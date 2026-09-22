# Season-upload contract

Issue #357 defines the versioned package contract used to submit one fixture, a
season, or a back catalogue to the Intermediate batch-ingestion pipeline. It is
separate from the synchronous [direct event submission](submissions.md)
contract. A package is stored and resolved before it can become staged delivery
items; this page defines the submitted shape, not a published-event API.

Version **`1.0`** remains accepted for matching existing canonical fixtures.
Version **`1.1`** adds a required fixture proposal. A receiver rejects
unsupported versions rather than attempting a best-effort parse.

## Templates

The deployed frontend publishes these downloadable starter files:

- [Canonical JSON template](https://sport-analytics-tool-web.pages.dev/season-upload-template.json)
- [Spreadsheet CSV template](https://sport-analytics-tool-web.pages.dev/season-upload-template.csv)
- [Multi-file manifest template](https://sport-analytics-tool-web.pages.dev/season-upload-manifest-template.json)

The CSV is a spreadsheet-oriented flat view of the same values. Repeating
fixture and innings context in each row is intentional: spreadsheet users do
not need application identifiers, and a parser can group the rows into the
canonical JSON package. Its file row is an arrival position only, not a
delivery identity or ordering value.

Since issue #500 the templates carry no provider reference: every `sourceId`
value and every CSV column ending in `SourceId` is empty, so a submitter who
fills in only the readable names produces a package that resolves. The two
identities the contract requires, `packageId` and each `eventId`, are labels
the submitter chooses and keeps unchanged, for example
`my-club:delivery:innings-0-ball-1`; neither is a database identifier.

### Dismissals

The JSON template's second example event records a caught dismissal with one
named fielder in its `wickets` array.

Since issue #536 the CSV template ends with twelve dismissal columns, after
`extraPenalty`:

| Columns                                                  | Meaning                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wicketKind`                                             | The dismissal kind, for example `caught`. Leave every dismissal column blank when the delivery has no dismissal. A row that fills in the dismissed player or a fielder but leaves `wicketKind` blank is rejected with `CSV_WICKET_KIND_MISSING`, so the dismissal is reported rather than dropped. |
| `playerOutSourceId`, `playerOutName`                     | The dismissed player, given the same way as the striker and bowler.                                                                                                                                                                                                                                |
| `fielder1SourceId`, `fielder1Name`, `fielder1Substitute` | The first fielder. `fielder2…` and `fielder3…` follow the same pattern.                                                                                                                                                                                                                            |

A fielder slot counts when it has a source identifier, a name, or `true` in its
substitute column; a substitute with no name is an unidentified substitute.
Empty slots are skipped, so the fielders that are filled keep their order with
no gap. A substitute column accepts exactly `true` or `false`, as the
direct-submission CSV does, and any other value is rejected. Which dismissal
kinds require a fielder is checked by the delivery-event contract.

The CSV has two limits the JSON package does not:

- a row records at most **one dismissal** per delivery; and
- a dismissal names at most **three fielders**.

A delivery with more than one dismissal, or a dismissal involving more than
three fielders, must be submitted in the JSON package.

## Canonical JSON format

```json
{
  "contractVersion": "1.0",
  "packageId": "cricsheet:package:varsity-cup-2026",
  "competition": { "context": { "name": "Varsity Cup", "country": "South Africa" } },
  "season": { "context": { "name": "2026" } },
  "fixtures": [
    {
      "sourceId": "cricsheet:fixture:1412526",
      "context": {
        "date": "2026-03-14",
        "teams": [{ "context": { "name": "Wits" } }, { "context": { "name": "UCT" } }]
      },
      "innings": [
        {
          "sourceId": "cricsheet:innings:1412526-1",
          "context": { "ordinal": 0, "battingTeam": { "context": { "name": "Wits" } } },
          "events": [
            {
              "eventId": "cricsheet:delivery:1412526-1-1",
              "occurrenceSequence": 1,
              "overNumber": 0,
              "positionInOver": 0,
              "ballLabel": "0.1",
              "striker": { "context": { "name": "A. Batter" } },
              "nonStriker": { "context": { "name": "B. Batter" } },
              "bowler": { "context": { "name": "C. Bowler" } },
              "runs": { "offBat": 4, "extras": 0, "total": 4 },
              "extras": {}
            }
          ]
        }
      ]
    }
  ]
}
```

Templates do not require application database keys. A source identifier is
always `namespace:entityType:value`; it is compared only within its namespace
and entity type. A reference may instead use readable context, or include both
for a useful resolution audit. Source-only competition, season and team
references are rejected because the platform has no durable mapping for them.
Source-only fixture and participant references may use `cricsheet`, while
`app` fixture, innings and participant references require a positive canonical
identifier. Names are scoped by the enclosing competition, season, fixture and,
where supplied, team; they are never globally unique.

An innings `ordinal` is zero-based, so the first innings of a fixture is `0`. It
is the same number the platform stores and the same number the public read API
returns, so no conversion applies in either direction.

`eventId` is the stable delivery identity for retry and duplicate detection.
`occurrenceSequence` gives the delivery's order within its innings. Neither the
JSON-array position, CSV row number, manifest-file order, nor `ballLabel` is
used as an identity or ordering key. A printed label is optional display data,
so a no-ball or wide cannot change identity merely by repeating a legal-ball
label. Every event supplies the zero-based canonical coordinates `overNumber`
and `positionInOver`; neither coordinate is derived from a label or source-row
order. When `ballLabel` is present it must use `<over>.<ball>` form and its over
component must equal `overNumber`.

## Fixture proposals in version 1.1

A `1.1` fixture must retain its stable fixture source ID and include a complete
`proposal`. The proposal carries `endDate`, `matchType`, `teamType`, `gender`,
`ballsPerOver`, `outcome`, `sourceVersion`, and `sourceRevision`. It is rejected
if absent, malformed, or if its end date precedes the fixture date. Existing
`1.0` packages remain valid for resolution against existing canonical records.

## Corrections and duplicates

A correction creates a new submitted delivery identity and points at the
stable identity it corrects. It does not use a ball label or an internal key.

```json
{
  "eventId": "cricsheet:delivery:1412526-1-1-revision-2",
  "occurrenceSequence": 1,
  "operation": "correction",
  "correctsEventId": "cricsheet:delivery:1412526-1-1"
}
```

Two events with the same `eventId`, or the same `occurrenceSequence` inside an
innings, are invalid. A receiver treats a previously accepted stable event ID
as a duplicate/retry according to the batch lifecycle; it must not create a
second delivery from it.

During asynchronous validation, `operation` and `correctsEventId` are retained
on the staged item. A correction target is resolved only from a current
published delivery carrying that exact external source identity. The target
must be unique and must belong to both the fixture declared by the item and the
batch competition. Missing, ambiguous, wrong-fixture, and wrong-competition
targets are reported against `correctsEventId` with distinct actionable rule
codes.

The submitted replacement is validated with the target's existing occurrence
sequence. It is not classified as a conflicting ordinary upsert merely because
its cricket content differs from the target. After reviewer approval,
publication inserts a new immutable delivery revision, supersedes the current
target revision, records correction and reviewer provenance, and refreshes the
same dependent statistics as the direct correction workflow. Publication
rechecks the live lineage under a transaction lock, so a retry cannot create a
second replacement revision. Ordinary `upsert` duplicate and conflict handling
is unchanged.

## Reference resolution

After receipt, the API resolves exact source identifiers first. Otherwise it
resolves competition and season, then fixture, innings, team and participant
context. It never fuzzy-matches or chooses the first same-name participant.

Only `cricsheet` fixture identifiers, and since #480 the `app` identifiers the
technical submission path generates, are compared. A fixture identifier from any
other namespace can never resolve, so where the fixture also carries readable
context the identifier is ignored, the fixture resolves on its date, season and
teams, and the result records that the identifier had no effect. Templates
downloaded before #500 carry such a placeholder. A `cricsheet` identifier that
matches no stored fixture is still staged rather than falling back to context.
An unresolved or ambiguous reference produces an actionable staged resolution
requirement, for example:

```json
{
  "code": "AMBIGUOUS_REFERENCE",
  "referencePath": "fixtures.0.innings.0.events.0.striker",
  "submittedReference": { "context": { "name": "A. Smith" } },
  "candidates": [
    { "sourceId": "cricsheet:participant:smith-1", "label": "A. Smith (Wits)" },
    { "sourceId": "cricsheet:participant:smith-2", "label": "A. Smith (UCT)" }
  ],
  "resolutionRequired": true
}
```

The batch remains staged until an authorised reviewer selects an existing
candidate or approves a proposed record. The original submitted reference and
decision are retained for provenance. Invalid source formats, a source ID for
the wrong entity type, missing reference context, and duplicate event
identities are contract validation errors.

Reports expose existing candidates as readable labels with opaque candidate references. The batch
owner or an administrator in the batch's competition scope can submit one of those references to
the [batch reference-mapping endpoint](batches.md#reference-mapping). The server rechecks that the
choice is still a valid candidate and asynchronously reruns canonical event and cricket validation.
References without a safe existing candidate require reviewer contact; this workflow does not
silently create records.

## Reviewer canonical-fixture decisions

For an unresolved fixture supplied under the versioned fixture-proposal contract, an administrator
may use `POST /api/v1/batches/{batchReference}/canonical-fixtures`. The backend rechecks the source
fixture immediately before insertion, records the reviewer, batch and reference path, then queues
normal reference resolution and validation. It does not publish any staged delivery. Teams,
participants, and seasons are prerequisites: they must already be canonical records before a reviewer
creates a fixture, after which the normal revalidation pass can resolve their references.

## Upload context and retries

The upload form selects an authorised competition only. The package's own season name/reference is
authoritative; the form does not offer a season selector because it cannot constrain processing.

The browser derives the batch idempotency key from the authorised competition and SHA-256 of the
file bytes. Reselecting unchanged content, including after refreshing and reselecting the file,
therefore reuses the durable receipt. A byte-level content change or a competition change uses a
different key. The receiver remains the authority that rejects any same-key/different-checksum
conflict.

## Multi-file packages

Use a manifest when a package contains more than one file. The manifest lists
relative file paths, media types, and lowercase SHA-256 checksums. It has the
same `contractVersion` and stable `packageId` as the package. Duplicate paths,
absolute paths, unsupported media types, invalid checksums, or fewer than two
files are invalid. Manifest ordering is only an arrival aid; event occurrence
order still comes from `occurrenceSequence`.

## Automated examples

The shared-contract suite covers a readable-context fixture, a multi-fixture
season payload with reversed arrival order, duplicate delivery/occurrence
values, corrections, ambiguous participants, invalid source references, and a
valid/invalid multi-file manifest. The schema is exported from
`@sport-analytics/contracts` for the future receipt endpoint and parsers.

## Batch status and result reports

Authenticated submitters can list their own batches at `GET /api/v1/batches` and retrieve a
batch's lifecycle status at `GET /api/v1/batches/{batchReference}`. Administrator reviewers can
use the same read endpoints across their authorised repository scope. A non-owner receives the
same forbidden response as an unknown reference, so another submitter's private batch is never
disclosed.

Status includes received and last-updated timestamps, processed progress, and accepted, rejected,
unresolved, duplicate and conflicting counts. `partially_published` and simultaneous non-zero
accepted and rejected counts explicitly represent partial success.

`GET /api/v1/batches/{batchReference}/report` returns cursor-paginated item outcomes. Every result
retains its source ordinal and available file, sheet, row and JSON path, readable innings/over/event
context, stable validation rule codes, and links to its staged item and published delivery where
applicable. All recorded faults are returned instead of only the first fault. Rule summaries group
errors by stable code. The complete report is available as JSON from
`GET /api/v1/batches/{batchReference}/report/download`.

## AI Declaration

This Issue #357 contract and documentation were generated with the assistance
of Codex[GPT-5]. The batch status and result-report section was generated with
the assistance of Codex[GPT-5]. The reference-mapping section was generated with
the assistance of Codex[GPT-5].
The Issue #587 source-only reference-resolution rules were documented with the
assistance of Codex[GPT-5].

## Multi-season back catalogues

A back-catalogue package may contain fixtures from more than one season. The
package-level `season` remains required as the backwards-compatible default.
A fixture may add its own `season` reference; when present, that fixture-level
season overrides the package default for fixture resolution and validation.

This is an additive envelope extension. Existing single-season packages do not
need to change.

The following is an **envelope fragment**; innings/event payloads are omitted
because their shape is unchanged.

```json
{
  "contractVersion": "1.0",
  "packageId": "provider:package:catalogue-2025-2026",
  "competition": { "context": { "name": "Example Competition" } },
  "season": { "context": { "name": "2025" } },
  "fixtures": [
    {
      "context": {
        "date": "2025-01-10",
        "teams": [{ "context": { "name": "Alpha" } }, { "context": { "name": "Bravo" } }]
      }
    },
    {
      "season": { "context": { "name": "2026" } },
      "context": {
        "date": "2026-01-10",
        "teams": [{ "context": { "name": "Alpha" } }, { "context": { "name": "Charlie" } }]
      }
    }
  ]
}
```

The effective season for a fixture is therefore:

1. `fixture.season`, when supplied; otherwise
2. the package-level `season`.

The effective season participates in canonical fixture resolution. A legitimate
season change inside a catalogue is not treated as an envelope mismatch merely
because another fixture in the same package belongs to a different season.

Idempotency, duplicate classification, review decisions, checkpointed
publication, and batch summary counts continue to use the existing batch
pipeline. Replaying the same source deliveries must not create additional
published events. Validation and reference-resolution failures remain attached
to the affected fixture/item so valid siblings are not hidden by a catalogue
containing one bad fixture.

For acceptance evidence, exercise at least two seasons, multiple fixtures in
each season, one invalid fixture among valid fixtures, and a replay of the same
catalogue after the first publication.

AI Declaration: This Issue #589 edit was generated and reviewed with the assistance of ChatGPT-Web[GPT-5.6 Sol].
