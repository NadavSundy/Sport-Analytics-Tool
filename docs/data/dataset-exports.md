# Dataset exports

Basic-tier dataset exports let an analyst download a bounded, filtered slice of accepted cricket
delivery data without scraping the public interface. They require no sign-in and are intended for
small, immediate analysis tasks.

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

Exports are ordered by innings ordinal, event sequence number, then event identifier. They contain
at most **100 events**. `cursor` and `limit` are intentionally unsupported, so a request containing
either is rejected with HTTP `400`; use the normal paginated public-read endpoint for browsing more
than one bounded slice.

The JSON response is `{ "data": [...] }`. The CSV response has `Content-Type: text/csv; charset=utf-8`
and downloads as `fixture-{fixtureId}-events.csv`. Its fixed columns include the event's stable IDs,
delivery position, competitor and participant IDs, runs, extras and flattened wicket details.

## Data safety and scope

The export is derived from the public accepted-event representation only. It does not include
private account information, submitter identities, submission IDs, source/revision administration,
audit timestamps or secrets. It is a current accepted-data view, not an immutable release or
checksum-backed snapshot.

The public calculation trace provides labelled CSV and JSON controls for the displayed event slice.
It carries the trace's visible innings/team or player context into the export request without exposing
pagination or technical-only controls.

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

The collection is returned newest first and includes each release's stable version, creation time,
scope, event count, format version, documented fields and SHA-256 checksum. The public application
exposes the same catalogue at `/dataset-releases`; each release page presents its metadata, schema,
checksum and a direct JSON download without requiring sign-in.

Each artifact is canonical JSON containing its format version, scope, field descriptions and ordered
published accepted-delivery rows. It is generated only from the live, corrected `delivery_current`
revision whose source submission is `accepted`; pending, rejected and superseded rows are excluded.
The metadata response includes the SHA-256 checksum of the exact artifact bytes. Consumers should
save the version and checksum with an analysis and verify the downloaded bytes before reuse.

Release rows cannot be updated or deleted. Later corrections can be captured only in a new version,
so a prior version and checksum always resolve to the same retained artifact.

## AI Declaration

The dataset-release catalogue and download documentation was updated with the assistance of
Codex[GPT-5].
