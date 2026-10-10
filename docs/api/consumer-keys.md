# Consumer API keys, rate limits and quotas

!!! note "Canonical access model"

    [ADR-016](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-016-api-consumer-access-model.md){ target="_blank" rel="noopener" }
    defines one canonical cricket-read hierarchy. Those reads accept anonymous requests or an
    optional valid consumer key. This page documents the requester-owned access lifecycle.

External integrations use the canonical `/api/v1/*` resource paths and may identify themselves
with a consumer key. The approved owner generates and manages credentials through the handwritten
management API. A raw secret is returned only by explicit owner generation or rotation. Store it in
the consumer's secret manager immediately.

## Requesting consumer access

An authenticated active user opens **Account → API access**, enters a consumer/application name and a
short intended-use description, and submits a request. One pending or approved request blocks
duplicates. A rejection grants no capability and permits a new request.

An administrator reviews pending requests under `/admin/api-consumers`. The review list resolves the
requesting account's display name and email for the administrator; the application account ID
remains backend ownership metadata rather than the primary review label. Approval records the
reviewer, timestamp and optional reason, creates a consumer owned by the requester, and assigns the
per-minute and daily limits. Approval does **not** generate a key. Rejection records the same audit
metadata without creating a consumer. The approved owner must return to **Account → API access** and
explicitly generate the first credential while present.

The raw key is shown only once when it is issued or rotated. The consumer must transfer and store it
as a secret, send it only in the `X-API-Key` request header, and never place it in a URL, query
string, browser-visible client bundle or log. Consumer keys identify requests to applicable
canonical reads and authorize documented consumer-only operations; they do not authorize
administrator, submission, batch or other application-authenticated operations.

## Management

Owner management operations require the owner's Supabase bearer token. Administrators separately
review requests, set limits, list consumers and revoke credentials; they never receive a raw key.

The frontend Administration area provides the routine workflow at
`/admin/api-consumers`: administrators review requests, inspect all consumers, adjust approved
limits and revoke an individual key. Owners generate, rotate, revoke and inspect usage from their
account area. The backend verifies ownership for every owner operation.

```http
POST /api/v1/account/api-access/requests
Authorization: Bearer <user-token>
Content-Type: application/json

{"name":"Partner dashboard","intendedUse":"Power a partner-facing match dashboard."}
```

After approval, `POST /api/v1/account/api-consumers/{consumerId}/keys` returns `data.apiKey`
exactly once. Subsequent account and administrator reads return only safe key metadata (ID, prefix,
creation time and revocation time), never the raw secret or its digest.

Owners rotate with `POST /api/v1/account/api-consumers/{consumerId}/keys/rotate` and revoke with
`DELETE /api/v1/account/api-consumers/{consumerId}/keys/{keyId}`. Rotation revokes every active key
before issuing the replacement. Revoked and unknown credentials return the same generic `401
API_KEY_UNAUTHORIZED` response.

The owner account area queries `GET /api/v1/account/api-consumers/{consumerId}/usage` with the
owner's bearer token. Owners select inclusive `from` and `to` UTC dates; the same 31-day maximum and
100-group cap used by administrator usage views apply.

The frontend keeps a raw generation or rotation response only in the current in-memory one-time-key
view. Dismissing or leaving that view discards the raw key; normal list and detail views use only the
safe metadata returned by the list operation. The frontend does not place keys in URLs, browser
storage, logs or analytics.

## Endpoint access classification

The API assigns every route to one of these access classes:

| Class                 | Surface                                                                           | Policy                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Canonical public read | Documented cricket-resource reads under `/api/v1/*`                               | Missing `X-API-Key` uses the bounded anonymous policy; a valid key selects the consumer policy and telemetry.          |
| Consumer-only         | `GET /api/v1/consumer/usage`                                                      | A valid active `X-API-Key`, per-consumer one-minute limit and UTC daily quota are required.                            |
| Internal/admin        | `/api/v1/admin/*`, submissions, batches, provenance and account-management routes | Supabase bearer authentication plus the documented application-role check. Consumer keys never authorize these routes. |

## Canonical requests

Use the canonical analytics paths, including:

```text
GET /api/v1/competitions
GET /api/v1/fixtures
GET /api/v1/fixtures/{fixtureId}/events
GET /api/v1/fixtures/{fixtureId}/events/export.json
GET /api/v1/fixtures/{fixtureId}/statistics
GET /api/v1/participants/{participantId}/statistics
```

The key does not change filters, pagination, ordering or response schemas. It changes only request
identification, limits, quota and usage accounting. If `X-API-Key` is absent, an applicable public
read is anonymous. If the header is supplied but malformed, unknown or revoked, the request returns
the generic `401 API_KEY_UNAUTHORIZED` response and never falls back to anonymous access.

The former `/api/v1/consumer/*` cricket-resource aliases remain temporarily available for
compatibility. They still require a key and return `Deprecation: ?1` plus a `successor-version`
`Link` to the canonical path while preserving the query string. No retirement date is approved, so
they do not send `Sunset`. New integrations must not use these aliases.

Send the key only in `X-API-Key`; never place it in a URL, browser-visible client bundle, query string or logs.

```http
GET /api/v1/fixtures
X-API-Key: sat_live_<secret>
```

When using the interactive OpenAPI client, select **Authorize** and paste only
the raw consumer key into the `apiKeyAuth` **Value** field. Do not include
`X-API-Key:` in the value; the client adds that request header automatically.

On consumer-only operations, a missing key also returns `401`. On canonical public reads, only a
missing header selects anonymous access. All supplied malformed, unknown and revoked secrets return
`401`, `WWW-Authenticate: ApiKey`, and no information about the matching consumer or key state.

## Consumer-self and administrator usage

