# API overview

## Product boundary

The API is a primary product. It must be designed and implemented by the team as HTTP endpoints. Generated database endpoints must not be used as the application API. Supabase may provide managed authentication, but application data must pass through the handwritten backend.

## Initial conventions

- Base path: `/api/v1`
- Format: JSON unless returning a documented dataset file
- Stable identifiers: opaque, immutable, non-recycled string identifiers
- Pagination: cursor pagination for Basic collection endpoints
- Filtering: explicit documented camelCase query parameters
- Sorting: endpoint-specific whitelisted fields with deterministic tie-breaking
- Errors: consistent machine-readable code, safe message, and optional field or event details
- Authentication: established provider/library for users; separate API-consumer credentials when introduced
- Versioning: URL major version initially, with a documented deprecation path before any retirement

The version-controlled API contract is published in the
[OpenAPI specification](openapi.md).

See [API versioning and deprecation](versioning.md) for compatibility,
deprecation and retirement rules.

See [Shared API Contracts](contracts.md) for the complete identifier,
response, error, filtering, sorting, date/time, event-ordering, and pagination conventions.

- Base path: `/api/v1`
- Format: JSON unless returning a documented dataset file
- Stable identifiers: opaque, non-recycled IDs
- Pagination: cursor pagination for large or changing collections where practical
- Filtering: explicit documented query parameters
- Errors: consistent machine-readable code, safe message, and optional field details
- Authentication: established provider/library for users; separate API-consumer credentials when introduced
- Versioning: URL major version initially, with a documented deprecation path before any retirement

## Current endpoints

```http
GET /api/v1/health
```

Example response:

```json
{
  "status": "ok",
  "service": "sport-analytics-api",
  "timestamp": "2026-08-04T19:00:00.000Z"
}
```

This endpoint is scaffold infrastructure only.

### Current user profile

```http
GET /api/v1/auth/me
Authorization: Bearer <supabase-access-token>
```

Successful response:

```json
{
  "user": {
    "id": "42",
    "subject": "<supabase-user-id>",
    "displayName": "Example User",
    "role": "viewer",
    "approvalState": "approved",
    "competitionIds": ["7", "12"]
  }
}
```

Missing, malformed, invalid, expired or revoked tokens receive:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
```

The API verifies the Supabase identity, creates or synchronizes the local account, and returns
server-owned authorization state. Authentication does not promote a user, approve submission, or
grant competition scope. A disabled account receives `403 Forbidden`.

### Public read

The following endpoints are available without authentication:

```text
GET /api/v1/competitions
GET /api/v1/competitions/{competitionId}
GET /api/v1/seasons
GET /api/v1/seasons/{seasonId}
GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}
GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}
GET /api/v1/participants
GET /api/v1/participants/{participantId}
```

See [Public Read API](public-read.md) for filters, pagination, deterministic ordering and example responses.

### Direct event submission

Approved submitters can send scoped, ordered cricket delivery events through:

```text
POST /api/v1/submissions
```

See [Direct Event Submissions](submissions.md) for the versioned request schema, provenance response,
validation errors, payload limit, and rate limit.

## Required future API areas

- competitions, seasons, competitors, and fixtures;
- review, rejection, correction, and audit history;
- events and derived fixture/season/career statistics;
- filtered exports and dataset releases;
- statistic definitions and versions for the advanced tier;
- asynchronous jobs for large requests;
- API consumers, keys, quotas, rate limits, and usage; and
- change feeds and release differences for the advanced tier.

An OpenAPI specification should be maintained alongside implementation and verified by contract tests. Do not generate backend behaviour from a third-party database platform.

## AI Declaration

The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
