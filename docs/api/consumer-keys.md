# Consumer API keys, rate limits and quotas

External integrations use the consumer surface rather than the anonymous public-read surface. An administrator issues and manages keys through the handwritten management API; a raw secret is returned only by the issue and rotation responses. Store it in the consumer's secret manager immediately.

## Management

All management operations require an administrator's Supabase bearer token.

```http
POST /api/v1/admin/api-consumers
Authorization: Bearer <admin-token>
Content-Type: application/json

{"name":"Partner dashboard","rateLimitPerMinute":60,"dailyQuota":10000}
```

The `201` response contains `data.apiKey` exactly once. Subsequent `GET /api/v1/admin/api-consumers` responses return only safe key metadata (ID, prefix, creation time and revocation time), never the raw secret or its digest.

Rotate a consumer key with `POST /api/v1/admin/api-consumers/{consumerId}/keys/rotate`. Rotation revokes every active key for that consumer before issuing the replacement. Revoke an individual key immediately with `DELETE /api/v1/admin/api-consumers/{consumerId}/keys/{keyId}`. Both actions make the old key return the same generic `401 API_KEY_UNAUTHORIZED` result as an unknown key.

## Endpoint access classification

The API assigns every route to one of these access classes:

| Class                  | Surface                                                                           | Policy                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Public anonymous       | Health, authentication and weather routes, plus the documented public-read API    | No consumer key, quota or consumer rate-limit accounting. These routes are for the public product surface, not consumer-only capabilities. |
| Authenticated consumer | Every route below `/api/v1/consumer`                                              | A valid active `X-API-Key`, per-consumer one-minute limit and UTC daily quota are required.                                                |
| Internal/admin         | `/api/v1/admin/*`, submissions, batches, provenance and account-management routes | Supabase bearer authentication plus the documented application-role check. Consumer keys never authorize these routes.                     |

## Consumer requests

Every consumer route is key-protected. The protected analytics surface is:

```text
GET /api/v1/consumer/competitions
GET /api/v1/consumer/fixtures
GET /api/v1/consumer/fixtures/{fixtureId}
GET /api/v1/consumer/fixtures/{fixtureId}/events
GET /api/v1/consumer/fixtures/{fixtureId}/events/export.json
GET /api/v1/consumer/fixtures/{fixtureId}/events/export.csv
GET /api/v1/consumer/fixtures/{fixtureId}/events/{eventId}
GET /api/v1/consumer/fixtures/{fixtureId}/statistics
GET /api/v1/consumer/fixtures/{fixtureId}/statistics/{statisticId}
GET /api/v1/consumer/fixtures/{fixtureId}/statistics/{statisticId}/events/export.json
GET /api/v1/consumer/fixtures/{fixtureId}/statistics/{statisticId}/events/export.csv
GET /api/v1/consumer/participants/{participantId}/statistics
GET /api/v1/consumer/participants/{participantId}/statistics/{statisticId}
```

The list routes accept `limit` and `cursor`, and the same filters as their public counterparts: `name` for competitions, and `competitionId`, `seasonId`, `competitorId`, `gender`, `startDateFrom` and `startDateTo` for fixtures. The fixture/event/statistics/export aliases use the same parameters and payloads as their public-read counterparts. An invalid parameter or cursor returns `400`.

There is no unprotected alternate route under `/consumer`: all consumer aliases use the same authentication middleware and the same per-consumer rate-limit state. A consumer therefore cannot avoid its limit by changing from a fixture list to an event, statistic or export read.

Send the key only in `X-API-Key`; never place it in a URL, browser-visible client bundle, query string or logs.

```http
GET /api/v1/consumer/fixtures
X-API-Key: sat_live_<secret>
```

Missing, malformed, unknown and revoked secrets return `401`, `WWW-Authenticate: ApiKey`, and no information about the matching consumer or key state.

### Using a consumer key from WSL

If the issued consumer key is already stored in the `API_KEY` environment
variable in WSL, it can be copied directly to the Windows clipboard without
printing the secret in the terminal:

```bash
printf '%s' "$API_KEY" | clip.exe
```

## Policy and response metadata

Each consumer has a configurable fixed UTC-minute window (default **60 requests per minute**) and a durable UTC daily quota (default **10,000 limit-admitted requests per day**). Per-minute counter rows are held in PostgreSQL and atomically admitted, so one consumer limit applies across all active backend replicas, survives an individual replica restart, and resets at the next UTC minute boundary. Limits apply across all of a consumer's keys, so rotation cannot evade the policy. A request that exceeds either policy returns `429` with the `RateLimit-*` headers. A per-minute limit response (`RATE_LIMIT_EXCEEDED`) also includes `Retry-After`; a daily quota response (`QUOTA_EXCEEDED`) includes the `X-Quota-*` headers instead.

Consumer rate limiting is **fail closed**. If the shared PostgreSQL counter is unavailable, the API returns `503 RATE_LIMIT_UNAVAILABLE` and does not admit the request or consume daily quota. Consumers should retry with bounded backoff; they must not treat this response as an accepted request.

Every accepted keyed request exposes these safe values:

- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` for the one-minute window.
- `X-Quota-Limit`, `X-Quota-Remaining`, `X-Quota-Reset` for the UTC-day quota.

The metadata contains counts and reset times only; it does not expose raw keys, hashes, consumer names or internal account identifiers.

## AI Declaration

The preceding consumer-key documentation was generated and edited with the assistance of Codex[GPT-5].
The issue #609 consumer filter and limit-header details were added with the assistance of Claude-Code[Claude Opus 5].
The issue #594 consumer-surface classification and protected aliases were added with the assistance of Codex[GPT-5].
The issue #595 shared rate-limit counter and failure-mode documentation was added with the assistance of Codex[GPT-5].
