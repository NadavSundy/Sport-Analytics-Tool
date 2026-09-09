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

`npm run ci:local` remains the ordinary repository quality gate for the final branch and must still be
recorded after the complete #364 change set is ready. The retained manual **Intermediate Ingestion
Acceptance** Gitea workflow can additionally provide hosted parity evidence without changing normal
Pull Request routing; record the hosted run reference here if it is executed.

## Acceptance evidence matrix

| Acceptance criterion                                                          | Evidence / expected observation                                                                                                                                                                       | Status before local run                   |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Authorized submitter uploads representative whole season without database IDs | Season-upload contract accepts readable/source references; guided season upload uses opaque competition choice and durable batch receipt. Final exercise must record the representative package size. | automated coverage present                |
| Back catalogue with proposed fixtures can be staged                           | Resolver stages unknown fixture/reference context rather than creating canonical rows; report retains actionable unresolved state.                                                                    | automated coverage present                |
| Invalid events produce a complete actionable report                           | Paginated report + full download include rule code, message and source location; browser focus returns to rejected input/report context.                                                              | automated coverage present                |
| Ambiguous participants require explicit mapping                               | Ambiguous candidates remain blocked until an authorised opaque candidate mapping is queued and revalidated.                                                                                           | automated coverage present                |
| Equivalent re-upload does not duplicate batch/event/statistic                 | Same key/checksum returns original receipt; concurrent equivalent creation and publication replay are idempotent.                                                                                     | automated coverage present                |
| Reused key with changed content is rejected                                   | Same key/different checksum returns conflict.                                                                                                                                                         | automated coverage present                |
| Validation/publication resume after worker termination                        | Worker redelivery + durable validation checkpoints; publication lease reclaim; deployment recovery procedure. Record one integrated restart observation if available.                                 | automated + operational procedure present |
| Concurrent workers do not duplicate work                                      | Live leases exclude competing worker ownership; completed replay is a deterministic no-op.                                                                                                            | automated coverage present                |
| Staged data is never public before approval                                   | Database test observes zero canonical delivery rows while staged and rejects premature publication.                                                                                                   | automated coverage present                |
| Approval publishes intended accepted items; rejection publishes nothing       | Review/publication integration tests cover accepted-only write, rejection and correction-request disposition.                                                                                         | automated coverage present                |
| Corrections retain history and update dependent statistics                    | Correction database/API/browser tests.                                                                                                                                                                | automated coverage present                |
| Statistic-to-submitter provenance demonstrated                                | Protected provenance API from Issue #363 and `evidence/validation/issue-363-provenance.md`.                                                                                                           | automated coverage present                |
| Representative season-scale throughput meets approved target                  | **Record measured value, package fixture/event count, environment and approved target here.** Parser-only or contract timing is insufficient.                                                         | pending measurement                       |
| Payloads/credentials absent from logs                                         | Safe-scalar worker logger, structured log field audit in #364 verifier, security/worker docs.                                                                                                         | automated coverage present                |
| Accessibility/responsive checks pass                                          | Focused ingestion/review/correction Playwright plus normal CI accessibility coverage.                                                                                                                 | pending local run                         |
| #417/#418 representative-user evidence                                        | Link the completed formal submitter and reviewer/admin evidence here. No separate #364 session is required.                                                                                           | **pending dependency**                    |
| Architecture/API/database/deployment/testing/user docs current                | `docs/testing/intermediate-ingestion-acceptance.md` indexes current source documentation; strict MkDocs must pass.                                                                                    | pending local run                         |
| Every Intermediate brief requirement maps to evidence                         | See the Intermediate project-brief traceability table in `docs/testing/intermediate-ingestion-acceptance.md`.                                                                                         | mapped                                    |

## Intermediate brief cross-check

The issue-specific acceptance exercise must retain evidence for batch ingestion/review/corrections,
participant aggregates, dependency-aware recomputation, reference figures, representative-scale
performance, API versioning, consumer keys/rate limits/quotas, caching, and reproducible dataset
releases. The detailed source/test mapping is maintained in the linked acceptance guide rather than
repeated here.

## Defects found

None recorded yet. Add only defects actually observed during the integrated run, with issue/commit
references and the rerun that proves the fix.

## Final decision

**Not ready to close until final `ci:local`/hosted quality evidence, the representative season
throughput result, and #417/#418 formal user-testing evidence are recorded above.**

AI Declaration: The preceding validation plan and evidence index were generated and edited with the
assistance of ChatGPT-Web[GPT-5.6 Sol].
