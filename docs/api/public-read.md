# Public read API

The public read API provides anonymous access to competition and fixture reference data.

No sign-in or bearer token is required for these endpoints.

All application data is served through the handwritten Express backend. Supabase-generated Data API or PostgREST endpoints are not used as the public Sport Analytics API.

## Base path

```text
/api/v1
```

## Resources

The public API exposes:

- competitions;
- seasons;
- fixtures;
- competitors; and
- participants.

For cricket, competitors are teams and participants are people/players.

## Competition endpoints

```http
GET /api/v1/competitions
GET /api/v1/competitions/{competitionId}
```

Supported collection filter:

```text
name
```

Deterministic ordering:

```text
name ASC
competitionId ASC
```

## Season endpoints

```http
GET /api/v1/seasons
GET /api/v1/seasons/{seasonId}
```

Supported collection filter:

```text
competitionId
```

A season resource is derived from a competition and the season value recorded on its fixtures.

`seasonId` is a stable opaque identifier derived by the backend. Consumers must not decode or derive meaning from its representation.

Deterministic ordering:

```text
competitionId ASC
season ASC
```

## Fixture endpoints

```http
GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}
```

Supported collection filters:

```text
competitionId
seasonId
competitorId
gender
startDateFrom
startDateTo
```

The date bounds are inclusive.

Example:

```http
GET /api/v1/fixtures?competitionId=12&competitorId=20&limit=25
```

Example response:

```json
{
  "data": [
    {
      "fixtureId": "481",
      "competitionId": "12",
      "seasonId": "season_...",
      "season": "2026",
      "matchType": "T20",
      "teamType": "international",
      "gender": "male",
      "ballsPerOver": 6,
      "scheduledOvers": 20,
      "startDate": "2026-08-09",
      "endDate": "2026-08-09"
    }
  ],
  "pagination": {
    "nextCursor": null
  }
}
```

Deterministic fixture ordering:

```text
startDate ASC
fixtureId ASC
```

## Competitor endpoints

```http
GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}
```

Supported filters:

```text
competitionId
seasonId
name
```

A competitor represents a cricket team.

Deterministic ordering:

```text
name ASC
competitorId ASC
```

## Participant endpoints

```http
GET /api/v1/participants
GET /api/v1/participants/{participantId}
```

Supported filters:

```text
fixtureId
competitorId
name
```

Only public participant fields are returned.

Internal source references, authentication data, submission records and audit information are not exposed.

Deterministic ordering:

```text
displayName ASC
participantId ASC
```

## Pagination

Collection endpoints use cursor pagination.

The default page size is:

```text
50
```

The maximum page size is:

```text
100
```

Example:

```http
GET /api/v1/competitions?limit=25
```

A response may contain:

```json
{
  "pagination": {
    "nextCursor": "opaque-next-cursor"
  }
}
```

The next request can use:

```http
GET /api/v1/competitions?limit=25&cursor=opaque-next-cursor
```

Cursors and resource identifiers are opaque. Consumers must not derive meaning from their representation.

## Not-found responses

Unknown resource identifiers return HTTP `404`.

Example:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Competition not found."
  }
}
```

## Invalid requests

Invalid filters, page sizes or cursors return HTTP `400` using the shared machine-readable API error format.

## OpenAPI

The machine-readable specification is documented in the [OpenAPI specification](openapi.md).

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
