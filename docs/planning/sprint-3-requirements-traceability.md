# Sprint 3 Requirements and Rubric Traceability

**Related issues:** #577, #613
**Evidence status:** **Pre-finalisation — actual evidence mapped through 28 September 2026**

This page converts the Sprint 3 planning baseline into marker-facing **actual evidence**. It does not
award a mark or infer completion from an issue being closed. Where the current evidence is incomplete,
that limitation is stated explicitly.

The historical planned mapping remains in
[`evidence/sprints/sprint-3/2026-09-15-planning.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-3/2026-09-15-planning.md).
The Sprint 3 close-out record is
[`evidence/sprints/sprint-3/2026-09-28-sprint-3-close-out.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-3/2026-09-28-sprint-3-close-out.md).

## Current Milestone State

At preparation time, the Sprint 3 milestone had five open issues:

- #604 — season / multi-season back-catalogue user feedback;
- #612 — selected Advanced API consumer user feedback;
- #613 — Sprint 3 close-out;
- #776 — administrator per-consumer API usage visibility; and
- #779 — admin fixture-selector performance defect.

Everything below is interpreted against that visible state. Open work is not converted into a
completion claim.

## Sprint 3 Rubric — Planned vs Actual Evidence

| Rubric category        | Weight | Actual Sprint 3 evidence                                                                                                                                                      | Current evidence state                                                                                                                  | Finalisation action                                                                              |
| ---------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| User Feedback          |    10% | Formal task-based process under #600; retained Sprint 3 session evidence; #601/#606/#607 final results in summary; later closed gates including #605/#778; open #604 and #612 | **Partial / still open** because #604 and #612 remain open; #605 is not accepted and its findings are deferred                          | Reconcile latest summary and record exact final outcomes for every gate                          |
| Automated Testing      |    10% | #578 repository-wide coverage; regression/unit/API/database/worker/frontend suites; Playwright; OpenAPI/deployment tests; #598 acceptance                                     | Strong automated evidence exists, but #598 final PASS/FAIL is not yet imported into this pre-finalisation record                        | Add final #598 result and current CI links                                                       |
| Feature Implementation |    20% | Basic/Intermediate hardening, new-fixture/onboarding, multi-season implementation, corrections/provenance, statistics/frontend improvements                                   | Most owning implementation issues are closed; user validation remains open for #604 and high-priority defect #779 remains               | Keep #604/#779 explicit; do not claim defect-free completion                                     |
| API Implementation     |    20% | Public OpenAPI specification and Explorer (#658–#661), consumer controls, dataset/API work, selected Advanced API issues #608–#611                                            | Substantial API work shipped; #776 remains open and #612 has not validated the selected Advanced group                                  | Record #776/#612 final disposition and link final issue evidence                                 |
| Performance            |     5% | #599 representative 300-fixture/72,000-event local revalidation; prior deployed season-scale acceptance; later deployed API response-time follow-up #765                      | Local targets passed/no regression; deployed response-time evidence must be linked from current main; #599 retains explicit limitations | Link #765 final evidence; keep release-generation variance and test-isolation limitation visible |
| Improvement            |     5% | Sprint 2 stakeholder feedback converted into #579–#582/#513; #647 closure-gate refinement; API Explorer and UX improvements; Sprint 3 stakeholder review                      | Evidence exists of feedback-driven and process-driven change                                                                            | Link exact issue/PRs used in final close-out                                                     |
| Documentation          |    15% | #577 planning; #579 DB docs; #578 coverage docs; API/OpenAPI docs; deployment/testing docs; Sprint evidence; #613 close-out and this traceability page                        | Substantive documentation trail exists                                                                                                  | Final link audit and strict docs build                                                           |
| Project Methodology    |    15% | Scrumban/progressive refinement; issue tracker; stand-ups; stakeholder interaction; formal user-testing gates; acceptance/performance gates; explicit carry-forward           | Methodology is evidenced across the sprint and unfinished work is visible                                                               | Record peer review and final milestone/tag evidence                                              |

## User-Feedback Gate Traceability

The consolidated source of truth is
[`evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md).

| Gate | User goal                                            | Current close-out treatment                                                                                        |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| #601 | Navigation, authentication and overall frontend flow | Accepted with documented limitations in retained summary                                                           |
| #602 | Public statistics and fixture analytics              | Closed in current Gitea milestone state; final retained result/retest must be reconciled from current main         |
| #603 | New fixture submission and reviewer onboarding       | Closed in current Gitea milestone state; final retained result must be reconciled from current main                |
| #604 | Season and multi-season back-catalogue ingestion     | **OPEN — incomplete**                                                                                              |
| #605 | Corrections, stable identity and provenance          | Closed **not accepted**; findings deferred in #778; exact finding rows must be copied from final retained evidence |
| #606 | Versioned dataset release and reproducibility        | Accepted in retained summary                                                                                       |
| #607 | API consumer keys, quotas and rate limits            | Accepted with documented limitations in retained summary                                                           |
| #612 | Selected Advanced API consumer capabilities          | **OPEN — incomplete**                                                                                              |

Closing an issue is not treated as a synonym for a passing user result.

## Automated Coverage Traceability — #578

Retained baseline:

| Metric     | Covered / total | Percentage |
| ---------- | --------------: | ---------: |
| Lines      |   5,466 / 8,566 |     63.81% |
| Statements |   5,628 / 8,999 |     62.54% |
| Functions  |   1,385 / 2,013 |     68.80% |
| Branches   |   3,790 / 6,627 |     57.19% |

The repository aggregation is counter-based across frontend, backend, worker, contracts and
batch-processing; unimported production source remains in the denominator. Temporary pass/fail line
thresholds were used to prove enforcement and were not adopted as an invented course threshold.

Evidence:
[`evidence/validation/issue-578-repository-code-coverage.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-578-repository-code-coverage.md).

## Intermediate Acceptance Traceability — #598

**Explicit result in this pre-finalisation record: PENDING FINAL IMPORT.**

#598 is closed in the current milestone state, but the repository snapshot used for this draft does
not contain the authoritative final closure record needed to state PASS or FAIL responsibly.

The final #613 pass must insert the exact result and link its deployed evidence. A closed issue alone
is not used as proof of acceptance.

## Performance Traceability — #599 / #765

#599 measured a deterministic 300-fixture / 72,000-event corpus locally and reports that all targets
set before measurement passed with no regression against the comparable prior local evidence.

Examples from the least favourable of the three primary local API runs:

| Operation             |      P95 |   Target |
| --------------------- | -------: | -------: |
| Public fixture page   |  15.3 ms |   500 ms |
| Fixture event page    |  33.1 ms |   750 ms |
| Fixture statistics    |  43.9 ms | 1,500 ms |
| Participant aggregate | 259.4 ms | 1,500 ms |
| CSV event export      |  69.9 ms | 1,000 ms |

These are **local** results, not deployed response times.

The same report records important non-pass-style findings:

- dataset release generation ranged from 4.3 s to 16.2 s for identical output and remains too
  variable for a stable target;
- the query-plan check must be isolated from the shared database suite; and
- horizontal scaling was not tested even though the original single-replica rationale may have
  changed after shared rate-limit state.

A later deployed-response-time follow-up exists under #765. Add its merged evidence link and final
figures during #613 finalisation.

## API / Advanced Traceability

### Public API / OpenAPI experience

Sprint 3 added the externally usable API documentation path through #658–#661:

- anonymous OpenAPI specification exposure;
- hardened contract metadata/linting;
- public Swagger API Explorer; and
- product navigation/integration plus deployment/browser verification.

### Selected Advanced work

The sprint intentionally selected only four Advanced API issues rather than the entire Advanced tier.

| Issue | Capability                         | Actual treatment                                                          |
| ----- | ---------------------------------- | ------------------------------------------------------------------------- |
| #608  | API deprecation lifecycle          | Closed in current milestone state; link final evidence before #613 closes |
| #609  | OpenAPI / API contract enforcement | Closed; contract/deployment tests provide supporting evidence             |
| #610  | Per-consumer API usage             | Core issue closed; administrator visibility follow-up #776 still open     |
| #611  | Advanced aggregate-query support   | Closed in current milestone state; link final evidence before #613 closes |
| #612  | Representative user validation     | **Open — selected Advanced group is not yet fully user-validated**        |

No claim is made that unselected Advanced project-brief requirements were completed.

## Stakeholder Feedback Traceability

The 22–24 September asynchronous stakeholder review asked whether any important cricket/analytics/API
capability was missing and what one item should be prioritised before Sprint 3 closed.

The stakeholder reported no important missing capability or major pre-close change from what they had
seen, but raised two minor UX concerns:

- page-position/pagination clarity in seasons/players views; and
- asynchronous API Explorer rendering without a visible loading indicator/spinner.

Evidence is retained under `evidence/sprints/sprint-3/2026-09-22 Asynch Stakeholder meeting/` and
summarised in `evidence/sprints/sprint-3/2026-09-28-stakeholder-review.md`.

## Known Open Work / Limitations

| Item                             | Why it remains visible                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| #604                             | Required user-feedback gate is still open                                             |
| #612                             | Selected Advanced user-feedback gate is still open                                    |
| #776                             | Administrator per-consumer usage visibility is still open                             |
| #779                             | High-priority admin fixture selector performance defect is still open                 |
| #605/#778                        | Closed but not accepted; findings are deferred, so closure is not presented as a pass |
| #599 release-generation variance | Performance evidence remains variable for this workload                               |
| #598 final result                | Must be imported explicitly before milestone closure                                  |

## Milestone / Tag Evidence

**Pending finalisation.** The final Sprint 3 tag and commit SHA must be added only after the close-out
has been reconciled with current `main` and reviewed by another team member.

## Finalisation Checklist

- [ ] Reconcile latest #601–#607/#612 summary with this page.
- [ ] Add exact #598 PASS/FAIL and deployed acceptance link.
- [ ] Add merged #765 deployed response-time evidence and final figures.
- [ ] Update #604 / #612 / #776 / #779 final disposition.
- [ ] Link final issue/PR evidence for #608–#611 individually.
- [ ] Run strict documentation build and link/check all marker-facing evidence.
- [ ] Obtain another team member's review of the close-out/traceability.
- [ ] Add final Sprint 3 tag name and commit SHA.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
