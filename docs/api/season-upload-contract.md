# Season-upload contract

Issue #357 defines the versioned package contract used to submit one fixture, a
season, or a back catalogue to the Intermediate batch-ingestion pipeline. It is
separate from the synchronous [direct event submission](submissions.md)
contract. A package is stored and resolved before it can become staged delivery
items; this page defines the submitted shape, not a published-event API.

The initial contract version is **`1.0`**. Every JSON package and every
multi-file manifest must declare `contractVersion: "1.0"`. A receiver must
reject an unsupported version rather than attempting a best-effort parse.

## Templates

The deployed frontend publishes these downloadable starter files:

- [Canonical JSON template](https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net/season-upload-template.json)
- [Spreadsheet CSV template](https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net/season-upload-template.csv)
- [Multi-file manifest template](https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net/season-upload-manifest-template.json)

The CSV is a spreadsheet-oriented flat view of the same values. Repeating
fixture and innings context in each row is intentional: spreadsheet users do
not need application identifiers, and a parser can group the rows into the
canonical JSON package. Its file row is an arrival position only, not a
delivery identity or ordering value.

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

No field accepts an application database primary key. A source identifier is
always `namespace:entityType:value`; it is compared only within its namespace
and entity type. A reference may instead use readable context, or include both
for a useful resolution audit. Names are scoped by the enclosing competition,
season, fixture and, where supplied, team; they are never globally unique.

An innings `ordinal` is zero-based, so the first innings of a fixture is `0`. It
is the same number the platform stores and the same number the public read API
returns, so no conversion applies in either direction.

`eventId` is the stable delivery identity for retry and duplicate detection.
`occurrenceSequence` gives the delivery's order within its innings. Neither the
JSON-array position, CSV row number, manifest-file order, nor `ballLabel` is
used as an identity or ordering key. A printed label is optional display data,
so a no-ball or wide cannot change identity merely by repeating a legal-ball
label.

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

## Reference resolution

After receipt, the API resolves exact source identifiers first. Otherwise it
resolves competition and season, then fixture, innings, team and participant
context. It never fuzzy-matches or chooses the first same-name participant.
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
