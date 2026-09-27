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

## Pull Request merge gate

Intermediate ingestion acceptance is integrated into the existing **Sport Analytics CI** workflow.
There is no second hosted workflow and no second copy of the database/browser suites. The change-aware
planner exposes `intermediateIngestion=true` for the implemented ingestion boundaries and then forces
the existing validation and browser lanes that together prove the cross-layer path.

When the flag is selected:

- validation runs the shared contracts, backend, worker, PostgreSQL and OpenAPI checks once;
- `npm run verify:intermediate-ingestion:invariants` adds only the #364-specific retained-evidence and
  worker log-safety checks that are not already owned by those suites;
- browser CI runs the focused submission, batch-review and correction journeys when the Pull Request
  affects only Intermediate ingestion surfaces;
- a simultaneous broader frontend/browser change upgrades that lane to the normal full Playwright suite
  rather than running both; and
- the existing `Sport Analytics CI / quality` status requires the selected validation and browser jobs
  to succeed before merge where that status is protected.

This keeps #364 merge-affecting while preserving change-aware optimization for unrelated Pull Requests.
The complete `npm run verify:intermediate-ingestion` command remains available for deliberate local or
milestone evidence runs.

## Issue #364 acceptance map

| Requirement                                                          | Verification source                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole-season upload without database IDs                             | `packages/contracts/src/tests/season-upload.test.ts`; the versioned package accepts readable/source references without application IDs. Guided season and catalogue upload are covered by `SubmissionPage.test.tsx` and `tests/e2e/submissions.spec.ts`.                                                                                                                        |
| Back catalogue/proposed fixtures stage safely                        | Unknown fixture/reference outcomes remain unresolved staged evidence in `packages/batch-processing/src/reference-resolver.ts`; worker/package and database report tests verify no canonical record is silently created.                                                                                                                                                         |
| Complete actionable invalid-event report                             | `apps/backend/tests/database/batch.repository.database.test.ts`, `apps/backend/tests/unit/batch.service.test.ts`, `apps/backend/tests/api/batches.test.ts` and the file-validation browser journey verify grouped faults, source row/field locations, pagination and complete report download.                                                                                  |
| Ambiguous participants require mapping                               | Season-upload contracts require explicit resolution; batch service/API and the guided browser journey verify labeled opaque candidates and explicit mapping decisions.                                                                                                                                                                                                          |
| Equivalent re-upload is idempotent                                   | `apps/backend/tests/unit/batch.service.test.ts` and batch repository database tests verify same key + same checksum returns the original receipt and concurrent equivalent requests create one batch/job. Publication replay is a no-op.                                                                                                                                        |
| Changed content under one idempotency key is rejected                | Batch service tests verify same key + changed checksum returns `BATCH_CONFLICT`.                                                                                                                                                                                                                                                                                                |
| Validation/publication recover after termination                     | `apps/worker/tests/delivery-pump.test.ts` proves transient delivery redelivery and bounded drain behavior; validation checkpoints are durable; `batch.repository.database.test.ts` proves expired publication leases are reclaimed; the operational restart procedure is in `docs/deployment/azure-worker.md`.                                                                  |
| Concurrent workers do not duplicate work                             | Validation uses a live lease and delivery redelivery; publication repository tests reject a competing live owner and make completed replays deterministic no-ops.                                                                                                                                                                                                               |
| Staged data is private before approval                               | Batch database tests assert no delivery exists before approval and publication is rejected before review. Public routes are unchanged by staging.                                                                                                                                                                                                                               |
| Approval publishes intended accepted items; rejection publishes none | Batch repository, service, frontend and browser tests verify that a mixed batch publishes only its accepted subset, retains ordinary rejected records and reasons, preserves true review blockers, and keeps decisions/publication idempotent.                                                                                                                                  |
| Corrections retain history and refresh statistics                    | Submission database/API and `tests/e2e/corrections.spec.ts` verify immutable revisions and refreshed dependent statistics.                                                                                                                                                                                                                                                      |
| Statistic-to-submitter provenance                                    | Issue #363 protected provenance APIs/tests and `evidence/validation/issue-363-provenance.md`.                                                                                                                                                                                                                                                                                   |
| Representative-scale throughput                                      | Retain the original #364 season-scale run plus the successful post-#540 deployed retest. The representative workload was 70 fixtures / 16,713 events; validation completed in 4m27s and final publication completed in 3m37.235s against the approved <=15m target. Source: `evidence/acceptance/issue-540-season-scale-publication.md`.                                        |
| No payloads or credentials in logs                                   | Worker logger accepts deliberately safe scalar fields; the #364 verifier rejects sensitive ingestion field names in structured worker log calls. Security/retention boundaries remain documented.                                                                                                                                                                               |
| Accessibility/responsiveness                                         | Focused Playwright submission/review/correction journeys plus normal `ci:local` accessibility coverage.                                                                                                                                                                                                                                                                         |
| Formal user testing                                                  | Reuse #417 and #418 evidence. #418 reviewer/admin testing is retained at `evidence/user-testing/sprint-2/2026-09-10-P04-reviewer.md`. #417 formal submitter testing is complete with `2026-09-11-P05-submitter.md` and `2026-09-15-P06-submitter.md`, consolidated in `sprint-2-user-testing-summary.md`; pending P06 findings remain explicit for team disposition/carry-over. |
| Documentation current                                                | Architecture, API, database, worker deployment, security, testing and user-facing submission/review docs are part of the #364 review and strict MkDocs build.                                                                                                                                                                                                                   |

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

## Live development deployment evidence

The repository-level tests are supplemented by a deployed-development acceptance record from Issue #463.

On 11 September 2026, a controlled season package was processed by the real Azure worker/Service Bus path, reached `awaiting_review`, appeared in the reviewer queue, was approved and reached `published`. Because the item exactly matched an existing published delivery, publication marked it `duplicate_skipped`; a live canonical query confirmed the delivery count remained one.

The complete operational evidence, including runtime defects found/fixed during provisioning and the post-merge deployment check, is retained in `evidence/validation/issue-463-dev-worker-deployment.md`.

This deployed evidence complements the later representative-scale acceptance.

A second deployed-development acceptance under #540 then exercised the same 16,713-event season-scale workload after publication remediation. The original stranded #364 batch recovered through a single durable publication job, and a fresh representative replay reached `published` in 3m37.235s with one successful publication-job attempt. Both validation (4m27s) and publication (3m37.235s) are within the approved <=15-minute target.

The retained source record is `evidence/acceptance/issue-540-season-scale-publication.md`.

## Close-out evidence

The two former external #364 close-out gates are now satisfied:

1. **Formal user testing:** #418 reviewer/admin testing is complete, and #417 formal submitter testing is complete with two external sessions (P05 and P06). Pending P06 findings remain visible for explicit team triage/carry-over; they are not missing test evidence.
2. **Integrated season throughput:** the representative workload is 70 fixtures / 16,713 events. Validation completed in 4m27s and the final post-#540 deployed publication completed in 3m37.235s, both within the approved <=15-minute target. The original stranded batch also recovered to `published`.

Before closing #364, run a fresh current-main:

```powershell
npm.cmd run verify:intermediate-ingestion
```

and confirm the command exits successfully after the final evidence updates are merged.

No additional representative 70-fixture publication rerun is required unless code affecting the accepted publication path changes before closure.

AI Declaration: The preceding page was planned and generated with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
