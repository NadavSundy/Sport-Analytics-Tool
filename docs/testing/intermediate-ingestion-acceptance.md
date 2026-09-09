# Intermediate ingestion integrated acceptance

Issue #364 is the final verification exercise for the Intermediate ingestion path. It does not add a
new ingestion format or workflow. It proves that the already implemented API, database, worker,
review, correction, provenance and frontend behaviors operate together and records any narrowly
scoped defects found during the exercise.

## Automated verification command

Run from the repository root after installing dependencies and before opening the Issue #364 pull
request:

```powershell
npm.cmd run verify:intermediate-ingestion
```

The command runs the contracts, backend unit/API, worker, frontend, PostgreSQL integration and
focused browser journeys that exercise the ingestion path, followed by OpenAPI validation. It also
checks that the retained Intermediate architecture/operations evidence exists and statically rejects
worker log calls that add payload, credential or private-storage fields.

Run the normal repository gate as well:

```powershell
npm.cmd run ci:local
```

The dedicated verifier is an acceptance harness; it does not replace the repository methodology or
normal change-aware CI.

## Hosted acceptance workflow

The same harness is available through the manual Gitea Actions workflow:

```text
Intermediate Ingestion Acceptance
```

It is deliberately `workflow_dispatch`-only. Ordinary Pull Requests continue to use the existing
change-aware `Sport Analytics CI / quality` gate, and pushes to `main` remain deployment-only after
that gate. The acceptance workflow therefore does not make every ingestion-related change rerun the
entire Intermediate exercise.

The hosted job follows the repository's existing runner/browser conventions instead of introducing a
second CI policy:

- Ubuntu 24.04 and Node.js 22;
- one `npm ci` in one job, avoiding repeated checkout/install work across acceptance lanes;
- the pinned Playwright 1.62.1 Chromium cache key already used by normal browser CI;
- two Playwright workers, matching the measured shared-runner setting;
- one production frontend build reused by the focused browser journeys with
  `PLAYWRIGHT_REUSE_BUILD=1`; and
- the repository's disposable PostgreSQL 16 integration-test runtime.

The workflow does not deploy, generate duplicate coverage, or replace the required Pull Request
quality status. Use it for milestone/final acceptance, after a material ingestion change when a full
cross-layer regression is warranted, or when a hosted reproduction of the local verifier is useful.
The Gitea run log is acceptable hosted execution evidence; record its run reference in the Issue #364
validation record when used.

## Issue #364 acceptance map

