# Direct event submissions

`POST /api/v1/submissions` is a privileged legacy/import endpoint restricted to authenticated
`admin` accounts. Ordinary submitters cannot use this synchronous path because submitter-provided
event data must pass through the staged batch validation and review lifecycle before publication.
Client-supplied roles or scope values are ignored.

The current schema version is `1.0`. A request contains one fixture and 1–1,000 ordered cricket
delivery events. Events for each innings must appear in ascending `sequenceNumber` order. Statistics
are not accepted: the platform derives them from accepted deliveries.

```http
POST /api/v1/submissions
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

```json
{
  "fixtureId": "42",
  "schemaVersion": "1.0",
  "events": [
    {
      "eventId": "123e4567-e89b-42d3-a456-426614174000",
      "inningsId": "81",
      "sequenceNumber": 1,
      "overNumber": 0,
      "positionInOver": 0,
      "ballNumber": "0.1",
      "strikerId": "101",
      "nonStrikerId": "102",
      "bowlerId": "201",
      "runs": {
        "offBat": 4,
        "extras": 0,
        "total": 4,
        "nonBoundary": false
      },
      "extras": {},
      "wickets": []
    }
  ]
}
```

Successful validation and storage are synchronous and atomic:

```http
HTTP/1.1 201 Created
```

```json
{
  "data": {
    "submissionId": "300",
    "fixtureId": "42",
    "submitterId": "17",
    "status": "accepted",
    "receivedAt": "2026-08-13T16:00:00.000Z",
    "schemaVersion": "1.0",
    "eventCount": 1
  }
}
```

The backend records the submitter, fixture, received timestamp, schema version, original event ID,
and zero-based event-array position. A globally unique event UUID protects against accidental retry
or replay. If any event is invalid or conflicts, the transaction rolls back and stores neither the
submission nor any of its events.

Responses are `401` for missing or invalid authentication, `403` for any non-administrator, `409` for event conflicts, `413` above the 1 MB JSON limit, `422` for
contract or reference validation, and `429` after 30 requests from one account in 60 seconds.
Validation details include a field path and `eventIndex` where applicable.

## File uploads

The unified `/submissions/new` interface accepts single-fixture, season and back-catalogue packages
using the durable batch pipeline documented in
[Batch submission packages](../data/batch-submission-packages.md). In single-fixture mode, the
submitter chooses a fixture by date, team names, competition and season; the browser verifies that a
JSON or CSV package contains exactly that readable fixture context before upload. Season and
back-catalogue modes use readable competition and optional season context and retain NDJSON support.
All guided modes use the same maintained JSON and spreadsheet templates, and database IDs are not
required. The interface displays upload progress and the durable receipt, and links to the batch
report where background validation, source-row errors and ambiguous-reference mapping remain
available after navigation.

Single-fixture mode also offers **New fixture**. The submitter selects an authorised competition,
enters the fixture date, season, teams and the complete canonical-fixture metadata, then uploads a
matching JSON or CSV fixture package. The browser generates the existing version `1.1` fixture-proposal
contract and sends it through the batch pipeline; it never inserts canonical fixture data directly.
Selecting the package first prefills its competition, season, fixture date and team names in the
proposal form, leaving the submitter to confirm that context and enter the proposal-only metadata.
Match type is retained because version `1.1` and the canonical fixture require it, but the UI fixes
the available value to `T20`, matching the platform scope. Team type is selected as `club` or
`international`, and gender as `female` or `male`.
An administrator can use the batch report's **Create canonical fixture from proposal** action, after
which normal reference resolution and validation run again for the affected submission.

The advanced technical JSON editor preserves the canonical identifier-based input format. For an
ordinary submitter, the browser converts that input to a batch package using explicit `app:*`
application references and uploads it to `POST /api/v1/batches`, so it receives a durable receipt and
must pass review before publication. Administrators retain the synchronous direct endpoint only as a
clearly privileged import path.

`POST /api/v1/submissions/uploads` is likewise restricted to authenticated administrators and exists
only for legacy/internal imports. Normal submitter file uploads use `POST /api/v1/batches`. It accepts only a `.json` file with
`application/json` media type or a `.csv` file with `text/csv` media type, and limits the file to
1 MB (the `MAX_SUBMISSION_UPLOAD_BYTES` limit exported by `@sport-analytics/contracts`). Both formats are normalised into the same `fixtureId`, `schemaVersion`, and ordered `events`
contract shown above before the existing scope, cricket-rule, reference, replay, and transaction
checks run.

JSON files contain the direct-submission JSON object. CSV files contain one event per row and must
use this exact header order:

```text
fixtureId,schemaVersion,eventId,inningsId,sequenceNumber,overNumber,positionInOver,ballNumber,strikerId,nonStrikerId,bowlerId,runsOffBat,runsExtras,runsTotal,runsNonBoundary,extraWides,extraNoBalls,extraByes,extraLegByes,extraPenalty,wickets
```

`wickets` is a JSON array in the CSV cell; blank optional extras are treated as absent and a blank
`wickets` cell is an empty array. Every CSV row must name the same fixture and schema version.
Invalid file or normalised row errors return `422` with actionable details and an `eventIndex` for
row-specific failures; oversized files return `413`. Uploads remain atomic and persist original
filename, canonical media type, byte length, and a SHA-256 checksum of the original uploaded bytes on
the accepted submission. Direct JSON submissions persist a deterministic SHA-256 checksum of the
validated request payload as well. These retained checksums are used by the protected
[provenance and audit API](provenance.md).

## Correct an accepted event

`PUT /api/v1/submissions/events/{eventId}` corrects an accepted direct-submission event. The path
event ID is the original client UUID; the request supplies the fixture, contract version, corrected
delivery content, and a required non-blank reason. The occurrence sequence is inherited from the live
source event and is not client-editable.

Only an authenticated `submitter` or `admin` may correct it. An ordinary submitter needs the
fixture's server-owned competition scope; an administrator may correct any eligible fixture without a
scope assignment. The replacement is validated against the same cricket contract, participant,
innings, and dismissal-kind rules as a new submission. Invalid, unknown, unauthorised, or out-of-scope
corrections leave the live event unchanged.

The database transaction inserts a new immutable delivery revision, links it explicitly to its predecessor,
marks the previous live row superseded, and appends an immutable audit record with the requester, timestamp,
reason, before/after states, and original submission/batch-item provenance. Revision numbers increase by one
under a per-event transaction lock, including for concurrent requests. It never accepts statistic totals.
Fixture, participant, and public-event reads use live
deliveries, so the affected derived statistics change automatically while unrelated delivery statistics
remain unchanged. The successful correction response also contains `refreshedScopes`: the durable,
deduplicated refresh targets for the fixture and for the affected players' season, competition, and
career aggregates. This is an observable dependency journal rather than a second source of statistic
values; public statistics continue to derive from the current accepted revisions.

```json
{
  "fixtureId": "42",
  "schemaVersion": "1.0",
  "reason": "Correct scorer transcription from the signed scorebook.",
  "event": {
    "inningsId": "81",
    "overNumber": 0,
    "positionInOver": 0,
    "ballNumber": "0.1",
    "strikerId": "101",
    "nonStrikerId": "102",
    "bowlerId": "201",
    "runs": { "offBat": 6, "extras": 0, "total": 6 }
  }
}
```

`GET /api/v1/submissions/events/{eventId}/history` exposes ordered audit history to an in-scope
submitter or an administrator. Each entry includes explicit previous and replacement delivery identifiers
and revision numbers, requester identity, correction time and reason, complete previous/resulting event
states, original submission position, and optional batch-item identity. Reviewer, decision, review time and
review reason are returned together where review applies; the immediate accepted-correction flow returns
`review: null`. Public event endpoints continue to return only the current accepted revision and omit audit
metadata.

## Rejection format

A rejected submission returns an `error` object carrying a code, a human-readable
message, and — where the failure can be attributed to a particular field or event
— a `details` array. Every detail names the field path that failed and, for a
failure inside a submitted event, the zero-based index of that event.

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The submission is invalid.",
    "details": [
      {
        "code": "INVALID_PARTICIPANT",
        "message": "The participant does not belong to the submitted fixture.",
        "field": "wickets.0.fielders.2.participantId",
        "eventIndex": 3
      }
    ]
  }
}
```

