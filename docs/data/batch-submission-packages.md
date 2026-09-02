# Batch submission packages

## Approved formats and limits

Issue #356 approves three human-facing batch formats for Intermediate ingestion:

| Format | Media type             | Intended use                                                                                           |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| JSON   | `application/json`     | A structured season or back-catalogue package with an envelope and nested records.                     |
| CSV    | `text/csv`             | Spreadsheet-oriented event rows carrying repeated human-readable match context.                        |
| NDJSON | `application/x-ndjson` | A manifest record followed by independently parseable fixture, innings, participant and event records. |

Each package declares a batch-envelope version separately from the shared delivery-event schema
version. Archive formats are not accepted in the first implementation.

The approved limits are:

- 50 MB of source bytes per batch, enforced while streaming;
- 50,000 expanded event items per batch, enforced by the worker; and
- three concurrent non-terminal batches per submitter.

Changing these limits requires representative measurement and a recorded follow-up decision.

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

The issue #356 package, identity and resolution decisions were documented with the assistance of
Codex[GPT-5].