`GET /api/v1/consumer/usage` returns an API key's **own consumer's** aggregated request
usage. It never accepts a consumer ID. `GET
/api/v1/admin/api-consumers/{consumerId}/usage` instead uses an application-user bearer token,
requires the `admin` role and applies the existing administrator-owner visibility rule before
reading telemetry. A missing and a non-visible consumer receive the same safe not-found response;
the administrator does not supply or recover the consumer's secret key.

Both operations use the same aggregation and window semantics. Results are grouped by UTC date,
normalized route template and HTTP status class, ordered by date descending, endpoint ascending
and status class ascending. Use `from` and `to` as inclusive `YYYY-MM-DD` dates; the default window
is the most recent seven UTC dates and the maximum is 31 days. `limit` defaults to 50 groups and is
capped at 100.

```http
GET /api/v1/consumer/usage?from=2026-09-20&to=2026-09-26&limit=50
X-API-Key: sat_live_<secret>
```

```http
GET /api/v1/admin/api-consumers/17/usage?from=2026-09-20&to=2026-09-26&limit=50
Authorization: Bearer <admin-token>
```

Telemetry records only the stable consumer ID, safe key ID, timestamp, normalized method/route
template and response status class. It never stores a raw key or hash, URL/query values, headers,
request body, credentials or response payload. Usage events are retained for 31 days, then removed
by scheduled operational cleanup. The current request becomes visible after its response completes;
the consumer-self response's `quota` context describes the request that retrieved the aggregate.
The administrator response instead provides the selected consumer's configured daily quota and
per-minute rate limit alongside historical totals. It does not claim a current remaining quota or
live rate-limit state. Neither response exposes raw keys, key hashes, credential headers, request
bodies, response payloads or raw query-string values, and the frontend never queries PostgreSQL
directly.

### Using a consumer key from WSL

If the issued consumer key is already stored in the `API_KEY` environment
variable in WSL, it can be copied directly to the Windows clipboard without
printing the secret in the terminal:

```bash
printf '%s' "$API_KEY" | clip.exe
```

## Policy and response metadata

Anonymous canonical reads use durable PostgreSQL fixed-minute counters: **30 requests per source
per minute** by default and a shared **600 requests per minute** platform budget. Since issue #924
the same counters also cover `POST /api/v1/query-definitions/evaluate`: it is a read expressed as a
POST, and it was the one public operation with no bound at all. The source is a
server-side HMAC of the trusted client address, never the raw address. Only explicitly configured
trusted-proxy hops may influence that address. Anonymous limiting fails closed with
`503 RATE_LIMIT_UNAVAILABLE`; an exceeded source or platform allowance returns `429
RATE_LIMIT_EXCEEDED`. Anonymous requests expose `RateLimit-*` and, when limited, `Retry-After`, but
do not receive consumer quota headers or telemetry. Omitting a key therefore provides only a small,
bounded public allowance rather than an unrestricted way around consumer policy.

Each consumer has a configurable fixed UTC-minute window (default **60 requests per minute**) and a durable UTC daily quota (default **10,000 limit-admitted requests per day**). Per-minute counter rows are held in PostgreSQL and atomically admitted, so one consumer limit applies across all active backend replicas, survives an individual replica restart, and resets at the next UTC minute boundary. Limits apply across all of a consumer's keys, so rotation cannot evade the policy. A request that exceeds either policy returns `429` with the `RateLimit-*` headers. A per-minute limit response (`RATE_LIMIT_EXCEEDED`) also includes `Retry-After`; a daily quota response (`QUOTA_EXCEEDED`) includes the `X-Quota-*` headers instead.

Consumer rate limiting is **fail closed**. If the shared PostgreSQL counter is unavailable, the API returns `503 RATE_LIMIT_UNAVAILABLE` and does not admit the request or consume daily quota. Consumers should retry with bounded backoff; they must not treat this response as an accepted request.

Every accepted keyed request exposes these safe values:

- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` for the one-minute window.
- `X-Quota-Limit`, `X-Quota-Remaining`, `X-Quota-Reset` for the UTC-day quota.

The metadata contains counts and reset times only; it does not expose raw keys, hashes, consumer names or internal account identifiers.

These safe response headers are exposed through CORS to approved browser
origins so browser-based API consumers can read the same rate-limit, quota and
retry metadata as direct HTTP clients.

## AI Declaration

The preceding consumer-key documentation was generated and edited with the assistance of Codex[GPT-5].
The issue #609 consumer filter and limit-header details were added with the assistance of Claude-Code[Claude Opus 5].
The issue #594 consumer-surface classification and protected aliases were added with the assistance of Codex[GPT-5].
The issue #595 shared rate-limit counter and failure-mode documentation was added with the assistance of Codex[GPT-5].
The issue #886 review recorded the issue #924 definition-evaluation endpoint against the same anonymous counters, with the assistance of Claude-Code[Claude Opus 5 (1M context)].
The issue #743 browser-client authentication and CORS response-header clarification was added with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #610 consumer usage documentation was added with the assistance of Codex[GPT-5].
The issue #775 administrator frontend workflow and current usage boundary were documented with the
assistance of Codex[GPT-5.6 Sol].
The issue #776 administrator per-consumer usage authorization, aggregation and privacy boundaries
were documented with the assistance of Codex[GPT-5.6 Sol].
The issue #783 external-consumer access-request and credential-handling guidance was documented with
the assistance of Codex[GPT-5].
The issue #820 current/future access-model boundary was documented with the assistance of
Codex[GPT-5].
The issue #821 canonical optional-key access model, anonymous protection and alias migration were
documented with the assistance of Codex[GPT-5].
metadata without creating a consumer. The approved owner must return to **Account → API access** and