Validation does not stop at the first failure. Every problem the platform can
detect in one pass is returned together, so a submitter can correct a submission
without discovering its faults one at a time.

### Response codes

| Status | Code                    | Meaning                                                                                                                         |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `INVALID_JSON`          | The request body is not valid JSON.                                                                                             |
| 401    | `UNAUTHORIZED`          | Authentication is missing or could not be verified.                                                                             |
| 403    | `FORBIDDEN`             | The account is authenticated but lacks the `submitter`/`admin` role, or an ordinary submitter is outside its competition scope. |
| 409    | `DUPLICATE_EVENT_ID`    | One or more event identifiers have already been accepted. The submission is a replay rather than an invalid payload.            |
| 413    | `PAYLOAD_TOO_LARGE`     | The request exceeds the 1 MB limit.                                                                                             |
| 422    | `VALIDATION_FAILED`     | The submission is structurally or referentially invalid. See `details`.                                                         |
| 429    | `RATE_LIMIT_EXCEEDED`   | More than 30 requests from one account in 60 seconds. `Retry-After` gives the wait in seconds.                                  |
| 500    | `INTERNAL_SERVER_ERROR` | An unexpected failure. No detail is returned, and the cause is recorded server-side.                                            |

### Detail codes

Returned inside `details` on a 422.

