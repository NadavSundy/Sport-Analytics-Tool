# Sprint 3 Close-Out — Pre-Finalisation Record

**Sprint:** Sprint 3
**Date prepared:** 28 September 2026
**Team:** Git Push Pray
**Related issue:** #613
**Status:** **PRE-FINALISATION — keep #613 open**

**State refresh:** Later on 28 September 2026, the Sprint 3 milestone showed only #612 and #613 open; #604, #776 and #779 had closed.

> This record deliberately separates evidence already available from work that is still open.
> It is intended to complete the substantive close-out work before the milestone freeze. The final
> pass must reconcile the latest Gitea state, import any newer retained evidence, record the final
> #598 PASS/FAIL result, obtain a second-team-member review, and add the Sprint 3 tag/commit.

## Sprint Goal

Sprint 3 was planned as the near-complete-product milestone: stabilise the Basic and Intermediate
work, integrate Sprint 2 feedback, expand the analytics/API experience, exercise the system with
formal user testing and representative-scale performance evidence, and attempt selected Advanced
API work without hiding unfinished core work.

The planning baseline is retained in `2026-09-15-planning.md` and Issue #577.

## Sprint Result So Far

Sprint 3 materially strengthened the product, test evidence, public API experience, documentation
and methodology trail. The milestone state was refreshed later on 28 September after further issue
closure.

At this refresh, only **two Sprint 3 milestone issues remain open**:

- #612 — user validation for selected Advanced API consumer capabilities; and
- #613 — this Sprint 3 close-out.

Issues #604, #776 and #779, which were still open when this pre-finalisation record was first drafted,
are now shown as **closed** in Gitea. Their closure is recorded here as current milestone state; it is
not used by itself to infer a passing user-test result or to replace the final issue/PR evidence that
must be linked before #613 closes.

The sprint therefore remains **pre-finalisation** rather than tagged/finalised, but the remaining
milestone work is now concentrated in #612 plus this close-out.

## Completed / Evidenced Work

### Sprint planning and documentation baseline

- #577 established the refined Sprint 3 goal, carry-over rationale, execution order, risks and
  initial rubric traceability.
- #579 consolidated database schema, deployment and design-motivation documentation.
- Sprint evidence includes the 17 September stand-up, the 22–24 September asynchronous stakeholder
  interaction, and a later stand-up record.

### Repository-wide automated coverage

Issue #578 established one repository-wide coverage command across the five production workspaces.
The retained verification record reports:

- lines: **5,466 / 8,566 = 63.81%**;
- statements: **5,628 / 8,999 = 62.54%**;
- functions: **1,385 / 2,013 = 68.80%**;
- branches: **3,790 / 6,627 = 57.19%**.

Threshold enforcement was also exercised in both directions: a temporary 63.82% line threshold
correctly failed and 63.80% correctly passed. No course-mandated numeric threshold was invented.

Evidence: `../../validation/issue-578-repository-code-coverage.md`.

### Public API documentation and explorer

Sprint 3 added and hardened the public OpenAPI experience, including:

- backend exposure of the OpenAPI specification;
- contract hardening and linting;
- a public Swagger API Explorer;
- navigation/integration of the explorer into the product; and
- deployment/browser evidence for the API Explorer experience.

The OpenAPI/API Explorer work is represented by #658–#661 and the related API documentation and
tests.

### Representative-scale performance re-validation

Issue #599 re-ran the representative local performance suite against a deterministic corpus of
**300 fixtures / 72,000 delivery events**.

The retained report states that every target set before measurement passed and that no measured
code path regressed against the comparable prior local evidence. It also added baselines for
filtered/deeply paginated reads, API-consumer enforcement overhead, batch-report reads, dataset
release generation, and cold-start observations.

