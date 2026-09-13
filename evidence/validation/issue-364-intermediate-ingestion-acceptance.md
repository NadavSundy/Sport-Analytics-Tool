# Issue #364 Intermediate ingestion integrated acceptance

## Scope

This record is the final acceptance index for the Intermediate ingestion pipeline across the API,
database, asynchronous worker and frontend. The issue is verification-first: existing behavior is
traced to tests and operational evidence; only defects found by the exercise should change product
code.

## Automated verification

Run:

```text
npm run verify:intermediate-ingestion
npm run ci:local
```

Observed 2026-09-09 local result for `npm run verify:intermediate-ingestion`: **PASS**.

The run verified all required retained evidence references and worker log-safety checks, then passed:

- 135 shared-contract tests;
- 181 backend unit tests;
- 153 backend API tests;
- 22 worker tests;
- 125 frontend unit tests;
- 145 PostgreSQL integration tests, with the two normal performance-query-plan tests skipped;
- 13 focused Playwright submission/review/correction tests; and
- OpenAPI linting.

`npm run ci:local` also passed for the first #364 verification PR, and its hosted Pull Request quality
run passed all required validation and browser jobs. One unrelated Three.js context-loss browser test
needed the configured automatic retry and then passed; that flake was logged separately and did not
affect ingestion acceptance. A follow-up #364 CI-routing change integrates future Intermediate
ingestion changes into the existing required validation/browser/quality gate instead of keeping a
duplicate manual acceptance workflow.

## Acceptance evidence matrix

| Acceptance criterion                                                          | Evidence / expected observation                                                                                                                                                                            | Status before local run                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Authorized submitter uploads representative whole season without database IDs | Season-upload contract accepts readable/source references; guided season upload uses opaque competition choice and durable batch receipt. Final exercise must record the representative package size.      | automated coverage present                   |
| Back catalogue with proposed fixtures can be staged                           | Resolver stages unknown fixture/reference context rather than creating canonical rows; report retains actionable unresolved state.                                                                         | automated coverage present                   |
| Invalid events produce a complete actionable report                           | Paginated report + full download include rule code, message and source location; browser focus returns to rejected input/report context.                                                                   | automated coverage present                   |
| Ambiguous participants require explicit mapping                               | Ambiguous candidates remain blocked until an authorised opaque candidate mapping is queued and revalidated.                                                                                                | automated coverage present                   |
| Equivalent re-upload does not duplicate batch/event/statistic                 | Same key/checksum returns original receipt; concurrent equivalent creation and publication replay are idempotent.                                                                                          | automated coverage present                   |
| Reused key with changed content is rejected                                   | Same key/different checksum returns conflict.                                                                                                                                                              | automated coverage present                   |
| Validation/publication resume after worker termination                        | Worker redelivery + durable validation checkpoints; publication lease reclaim; deployment recovery procedure. Record one integrated restart observation if available.                                      | automated + operational procedure present    |
| Concurrent workers do not duplicate work                                      | Live leases exclude competing worker ownership; completed replay is a deterministic no-op.                                                                                                                 | automated coverage present                   |
| Staged data is never public before approval                                   | Database test observes zero canonical delivery rows while staged and rejects premature publication.                                                                                                        | automated coverage present                   |
| Approval publishes intended accepted items; rejection publishes nothing       | Review/publication integration tests cover accepted-only write, rejection and correction-request disposition.                                                                                              | automated coverage present                   |
| Corrections retain history and update dependent statistics                    | Correction database/API/browser tests.                                                                                                                                                                     | automated coverage present                   |
| Statistic-to-submitter provenance demonstrated                                | Protected provenance API from Issue #363 and `evidence/validation/issue-363-provenance.md`.                                                                                                                | automated coverage present                   |
| Representative season-scale throughput meets approved target                  | **Record measured value, package fixture/event count, environment and approved target here.** Parser-only or contract timing is insufficient.                                                              | pending measurement                          |
| Payloads/credentials absent from logs                                         | Safe-scalar worker logger, structured log field audit in #364 verifier, security/worker docs.                                                                                                              | automated coverage present                   |
| Accessibility/responsive checks pass                                          | Focused ingestion/review/correction Playwright plus normal CI accessibility coverage.                                                                                                                      | local and hosted browser validation passed   |
| #417/#418 representative-user evidence                                        | #418 reviewer/admin evidence: `evidence/user-testing/sprint-2/2026-09-10-P04-reviewer.md` (initial S1 failure -> #463 -> successful same-task retest). #417 submitter evidence remains to be consolidated. | **#418 complete; #417 pending**              |
| Architecture/API/database/deployment/testing/user docs current                | `docs/testing/intermediate-ingestion-acceptance.md` indexes current source documentation; strict MkDocs remains part of normal change-aware CI.                                                            | verifier, local CI and hosted quality passed |
| Every Intermediate brief requirement maps to evidence                         | See the Intermediate project-brief traceability table in `docs/testing/intermediate-ingestion-acceptance.md`.                                                                                              | mapped                                       |

## Intermediate brief cross-check

The issue-specific acceptance exercise must retain evidence for batch ingestion/review/corrections,
participant aggregates, dependency-aware recomputation, reference figures, representative-scale
performance, API versioning, consumer keys/rate limits/quotas, caching, and reproducible dataset
releases. The detailed source/test mapping is maintained in the linked acceptance guide rather than
repeated here.

## Live development integration evidence - 11 September 2026

Issue #463 supplied a real deployed-development integration exercise for the batch path documented by this acceptance record.

A controlled season package progressed through the deployed path as follows:

```text
upload
-> stored batch
-> transactional outbox
-> Service Bus batch.validate
-> worker validation/reference resolution
-> awaiting_review
-> global reviewer queue
-> approved
-> published
```

Batch `f65118c3-3367-47d8-9d2d-5f29469225ff` reached `awaiting_review` with one accepted and zero rejected items. The reviewer opened the report, approved the batch, and the persisted batch state became `published`.

The staged event exactly matched published delivery `4157`. Publication therefore marked the batch item `duplicate_skipped`, linked it to delivery `4157`, and a live canonical query confirmed the natural delivery position still contained exactly one delivery. This supplies deployed evidence for review-before-publication and duplicate-safe replay.

The same #463 exercise also demonstrated recovery of previously stored/pending outbox commands after the worker/Service Bus runtime path was repaired, without resubmitting those source batches.

See `evidence/validation/issue-463-dev-worker-deployment.md` for the full operational record.

This evidence strengthens the deployed integration trail. Formal reviewer/admin user testing is now completed under #418 and retained in `evidence/user-testing/sprint-2/2026-09-10-P04-reviewer.md`; #417 submitter evidence and the representative season-scale throughput result remain #364 close-out gates.

## Defects found

The deployed #463 acceptance run identified a real report-contract defect: valid zero-based cricket delivery positions (`positionInOver: 0`) were rejected by the frontend report response schema because it used `positive()` rather than `nonnegative()`. The backend report endpoint returned HTTP 200; the shared frontend contract rejected the response. The defect was fixed separately with regression coverage and the same already-staged batch then loaded successfully.

The final duplicate-safe publication check also observed two active `EXACT_PUBLISHED_DUPLICATE` warning rows for one source ordinal. This did not affect acceptance or canonical publication and should be tracked separately as a validation-result persistence/idempotency defect.

## Final decision

**Not ready to close until the representative season throughput result and the remaining #417 submitter formal-user evidence are recorded above. #418 reviewer/admin formal testing is complete.**

AI Declaration: The preceding validation plan and evidence index were generated and edited with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