| Code                     | Field                                                                                                     | Raised when                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `INVALID_FIELD`          | The path that failed                                                                                      | The payload does not satisfy the submission contract: a missing or mistyped field, a value outside the supported range, an unexpected field, a printed ball number not in the published form, or an ordering rule broken within the submission. The message is the contract's own.                                                   |
| `FIXTURE_NOT_FOUND`      | `fixtureId`                                                                                               | The submitted fixture does not exist.                                                                                                                                                                                                                                                                                                |
| `INVALID_INNINGS`        | `inningsId`                                                                                               | The innings does not exist, or belongs to a different fixture. The check is scoped to the submitted fixture, so an innings identifier from elsewhere is rejected rather than accepted.                                                                                                                                               |
| `INVALID_PARTICIPANT`    | `strikerId`, `nonStrikerId`, `bowlerId`, `wickets.N.playerOutId`, or `wickets.N.fielders.M.participantId` | The participant is not in the squad for the submitted fixture. Existing as a person is not sufficient.                                                                                                                                                                                                                               |
| `UNKNOWN_DISMISSAL_KIND` | `wickets.kind`                                                                                            | The dismissal kind is absent from the `dismissal_kind` lookup table. The vocabulary is held in that table rather than in the contract, so a new kind requires a row and no code change.                                                                                                                                              |
| `DUPLICATE_EVENT_ID`     | `eventId`                                                                                                 | The event identifier has already been accepted. Also returned as the top-level code on a 409.                                                                                                                                                                                                                                        |
| 409                      | `EVENT_CONFLICT`                                                                                          | A delivery position, within-innings sequence, or event identifier conflicts with data already accepted. Unlike `DUPLICATE_EVENT_ID`, this is raised by the database rather than the pre-submission checks: it means the conflicting data was accepted between validation and storage, or that another submission holds the position. |

### Atomicity

A rejected submission stores nothing. Validation and storage share one
transaction, so a failure at any point leaves neither the submission record nor
any of its events behind. A submitter may correct and resubmit without first
removing a partial result.

## AI Declaration

The direct submission API documentation was generated with the assistance of Codex[GPT-5.6 Sol].
The correction workflow and file-upload submission support were added with the assistance of
Codex[GPT-5].
The Issue #311 administrator submission rule was documented with the assistance of Codex[GPT-5].
The Issue #284 correction audit contract was documented with the assistance of Codex[GPT-5].
The Issue #286 selective refresh dependency contract was documented with the assistance of
Codex[GPT-5].
The Issue #435 guided single-fixture upload behavior was documented with the assistance of
Codex[GPT-5].
The Issue #437 unified submission workflow was documented with the assistance of Codex[GPT-5].
The Issue #571 new-fixture proposal workflow was documented with the assistance of Codex[GPT-5].
