# Sprint 3 Close-Out

**Sprint:** Sprint 3
**Date:** 28 September 2026
**Team:** Git Push Pray
**Related Issue:** #613
**Retrospective Format:** Asynchronous team reflection via WhatsApp
**Milestone Status:** **Sprint 3 closed**

## Sprint Goal

Sprint 3 was the near-complete-product milestone: stabilise the Basic and Intermediate work, integrate
Sprint 2 feedback, strengthen the analytics/API experience, exercise the system with formal user
testing and representative-scale performance evidence, and attempt selected Advanced API work
without hiding unfinished scope.

The planning baseline is retained in `2026-09-15-planning.md` and Issue #577.

## Sprint Result

Sprint 3 materially strengthened the product, testing evidence, public API experience, documentation,
deployment process and methodology trail.

At the Sprint 3 boundary, the milestone showed only two open issues:

- #612 — representative user validation of selected Advanced API consumer capabilities; and
- #613 — this Sprint 3 close-out.

#612 is treated as explicit carry-forward into the final-submission period rather than being
represented as completed Sprint 3 work. #613 is completed by this close-out record.

Issues #604, #776 and #779, which were still open earlier on 28 September, were closed before the
Sprint 3 close-out.

## Completed / Evidenced Work

### Sprint planning and documentation baseline

- #577 established the refined Sprint 3 goal, carry-over rationale, execution order, risks and
  initial rubric traceability.
- #579 consolidated database schema, deployment and design-motivation documentation.
- Sprint evidence includes the 17 September stand-up, the 22–24 September asynchronous stakeholder
  interaction, and later Sprint 3 stand-up evidence.

### Repository-wide automated coverage

Issue #578 established one repository-wide coverage command across the five production workspaces.

The retained verification record reports:

- lines: **5,466 / 8,566 = 63.81%**;
- statements: **5,628 / 8,999 = 62.54%**;
- functions: **1,385 / 2,013 = 68.80%**;
- branches: **3,790 / 6,627 = 57.19%**.

Threshold enforcement was exercised in both directions: a temporary 63.82% line threshold correctly
failed and 63.80% correctly passed. No course-mandated numeric threshold was invented.

Evidence: `../../validation/issue-578-repository-code-coverage.md`.

### Public API documentation and Explorer

Sprint 3 added and hardened the public OpenAPI experience, including:

- backend exposure of the OpenAPI specification;
- contract hardening and linting;
- a public Swagger API Explorer;
- navigation/integration of the Explorer into the product; and
- deployment/browser verification for the Explorer experience.

The OpenAPI/API Explorer work is represented by #658–#661 and the related API documentation and tests.

### Representative-scale performance work

Issue #599 re-ran the representative local performance suite against a deterministic corpus of
**300 fixtures / 72,000 delivery events**.

The retained report records that the local targets set before measurement passed and that no measured
code path regressed against comparable prior local evidence.

The report also added baselines for:

- filtered/deeply paginated reads;
- API-consumer enforcement overhead;
- batch-report reads;
- dataset release generation; and
- cold-start observations.

