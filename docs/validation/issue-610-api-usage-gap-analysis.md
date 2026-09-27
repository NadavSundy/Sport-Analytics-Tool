# Issue #610: per-consumer API usage gap analysis

## Audited baseline

Issue #594 already provides stable consumer and key identity, active-key authentication,
consumer-wide daily quotas and shared minute rate limits for every `/api/v1/consumer` route.
It deliberately stores only quota/rate-limit counters, however: it has no normalized endpoint
telemetry and no consumer-authenticated way to inspect prior usage.

## Smallest capability added

`GET /api/v1/consumer/usage` is the smallest useful addition. It uses the existing API-key
authentication path, derives ownership solely from the authenticated consumer, and reports a
bounded, deterministic aggregate grouped by UTC date, normalized route template and status class.
There is no consumer-ID parameter and no administrative read endpoint.

Usage recording persists only consumer ID, safe key ID, timestamp, method/route template and status
class. It deliberately excludes raw keys, hashes, headers, bodies, query values, raw URLs and
responses. The aggregation uses two fixed set-based queries (a total and a grouped page), never an
N+1 query. A 31-day retention boundary is documented for scheduled cleanup.

## Gate status

#594 is closed. #598 remains open; development proceeded only on the user's explicit direction.
#612 remains an open user-feedback closure gate and must be completed by representative users on a
deployed build; this implementation does not claim that testing or close #610.
