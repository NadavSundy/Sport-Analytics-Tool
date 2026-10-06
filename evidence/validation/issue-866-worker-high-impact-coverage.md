# Issue #866 Worker High-Impact Coverage Evidence

Date: 2026-10-06
Issue: #866
Branch: `test/866-worker-high-impact-coverage`
Starting commit: `02ec40a43b26a43b78d715cffb9d77b0c38bccfb` (`origin/main`)

## Baseline

The untouched baseline was measured after fetching authoritative Gitea `origin/main` and confirming
that the merged Issue #863 backend coverage work was present.

| Scope      |                 Lines |            Statements |            Functions |             Branches |
| ---------- | --------------------: | --------------------: | -------------------: | -------------------: |
| Worker     |  61.46% (1,021/1,661) |  58.81% (1,064/1,809) |     53.81% (141/262) |   54.84% (611/1,114) |
| Repository | 77.63% (9,066/11,678) | 76.33% (9,436/12,362) | 82.18% (2,408/2,930) | 70.45% (6,514/9,245) |

All 106 existing worker tests passed during the baseline coverage run. The live repository branch
counter was one lower than the historical issue description; the measured result is retained here.

## Final

| Scope      |                 Lines |            Statements |            Functions |             Branches |
| ---------- | --------------------: | --------------------: | -------------------: | -------------------: |
| Worker     |  82.90% (1,377/1,661) |  79.65% (1,441/1,809) |     82.82% (217/262) |   68.58% (764/1,114) |
| Repository | 80.68% (9,422/11,678) | 79.38% (9,813/12,362) | 84.77% (2,484/2,930) | 72.11% (6,667/9,245) |

Worker and repository line coverage each gained 356 covered lines without changing either
denominator. Worker line coverage increased by 21.44 percentage points; repository line coverage
increased by 3.05 percentage points. Frontend remained 81.61%, backend 76.21%, contracts 96.34%, and
batch-processing 89.29% lines.

## Per-file impact

| Worker production file          | Baseline lines | Final lines |
| ------------------------------- | -------------: | ----------: |
| `batch-validation-job.ts`       |         31.49% |      80.66% |
| `runtime-dependencies.ts`       |         28.57% |      96.42% |
| `database-delivery-receiver.ts` |         13.51% |     100.00% |
| `outbox-relay.ts`               |         61.70% |     100.00% |
| `batch-publication-job.ts`      |         67.36% |      67.36% |

`batch-publication-job.ts` remained unchanged because the preferred 82–85% worker range was reached
through the higher-priority validation, runtime-composition, database-delivery, and outbox-relay
paths. Its existing success and retry tests continued to pass.

## Tests added and changed

### Added

- `apps/worker/tests/batch-validation-job.test.ts` — six orchestration tests.
- `apps/worker/tests/database-delivery-receiver.test.ts` — six database-delivery tests.
- `apps/worker/tests/runtime-dependencies.azure.test.ts` — three Azure composition tests.

### Changed

- `apps/worker/tests/outbox-relay.test.ts` — four additional relay tests, for six total.

No production file was changed.

### Behaviours protected

- Batch validation command and shutdown guards before database access.
- Durable job claim, source lookup, object-store reads, reference-resolution orchestration, bounded
  chunk persistence, checkpoint/progress ordering, and final batch/job state persistence.
- Accepted-item aggregation and `awaiting_review` finalisation.
- Idempotent replay of an already completed validation delivery.
- Transient processing failure requeue and lease release without consuming the remaining retry
  budget; permanent invalid-source classification and terminal failure persistence.
- Fatal source-fault persistence and rejection when a package has no publishable items.
- Database transport's ordered `SKIP LOCKED LIMIT 1` claim, durable delivery context, acknowledgement,
  abandon, transactional dead-letter, rollback, safe bounded error detail, and shutdown.
- Outbox empty cycles, bounded claim parameters, stable message identity, publish-before-acknowledge
  sequencing, claim failures, downstream failures, best-effort lease release failures, retryability,
  duplicate start protection, and scheduled stop behaviour.
- Azure runtime pool bounds, managed-identity composition, separate private Blob containers,
  peek-lock receiver configuration, broker message mapping and settlement, health checks, sequential
  outbox sending, public-container rejection, and dependency cleanup.

