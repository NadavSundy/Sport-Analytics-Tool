# Sprint 2 requirements and rubric traceability

| Document information | Details                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project              | Sport Analytics Tool                                                                                                                                                                               |
| Milestone            | Sprint 2                                                                                                                                                                                           |
| Related issue        | #420                                                                                                                                                                                               |
| Purpose              | Map the Intermediate Sport Analytics requirements and every Sprint 2 rubric criterion to auditable repository evidence                                                                             |
| Evidence cut-off     | 15 September 2026; evidence current through #417 P05/P06 formal submitter testing and #540 season-scale publication acceptance                                                                     |
| Close-out owner      | #298 reviews this record before Sprint 2 milestone tagging                                                                                                                                         |
| Status               | Traceability is current through formal Sprint 2 testing and season-scale acceptance; the team retrospective is recorded, while final stakeholder close-out and milestone tagging remain under #298 |

## 1. Purpose and evidence policy

This record gives a marker one place to verify the Sprint 2 requirement and rubric evidence without
reconstructing the project history from individual issues, Pull Requests and commits.

For each Intermediate requirement it records:

- implementation status;
- the issue and representative Pull Request/commit;
- relevant automated or integrated verification;
- the main documentation/evidence source; and
- a known limitation or remaining close-out action where one exists.

For the Sprint 2 rubric it maps each criterion to the repository evidence that supports it. This page
is an evidence index, not a replacement for the linked source records. Gitea remains authoritative for
current issue and Pull Request state.

The statuses deliberately distinguish implementation from final deployed acceptance. A feature is not
marked fully verified merely because code and tests exist when the representative deployed acceptance
record still contains an unresolved failure.

## 2. Status definitions

| Status                               | Meaning                                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Implemented**                      | The requirement is implemented and has representative automated/integrated evidence.                                  |
| **Implemented with follow-up fixes** | The requirement is implemented, and defects found during Sprint 2 were separately tracked and repaired.               |
| **Verification pending**             | The implementation and regression coverage exist, but a required representative deployed retest is still outstanding. |
| **Partial**                          | A meaningful part is implemented, but a material requirement or evidence gate remains incomplete.                     |
| **Carry-over**                       | Work is intentionally not claimed as complete for Sprint 2 and remains for later close-out.                           |

## 3. Intermediate Sport Analytics requirements

The Intermediate tier in the project brief requires the Basic platform to grow into a staged,
reviewed, resumable and idempotent batch pipeline; add broader and selectively recomputed aggregates;
prove correctness and representative-scale performance; harden the API with versioning, consumer
controls and caching; and publish reproducible versioned dataset releases.

