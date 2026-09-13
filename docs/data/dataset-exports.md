# Dataset exports

Basic-tier dataset exports let an analyst download the complete filtered set of accepted cricket
delivery data for a fixture without scraping the public interface. They require no sign-in and are
intended for immediate analysis tasks.

## Fixture-event slice

For a fixture's accepted event data, use either format:

```http
GET /api/v1/fixtures/{fixtureId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/events/export.csv
```

Both endpoints accept these optional filters: `inningsId`, `competitorId`, `participantId`,
`overNumber` and `wicketKind`. Their meaning is identical to the [public fixture-event
collection](../api/public-read.md#fixture-event-endpoints). For example:

```http
GET /api/v1/fixtures/481/events/export.csv?participantId=30&overNumber=4
```

Exports are ordered by innings ordinal, event sequence number, then event identifier, and contain
every event the filters match. The server follows the event collection's cursor until it is
exhausted; `cursor` and `limit` are therefore not accepted, and a request containing either is
rejected with HTTP `400`.

An export is limited to **5,000 events** so that it stays synchronous; the largest fixture in the
imported corpus has 346. An export over that limit fails with HTTP `422` and `EXPORT_TOO_LARGE`
rather than downloading a partial file, and a failure part of the way through reading returns an
error rather than the rows read so far. Before issue #467 an export silently stopped at the first
100 events, which cut short most innings.

The JSON response is `{ "data": [...] }`. The CSV response has `Content-Type: text/csv; charset=utf-8`
and downloads with a name identifying its filters, such as
`fixture-481-player-30-over-4-events.csv`. Its fixed columns include the event's stable IDs, delivery
position, competitor and participant IDs, runs, extras and flattened wicket details.

## Calculation-trace export

A calculation trace downloads exactly the events it displays:

```http
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}/events/export.csv
```

The rows are the statistic's contributing events, so an innings trace export reproduces the innings'
delivery runs and a player trace export contains only the standard-innings deliveries that player
faced or bowled. The filtered export with `participantId` is wider: it also includes deliveries where
the player was the non-striker, was dismissed or fielded, and super-over deliveries. See the
[public read reference](../api/public-read.md#calculation-trace-exports).

## Data safety and scope

The export is derived from the public accepted-event representation only. It does not include
private account information, submitter identities, submission IDs, source/revision administration,
audit timestamps or secrets. It is a current accepted-data view, not an immutable release or
checksum-backed snapshot.

The public calculation trace provides labelled CSV and JSON controls that download the calculation-
trace export for that statistic. The control states how many events the file contains, announces
while the export is being prepared and once it has downloaded, and shows the server's reason when an
export fails; it exposes no pagination or technical-only controls.

## Versioned dataset releases

An administrator can create a named immutable release with:

```http
POST /api/v1/admin/dataset-releases
Authorization: Bearer <administrator token>
Content-Type: application/json

{ "version": "2026.09.1" }
```

The version is a caller-selected stable identifier and can contain letters, digits, dots, underscores
and hyphens. Reusing a version retrieves its original release rather than regenerating it. Public
consumers retrieve the metadata and exact downloadable artifact at:

```http
GET /api/v1/dataset-releases
GET /api/v1/dataset-releases/{version}
GET /api/v1/dataset-releases/{version}/artifact.json
```

An authenticated administrator can perform the same operation without constructing an API request
by opening **Publish dataset release** from the Account page. The admin-only workflow validates the
version, explains that publication is immediate and immutable, and links the successful result to
its public metadata, JSON artefact and catalogue entry. The backend administrator guard remains the
authoritative permission boundary.

The collection is returned newest first and includes each release's stable version, creation time,
scope, event count, format version, documented fields and SHA-256 checksum. The public application
exposes the same catalogue at `/dataset-releases`; each release page presents its metadata, schema,
checksum and a direct JSON download without requiring sign-in.

Each artifact is canonical JSON containing its format version, scope, field descriptions and ordered
published accepted-delivery rows. It is generated only from the live, corrected `delivery_current`
revision whose source submission is `accepted`; pending, rejected and superseded rows are excluded.
Release generation reads those rows in deterministic keyset pages ordered by fixture, innings,
delivery sequence and delivery identifier. The backend writes the JSON header, individual event
objects and closing bytes directly to private object storage while updating SHA-256 over those exact
UTF-8 bytes. It therefore never constructs the complete event array or artifact string in
application memory. PostgreSQL retains the immutable version, schema, event count, checksum and
opaque artifact reference; public downloads resolve that reference and stream the stored bytes.

Metadata is inserted only after object storage confirms the complete write. An interrupted database
read, JSON stream or storage write fails the publication request and triggers deletion of the
generated object key, leaving no visible release. If metadata insertion loses a concurrent race for
the same version, the newly written unreferenced object is deleted and the original immutable
release is returned. Operational reconciliation remains the fallback when storage is unavailable
during cleanup. The metadata response includes the SHA-256 checksum of the exact artifact bytes.
Consumers should save the version and checksum with an analysis and verify the downloaded bytes
before reuse.

Release rows cannot be updated or deleted. Later corrections can be captured only in a new version,
so a prior version and checksum always resolve to the same retained artifact.

## AI Declaration

The dataset-release catalogue and download documentation was updated with the assistance of
Codex[GPT-5]. The administrator publication workflow was documented with the assistance of
Codex[GPT-5.6 Sol]. The complete-export and calculation-trace export documentation for issue #467 was
updated with the assistance of Claude Code[Claude Opus 5]. The streamed release-generation and
storage lifecycle was documented with the assistance of Codex[GPT-5].
