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

## Consumer requests

The currently keyed endpoints are:

```text
GET /api/v1/consumer/competitions
GET /api/v1/consumer/fixtures
```

Send the key only in `X-API-Key`; never place it in a URL, browser-visible client bundle, query string or logs.

```http
GET /api/v1/consumer/fixtures
X-API-Key: sat_live_<secret>
```

Missing, malformed, unknown and revoked secrets return `401`, `WWW-Authenticate: ApiKey`, and no information about the matching consumer or key state.

## Policy and response metadata

Each consumer has a configurable fixed-window rate limit (default **60 requests per minute**) and a durable UTC daily quota (default **10,000 limit-admitted requests per day**). Limits apply across all of a consumer's keys, so rotation cannot evade the policy. A request that exceeds either policy returns `429`; rate-limit responses include `Retry-After`.

Every accepted keyed request exposes these safe values:

- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` for the one-minute window.
- `X-Quota-Limit`, `X-Quota-Remaining`, `X-Quota-Reset` for the UTC-day quota.

The metadata contains counts and reset times only; it does not expose raw keys, hashes, consumer names or internal account identifiers.

## AI Declaration

The preceding consumer-key documentation was generated and edited with the assistance of Codex[GPT-5].
