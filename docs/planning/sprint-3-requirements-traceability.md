# Sprint 3 Requirements and Rubric Traceability

**Related issues:** #577, #613
**Evidence status:** **Sprint 3 finalised under #613; later final-submission work is tracked separately**

**State refresh:** 29 September 2026 - #613 completed the Sprint 3 close-out; #612 was explicitly carried forward into the final-submission period.

This page converts the Sprint 3 planning baseline into marker-facing **actual evidence**. It does not
award a mark or infer completion from an issue being closed. Where the current evidence is incomplete,
that limitation is stated explicitly.

The historical planned mapping remains in
[`evidence/sprints/sprint-3/2026-09-15-planning.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-3/2026-09-15-planning.md){ target="_blank" rel="noopener" }.
The Sprint 3 close-out record is
[`evidence/sprints/sprint-3/2026-09-28-sprint-3-close-out.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-3/2026-09-28-sprint-3-close-out.md){ target="_blank" rel="noopener" }.

## Current Milestone State

At the 28 September close-out, #612 was explicitly carried forward and #613 completed the Sprint 3 close-out. #612 subsequently completed its final user-feedback gate as **Accepted with documented limitations**. The final Sprint 3 tag is `sprint3` at commit `91a17a17`. No Sprint 3 milestone issue remains open in the current repository state.

Issues #604, #776 and #779 have closed since the first pre-finalisation draft. Their closed state is
recorded here, but the final close-out still links their actual retained evidence rather than treating
issue closure alone as proof of a passing test or defect resolution.

Everything below is interpreted against that visible state. #612 remains incomplete until its final
user-feedback outcome is recorded.

## Sprint 3 Rubric — Planned vs Actual Evidence