The fakes retain the worker's actual orchestration, cricket validation, transaction/query sequencing,
state updates, and error classification. Only external package expansion/reference resolution,
PostgreSQL, Blob Storage, and Service Bus boundaries are deterministic.

## Remaining important worker gaps

- `batch-publication-job.ts` remains at 67.36%; additional valuable work would include terminal
  attempt exhaustion, already-finalised publication, lease contention, conflict/partial-publication
  final states, and malformed durable state.
- Validation paths not directly exercised through the new handler suite include checkpoint-state
  rehydration, lease contention, manual mapping application/failure, published duplicate/conflict
  classification, and integrated reviewer-onboarding finalisation. Their exported domain helpers retain
  the pre-existing focused coverage.
- `index.ts` and `logger.ts` remain at 0%; these are entrypoint/process and logging-adapter paths rather
  than the highest-value worker business orchestration.
- `azure-blob-object-store.ts` remains low because the runtime suite verifies provider composition and
  privacy checks while leaving Azure SDK stream semantics to the adapter boundary.

No unrelated production defect was changed. The frontend suite continues to emit pre-existing
`URIError: URI malformed` console diagnostics while still passing; this was visible in both baseline
and final repository coverage/check runs. The first `npm run check` attempt also encountered one
transient `ECONNRESET` in `tests/api/openapi.test.ts`; that file passed both tests in isolation, and the
complete unchanged `npm run check` rerun passed.

## Verification

| Command                                                                                 | Result                                                                                                                                                      |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:coverage --workspace=@sport-analytics/worker` (baseline)                  | PASS — 14 files, 106 tests; lines 61.46%, statements 58.81%, functions 53.81%, branches 54.84%                                                              |
| `npm run test:coverage` (baseline)                                                      | PASS — lines 77.63% (9,066/11,678), statements 76.33% (9,436/12,362), functions 82.18% (2,408/2,930), branches 70.45% (6,514/9,245)                         |
| Focused changed worker files                                                            | PASS — 4 files, 21 tests                                                                                                                                    |
| `npm run lint --workspace=@sport-analytics/worker`                                      | PASS                                                                                                                                                        |
| `npm run typecheck --workspace=@sport-analytics/worker`                                 | PASS                                                                                                                                                        |
| `npm run test:coverage --workspace=@sport-analytics/worker` (final)                     | PASS — 17 files, 125 tests; lines 82.90%, statements 79.65%, functions 82.82%, branches 68.58%                                                              |
| `npm run test:coverage` (final)                                                         | PASS — lines 80.68% (9,422/11,678), statements 79.38% (9,813/12,362), functions 84.77% (2,484/2,930), branches 72.11% (6,667/9,245)                         |
| First `npm run check`                                                                   | FAILED — unrelated OpenAPI endpoint test ended with `ECONNRESET`; all preceding structure, format, lint, typecheck, backend-unit, and frontend tests passed |
| `npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/openapi.test.ts` | PASS — 1 file, 2 tests; 75 ms test time                                                                                                                     |
| Final `npm run check`                                                                   | PASS — structure, formatting, every workspace lint/typecheck, all repository tests, OpenAPI lint, and all builds                                            |
| `npm run hygiene`                                                                       | PASS — Knip and Syncpack found no issues; dependency-cruiser found no violations across 388 modules and 1,353 dependencies                                  |
| `git diff --check`                                                                      | PASS                                                                                                                                                        |

## Integrity

The implementation introduced none of the following:

- coverage exclusions or coverage-ignore comments;
- changes to coverage include, thresholds, or denominator configuration;
- production-code deletion or restructuring for coverage;
- test-only production exports;
- weakened assertions;
- timeout increases;
- skipped or focused-only committed tests; or
- production behaviour changes.

No generated coverage output is retained in the change.

## Documentation

Only this required validation record was added. Product behaviour, setup, API contracts, database
schema, deployment, and security behaviour did not change, so canonical documentation required no
update.

## AI Declaration

This evidence record and the Issue #866 test implementation were produced with the assistance of
Codex[GPT-5]. Human review is pending.
