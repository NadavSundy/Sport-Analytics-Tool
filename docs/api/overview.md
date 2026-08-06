# API overview

## Product boundary

The API is a primary product. It must be designed and implemented by the team as HTTP endpoints. Generated Firebase or Supabase database endpoints must not be used as the application API.

## Initial conventions

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

### Authenticated identity proof

```http
GET /api/v1/auth/me
Authorization: Bearer <firebase-id-token>
```

Successful response:

```json
{
  "identity": {
    "subject": "<firebase-user-id>"
  }
}
```

Missing, malformed, invalid, expired or revoked tokens receive:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
```

The endpoint proves authenticated identity only. It does not assign roles or sport-specific permissions.

## Required future API areas

- accounts and role/scope information;
- competitions, seasons, competitors, and fixtures;
- event schemas and validated submissions;
- review, rejection, correction, and audit history;
- events and derived fixture/season/career statistics;
- filtered exports and dataset releases;
- statistic definitions and versions for the advanced tier;
- asynchronous jobs for large requests;
- API consumers, keys, quotas, rate limits, and usage; and
- change feeds and release differences for the advanced tier.

An OpenAPI specification should be maintained alongside implementation and verified by contract tests. Do not generate backend behaviour from a third-party database platform.