Important qualification: the #599 measurements are local against embedded PostgreSQL over loopback;
they are **not deployed response times**. The report deliberately records that limitation. A later
Sprint 3 follow-up (#765) recorded deployed API response-time evidence; the finalisation pass must
link the merged #765 evidence and final figures from current `main` before #613 closes.

Evidence: `issue-599-performance-revalidation.md` and `../../validation/issue-599/`.

### Formal user-feedback process

Sprint 3 retained the task-based user-testing process: Success / Partial / Failure per task, S1–S4
finding severity, explicit Accept / Defer / Reject decisions, and retest evidence where required.

The repository snapshot used to prepare this record contains formal evidence for P07–P10 and records
these results:

- #601 — **Accepted with documented limitations**;
- #606 — **Accepted**;
- #607 — **Accepted with documented limitations**.

The current Gitea milestone state shows #602, #603 and #605 closed as well. Their final retained
evidence is newer than parts of the repository snapshot used for this draft and must be reconciled
from current `main` during finalisation rather than reconstructed from memory.

For #605 specifically, the later close-out record linked from #778 records the gate as **not
accepted**, with its findings **deferred**. #613 must preserve that result rather than turning the
closed issue into a pass.

#604 is now closed in the current milestone state, but its exact final user-testing result must still be reconciled from the retained evidence; closure is not treated as a synonym for PASS. #612 remains open and is therefore not claimed as a completed user-feedback gate.

## User Feedback Summary

### Participants / roles already retained in the evidence snapshot

| Participant | Role / context                                    | Gate |
| ----------- | ------------------------------------------------- | ---- |
| P07         | Public/viewer; approved submitter; reviewer/admin | #601 |
| P08         | Public statistics participant                     | #602 |
| P09         | Technically competent API consumer                | #607 |
| P10         | Administrator; analyst/data-oriented participant  | #606 |

Any later Sprint 3 participants added after this snapshot must be appended during the finalisation
pass from the retained session files.

### Task outcomes and retained findings already visible

The Sprint 3 summary records task-level Success / Partial / Failure outcomes rather than replacing
participant results with facilitator interpretation.

Findings already present in the retained summary include:

| Finding | Gate | Task    | Severity | Decision | Follow-up / retest                                                 |
| ------- | ---- | ------- | -------- | -------- | ------------------------------------------------------------------ |
| P07-F01 | #601 | AUTH-04 | S3       | Accept   | #713; no S1/S2 retest required                                     |
| P07-F02 | #601 | SUB-01  | S3       | Accept   | #714; no S1/S2 retest required                                     |
| P08-F01 | #602 | PUB-06  | S2       | Accept   | #716; final retest/result must be reconciled from current evidence |
| P09-F01 | #607 | API-01  | S3       | Accept   | #743; deployed technical retest passed                             |

For #605, use the final #778 evidence during the finalisation pass. Its disposition is retained as
**not accepted / findings deferred**; finding IDs and exact reasons must be copied from the merged
record rather than invented here.

The authoritative consolidated summary remains:
`../../user-testing/sprint-3/sprint-3-user-testing-summary.md`.

## Automated Testing and Coverage

Sprint 3 evidence includes:

- repository-wide coverage and threshold enforcement under #578;
- unit/API/database/worker/frontend suites used throughout feature work;
- Playwright/browser regression coverage for user-facing flows;
- OpenAPI contract/deployment tests;
- change-aware CI and deployment verification; and
- acceptance/performance-specific regression suites.

The close-out does not treat a green CI run as proof of a feature where the owning acceptance or
user-feedback gate records a failure or deferral.

## Intermediate Acceptance — #598

**FINAL PASS/FAIL: PENDING FINAL EVIDENCE IMPORT.**

The current Sprint 3 milestone state shows #598 is no longer open, but the repository snapshot used
to prepare this pre-finalisation record does not contain the final #598 closure record in a form that
supports a trustworthy PASS/FAIL statement here.

Before #613 closes, replace this section with:

1. the explicit final #598 result (**PASS** or **FAIL**);
2. the deployed build/commit or other immutable build identifier used;
3. the scenarios exercised;
4. defects found and their owning issues;
5. fixes/retests relied on; and
6. any limitations or requirements deliberately carried into final submission.

Do **not** infer PASS merely because #598 is closed.

## Performance Evidence

### What is supported now

- #599 local representative-scale targets passed with no regression against comparable prior local
  evidence.
- Participant aggregate reads remained well inside their target.
- Deep pagination did not degrade relative to the first page in the local measurement.
- API-consumer enforcement overhead was measured locally and remained inside the stated delta target.
- Public reads sampled during local release generation remained inside their targets.

### Explicit limitations / follow-ups

The retained #599 report records these limitations rather than hiding them:

1. deployed response times were not measured by the original #599 local run;
2. dataset-release generation varied from **4.3 s to 16.2 s** for the same 72,000-event workload,
   so no repeatable latency target was set;
3. the opt-in query-plan command interfered with unrelated database tests when run with the full
   suite and therefore had to be isolated; and
4. the API single-replica rationale appeared potentially obsolete after shared rate-limit state,
   but horizontal scaling was not changed or claimed safe by #599.

The later deployed API-response-time record (#765) must be linked during finalisation.

## API Implementation Status

Sprint 3 materially extended the API product rather than treating it as a secondary interface:

- the OpenAPI contract is exposed and documented;
- the public API Explorer is deployed;
- consumer authentication/rate-limit/quota behaviour has dedicated API/user evidence;
- dataset release and analytics APIs remain part of the public analysis workflow; and
- selected Advanced API work was attempted individually rather than being claimed as an all-or-
  nothing Advanced tier.

The administrator-facing per-consumer usage follow-up #776 is now closed in the current milestone
state. The final close-out should link its merged implementation/verification evidence rather than
relying on closure status alone. #612 remains the outstanding representative-user validation gate
for the selected Advanced API capability group.

## Documentation Improvements

Sprint 3 documentation work includes:

- refined planning and rubric mapping (#577);
- database schema/deployment/design motivation consolidation (#579);
- repository-wide code-coverage documentation (#578);
- OpenAPI/API Explorer documentation;
- hosting/deployment documentation;
- formal Sprint 3 user-testing process/evidence; and
- this requirements/rubric traceability and close-out record.

## Project Methodology Evidence

Sprint 3 retained the project's Scrumban / progressive-refinement approach through:

- a refined active Sprint 3 plan rather than blindly executing the original Sprint 1 roadmap;
- Gitea issue/milestone tracking and dependencies;
- weekly/periodic stand-up evidence;
- asynchronous stakeholder review when the normal meeting slot was missed;
- task-based user feedback with explicit finding dispositions;
- separate technical acceptance and performance gates; and
- explicit carry-forward instead of relabelling unfinished work as Done.

The 17 September #647 process refinement also removed circular closure-gate behaviour: user-feedback
issues remained independent validation/evidence gates while actionable findings created or reopened
implementation work.

## Selected Advanced Scope

Sprint 3 deliberately selected four Advanced API capabilities instead of committing to the entire
Advanced project tier.

| Issue | Capability                                                   | Current close-out treatment                                                                                          |
| ----- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| #608  | API deprecation lifecycle                                    | Closed in current milestone state; link final implementation evidence during finalisation                            |
| #609  | Automated OpenAPI / contract enforcement                     | Closed in current milestone state; supported by contract/deployment tests                                            |
| #610  | Per-consumer API usage                                       | Core issue closed; administrator visibility follow-up #776 is now closed; final evidence link still to be reconciled |
| #611  | Advanced aggregate-query support                             | Closed in current milestone state; link final implementation evidence during finalisation                            |
| #612  | Representative user validation of selected Advanced API work | **OPEN — not complete**                                                                                              |

This table does **not** claim the entire Advanced tier. Unselected Advanced requirements remain
future/stretch scope.

## Stakeholder Feedback and Decisions

The planned 22 September stakeholder check-in moved to WhatsApp because the normal slot clashed with
a test. The team sent the stakeholder the deployed product/API links and summarised the main Sprint 3
changes.

On 24 September the stakeholder replied that, from what they had seen, they did not identify an
important missing product/API capability and did not identify a major pre-close change. Two minor UX
concerns were raised:

1. seasons/players pagination did not make the current page/position sufficiently obvious; and
2. the API Explorer could render sections asynchronously without a visible loading indicator,
   making the page look incomplete for the first few seconds.

The stakeholder suggested a loading spinner for the API Explorer.

These comments are recorded as minor follow-up feedback. This close-out does not claim either item
was fixed unless a linked issue/PR provides that evidence.

Evidence: `2026-09-28-stakeholder-review.md` and the retained screenshots under
`2026-09-22 Asynch Stakeholder meeting/`.

## Known Defects and Limitations at Pre-Finalisation

At the latest milestone-state refresh, the only open Sprint 3 issues are **#612** and **#613**.

Previously open items #604, #776 and #779 are now closed in Gitea. Their exact final evidence should
still be linked during finalisation, especially #604 because a closed user-feedback gate does not by
itself establish a passing result.

Remaining limitations / evidence items:

- **#612 — open:** selected Advanced API consumer capabilities still require their final
  representative-user gate or an explicit carry-forward decision.
- **#605/#778:** closed **not accepted**, with findings deferred; closure must not be rewritten as a
  pass.
- **#599:** dataset-release generation showed large unexplained run-to-run variance.
- **#599:** query-plan checks require isolated execution because the full shared database suite can
  interfere with the measurement.
- **#598:** the explicit final acceptance result still needs to be imported from its authoritative
  closure evidence into this close-out.
- **#604 / #776 / #779:** now closed; link their final retained evidence before the milestone record
  is frozen.

## Improvement for Final Submission

The Sprint 2 retrospective identified that too much integration, deployed testing and documentation
accumulated near the milestone boundary. Sprint 3 improved the evidence trail, but the remaining
open gates and late high-priority defect show that the same risk still exists.

For the final-submission period, the team should use an earlier release freeze: stop optional scope,
run complete deployed user journeys and release checks first, and keep evidence current as each
result is obtained instead of rebuilding it at the end.

## Sprint 3 Requirements / Rubric Traceability

The marker-facing actual-evidence mapping is maintained in:

`../../../docs/planning/sprint-3-requirements-traceability.md`

The traceability document distinguishes completed evidence, open work, limitations and finalisation
items. The original planned mapping remains in `2026-09-15-planning.md` as historical planning
evidence.

## Milestone / Tag

**Pending. Do not create the final Sprint 3 tag from this pre-finalisation update.**

The latest milestone view has only #612 and #613 open. The final tag should identify the reviewed
repository state after:

- #612 has either completed its user-feedback gate or is explicitly carried forward with its exact
  final status;
- the closed #604 / #776 / #779 work has its final retained evidence linked where relevant;
- the final #598 PASS/FAIL record is linked;
- current Sprint 3 user-testing summary/evidence is reconciled, including the exact #604 result and
  the #605/#778 not-accepted disposition;
- final CI/coverage/performance links are current;
- another team member has reviewed this close-out; and
- the team agrees the milestone state to freeze.

Record the final annotated tag name and commit SHA here during the final pass.

## Finalisation Checklist

- [x] Refresh the Sprint 3 milestone issue list: only #612 and #613 remain open.
- [ ] Import the final #598 PASS/FAIL result and evidence.
- [ ] Reconcile the current Sprint 3 user-testing summary, including the exact final #604 result and
      #605/#778 deferred/not-accepted disposition.
- [ ] Record the final #612 result or carry it forward explicitly.
- [ ] Link final closure/fix evidence for #776 and #779.
- [ ] Link merged #765 deployed API response-time evidence and final figures.
- [ ] Refresh final CI/coverage/performance links if newer evidence supersedes this draft.
- [ ] Confirm every selected Advanced issue individually as complete/incomplete.
- [ ] Obtain review from another team member and record reviewer/date.
- [ ] Create/record the Sprint 3 annotated tag and commit SHA only after review.
- [ ] Remove the `PRE-FINALISATION` status once all final evidence items above are reconciled.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
