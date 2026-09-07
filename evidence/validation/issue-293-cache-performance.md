# Issue #293 cache performance evidence

## Scope

The cacheable workload is the public, repeated
`GET /api/v1/fixtures/{fixtureId}/statistics` response without contributor traces. Issue #289 names
this as the representative statistic workload; contributor traces remain uncached because they are
explicit audit requests rather than repeated browse reads.

## Repeat-work comparison

`apps/backend/tests/unit/fixture-statistics.service.test.ts` performs two identical requests against
one fixture source.

| Path               | Authoritative fixture-source derivations | Cache writes | Result                                                           |
| ------------------ | ---------------------------------------: | -----------: | ---------------------------------------------------------------- |
| Before cache-aside |                                        2 |            0 | Each repeated request performs derivation.                       |
| After cache-aside  |                                        1 |            1 | First request derives and stores; second request is a cache hit. |

This count is the relevant implementation-level performance result: a hit avoids every source-load
and cricket-statistic derivation operation. It deliberately does not claim a wall-clock API result,
which depends on the local database and network. The existing representative API timing command in
`docs/development/performance-baseline.md` remains the way to collect deployment-specific latency.

## Correctness and expiry

The database integration suite creates a version-41 fixture cache entry, applies a correction, and
asserts version 42 with zero remaining cache entries. The entry key also contains the version, so a
prior value is unreachable even if deletion cannot complete. A 60-second expiry is the recovery bound
for an unexpected writer that misses version advancement.

## Commands and results

On 2026-09-07, the focused cache unit/API tests passed 6 of 6. The disposable PostgreSQL suite
passed 134 tests with 1 opt-in performance-plan test skipped. The cache migration applied before
the suite and batch, direct-submission, and correction paths were included in compilation and tests.

## AI Declaration

This validation record was prepared with the assistance of Codex[GPT-5].