| Requirement                                                          | Verification source                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole-season upload without database IDs                             | `packages/contracts/src/tests/season-upload.test.ts`; the versioned package accepts readable/source references without application IDs. Guided season and catalogue upload are covered by `SubmissionPage.test.tsx` and `tests/e2e/submissions.spec.ts`.                                                       |
| Back catalogue/proposed fixtures stage safely                        | Unknown fixture/reference outcomes remain unresolved staged evidence in `packages/batch-processing/src/reference-resolver.ts`; worker/package and database report tests verify no canonical record is silently created.                                                                                        |
| Complete actionable invalid-event report                             | `apps/backend/tests/database/batch.repository.database.test.ts`, `apps/backend/tests/unit/batch.service.test.ts`, `apps/backend/tests/api/batches.test.ts` and the file-validation browser journey verify grouped faults, source row/field locations, pagination and complete report download.                 |
| Ambiguous participants require mapping                               | Season-upload contracts require explicit resolution; batch service/API and the guided browser journey verify labeled opaque candidates and explicit mapping decisions.                                                                                                                                         |
| Equivalent re-upload is idempotent                                   | `apps/backend/tests/unit/batch.service.test.ts` and batch repository database tests verify same key + same checksum returns the original receipt and concurrent equivalent requests create one batch/job. Publication replay is a no-op.                                                                       |
| Changed content under one idempotency key is rejected                | Batch service tests verify same key + changed checksum returns `BATCH_CONFLICT`.                                                                                                                                                                                                                               |
| Validation/publication recover after termination                     | `apps/worker/tests/delivery-pump.test.ts` proves transient delivery redelivery and bounded drain behavior; validation checkpoints are durable; `batch.repository.database.test.ts` proves expired publication leases are reclaimed; the operational restart procedure is in `docs/deployment/azure-worker.md`. |
| Concurrent workers do not duplicate work                             | Validation uses a live lease and delivery redelivery; publication repository tests reject a competing live owner and make completed replays deterministic no-ops.                                                                                                                                              |
| Staged data is private before approval                               | Batch database tests assert no delivery exists before approval and publication is rejected before review. Public routes are unchanged by staging.                                                                                                                                                              |
| Approval publishes intended accepted items; rejection publishes none | Batch repository tests verify accepted-only publication, rejection/return-for-correction with no canonical writes, review blockers and idempotent decisions.                                                                                                                                                   |
| Corrections retain history and refresh statistics                    | Submission database/API and `tests/e2e/corrections.spec.ts` verify immutable revisions and refreshed dependent statistics.                                                                                                                                                                                     |
| Statistic-to-submitter provenance                                    | Issue #363 protected provenance APIs/tests and `evidence/validation/issue-363-provenance.md`.                                                                                                                                                                                                                  |
| Representative-scale throughput                                      | Record the actual season-scale run and approved threshold in `evidence/validation/issue-364-intermediate-ingestion-acceptance.md`. Historical throughput context is retained in `docs/architecture/batch-ingestion-pipeline.md`; do not substitute parser-only timing for the integrated result.               |
| No payloads or credentials in logs                                   | Worker logger accepts deliberately safe scalar fields; the #364 verifier rejects sensitive ingestion field names in structured worker log calls. Security/retention boundaries remain documented.                                                                                                              |
| Accessibility/responsiveness                                         | Focused Playwright submission/review/correction journeys plus normal `ci:local` accessibility coverage.                                                                                                                                                                                                        |
| Formal user testing                                                  | Reuse #417 and #418 evidence. #364 must not claim completion until those records demonstrate representative users can complete the workflow without schema knowledge.                                                                                                                                          |
| Documentation current                                                | Architecture, API, database, worker deployment, security, testing and user-facing submission/review docs are part of the #364 review and strict MkDocs build.                                                                                                                                                  |

## Intermediate project-brief traceability

The project-specific Intermediate brief requires more than batch receipt mechanics. The final
acceptance record therefore also links the following already implemented requirements instead of
silently narrowing Intermediate to ingestion alone.

| Intermediate brief requirement                                             | Current verification evidence                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Whole-season/back-catalogue staged batch pipeline, retry/resume and review | Batch/worker tests above; batch ingestion architecture; Azure worker recovery procedure.                                  |
| Impossible/conflicting validation and correction history                   | Versioned cricket validation (#282), reference resolver tests, immutable correction tests.                                |
| Season/career/competition aggregates                                       | `participant-aggregates` unit/API/database tests and `docs/statistics/participant-aggregates.md`.                         |
| Dependency-aware recomputation                                             | `apps/backend/tests/unit/recomputation-dependencies.test.ts` and correction/statistics database tests.                    |
| Reference-result correctness                                               | `reference-fixture.database.test.ts`, `reference-figures.database.test.ts`, and `docs/development/reference-fixtures.md`. |
| Representative scale and response-time targets                             | #289/#290 validation evidence and `docs/development/performance-baseline.md`.                                             |
| API versioning                                                             | `docs/api/versioning.md`, OpenAPI `/api/v1` contract and contract/API tests.                                              |
| Consumer keys, rate limits and quotas                                      | `api-consumers` API/database tests and `docs/api/consumer-keys.md`.                                                       |
| Cache repeated reads                                                       | `evidence/validation/issue-293-cache-performance.md` and fixture-statistics cache tests.                                  |
| Versioned reproducible dataset releases with schema/checksum               | `dataset-releases` API tests, release persistence and dataset documentation/OpenAPI contracts.                            |

## External close-out gates

Two criteria cannot be honestly manufactured by this patch:

1. **#417/#418 formal user testing.** The current repository snapshot contains the testing pipeline,
   but the imported response store is empty. Link the completed generated/session evidence once those
   issues are executed.
2. **Integrated season throughput.** Run a representative package through the real staged worker path,
   record fixture/event count, elapsed validation/publication time, environment and approved target,
   and retain the result in the Issue #364 validation record.

Do not close #364 until both are present. A pull request may be opened earlier for the verification
harness and documentation if these dependencies are still in progress.

AI Declaration: The preceding page was planned and generated with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
