# Issue #863 Backend High-Impact Coverage Evidence

Date: 2026-10-05  
Issue: #863  
Branch: `test/863-backend-high-impact-coverage`  
Starting commit: `a44fc0d8ca48b59312d1d712a6f5762e85e28822` (`origin/main`)

## Baseline

The untouched `origin/main` baseline was measured before adding tests.

| Scope      |                 Lines |            Statements |            Functions |             Branches |
| ---------- | --------------------: | --------------------: | -------------------: | -------------------: |
| Backend    |  60.85% (2,856/4,693) |  60.02% (2,919/4,863) |   65.00% (706/1,086) | 52.03% (1,712/3,290) |
| Repository | 67.77% (7,915/11,678) | 66.55% (8,228/12,362) | 72.52% (2,125/2,930) | 61.41% (5,678/9,245) |

The untouched backend test suite also passed with 720 tests: 451 unit tests and 269 API tests.

The repository-wide baseline differs from the historical figure in the issue because the latest authoritative `origin/main` measured `@sport-analytics/batch-processing` at 2.42% line coverage. The unmerged Issue #859 branch was not treated as part of the Issue #863 baseline.

## Final coverage

| Scope      |                 Lines |            Statements |            Functions |             Branches |
| ---------- | --------------------: | --------------------: | -------------------: | -------------------: |
| Backend    |  76.21% (3,577/4,693) |  75.52% (3,673/4,863) |   81.67% (887/1,086) | 67.08% (2,207/3,290) |
| Repository | 73.95% (8,636/11,678) | 72.65% (8,982/12,362) | 78.70% (2,306/2,930) | 66.76% (6,172/9,245) |

Backend line coverage increased by 15.36 percentage points and 721 covered lines. Repository-wide line coverage increased by 6.18 percentage points and 721 covered lines.

The other workspace line totals remained unchanged from the measured baseline: frontend 81.61% (3,472/4,254), worker 61.46% (1,021/1,661), contracts 96.34% (554/575), and batch-processing 2.42% (12/495). A one-branch variation in frontend instrumentation changed its branch count from 3,087 to 3,086 without any frontend source or test change.

## Test work

### Test files added

- `apps/backend/tests/unit/admin.repository.test.ts`
- `apps/backend/tests/unit/anonymous-access.repository.test.ts`
- `apps/backend/tests/unit/api-access.repository.test.ts`
- `apps/backend/tests/unit/api-consumer.repository.test.ts`
- `apps/backend/tests/unit/batch.repository.test.ts`
- `apps/backend/tests/unit/leaderboards.repository.test.ts`
- `apps/backend/tests/unit/participant-aggregates.snapshot.test.ts`
- `apps/backend/tests/unit/participant.repository.test.ts`
- `apps/backend/tests/unit/provenance.repository.test.ts`
- `apps/backend/tests/unit/public-entity.repositories.test.ts`
- `apps/backend/tests/unit/submission.repository.test.ts`

### Test files changed

- `apps/backend/tests/unit/dataset-release.repository.test.ts`

### Production files directly exercised

- Batch, submission, participant, provenance, administration, API-access, API-consumer, anonymous-access, and dataset-release repositories
- Participant aggregate snapshot persistence
- Leaderboard, competition, competitor, and season repositories

No production file was changed.

### Important behaviours protected

- Batch creation and row mapping; scoped lookup and keyset pagination; active-batch bounds; state, progress, count, report, item, rule, resolution, fixture, validation, review, publication, checkpoint, lease, retry, idempotency, provenance-link, and participant-onboarding operations
- Submission lookup plus accepted-submission and correction transactions, including authorization, reference and business validation, duplicate/conflict rollback, immutable revisions, replacement links, correction history, dependency refresh, and data-version updates
- Participant lookup, competition/season scoping, fixture history, pagination, deterministic ordering, empty results, missing participants, and bulk competitor mapping
- Provenance submission/source relationships, lifecycle and review decisions, event revisions, current-versus-historical mappings, correction history, nullable mappings, scopes, ownership, bounds, and missing records
- Participant aggregate snapshot reads and writes, scope keys, version/current/stale state, refresh claims, busy and untracked outcomes, invalidation, and failure recording
- Administrative user and scope mapping, exact-scope approval, rejection, promotion, conflicts, invalid scopes, missing records, and deterministic list results
- Consumer access requests, duplicate pending requests, ownership, approval conflicts, rejection state, consumer metadata, API-key issuance/rotation/revocation, active lookup, quotas, usage, and anonymous admission limits
- Dataset-release event pagination, immutable existing releases, generation jobs, failed-job retries, release/artifact retrieval, and deterministic listing
- Leaderboard ranking and bounds plus public competition, competitor, and season filtering, pagination, ordering, mapping, empty, and missing cases