| Intermediate requirement                                                         | Status                               | Issue(s)                           | Representative PR / commit                                                                             | Automated or integrated verification                                                                                                                                                                          | Documentation / evidence                                                                                                                                                                                                                  | Known limitation or remaining work                                                                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage whole seasons/back catalogues before publication                           | **Implemented with follow-up fixes** | #277, #357, #358, #359, #360, #361 | PR #381 / `1828f2c`; PR #431 / `3f54476`                                                               | `apps/backend/tests/api/batches.test.ts`; `apps/backend/tests/database/batch.repository.database.test.ts`; `apps/frontend/src/features/submissions/BatchUploadPage.test.tsx`; `tests/e2e/submissions.spec.ts` | `docs/api/season-upload-contract.md`; `docs/data/batch-submission-packages.md`; `docs/architecture/batch-ingestion-pipeline.md`                                                                                                           | Season-scale acceptance exposed review/usability defects that were split into follow-up issues rather than hidden inside the staging work.                                              |
| Process staged batches asynchronously                                            | **Implemented with follow-up fixes** | #278, #365, #463, #524, #540       | PR #399 / `f490227`; PR #464; worker auto-deploy follow-up #524; PR #549 / #556 publication follow-ups | Worker/service tests; `apps/worker/tests/batch-publication-job.test.ts`; #463 live acceptance; #540 recovery and season-scale deployed acceptance                                                             | `docs/deployment/azure-worker.md`; `evidence/validation/issue-463-dev-worker-deployment.md`; `evidence/acceptance/issue-540-season-scale-publication.md`                                                                                  | Durable asynchronous validation/publication is proven in deployment, including recovery of the originally stranded #364 season workload.                                                |
| Report accepted and rejected outcomes with actionable item detail                | **Implemented with follow-up fixes** | #279, #366, #367, #465, #471, #499 | PR #414 / `b091385`; PR #400 / `4c89649`; PR #507 / `bcb9635`                                          | Batch API/service tests; `BatchReportsPage.test.tsx`; focused Intermediate acceptance; #417 P05/P06 formal submitter sessions                                                                                 | `docs/api/batches.md`; `evidence/validation/issue-364-intermediate-ingestion-acceptance.md`; Sprint 2 user-testing summary                                                                                                                | Formal #417 testing is complete. Pending P06 findings remain visible for explicit disposition/carry-over rather than being treated as missing evidence.                                 |
| Resubmitting equivalent data does not double-count                               | **Implemented**                      | #280                               | PR #401 / `a4ab116`                                                                                    | Batch service/database idempotency coverage and #463 duplicate-safe live publication                                                                                                                          | `docs/architecture/batch-ingestion-pipeline.md`; `evidence/validation/issue-463-dev-worker-deployment.md`                                                                                                                                 | No known requirement gap; continue regression coverage as ingestion paths evolve.                                                                                                       |
| Resume interrupted validation/publication rather than restart                    | **Implemented with follow-up fixes** | #281, #463, #540, #551             | PR #405 / `b59bd09`; PR #553 / `046b42a`; PR #549; PR #556                                             | Worker checkpoint/lease tests; `apps/worker/tests/batch-publication-job.test.ts`; #463 recovery evidence; #540 recovery of the original stranded season-scale batch                                           | `docs/deployment/azure-worker.md`; `docs/testing/intermediate-ingestion-acceptance.md`; `evidence/acceptance/issue-540-season-scale-publication.md`                                                                                       | Original #364 stranded publication resumed to `published`; a fresh representative job then completed in one attempt.                                                                    |
| Require review before publication                                                | **Implemented with follow-up fixes** | #283, #362, #479, #480, #540       | PR #423 / `6f8e53d`; PR #434 / `0784932`; PR #491 / `80cccc5`; PR #504; PR #549                        | Backend batch review tests; `BatchReviewWorkspacePage.test.tsx`; focused reviewer E2E; P04 reviewer session; #540 deployed async-publication acceptance                                                       | `docs/api/batches.md`; `evidence/user-testing/sprint-2/2026-09-10-P04-reviewer.md`; `evidence/acceptance/issue-540-season-scale-publication.md`                                                                                           | Review approval is durable and publication is handed to a background job rather than blocking the reviewer request.                                                                     |
| Catch impossible or conflicting cricket data                                     | **Implemented with follow-up fixes** | #282, #522, #529, #537             | PR #412 / `d5828e6` + validation commits; PR #523/#527 conflict reconciliation; PR #538                | Contracts, batch service/database/worker tests; `BatchReviewWorkspacePage.test.tsx`; season-scale conflict-resolution exercise                                                                                | `docs/architecture/batch-ingestion-pipeline.md`; `evidence/validation/issue-364-intermediate-ingestion-acceptance.md`                                                                                                                     | #537 follow-up is repaired: blocking references/conflicts are exposed through `report.blockingItems` independently of ordinary pagination.                                              |
| Preserve correction history                                                      | **Implemented with follow-up fixes** | #284, #484, #539                   | PR #404 / `2de6b8f`; PR #503 / `fd01448`; PR #548 / `78c068b`                                          | Database/API correction coverage; worker correction tests; `tests/e2e/corrections.spec.ts`; lineage frontend/API/database tests                                                                               | `docs/database/schema.md`; `docs/api/provenance.md`; `docs/api/batches.md`                                                                                                                                                                | #539 repair is merged: corrected submissions expose predecessor/replacement lineage through `replacesBatchReference` / `supersededByBatchReference`.                                    |
| Derive season, career and competition-wide aggregates                            | **Implemented**                      | #285, #476                         | PR #411 / `5a2c92e`; PR #490 / `4ca36f0`                                                               | `participant-aggregates` unit/API/database tests                                                                                                                                                              | `docs/statistics/participant-aggregates.md`                                                                                                                                                                                               | Additional scorecard presentation improvements from user testing are product UX work, not a derivation correctness gap.                                                                 |
| Recompute only figures affected by event changes                                 | **Implemented**                      | #286                               | PR #427 / `3cf51ce`                                                                                    | Correction/database refresh coverage; dependency-aware refresh tests in the statistics path                                                                                                                   | `docs/statistics/participant-aggregates.md`; ADR-009                                                                                                                                                                                      | Continue performance monitoring as more aggregate types are added.                                                                                                                      |
| Verify figures against known-correct reference results                           | **Implemented**                      | #287                               | PR #316 / `d443bfc`                                                                                    | `apps/backend/tests/database/reference-figures.database.test.ts`; reference fixture/database tests                                                                                                            | `docs/development/reference-fixtures.md`                                                                                                                                                                                                  | Reference corpus should expand as new statistics are introduced.                                                                                                                        |
| Exercise representative load and meet stated response-time targets               | **Implemented with follow-up fixes** | #289, #290, #410, #364, #540       | PR #408 / `726f744`; PR #409 / `c799ef6`; PR #429 / `560458c`; PR #549; PR #556 / `b68158c`            | Public-read benchmark/query-plan tests; `apps/worker/tests/batch-publication-throughput.test.ts`; deployed #364/#540 measurements                                                                             | `docs/development/performance-baseline.md`; `evidence/validation/issue-410-post-change-measurement.md`; `evidence/validation/issue-364-intermediate-ingestion-acceptance.md`; `evidence/acceptance/issue-540-season-scale-publication.md` | Representative workload: 70 fixtures / 16,713 events. Validation passed in 4m27s and final post-#540 publication passed in 3m37.235s, both within <=15m.                                |
| Version the API                                                                  | **Implemented**                      | #291                               | PR #340 / `6280c52`                                                                                    | API version-routing/contract tests and OpenAPI lint                                                                                                                                                           | `docs/api/versioning.md`; `docs/api/overview.md`                                                                                                                                                                                          | Future breaking versions must follow the documented deprecation path.                                                                                                                   |
| Issue consumer API keys and enforce rate limits/quotas                           | **Implemented**                      | #292                               | PR #424 / `3f49174`                                                                                    | `apps/backend/tests/api/api-consumers.test.ts`; `apps/backend/tests/database/api-consumers.database.test.ts`                                                                                                  | `docs/api/consumer-keys.md`; `docs/security/roles-and-permissions.md`                                                                                                                                                                     | Operational monitoring/consumer-usage reporting can be extended in Sprint 3.                                                                                                            |
| Cache repeated reads with correct invalidation                                   | **Implemented with follow-up fixes** | #293, #369, #430                   | PR #427 / `d88c529`; PR #402 / `5d14c4f`; PR #449 / `2c3b145`                                          | `fixture-statistics.service.test.ts`; database invalidation coverage; issue #293 evidence                                                                                                                     | ADR-009; `evidence/validation/issue-293-cache-performance.md`                                                                                                                                                                             | Cache failures are designed not to fail authoritative published reads; continue observing deployment latency.                                                                           |
| Publish versioned immutable dataset releases with schema/field docs and checksum | **Implemented with follow-up fixes** | #294, #458, #533                   | PR #439 / `740afde`; PR #461 / `b6116bf`; PR #545 / async release commits                              | Dataset release unit/API/contracts/database-independent tests; admin release E2E                                                                                                                              | Dataset release section in API/data docs; `evidence/validation/issue-458-admin-dataset-release-workflow.md`                                                                                                                               | Full-corpus synchronous generation failure #533 was replaced by durable asynchronous generation. Final deployed release publication evidence should be confirmed during #298 close-out. |
| Provide a release catalogue and download workflow                                | **Implemented with follow-up fixes** | #295, #467, #468, #475             | PR #451 / `0e49ccc`; PR #493 / `923449a`; PR #474 / `31ee2d9`; follow-up public UX PRs                 | Dataset release page tests; admin release E2E; public user-testing findings/retests                                                                                                                           | `docs/data/dataset-exports.md`; Sprint 2 user-testing summary                                                                                                                                                                             | User testing found export pagination/readability/navigation defects; several fixes are merged, while remaining accepted UX findings stay visible in the user-testing summary.           |
| Preserve end-to-end provenance from statistic to source submission/review        | **Implemented**                      | #363                               | PR #440 / `475f67f`                                                                                    | Provenance contract/unit/API tests; PostgreSQL integration coverage                                                                                                                                           | `docs/api/provenance.md`; `evidence/validation/issue-363-provenance.md`                                                                                                                                                                   | Public endpoints intentionally omit private provenance fields; authenticated provenance routes provide the audit trace.                                                                 |
| Integrate a relevant external API and repair fixture-to-weather resolution       | **Implemented with follow-up fixes** | #299, #300, #415, #473             | PR #320 / `369c246`; PR #335; PR #466 / `2347742`; PR #489 / `e75a904`                                 | Weather unit/API tests and fixture-weather tests                                                                                                                                                              | ADR-008; `docs/api/weather.md`; `docs/api/openapi.yaml`                                                                                                                                                                                   | Open-Meteo remains an external dependency; provider failures are isolated and documented.                                                                                               |

