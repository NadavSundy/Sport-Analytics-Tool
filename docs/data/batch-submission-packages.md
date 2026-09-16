# Batch submission packages

## Approved formats and limits

Issue #356 approves three human-facing batch formats for Intermediate ingestion:

| Format | Media type             | Intended use                                                                                           |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| JSON   | `application/json`     | A structured season or back-catalogue package with an envelope and nested records.                     |
| CSV    | `text/csv`             | Spreadsheet-oriented event rows carrying repeated human-readable match context.                        |
| NDJSON | `application/x-ndjson` | A manifest record followed by independently parseable fixture, innings, participant and event records. |

A CSV row records at most one dismissal per delivery, naming at most three fielders. A delivery with
more than one dismissal, or a dismissal involving more than three fielders, must use the JSON
package; see [dismissals in the templates](../api/season-upload-contract.md#dismissals).

Each package declares a batch-envelope version separately from the shared delivery-event schema
version. Archive formats are not accepted in the first implementation.

The approved limits are:

- 50 MB of source bytes per batch, enforced while streaming;
- 50,000 expanded event items per batch, enforced by the worker; and
- three concurrent non-terminal batches per submitter.

Changing these limits requires representative measurement and a recorded follow-up decision.

## Version 1.1 fixture proposals

A version `1.1` package can introduce a fixture that is not yet canonical. Every proposed fixture
must retain all of the following metadata through staging and reviewer resolution: `endDate`,
`matchType`, `teamType`, `gender`, `ballsPerOver`, `outcome`, `sourceVersion`, and
`sourceRevision`. The reviewer receives that exact validated proposal before choosing **Create
canonical fixture from proposal**; the upload never creates a canonical fixture directly.

JSON uses `fixtures[].proposal`. CSV uses the eight `fixture*` columns included in the maintained
template (`fixtureEndDate` through `fixtureSourceRevision`) on every row for that fixture. NDJSON
uses `proposal` on its `fixture` record. A version `1.1` source that omits or invalidly represents
any required proposal field is rejected as a package-item validation error; the worker never drops
proposal metadata or substitutes defaults. Version `1.0` packages remain unchanged and leave these
CSV columns blank.

## NDJSON record contract

NDJSON is line-oriented and every non-empty line is an independently valid JSON object. Records must
appear in dependency order so the worker never needs the whole package in memory:

1. one `manifest` record containing `contractVersion`, `packageId`, `competition` and `season`;
2. `fixture` records containing a caller-local `fixtureKey` plus the fixture `sourceId` and/or `context`;
3. `innings` records containing a caller-local `inningsKey`, their `fixtureKey`, and innings
   `sourceId` and/or `context`;
4. optional `participant` records containing a caller-local `participantKey` and the normal participant
   reference object in `reference`; and
5. `event` records containing an `inningsKey` and the season-upload event. Event participant roles may
   contain the normal participant reference directly or the corresponding `participantKey` string.

Example:

```json
{"recordType":"manifest","contractVersion":"1.0","packageId":"cricsheet:package:ipl-2026","competition":{"sourceId":"cricsheet:competition:ipl"},"season":{"sourceId":"cricsheet:season:2026"}}
{"recordType":"fixture","fixtureKey":"m1","sourceId":"cricsheet:fixture:1412526"}
{"recordType":"innings","inningsKey":"m1-i1","fixtureKey":"m1","context":{"ordinal":1,"battingTeam":{"context":{"name":"Example XI"}}}}
{"recordType":"participant","participantKey":"striker-1","reference":{"context":{"name":"Example Batter"}}}
{"recordType":"event","fixtureKey":"m1","inningsKey":"m1-i1","event":{"eventId":"cricsheet:delivery:1412526-1-0.1","occurrenceSequence":1,"overNumber":0,"positionInOver":0,"ballLabel":"0.1","striker":"striker-1","nonStriker":{"context":{"name":"Example Non-striker"}},"bowler":{"context":{"name":"Example Bowler"}},"runs":{"offBat":0,"extras":0,"total":0},"extras":{}}}
```

The manifest is required before dependent records. A fixture or innings key is unique within the file.
Malformed individual event/unknown lines are assigned a deterministic source ordinal, recorded, and processing
continues where later lines remain independently interpretable. Invalid UTF-8 and structural faults
that make the remaining dependency graph unsafe are batch-level source faults instead.

## User-facing references

A submitter is never required to discover or enter a PostgreSQL primary key. Packages identify
records with stable source identities where the source supplies them, and with human-readable
context otherwise.

A stable source identity has three parts:

```json
{
  "namespace": "cricsheet",
  "entityType": "fixture",
  "value": "1412526"
}
```

The namespace identifies the owner of the value. A value is compared only with the same namespace
and entity type. Provider-specific values therefore cannot collide, and a future live-feed adapter
can use the same identity shape without becoming the canonical event model.

Where no source identity exists, packages use readable context:

- competition name and season;
- fixture date and participating team names;
- innings ordinal and batting team;
- participant display name within the resolved fixture; and
- delivery occurrence sequence, over number and position within the over.

Printed ball number is display data and is never used as an identity key.

## Resolution rules

Resolution occurs after durable receipt and before shared per-event validation:

1. Resolve an exact namespaced source identity where one exists.
2. Otherwise resolve the readable competition, fixture and innings context.
3. Resolve participants within that fixture using exact source identities or exact retained aliases.
4. Record every automatic resolution with the original submitted reference.
5. Return missing or ambiguous references as actionable staged validation results.
6. Never fuzzy-match, select the first same-name record, or silently create a canonical record.
7. Allow a later authorised review to select an existing record or approve a proposed record.

These rules account for shared player names and historical aliases while keeping package creation
usable for submitters who understand the source data but not the application database.

## Correction items

JSON, CSV and NDJSON event records use the same correction fields. Set
`operation` to `correction`, give the replacement its own stable `eventId`, and
set `correctsEventId` to the exact stable source identity of the published
delivery being corrected. An ordinary event either omits `operation` or uses
`upsert`, and must not include `correctsEventId`.

The worker retains both fields on the staged item and resolves the target in a
single bounded query per validation chunk. Exactly one current published
delivery must carry the target source identity, and that delivery must belong to
the item's declared fixture and the batch competition. Validation reports use
`CORRECTION_TARGET_NOT_FOUND`, `CORRECTION_TARGET_AMBIGUOUS`,
`CORRECTION_TARGET_WRONG_FIXTURE`, or
`CORRECTION_TARGET_WRONG_COMPETITION` when those conditions are not met.

Changed cricket content is expected for a valid correction. Reviewer approval
creates a new immutable revision of the target event, retains its occurrence
sequence and original source provenance, supersedes the previous current
revision, records correction/reviewer history, and marks affected statistic
scopes for refresh. Retried publication observes the already-published batch
item and does not add another revision. Upsert duplicate/conflict semantics do
not change.

The receipt API resolves the batch's human-selected competition before it creates the database
batch and verifies it against the submitter's server-owned scope. During worker expansion, only
events with a resolved canonical innings become `batch_item` rows. Parse failures and unresolved
references retain their source ordinal or path in separate batch-source issue records; the pipeline
never invents placeholder database identifiers.

## Direct, batch and live boundaries

The synchronous Basic route retains its existing single-fixture request and response contract. A
batch has a distinct envelope, parser, lifecycle and asynchronous response. The formats converge
only after parsing and reference resolution, when each canonical delivery is validated with the
shared `submissionEventSchema` and cricket business rules.

A future live adapter may add provider event identity, provider revision, observation time and
occurrence time to its ingestion envelope. Those fields remain source metadata; accepted cricket
events still converge on the same validation, immutable revision and publication path.

## Retention

Original batch bytes remain private in Azure Blob Storage for 90 days from receipt. Deletion is a
recorded, retryable lifecycle operation. The batch record, checksum, expanded items, validation
results, review decisions and published-event links remain after the bytes are deleted.

Database domain records retain an opaque application object reference. They do not store or expose a
public URL, SAS token, user path or bare provider key; only the backend-owned object-store adapter
resolves that reference to Azure storage coordinates.

## AI Declaration

The issue #356 package, identity and resolution decisions were documented or edited with the
assistance of Codex[GPT-5] and ChatGPT-Web[GPT-5.6 Sol].
The Issue #583 fixture-proposal representation rules were documented with the assistance of
Codex[GPT-5].