### Largest measured file improvements

| Production file                      | Baseline lines |      Final lines |
| ------------------------------------ | -------------: | ---------------: |
| `participant.repository.ts`          |          0.00% |  100.00% (45/45) |
| `participant-aggregates.snapshot.ts` |          2.56% |   97.43% (76/78) |
| `provenance.repository.ts`           |          7.24% |   91.30% (63/69) |
| `admin.repository.ts`                |          1.26% |   84.81% (67/79) |
| `submission.repository.ts`           |          0.77% | 81.39% (105/129) |
| `batch.repository.ts`                |          1.13% | 33.48% (147/439) |

Additional final results were 100% for the dataset-release, leaderboard, competition, competitor, and season repositories; 95.23% for anonymous access; 83.92% for API access; and 79.66% for API consumers.

### Remaining uncovered backend areas

The largest remaining area is the advanced half of `batch.repository.ts`, especially canonical fixture and participant resolution, publication conflict handling, and the full publication loop. Other meaningful gaps include route/service orchestration around API access and public reads, stored-object and participant-aggregate repositories, natural-language analytics query persistence, and account-deletion persistence.

Defensive branches deliberately left uncovered are primarily impossible or database-corruption states, low-level query error propagation already provided by the shared executor, and advanced batch publication combinations that require substantially larger fixtures. They were not replaced with line-execution-only tests after the 75% acceptance threshold was safely exceeded.

## Verification

| Command                                                                                                     | Result                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test --workspace=@sport-analytics/backend` (untouched baseline)                                    | PASS — 46 unit files/451 tests and 27 API files/269 tests; 720 total                                                                                                                                     |
| `npm run test:coverage --workspace=@sport-analytics/backend` (untouched baseline)                           | PASS — backend lines 60.85%, statements 60.02%, functions 65.00%, branches 52.03%                                                                                                                        |
| `npm run test:coverage` (untouched baseline)                                                                | PASS — repository lines 67.77%, statements 66.55%, functions 72.52%, branches 61.41%                                                                                                                     |
| Focused repository test runs during development                                                             | PASS                                                                                                                                                                                                     |
| `npm run lint --workspace=@sport-analytics/backend`                                                         | PASS                                                                                                                                                                                                     |
| `npm run typecheck --workspace=@sport-analytics/backend`                                                    | PASS                                                                                                                                                                                                     |
| `npm run test:coverage --workspace=@sport-analytics/backend` (final)                                        | PASS — 84 files/804 tests; backend lines 76.21%, statements 75.52%, functions 81.67%, branches 67.08%                                                                                                    |
| `npm run test:coverage` (final)                                                                             | PASS — repository lines 73.95%, statements 72.65%, functions 78.70%, branches 66.76%                                                                                                                     |
| `npx vitest run tests/api/public-read.test.ts -t "exports every filtered fixture event, not a single page"` | PASS — 1 selected test in 46 ms; run unchanged after the first full check encountered a transient 5-second timeout in this pre-existing test                                                             |
| `npm run check`                                                                                             | PASS — structure, formatting, all-workspace lint and type checks, 535 backend unit tests, repository test suites, OpenAPI lint, and builds passed on the final tree; no timeout or logic change was made |
| `npm run hygiene`                                                                                           | PASS — Knip, Syncpack, and dependency-cruiser reported no issues or dependency violations (386 modules, 1,346 dependencies)                                                                              |

## Integrity

The implementation introduced none of the following:

- coverage exclusions;
- coverage ignore comments or directives;
- changes to coverage include or denominator configuration;
- production restructuring for coverage;
- private/helper exports solely for tests;
- weakened assertions;
- skipped or focused-only tests; or
- production behaviour changes.

The new tests use deterministic query-executor fakes and semantic assertions at the existing database boundary. They do not connect to a development or production database. No unrelated defect requiring a production change was discovered.

## Documentation

This evidence record captures the new measured coverage state. The canonical testing guide contains strategy and commands rather than live coverage figures, so it did not require a change. Historical audit evidence remains unchanged.

## AI Declaration

This evidence record and the Issue #863 test implementation were produced with the assistance of Codex[GPT-5]. Human review is pending.