The original #599 measurements were local against embedded PostgreSQL over loopback rather than
deployed response times. A later Sprint 3 follow-up (#765) recorded deployed API response-time
evidence.

The retrospective records an important Sprint 3 lesson from the deployed measurements: local
performance results did not fully predict deployed behaviour, so deployed measurement needs to happen
earlier in the final-submission period.

## Formal User-Feedback Process

Sprint 3 used the formal task-based user-testing process:

- Success / Partial / Failure per task;
- S1–S4 finding severity;
- explicit Accept / Defer / Reject decisions; and
- retest evidence where required.

The Sprint 3 close-out preserves the difference between issue closure and user acceptance.

| Gate | User goal                                            | Sprint 3 close-out treatment                                            |
| ---- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| #601 | Navigation, authentication and overall frontend flow | Accepted with documented limitations in retained summary                |
| #602 | Public statistics and fixture analytics              | Closed; retained result/retest remains in the Sprint 3 testing evidence |
| #603 | New fixture submission and reviewer onboarding       | Closed; retained result remains in the Sprint 3 testing evidence        |
| #604 | Season and multi-season back-catalogue ingestion     | Closed before Sprint 3 close-out                                        |
| #605 | Corrections, stable identity and provenance          | Closed **not accepted**; findings deferred in #778                      |
| #606 | Versioned dataset release and reproducibility        | Accepted in retained summary                                            |
| #607 | API consumer keys, quotas and rate limits            | Accepted with documented limitations in retained summary                |
| #612 | Selected Advanced API consumer capabilities          | **Carried forward into final submission**                               |

The authoritative consolidated source remains:
`../../user-testing/sprint-3/sprint-3-user-testing-summary.md`.

## Acceptance and Verification

Sprint 3 acceptance work included deployed and integrated verification, rather than relying only on
local/unit-level checks.

Issue #598 owned the Basic and Intermediate end-to-end acceptance exercise on the deployed Sprint 3
build and is closed in the Sprint 3 milestone. This close-out does not invent a separate PASS/FAIL
label where the exact owning-issue wording is not reproduced here; the acceptance result and evidence
remain authoritative in #598 and its retained evidence.

The Sprint 3 retrospective reinforces that deployed acceptance testing exposed defects that local
testing did not, and that acceptance testing should be run earlier and in smaller slices during the
final-submission period.

## API Implementation Status

Sprint 3 materially extended the API product:

- the OpenAPI contract is exposed and documented;
- the public API Explorer is deployed;
- consumer authentication/rate-limit/quota behaviour has dedicated API/user evidence;
- dataset release and analytics APIs remain part of the public analysis workflow; and
- selected Advanced API work was implemented individually rather than being claimed as an
  all-or-nothing Advanced tier.

The administrator-facing per-consumer usage follow-up #776 was closed before the Sprint 3 close-out.

## Selected Advanced Scope

Sprint 3 deliberately selected four Advanced API capabilities rather than claiming the entire
Advanced project tier.

| Issue | Capability                                                   | Sprint 3 treatment                                                        |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| #608  | API deprecation lifecycle                                    | Completed / closed                                                        |
| #609  | Automated OpenAPI / contract enforcement                     | Completed / closed                                                        |
| #610  | Per-consumer API usage                                       | Core issue completed; administrator visibility follow-up #776 also closed |
| #611  | Advanced aggregate-query support                             | Completed / closed                                                        |
| #612  | Representative user validation of selected Advanced API work | Carried forward into final submission                                     |

This does **not** claim that the entire Advanced project tier was completed. Unselected Advanced
requirements remain outside the Sprint 3 completion claim.

## Stakeholder Feedback and Decisions

The planned 22 September stakeholder check-in moved to WhatsApp because the normal slot clashed with
a test. The team sent the stakeholder the deployed product/API links and summarised the main Sprint 3
changes.

On 24 September the stakeholder replied that, from what they had seen, they did not identify an
important missing product/API capability and did not identify a major pre-close change.

Two minor UX concerns were raised:

1. seasons/players pagination did not make the current page/position sufficiently obvious; and
2. the API Explorer could render sections asynchronously without a visible loading indicator,
   making the page look incomplete for the first few seconds.

The stakeholder suggested a loading spinner for the API Explorer.

These comments are retained as qualitative Sprint 3 feedback. They do not override acceptance,
testing or defect evidence.

Evidence: `2026-09-28-stakeholder-review.md` and the retained screenshots under
`2026-09-22 Asynch Stakeholder meeting/`.

## Known Defects, Limitations and Carry-Forward

Sprint 3 closed with the following limitations recorded rather than hidden:

- **#612** remained open at the Sprint 3 boundary and is carried into the final-submission period.
- **#605/#778** closed **not accepted**, with findings deferred.
- #599 dataset-release generation showed large run-to-run variance for the same workload.
- #599 query-plan checks required isolated execution because the full shared database suite could
  interfere with the measurement.
- deployed performance was materially worse than local performance in later measurements, reinforcing
  the need for earlier deployed verification.
- previously open #604, #776 and #779 were closed before Sprint 3 close-out.

## Team Reflection

The Sprint 3 retrospective was conducted asynchronously through the team's WhatsApp group on
28 September 2026.

Each team member was asked to provide:

1. what went well in Sprint 3;
2. what did not go well or caused problems; and
3. what the team should change or improve for the final-submission period.

Responses were received from all six team members and are consolidated below.

## Individual Responses

### Shayna Unterslak

**What went well**

The team got a lot done during the sprint and improved at splitting work into proper issues and
working independently. Good progress was made on the API/OpenAPI work, the API Explorer, testing,
documentation and deployment/CI work. The project also began to feel more complete rather than like
a collection of separate features.

**What did not go well**

A significant amount of time was lost to CI/CD and deployment problems, and changes in one area
sometimes broke or blocked work elsewhere. At points, too many things were happening at once, which
made it harder to know whether something was actually working properly after merge. Some proper user
testing / validation was also left too late.

**What should change / improve for the final-submission period**

Shayna's response called for changing the team's working approach for the final period, in the
context of too many simultaneous changes and user testing/validation happening too late. The supplied
screenshot truncates the remainder of that sentence, so this close-out retains only the visible
meaning rather than inventing wording that was not captured.

---

### Ben Swartz

**What went well**

Deployed acceptance testing found defects that local testing did not. On #708 alone it exposed five
defects, including a case where a v1.1 proposal with outcome `won` was rejected by the database. The
existing tests had used tie or no-result cases, which allowed that defect to pass earlier testing.

The user-testing gate also produced useful evidence. One outside-participant session produced eleven
findings, including two S1 findings. A major finding was that the participant could not find a way to
correct data submitted earlier and said they would contact support.

Writing tests that fail first and then proving each fix against the test it unblocks also caught
several problems that otherwise could have appeared correct.

**What did not go well**

Deployed performance was materially worse than the local measurements: all five public reads missed
their deployed targets by approximately 1.4x to 3x even though they passed locally.

The deployed environment also consumed significant time. Two stale frontends were live at different
URLs, a green deployment did not create a new revision in one case, and Gitea intermittently refused
pushes and merges.

Implementation issues were sometimes closed on technical completion before their user-feedback gates
ran. This meant the gates recorded findings against work that was already marked done rather than
gating its release.

**What should change / improve for the final-submission period**

- Measure deployed behaviour earlier rather than relying on local performance numbers.
- Give teammates a heads-up before pushing to someone else's branch.
- Remove or redirect the stale `azurewebsites` frontend so there is one authoritative deployed
  frontend.
- Decide the performance/scaling approach before the final demonstration, including whether the
  existing single-replica / 0.5 CPU cap is still justified after #595.

---

### Gabriel Raz

**What went well**

Solid progress was made on the external API work, including consumer-usage visibility, implementing
and verifying the API deprecation lifecycle, and strengthening the related API tests and evidence.
The account/security navigation was also cleaned up, making that area clearer for users. The
issue-based workflow worked well for traceability and independent work.

**What did not go well**

Keeping feature work aligned with frequent changes on `main` took time, especially where
documentation, AI evidence and API contracts overlapped. Some work needed several rounds of
verification and follow-up fixes before it was ready, which slowed progress.

**What should change / improve for the final-submission period**

Lock down the key user flows and deployed API behaviour early, then focus on regression testing and
targeted fixes. For API changes, keep implementation, tests, OpenAPI/documentation and verification
evidence together in the same change so that contracts do not drift.

---

### Dean Feldman

**What went well**

The team moved a large amount of core functionality into a more stable state. Testing improved,
production-scale deployment acceptance was completed, several bugs identified through user testing
were fixed, and the documentation/evidence became much more complete.

**What did not go well**

Time was lost to deployment issues, merge conflicts, failing tests and branches becoming out of
sync. Some acceptance testing was left too late and the test scope became too large, so bugs were
discovered near the end of the sprint in larger groups and were harder to fix quickly.

**What should change / improve for the final-submission period**

Run smaller acceptance tests earlier and more often instead of large acceptance passes near the
deadline. Merge completed work earlier, keep branches smaller and current, capture evidence as work
is completed, and focus the final-submission period on stabilisation, performance and remaining bugs
rather than unnecessary new features.

---

### Nadav Sundy

**What went well**

A large amount of implementation work was completed, together with improvements and fixes to earlier
work so that it was closer to the standard required for the final product.

**What did not go well**

Some issues had been implemented without the full user journey or complete use cycle being properly
planned. Problems therefore became obvious only when features were used together or tested more
realistically. Previous work also had to be redone where it technically worked but was not at the
required standard.

**What should change / improve for the final-submission period**

Plan and review issues around the complete end-to-end use case before considering them complete,
including integration, edge cases, usability and testing. Be stricter about the quality of completed
work earlier so that less rework is required later.

---

### Liora Rosenberg

**What went well**

The team made good progress, especially in implementing and testing several features and bug fixes.
Work was split effectively between team members, and team members helped each other when someone got
stuck.

**What did not go well**

Some issues took longer than expected because of merge conflicts, CI/test failures and follow-up
fixes after integration. It was also sometimes difficult to keep track of changes happening across
different branches.

**What should change / improve for the final-submission period**

Communicate earlier when problems arise, keep branches and commits focused on individual issues, and
test changes more thoroughly before merging. This should reduce last-minute fixes and make final
integration smoother.

## Final Submission Actions

The retrospective produces the following concrete actions for the final-submission period:

| Action                                        | How it will be applied                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test deployed behaviour earlier               | Run deployed acceptance and performance checks earlier and repeatedly rather than relying on local results until the end.                                                        |
| Use smaller, earlier acceptance gates         | Exercise smaller end-to-end slices while the related implementation is still fresh instead of accumulating one large late acceptance pass.                                       |
| Treat the full user journey as part of Done   | Before considering implementation complete, check integration, edge cases, usability, user-feedback dependencies and relevant regression tests.                                  |
| Keep changes focused and synchronised         | Keep branches/commits scoped to individual issues, merge completed work earlier, stay current with `main`, and communicate before changing another person's branch.              |
| Keep API implementation and evidence together | For API changes, update implementation, tests, OpenAPI/documentation and verification evidence together to reduce contract drift.                                                |
| Remove deployment ambiguity                   | Maintain one authoritative deployed frontend/revision, remove or redirect stale deployments, and verify that a successful pipeline actually produced the intended live revision. |
| Prioritise stabilisation over optional scope  | Use the final-submission period primarily for regression testing, deployed performance, remaining defects, evidence and polish rather than unnecessary new features.             |

Across the team, the recurring theme was that Sprint 3 produced substantial functional and evidence
progress, but too much confidence still depended on late integrated/deployed validation.

The final-submission period therefore prioritises earlier deployed verification, smaller acceptance
cycles, tighter branch discipline and end-to-end quality over additional optional scope.

## Sprint 3 Requirements / Rubric Traceability

The marker-facing evidence mapping is maintained in:

`../../../docs/planning/sprint-3-requirements-traceability.md`

The original planned mapping remains in `2026-09-15-planning.md` as historical planning evidence.

## Sprint 3 Milestone Decision

Sprint 3 is considered closed with:

- the retrospective complete;
- stakeholder interaction recorded;
- completed Sprint 3 work evidenced;
- incomplete Advanced validation (#612) explicitly carried forward;
- known limitations recorded rather than hidden; and
- the final-submission actions derived from the team's retrospective.

The reviewed Sprint 3 repository state should be represented by the `sprint-3` milestone tag once the
close-out change is merged to `main` and the exact reviewed commit is known.

The tag is a repository-recording step and does not change the Sprint 3 completion decision recorded
here.

## Related Evidence

- Gitea issue #613
- Sprint 3 milestone
- `evidence/sprints/sprint-3/2026-09-15-planning.md`
- `evidence/sprints/sprint-3/2026-09-28-stakeholder-review.md`
- Sprint 3 stand-up evidence
- Sprint 3 user-testing summary and session evidence
- #578 — repository-wide code coverage
- #598 — Basic/Intermediate deployed acceptance
- #599 — representative-scale performance re-validation
- #658–#661 — OpenAPI/API Explorer work
- #765 — deployed API response-time evidence
- #778 — corrections/provenance user-feedback disposition
- Sprint 3 requirements/rubric traceability
- `sprint-3` annotated milestone tag once created

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