| Rubric category        | Weight | Actual Sprint 3 evidence                                                                                                                                            | Current evidence state                                                                                                                                                                                                                                                                                                         | Finalisation action                                                                                      |
| ---------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| User Feedback          |    10% | Formal task-based process under #600 with retained Sprint 3 session evidence for #601-#607 and #612                                                                 | All Sprint 3 user-feedback gates are closed. #604 is **Accepted with documented limitations**; #605 is **Not accepted**; #612 is **Accepted with documented limitations**. #602 retains its original `PUB-06` Partial participant outcome because no retained participant rerun on the corrected comparison workflow was found | Preserve historical participant outcomes separately from later implementation and final-gate disposition |
| Automated Testing      |    10% | #578 repository-wide coverage; regression/unit/API/database/worker/frontend suites; Playwright; OpenAPI/deployment tests; #598 acceptance                           | Strong automated evidence exists and the authoritative #598 intermediate-acceptance result is PASS                                                                                                                                                                                                                             | Retain the authoritative #598 acceptance record and final CI/deployment evidence                         |
| Feature Implementation |    20% | Basic/Intermediate hardening, new-fixture/onboarding, multi-season implementation, corrections/provenance, statistics/frontend improvements                         | The previously open high-priority #779 defect is closed and no Sprint 3 milestone issue remains open; historical user-testing limitations remain documented separately                                                                                                                                                         | Link #779 final fix/verification evidence and keep any retained limitations explicit                     |
| API Implementation     |    20% | Public OpenAPI specification and Explorer (#658–#661), consumer controls, dataset/API work, selected Advanced API issues #608–#611                                  | #776 is closed; #612 subsequently completed its final gate as Accepted with documented limitations                                                                                                                                                                                                                             | Retain #776 evidence and the documented #612 final-gate limitations                                      |
| Performance            |     5% | #599 representative 300-fixture/72,000-event local revalidation; prior deployed season-scale acceptance; later deployed API response-time follow-up #765            | Local targets passed/no regression; deployed response-time evidence must be linked from current main; #599 retains explicit limitations                                                                                                                                                                                        | Link #765 final evidence; keep release-generation variance and test-isolation limitation visible         |
| Improvement            |     5% | Sprint 2 stakeholder feedback converted into #579–#582/#513; #647 closure-gate refinement; API Explorer and UX improvements; Sprint 3 stakeholder review            | Evidence exists of feedback-driven and process-driven change                                                                                                                                                                                                                                                                   | Link exact issue/PRs used in final close-out                                                             |
| Documentation          |    15% | #577 planning; #579 DB docs; #578 coverage docs; API/OpenAPI docs; deployment/testing docs; Sprint evidence; #613 close-out and this traceability page              | Substantive documentation trail exists                                                                                                                                                                                                                                                                                         | Final link audit and strict docs build                                                                   |
| Project Methodology    |    15% | Scrumban/progressive refinement; issue tracker; stand-ups; stakeholder interaction; formal user-testing gates; acceptance/performance gates; explicit carry-forward | Methodology is evidenced across the sprint and unfinished work is visible                                                                                                                                                                                                                                                      | Record peer review and final milestone/tag evidence                                                      |

## User-Feedback Gate Traceability

The consolidated source of truth is
[`evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md){ target="_blank" rel="noopener" }.

| Gate | User goal                                            | Current close-out treatment                                                                                                                                                                                                                |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #601 | Navigation, authentication and overall frontend flow | Accepted with documented limitations in retained summary                                                                                                                                                                                   |
| #602 | Public statistics and fixture analytics              | Closed after #716 implementation; original PUB-06 participant result remains Partial because no retained participant rerun was found                                                                                                       |
| #603 | New fixture submission and reviewer onboarding       | Accepted with documented limitations; original REV-06 Partial/deferred #770 finding remains part of the Sprint 3 evidence                                                                                                                  |
| #604 | Season and multi-season back-catalogue ingestion     | Accepted with documented limitations in the retained Sprint 3 summary                                                                                                                                                                      |
| #605 | Corrections, stable identity and provenance          | Closed **Not accepted**; retained Sprint 3 evidence records the deferred findings and two unresolved S1 findings at close-out                                                                                                              |
| #606 | Versioned dataset release and reproducibility        | Accepted in retained summary                                                                                                                                                                                                               |
| #607 | API consumer keys, quotas and rate limits            | Accepted with documented limitations in retained summary                                                                                                                                                                                   |
| #612 | Selected Advanced API consumer capabilities          | **Accepted with documented limitations** - `API-02`, `API-03` and `API-04` succeeded; accepted `P13-F01` was implemented through #783 and the deployed `PUB-05` retest passed. The exact retest deployment SHA was not separately retained |

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
[`evidence/validation/issue-578-repository-code-coverage.md`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/validation/issue-578-repository-code-coverage.md){ target="_blank" rel="noopener" }.

## Intermediate Acceptance Traceability — #598

**Final #598 intermediate-acceptance result: PASS.**

#598 closed with an authoritative **PASS** result. The retained acceptance record documents the
deployed-revision boundary, scenario ledger, fixed-and-retested blockers and explicit limitations.

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

| Issue | Capability                         | Actual treatment                                                                                                            |
| ----- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| #608  | API deprecation lifecycle          | Closed in Sprint 3; final evidence is retained in the linked validation/API records                                         |
| #609  | OpenAPI / API contract enforcement | Closed; contract/deployment tests provide supporting evidence                                                               |
| #610  | Per-consumer API usage             | Core issue and administrator-visibility follow-up #776 closed in Sprint 3; final evidence is retained in the linked records |
| #611  | Advanced aggregate-query support   | Closed in Sprint 3; final evidence is retained in the linked validation/API records                                         |
| #612  | Representative user validation     | **Open — selected Advanced group is not yet fully user-validated**                                                          |

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

| Item                             | Current close-out treatment                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| #612                             | **Open.** Selected Advanced user-feedback gate is the only non-close-out Sprint 3 issue still open |
| #604                             | Closed; retained Sprint 3 result is **Accepted with documented limitations**                       |
| #776                             | Now closed; final implementation/verification evidence should be linked                            |
| #779                             | Now closed; final defect-fix/retest evidence should be linked                                      |
| #605/#778                        | Closed but **not accepted**; findings are deferred, so closure is not presented as a pass          |
| #599 release-generation variance | Performance evidence remains variable for this workload                                            |
| #598 final result                | **PASS** ? authoritative acceptance record retained in the repository                              |

## Milestone / Tag Evidence

**Final Sprint 3 tag:** `sprint3` at commit `91a17a17`.

The tag contains the final #613 Sprint 3 close-out merge. Historical close-out records remain unchanged where they describe the state at the time they were written.

## Finalisation Checklist

- [ ] Reconcile latest #601–#607/#612 summary with this page, including the exact final #604 result.
- [x] Record the authoritative #598 result as PASS and retain its acceptance evidence.
- [ ] Add merged #765 deployed response-time evidence and final figures.
- [x] Refresh milestone status: #613 completed the close-out; #612 was carried forward and subsequently closed with documented limitations.
- [ ] Link final closure/verification evidence for #604 / #776 / #779.
- [x] Record #612 as Sprint 3 carry-forward and preserve its later Accepted-with-documented-limitations final-gate result.
- [ ] Link final issue/PR evidence for #608–#611 individually.
- [ ] Run strict documentation build and link/check all marker-facing evidence.
- [ ] Obtain another team member's review of the close-out/traceability.
- [x] Record final Sprint 3 tag `sprint3` at commit `91a17a17`.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
