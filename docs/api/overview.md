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
    "role": "submitter",
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

### Account deletion

An authenticated user can permanently delete their own account through:

```http
DELETE /api/v1/account
Authorization: Bearer <supabase-access-token>
Content-Type: application/json

{"confirmation":"DELETE"}
```

The endpoint accepts no target account identifier, requires a sign-in no more than 15 minutes old,
and returns `422` unless the confirmation is exactly `DELETE`. A successful request disables the
local account, revokes its role, approval and competition grants, hard-deletes the Supabase Auth
user, and replaces local identity fields with a tombstone.

The backend requires a separate server-only `SUPABASE_SECRET_KEY` for that provider operation. If it
is not configured, the route returns `501 ACCOUNT_DELETION_UNAVAILABLE` before changing local state;
other routes and health checks remain available.

Submissions, fixtures, deliveries, derived statistics and their stable `app_user_id` provenance
remain. If Auth deletion or local finalization fails, the API returns `503`; the account remains
disabled and retry is idempotent. See [Privacy and retention](../security/privacy-retention.md).

Application registration is handled by Supabase Auth; there is no backend registration or profile
mutation endpoint that accepts `application_role`. New application accounts are synchronized as
`viewer`, and only a trusted administrative backend process may change the role to `submitter` or
`admin`.

### Submitter access requests

An authenticated viewer who does not already hold a submission-capable role can request submitter
access through:

```http
POST /api/v1/submitter-access-requests
Authorization: Bearer <supabase-access-token>
```

A successful request changes the authenticated application account's server-owned approval state to `pending`:

```json
{
  "data": {
    "accountId": "42",
    "approvalState": "pending"
  }
}
```

The endpoint returns `401 Unauthorized` when no valid authentication is supplied.

A `409 Conflict` is returned when the account already has a pending request, has the legacy
`approved` request state, or already holds the `submitter`/`admin` role. A previously rejected
viewer may submit a new request.

The request state is stored on the provider-neutral application account and can subsequently be
consumed by the administrator approval and competition-scope workflow. The request state is not an
authorization grant: approval must assign `application_role = submitter`, and the backend uses that
role plus competition scope for submission decisions.

### Administrator submitter-access decisions

Administrators can list application users through:

```http
GET /api/v1/admin/users
Authorization: Bearer <supabase-access-token>
```

The endpoint is restricted to the `admin` role and provides the account state needed for
submitter-access review and administration.

Only an authoritative `admin` may manage another active, non-administrator account. Approval and
scope replacement use `PATCH /api/v1/admin/users/{userId}/submitter-access`; approval requires a
pending viewer and at least one valid competition scope, while scope replacement requires an
approved submitter. Sending `approved: false` revokes an approved submitter, removes every scope,
and retains the historical `approved` request decision.

Rejecting a pending request is a separate action:

```http
POST /api/v1/admin/users/{userId}/submitter-access/rejection
Authorization: Bearer <supabase-access-token>
```

Rejection keeps the account as a viewer, writes `rejected`, clears all scopes, and allows the user
to request again. Invalid lifecycle changes return `409 INVALID_SUBMITTER_ACCESS_TRANSITION` and
leave the account's role, request state, scopes, and audit fields unchanged.

### Public read

The following endpoints are available without authentication:

```text
GET /api/v1/competitions
GET /api/v1/competitions/{competitionId}
GET /api/v1/seasons
GET /api/v1/seasons/{seasonId}
GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}
GET /api/v1/fixtures/{fixtureId}/events
GET /api/v1/fixtures/{fixtureId}/events/{eventId}
GET /api/v1/fixtures/{fixtureId}/statistics
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}
GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}
GET /api/v1/participants
GET /api/v1/participants/{participantId}
GET /api/v1/participants/{participantId}/fixtures
```

See [Public Read API](public-read.md) for filters, pagination, deterministic ordering and example responses.

### Direct event submission

Approved submitters can send scoped, ordered cricket delivery events through:

```text
POST /api/v1/submissions
```

See [Direct Event Submissions](submissions.md) for the versioned request schema, provenance response,
validation errors, payload limit, and rate limit.

### Weather integration

The backend exposes the course-required runtime external API integration through:

```http
GET /api/v1/weather
```

The endpoint accepts documented location and date parameters, calls Open-Meteo server-side,
validates the provider response, applies a bounded timeout, and maps upstream failures to safe
application errors.

See [Weather API](weather.md) for the request parameters, response format, provider behaviour,
and current limitations.

## Required future API areas

- submission review, correction, and correction-history workflows;
- derived season, competition, and career statistics;
- filtered exports and versioned dataset releases;
- staged and resumable batch ingestion;
- statistic definitions and versions for the advanced tier;
- asynchronous jobs for large requests;
- API consumers, keys, quotas, rate limits, and usage; and
- change feeds and release differences for the advanced tier.

The OpenAPI specification is maintained alongside the implementation, with shared request and
response contracts covered by automated contract tests. Backend behaviour is implemented through
the handwritten Express API rather than generated database endpoints.

## AI Declaration

The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol]
and Codex[GPT-5].
