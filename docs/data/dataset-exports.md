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
pagination or technical-only controls. Versioned dataset releases, larger asynchronous export jobs
and object storage remain outside Basic scope.
