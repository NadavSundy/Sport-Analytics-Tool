# Issue #805 final automated test and coverage audit

**Date:** 2026-10-04  
**Candidate:** `test/805-final-automated-audit` from `8c932ca58`

## Inventory and observed results

| Area                                | Command or evidence                                                         | Observed result                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend unit                        | `npm.cmd run test:unit`                                                     | 45 files; 435 tests passed.                                                                                                                 |
| Frontend unit/component/integration | `npm.cmd exec --workspace=@sport-analytics/frontend -- vitest run --silent` | 37 files; 386 tests passed.                                                                                                                 |
| API                                 | `npm.cmd run test:api`                                                      | 26 files; 261 tests passed.                                                                                                                 |
| API contract                        | `npm.cmd run test:api-contract`                                             | 6 files; 89 tests passed.                                                                                                                   |
| Shared contracts                    | `npm.cmd run test:contracts`                                                | 17 files; 292 tests passed.                                                                                                                 |
| Worker/batch processing             | `npm.cmd run test:worker`; direct package regression run                    | Worker suite was run; the direct batch-processing regression suite passed 2 tests.                                                          |
| Database integration                | `npm.cmd run test:database`                                                 | 38 files and 277 tests passed; 1 file and 2 tests skipped. Isolated disposable PostgreSQL 16 applied all migrations and deterministic seed. |
| E2E/accessibility                   | `npm.cmd run test:e2e`                                                      | Playwright `test-results/.last-run.json` recorded `status: passed`, with no failed tests.                                                   |
| Deployment/infrastructure           | `npm.cmd run test:deployment`                                               | 46 passed; 0 failed, skipped, cancelled, or todo.                                                                                           |
| CI routing and coverage gates       | `npm.cmd run test:ci-routing`                                               | 69 passed; 0 failed, skipped, cancelled, or todo.                                                                                           |

The worker command outlived the terminal-stream attachment in this local runner, so its final Vitest total was not captured. The direct package regression suite is recorded separately. The database command was rerun with its process exit code captured and completed successfully.

## Coverage

`npm.cmd run test:coverage` completed and wrote `coverage/combined/summary.txt` using the repository's counter-based aggregation.

| Workspace        |      Lines | Statements |  Functions |   Branches |
| ---------------- | ---------: | ---------: | ---------: | ---------: |
| frontend         |     82.31% |     80.85% |     86.75% |     75.68% |
| backend          |     61.70% |     61.01% |     67.67% |     52.60% |
| worker           |     61.46% |     58.81% |     53.81% |     54.84% |
| contracts        |     96.56% |     96.60% |     97.18% |     90.41% |
| batch-processing |      2.42% |      2.46% |      3.57% |      0.90% |
| **combined**     | **68.18%** | **67.02%** | **73.55%** | **61.69%** |

No threshold was configured locally, so the existing policy correctly reported the metrics as informational. The coverage strategy regression suite passed 9 tests, including configuration parsing and rejection when a configured threshold is missed, source inclusion, artifact failure, CI routing, and non-masking frontend execution.

## Gaps found and actions

- The included `batch-processing` workspace had no direct tests and began at 0% coverage. A new package-level regression test protects authoritative cache-version write ordering, duplicate handling, and empty-set no-op behaviour. It raises the workspace line coverage to 2.42% and its `statistics-refresh.ts` coverage to 33.33%.
- The new source test exposed compiled `dist/**` test-artifact discovery during coverage. `packages/batch-processing/vitest.config.ts` now excludes generated `dist/**`; the coverage strategy test locks that contract.
- Two flaky frontend tests were reproducibly failing: a lazy homepage chunk could miss its assertion window, and a deferred public-collection resolver could be invoked before its request started. The tests now preload the intended lazy chunk or await the request respectively; the focused 39-test run and the complete 386-test frontend suite passed.

No coverage threshold was reduced, no suite was skipped, and no retry was introduced.

## Remaining concern

The batch-processing workspace remains the largest coverage weakness: `batch-publication.ts` and `reference-resolver.ts` are still largely uncovered by direct package tests. This audit adds the highest-value shared cache-version path; broader publication and resolver unit coverage should be a follow-up rather than changing the established threshold policy in this close-out issue.

## AI Declaration

This audit evidence, test stabilisation, package regression test, and coverage-configuration repair were produced with the assistance of Codex[GPT-5].
