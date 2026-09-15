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
- Versioning: URI major version only; `v1` is supported at `/api/v1`, confirmed by the
  `API-Version: v1` response header, and unsupported major versions return
  `404 UNSUPPORTED_API_VERSION`

The version-controlled API contract is published in the
[OpenAPI specification](openapi.md).

## Live development API

The deployed Sprint 2 development backend is documented at:

- **Base URL:** <https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net>
- **Health check:** <https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net/api/v1/health>

The deployment guides and Sprint evidence retain the deployment/acceptance trail. Availability is
verified as part of milestone close-out rather than inferred from this documentation page.

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
    "requestedCompetition": {
      "competitionId": "7",
      "name": "Premier T20"
    },
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
Content-Type: application/json

{"competitionId":"7"}
```

A successful request validates and persists the selected competition and changes the authenticated
application account's server-owned approval state to `pending`:

```json
{
  "data": {
    "accountId": "42",
    "approvalState": "pending",
    "requestedCompetition": {
      "competitionId": "7",
      "name": "Premier T20"
    }
  }
}
```

The endpoint returns `401 Unauthorized` when no valid authentication is supplied and `422
Unprocessable Entity` when the body or competition identifier is invalid.

A `409 Conflict` is returned when the account already has a pending request, has the legacy
`approved` request state, or already holds the `submitter`/`admin` role. A previously rejected
viewer may submit a new request.

The requested competition and request state are stored on the provider-neutral application account
and exposed through `/api/v1/auth/me` and the administrator user list. They are not authorization
grants: approval must atomically assign `application_role = submitter` and grant exactly the stored
competition. The backend uses the authoritative role plus granted competition scope for submission
decisions.

### Administrator submitter-access decisions

Administrators can list active application users through:

```http
GET /api/v1/admin/users
Authorization: Bearer <supabase-access-token>
```

The endpoint is restricted to the `admin` role and provides the account state needed for
submitter-access review and administration. Each user includes the safe email address required by
the administration interface. The backend obtains this value with its server-only Supabase Admin
client and returns no provider metadata, credentials, or tokens. If that server-only configuration
is unavailable or the provider lookup fails, the endpoint returns a controlled `503` response.

Only an authoritative `admin` may manage another active, non-administrator account. Approval and
scope replacement use `PATCH /api/v1/admin/users/{userId}/submitter-access`; approval requires a
pending viewer and exactly the valid competition stored on that request, while scope replacement
for an approved submitter requires at least one valid competition. A legacy pending request without
a stored competition cannot be approved and must be rejected before the viewer submits a corrected
request. Sending `approved: false` revokes an approved submitter, removes every scope, and retains
the historical `approved` request decision.

Rejecting a pending request is a separate action:

```http
POST /api/v1/admin/users/{userId}/submitter-access/rejection
Authorization: Bearer <supabase-access-token>
```

An administrator may promote an active non-administrator through
`PATCH /api/v1/admin/users/{userId}/role` with `{"role":"admin"}`. The route validates the
role value server-side and prohibits self-management, disabled targets, and administrator
demotion. Direct `viewer` and `submitter` changes are rejected: those states must use the
submitter-access lifecycle so that approval and competition scopes remain consistent.

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
GET /api/v1/fixtures/{fixtureId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/events/export.csv
GET /api/v1/fixtures/{fixtureId}/statistics
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/statistics/{statisticId}/events/export.csv
GET /api/v1/competitors
GET /api/v1/competitors/{competitorId}
GET /api/v1/participants
GET /api/v1/participants/{participantId}
GET /api/v1/participants/{participantId}/fixtures
```

See [Public Read API](public-read.md) for filters, pagination, deterministic ordering and example responses.

### Direct event submission

Administrators can use the privileged legacy direct-import endpoint:

```text
POST /api/v1/submissions
```

See [Direct Event Submissions](submissions.md) for the versioned request schema, provenance response,
validation errors, payload limit, and rate limit.

### File event submission

```text
POST /api/v1/submissions/uploads
```

Administrators may use this legacy synchronous JSON/CSV import path. Ordinary submitter uploads
use the staged `/api/v1/batches` pipeline so validation and review occur before publication. See [Direct Event Submissions](submissions.md#file-uploads) for the
file types, CSV columns, limits, and errors.

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

### Consumer API keys

Administrators can issue, rotate and revoke external-consumer API keys. The keyed consumer surface
currently provides competition and fixture reads and applies consumer-wide request-rate and UTC daily
quota controls. See [Consumer API keys, rate limits and quotas](consumer-keys.md).

## Intermediate API areas

The Intermediate tier is implemented through the same handwritten `/api/v1` boundary and is included
in the version-controlled OpenAPI contract.

### Batch ingestion, review and publication

Whole-season and back-catalogue packages use the asynchronous batch API. The implemented surface
covers receipt, status, reports, report downloads, reference mapping, published-delivery conflict
resolution, reviewer decisions, correction resubmission and publication.

See [Batch ingestion receipt API](batches.md) for the lifecycle and authorisation rules.

### Corrections and audit history

Accepted delivery corrections create immutable revisions rather than overwriting published data.
Authorised users can submit a correction and retrieve the retained revision history.

See [Direct Event Submissions](submissions.md#correct-an-accepted-event) and
[Protected provenance and audit API](provenance.md).

### Participant aggregates

The public API derives season, competition and career aggregates from current accepted delivery
revisions:

```http
GET /api/v1/participants/{participantId}/statistics
GET /api/v1/participants/{participantId}/statistics/{statisticId}
```

See [Participant aggregate calculations](../statistics/participant-aggregates.md).

### Dataset releases

Administrators can queue immutable versioned dataset releases. Public consumers can discover release
metadata and download the exact checksum-backed JSON artifact.

See [Dataset exports](../data/dataset-exports.md).

### API consumer protections

Administrators can issue, rotate and revoke consumer API keys. Keyed consumer requests are protected
by configurable per-minute rate limits and durable UTC daily quotas.

See [Consumer API keys, rate limits and quotas](consumer-keys.md).

### Caching and response-time behaviour

Repeated fixture-statistics reads use a versioned 60-second server-side cache-aside path. Contributor
traces bypass the cache, and accepted changes advance the fixture version so stale cached statistics
are no longer reachable.

The reproducible workload, response-time targets and measurement commands are documented in
[Representative-scale API performance baseline](../development/performance-baseline.md).

The [OpenAPI specification](openapi.md) remains the authoritative request/response contract for all
implemented endpoints.

## Remaining future API areas

The following belong to later Advanced-tier work rather than the implemented Intermediate surface:

- analyst-defined statistic definitions, validation, sandboxing and versioning;
- late and out-of-order live-feed replay;
- bitemporal/as-of statistic queries and release comparisons;
- larger asynchronous analytical jobs and change-feed functionality where not already implemented
  for dataset-release generation.

## AI Declaration

The preceding API overview was reviewed and updated for the Intermediate implementation with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
