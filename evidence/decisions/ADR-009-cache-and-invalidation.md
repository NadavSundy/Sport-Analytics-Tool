# ADR-009: Measured cache-aside reads with versioned invalidation

- **Status:** Proposed
- **Date:** 2026-08-21
- **Participants:** Dean Feldman (document owner); project team (review requested)
- **Related issue:** #55

## Context

PostgreSQL is the source of truth for accepted event revisions, statistic definitions, derived
results, and public reference data. The current application does not have evidence that a separate
cache is needed. Adding one prematurely would introduce another service, cost, failure mode, and
consistency boundary.

The later-tier architecture nevertheless needs a compatible cache policy before implementations
invent unrelated key formats or treat cached data as authoritative. Corrections are particularly
sensitive: a cached result based on a superseded event or statistic-definition version must not be
presented as current.

## Decision

### Adoption gate

Do not provision a distributed application cache by default. First optimise query shape and indexes,
then measure representative production-like reads. Introduce caching only for a named hot path with:

- a recorded latency or database-load baseline;
- a target service-level objective;
- a demonstrated benefit from caching; and
- an owner, freshness bound, and invalidation test.

When that gate is met, use **Azure Managed Redis** behind a backend-owned `CacheStore` adapter. Do
not create new Azure Cache for Redis instances because Microsoft is retiring that service. The API
and workers remain correct when Redis is empty or unavailable.

### Read and write policy

Use cache-aside for public, reproducible read models such as published fixture statistics and stable
reference lists:

1. Construct a canonical versioned key.
2. Read Redis.
3. On a miss, read the authoritative PostgreSQL projection.
4. Cache the serialised response with a bounded TTL and return it.

Application writes never update only the cache. An accepted event, correction, definition change,
or completed recalculation commits its authoritative state and a targeted invalidation event in the
same PostgreSQL transaction. The background-job outbox from ADR-010 delivers that event after
commit. Consumers delete affected keys or advance the relevant data version; a later read then
repopulates the cache.

TTL is a recovery bound, not the primary consistency mechanism. It limits the lifetime of an entry
if invalidation delivery is delayed. TTLs must include random jitter so a large key set does not
expire simultaneously.

### Key and value rules

Keys are constructed only by the cache adapter and follow this logical shape:

```text
sat:<environment>:<contract-version>:<resource>:<scope>:<data-version>:<definition-version>:<query-hash>
```

- `scope` is a stable fixture, season, competition, participant, or reference-data identifier.
- `data-version` changes when an accepted input revision affecting that scope changes.
- `definition-version` identifies the calculation rules used by a derived value.
- `query-hash` is made from a canonical allow-listed filter representation, never raw unbounded
  request text.
- values contain the same validated response shape returned by the API plus creation and expiry
  metadata.

Cache only complete published projections. Do not cache bearer tokens, credentials, pending
submissions, administrator views, authorisation decisions, mutable job status, or responses whose
visibility depends on a user's current role or scope. Small per-process memoisation may be used only
for immutable configuration and must not be treated as cross-instance invalidation.

Public HTTP responses may additionally use `ETag` and deliberate `Cache-Control` directives. Browser
or CDN caching does not replace server-side version checks and must use the same freshness policy.

### Failure and operations

- Redis timeouts are short and fail open to PostgreSQL for reads.
- A cache failure does not fail an authoritative write.
- Misses for the same expensive key are coalesced or protected by a short bounded fill lock where
  measurements show a stampede risk.
- Metrics include hit ratio, miss/fill latency, fallback count, invalidation lag, errors, evictions,
  and memory use.
- A reconciliation task compares recent authoritative version changes with invalidation progress and
  can purge a resource namespace safely.
- Redis credentials stay server-side; managed identity and private networking are preferred when
  the selected Azure tier and deployment environment support them.

## Alternatives considered

### Cache every public response immediately

Rejected because there is no current performance evidence, it increases cost, and it creates stale
data risks before invalidation and observability exist.

### In-process memory cache

Rejected as the shared cache because Azure App Service can restart or scale to multiple instances.
Each instance would hold different values and invalidation would be unreliable. It remains acceptable
for immutable configuration that is safe to reconstruct.

### PostgreSQL materialized views only

Useful for expensive relational projections and should be evaluated before Redis. They do not remove
database read load and require their own refresh policy, so they are not a complete low-latency cache
strategy.

### Write-through caching

Rejected for the initial implementation because it makes an optional cache part of the write path
and requires cross-service consistency repair. Cache-aside keeps PostgreSQL authoritative and allows
the application to operate without Redis.

### Azure Cache for Redis

Rejected for new deployment because its Basic, Standard, and Premium tiers are scheduled for
retirement on 30 September 2028. Azure Managed Redis is the supported Azure direction.

## Advantages

- Adds operational cost only after a measured need exists.
- Keeps all cached values disposable and reproducible from PostgreSQL.
- Versioned keys prevent results from different data or formula versions colliding.
- Targeted invalidation and bounded TTLs address corrections without global flushes.
- The adapter keeps provider-specific Redis code out of domain services.

## Disadvantages and risks

- Cache invalidation remains eventually consistent between transaction commit and outbox delivery.
- Redis adds cost, networking, credentials, monitoring, and cluster-client configuration.
- Poor key cardinality or TTL choices can waste memory or overload PostgreSQL during misses.
- Fail-open fallback can amplify database load during a cache outage and needs rate limits and
  capacity monitoring.
- A missed dependency mapping can leave a stale projection until its TTL expires; automated
  invalidation and reconciliation tests are mandatory.

## Consequences

- New read endpoints start without Redis and record measurements before opting in.
- Statistic and event changes expose resource/data versions suitable for keys and invalidation.
- ADR-010's transactional outbox carries cache invalidation alongside recalculation work.
- Cache-specific environment variables and infrastructure are added only with the first approved
  cached path, not as unused placeholders.
- If the team later selects a non-Azure cache provider, it must preserve this failure, versioning,
  invalidation, and observability contract or supersede this ADR.

## Verification and review date

The project team must review this proposal in the Pull Request for #55. Review again before the
first cached endpoint is merged and at least once after representative load testing. Verification
must prove cache-disabled correctness, hit/miss equivalence, correction invalidation, delayed-event
reconciliation, TTL expiry, stampede behaviour, Redis-outage fallback, and the absence of private or
authorisation-sensitive cache entries.

Before merge, record the reviewer and review evidence in the Pull Request and change this record to
`Accepted` only if the proposal is approved without an unresolved architectural objection.

## References considered

- [Azure Managed Redis overview](https://learn.microsoft.com/en-us/azure/redis/overview)
- [Azure Cache for Redis retirement FAQ](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/retirement-faq)
- [Azure write-through caching architecture and cache-aside alternative](https://learn.microsoft.com/en-us/azure/architecture/databases/architecture/write-through-caching-azure-sql-managed-redis)

## AI Declaration

This decision record was drafted and reconciled with the repository with the assistance of
Codex[GPT-5].