### 3.1 Basic carry-over completed during Sprint 2

Sprint 2 also completed Basic work that Sprint 1 explicitly left partial, notably filtered fixture-event
exports (#269/#270) and the surrounding public export workflow. Those changes are covered by API,
database, browser and formal-user evidence and are included in the rubric mapping below rather than
being misrepresented as new Intermediate requirements.

## 4. Sprint 2 rubric evidence

The official Sprint 2 rubric totals 100% across the ten criteria below. The **evidence posture** column
is a repository self-check against the rubric wording, not a claim about the marker's final score.

| Rubric criterion                   | Weight | Evidence posture at cut-off                                                          | Repository evidence                                                                                                                                                                                                                                        | Known limitation / close-out action                                                                                                                                                                                                      |
| ---------------------------------- | -----: | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core Features**                  |    25% | **Intermediate requirement evidence complete; final rubric close-out under #298**    | Intermediate implementation matrix above; Basic acceptance #272; guided submission/review #361/#362; integrated acceptance #364; representative fixes/retests through #540                                                                                 | The former season-scale publication blocker is resolved and retested. Remaining open/deferred product findings stay visible and should be considered by #298 rather than being hidden.                                                   |
| **Automated Testing**              |    10% | **Advanced-target evidence present**                                                 | Contracts, backend unit/API, PostgreSQL integration, worker, frontend unit, Playwright E2E/accessibility, deployment/CI-routing tests; `npm run check`; `npm run verify:intermediate-ingestion`; #272/#273/#287/#296/#364 evidence                         | #296 remains the umbrella testing close-out item; final current-main quality evidence should be linked under #298.                                                                                                                       |
| **Stakeholder Reviews**            |    10% | **Advanced-target evidence present; final stakeholder close-out pending**            | 26 Aug approval; 1 Sep stakeholder meeting; 8 Sep asynchronous WhatsApp review; repository Sprint evidence; feedback-driven backlog changes                                                                                                                | The team retrospective is already recorded. Final Sprint 2 stakeholder close-out belongs to #298 and must not be fabricated here.                                                                                                        |
| **API**                            |    15% | **Advanced-target evidence present**                                                 | Handwritten Express `/api/v1`; published OpenAPI; public reads/exports; API consumer controls; Open-Meteo integration; versioning; deployed Azure backend evidence                                                                                         | #298 should perform the final live availability/smoke check and record any temporary Azure capacity limitation separately from API implementation completeness.                                                                          |
| **User Feedback**                  |    10% | **Formal Sprint 2 testing complete; finding disposition/carry-over remains visible** | Task-based protocol (#264/PR #317); public/analyst #416; reviewer/admin #418 with #463 fix/retest; submitter #417 with P05/P06 and cross-session retest evidence; consolidated Sprint 2 summary                                                            | #417's two external submitter sessions are complete. Four P06 findings remain Pending team disposition, and public/analyst carry-over findings remain explicit; this is outstanding product triage, not missing formal testing evidence. |
| **Project Methodology**            |    10% | **Advanced-target evidence present**                                                 | Lightweight Scrumban documented in `docs/project_methodology.md`; issue/project-board workflow; Sprint 2 planning; weekly stand-ups under #331 including 27 Aug, 3 Sep and 10 Sep; team retrospective in `evidence/sprints/sprint-2/sprint-2-close-out.md` | The retrospective is recorded. #298 still owns final stakeholder close-out, current-main verification and the milestone decision/tag.                                                                                                    |
| **Bug Tracker**                    |     5% | **Advanced-target evidence present**                                                 | `docs/testing/bug-tracking.md`; continuous labelled Gitea issue use; representative defects #367, #369, #410, #415, #430, #442, #446, #452, #463, #467-#500, #522/#529/#533/#537/#539/#540/#551                                                            | Open defects and deferred usability findings must remain visible; tracker usage is evidence of process, not proof that no bugs remain.                                                                                                   |
| **Database Documentation**         |     5% | **Advanced-target evidence present**                                                 | `docs/database/overview.md`, `schema.md`, `erd.md`, `batch-persistence.md`, `access.md`; executable migrations and migration README; deployment/provider rationale in ADR-005 and deployment docs                                                          | The #297 Intermediate documentation publication is present on current `main` through PR #559; #419/final close-out should still confirm consistency before milestone tag.                                                                |
| **Third-Party Code Documentation** |     5% | **Advanced-target evidence present**                                                 | `docs/development/technology-stack.md` lists selected technologies/dependencies with versions, purposes and motivations; `docs/development/dependencies.md` defines review/copied-code policy; ADRs motivate external services                             | Any new dependency added after this cut-off must be added before #298 tags Sprint 2.                                                                                                                                                     |
| **Testing Documentation**          |     5% | **Advanced-target evidence present**                                                 | `docs/development/testing.md`; user-testing protocol/task bank; bug-tracking policy; Intermediate acceptance runbook; performance baseline; validation/evidence index                                                                                      | The #297 documentation publication is present on current `main` through PR #559; #296/#419/final close-out should still confirm current-main test evidence and link integrity.                                                           |

## 5. Formal user-testing evidence and resulting work

The formal Sprint 2 process is task-based. The retained evidence must be read at task/finding level rather
than as an informal usability narrative.

Primary records:

- `docs/testing/user-testing-protocol.md`
- `docs/testing/user-testing-task-bank.md`
- `evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md`
- `evidence/user-testing/sprint-2/2026-09-10-P01-public.md`
- `evidence/user-testing/sprint-2/2026-09-10-P02-public.md`
- `evidence/user-testing/sprint-2/2026-09-07-P03-public.md`
- `evidence/user-testing/sprint-2/2026-09-10-P04-reviewer.md`
- `evidence/user-testing/sprint-2/2026-09-11-P05-submitter.md`
- `evidence/user-testing/sprint-2/2026-09-15-P06-submitter.md` — together these complete the two-session #417 formal submitter-testing evidence; pending P06 findings remain for explicit team disposition

Representative feedback-to-engineering trace:

| Finding / workflow                                                             | Resulting issue(s)                                        | Integration / retest state at cut-off                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reviewer batch unavailable because worker path was not progressing staged work | #463                                                      | Fixed and the same P04 `REV-01` task was successfully repeated before the remaining reviewer/admin tasks.                                                                                                                                                                                                                     |
| Export silently truncated beyond a page                                        | #467                                                      | Fix merged in PR #493; consolidated user-testing summary still needs the final retest/close-out update.                                                                                                                                                                                                                       |
| Export lacked readable cricket context                                         | #468                                                      | Fix merged in PR #474; multiple findings verified in deployed facilitator retest.                                                                                                                                                                                                                                             |
| Competition search only saw the initially loaded page                          | #469                                                      | Fix merged in PR #470; summary close-out/retest remains to be reconciled.                                                                                                                                                                                                                                                     |
| Public navigation/download/API discoverability and presentation findings       | #475                                                      | Follow-up fixes merged; the summary remains the authoritative record for unresolved accepted items.                                                                                                                                                                                                                           |
| Career aggregates existed in the API but were absent from the player page      | #476                                                      | UI integration merged in PR #490.                                                                                                                                                                                                                                                                                             |
| Submitter workflow and batch terminology/validation/scope findings             | #417 plus #498/#499/#500/#501/#519/#520 and related fixes | P05 produced five accepted findings and implementation work; P06 externally retested several improvements. Formal #417 testing is complete, while four new P06 findings remain Pending team disposition and one P05 identifier-path improvement was not exercised because P06 was blocked earlier in the single-fixture task. |

## 6. Stakeholder and methodology evidence

Sprint 2 stakeholder evidence is retained separately from user testing:

- `evidence/sprints/sprint-2/2026-08-25-planning.md`
- `evidence/sprints/sprint-2/Stakeholder/2026-08-26-sprint-2-stakeholder-approval.md`
- `evidence/sprints/sprint-2/Stakeholder/2026-09-01-stakeholder-meeting.md`
- `evidence/sprints/sprint-2/Stakeholder/2026-09-08-stakeholder-asynchronous-review.md`
- `evidence/sprints/sprint-2/Stakeholder/2026-09-08-stakeholder-whatsapp-transcript-redacted.md`

Sprint 2 stand-up evidence under #331 includes:

- `evidence/sprints/sprint-2/2026-08-27-standup.md`
- `evidence/sprints/sprint-2/2026-09-03-standup.md`
- `evidence/sprints/sprint-2/2026-09-10-weekly-standup.md`
- retained Teams transcripts under `evidence/sprints/sprint-2/Teams Transcripts/`

The team retrospective is recorded in `evidence/sprints/sprint-2/sprint-2-close-out.md`. The final
stakeholder close-out is not invented in this record and remains owned by #298.

## 7. Bug tracker and representative resolved defects

The project uses Gitea as the authoritative bug tracker and documents the workflow in
`docs/testing/bug-tracking.md`. Sprint 2 defects are not removed from the evidence trail when fixed.
Representative examples include:

- #367 — CSV BOM/common media-type handling;
- #369 — idle backend/database latency hardening;
- #410 — participant-history query-plan performance target;
- #415/#473 — fixture weather location resolution;
- #430 — published statistics read failure after cache/connection faults;
- #442/#446 — flaky browser/frontend CI tests;
- #452 — OpenAPI lint exception audited rather than a fictitious 4xx response;
- #463 — deployed worker path blocker found through reviewer testing;
- #467/#468/#469 — export/search defects found through formal public-user testing;
- #479/#480/#481/#482/#483/#484/#486 — reviewer/submission authorization and ingestion integrity fixes;
- #522/#529 — published conflict reconciliation;
- #533 — full-corpus dataset release publication moved to durable asynchronous generation;
- #537/#539 — season-scale review/correction issues discovered through #364;
- #540 — season-scale publication throughput remediation; and
- #551 — failed batches excluded from the active-batch limit.

This is evidence of continuous defect discovery, prioritisation, repair and retest; it is not a claim
that the current product contains no defects.

## 8. CI, deployment and integrated verification

Representative repository/deployed evidence includes:

- `evidence/validation/issue-272-basic-e2e-acceptance.md` — Basic vertical-slice acceptance;
- `evidence/validation/issue-273-accessibility-responsive-audit.md` — responsive/accessibility audit;
- `docs/development/reference-fixtures.md` plus the reference-result database test suite for #287;
- `evidence/validation/issue-293-cache-performance.md` — repeated-read cache correctness/performance evidence;
- `evidence/validation/issue-363-provenance.md` — protected end-to-end provenance;
- `evidence/validation/issue-364-intermediate-ingestion-acceptance.md` — integrated Intermediate pipeline and representative season-scale acceptance;
- `evidence/validation/issue-410-post-change-measurement.md` — participant-history performance remediation evidence;
- `evidence/validation/issue-463-dev-worker-deployment.md` — live worker/Service Bus acceptance;
- `evidence/acceptance/issue-540-season-scale-publication.md` — durable publication recovery and successful 16,713-event season-scale publication in 3m37.235s;
- `evidence/validation/issue-458-admin-dataset-release-workflow.md` — administrator release workflow verification;
- `evidence/validation/issue-376-dedicated-runner-verification.md` and `evidence/validation/issue-383-hosted-ci-optimisation-verification.md` for successful hosted CI/runner evidence, together with change-aware CI work under #348/#382; and
- deployment guides under `docs/deployment/` for the frontend, backend, worker, object storage and documentation site.

The final #298 close-out should link a green hosted CI run for the final Sprint 2 main commit and repeat
any deployed checks that are explicitly still pending in this page.

## 9. Intermediate technical documentation

The Intermediate documentation published through #297 (PR #559 on current `main`) and the alignment work
tracked by #419 are distributed by responsibility rather than copied into one large milestone document:

- API and OpenAPI: `docs/api/`
- database schema, ERD, access and batch persistence: `docs/database/`
- testing, CI, local verification and performance: `docs/development/testing.md`,
  `docs/development/local-ci.md`, `docs/development/performance-baseline.md`
- third-party technology/dependency motivation: `docs/development/technology-stack.md` and
  `docs/development/dependencies.md`
- deployment/operations: `docs/deployment/`
- security/authentication: `docs/security/`
- public project-process/evidence discoverability: `docs/process/` (work initiated under #254)

This traceability page links those records rather than duplicating their detailed content.

## 10. Known incomplete / carry-over work at this cut-off

The former #364 season-scale retest and #417 formal-session gates are now satisfied. Remaining Sprint 2 close-out work is:

1. **P06 submitter finding disposition.** #417 formal testing is complete, but four new P06 findings remain Pending until the team records explicit Accept / Defer / Reject decisions and issue links where appropriate.
2. **Public user-feedback carry-over.** Several accepted public/analyst findings are fixed, while others remain outstanding or require explicit retest/reconciliation in the consolidated summary.
3. **#296/#419 umbrella close-out.** Intermediate documentation is published; final testing/alignment work should still confirm current-main consistency and evidence links.
4. **Dataset release live confirmation.** #533 replaced full-corpus synchronous generation with durable asynchronous release generation; #298 should retain final deployed confirmation for the release flow.
5. **#298 final stakeholder close-out and milestone tag.** The team retrospective is already recorded in `evidence/sprints/sprint-2/sprint-2-close-out.md`; the remaining stakeholder close-out and final tag decision remain intentionally outside #420.

These are explicit carry-over/close-out items, not hidden omissions. They do not reopen the completed #364 representative throughput or #417 formal-session evidence gates.

## 11. Handoff to #298

Before the Sprint 2 milestone is tagged, #298 should:

1. review this traceability record against the current final `main` commit;
2. update any row whose pending verification completed after 14 September;
3. link the final stakeholder close-out and retain the already-recorded team retrospective;
4. link the final successful hosted CI run and deployed smoke/acceptance evidence;
5. confirm the completed #417/#364 evidence, #296/#419 states, and preserve remaining finding/carry-over work honestly; and
6. tag the milestone only after the evidence reflects the actual deployed state.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
