# Sprint 4 feedback decisions and traceability

**P15 outcomes and feedback decisions approved by Gabriel.** Participant reports and technical corroboration remain separate. Accepted improvements are linked to an existing issue; implementation and retesting are not claimed.

| Session / raw source                                                          | Finding ID | Task ID            | Observation                                                           | Severity                                   | Decision           | Decision reason                                                                                                               | Outcome state                                 | Gitea issue                                                                     | Fix PR / commit | Retest requirement / record                                         | Recurs with                                         | Owner / factual validation                |
| ----------------------------------------------------------------------------- | ---------- | ------------------ | --------------------------------------------------------------------- | ------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| [P15](2026-10-05-P15-public.md); [source](raw/2026-10-05-P15-public-notes.md) | F01        | PUB-06             | Unclear player-team membership in comparison                          | S3                                         | Accept             | Fixture-team grouping/labelled separator in dropdowns, with selected-player team context in results; use published membership | Existing issue linked; implementation pending | [#800](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/800) | None            | No human retest yet; S1/S2 mandatory rule does not apply to this S3 | No recurrence established for this specific finding | Gabriel approved; #800 remains unassigned |
| [P15](2026-10-05-P15-public.md); [source](raw/2026-10-05-P15-public-notes.md) | F02        | PUB-02             | Clarified separate score counts; novice wicket-hit wording retained   | No severity; no product defect established | Reject (no change) | No presentation defect established; preserve reported uncertainty and clarification                                           | Accepted behaviour / no change required       | None required                                                                   | None            | No change or retest required by decision                            | No recurrence established                           | Gabriel approved                          |
| [P15](2026-10-05-P15-public.md); [source](raw/2026-10-05-P15-public-notes.md) | F03        | PUB-06 / follow-up | Both short comparison scorecards scroll vertically in technical check | S4                                         | Accept             | Let short scorecards expand; preserve needed scrolling for narrow layouts/other results                                       | Existing issue linked; implementation pending | [#800](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/800) | None            | No human retest yet; S1/S2 mandatory rule does not apply to this S4 | No recurrence established                           | Gabriel approved; #800 remains unassigned |

Existing-issue lookup: all-state comparison search, closed #716 and open #800 inspected. #716 concerned comparison discoverability; no recurrence of its original defect is claimed. #800 covers current comparison readability and responsive polish. [Separate technical review](supporting/2026-10-05-technical-PUB-06-comparison-review.md) corroborates F01/F03; no duplicate issue created.

## Canonical decision mapping

| Issue #803 outcome state                | Canonical decision | Required evidence                                                                                         |
| --------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| Implemented                             | Accept             | Reason; existing/new issue; actual PR/commit; human retest for accepted S1/S2 changes                     |
| Issue created / existing issue linked   | Accept             | Actionable issue link; reason; owner; implementation/retest still pending where required                  |
| Accepted behaviour / no change required | Reject (no change) | Explicit reason behaviour is acceptable; distinguish accepting existing behaviour from accepting a change |
| Deferred                                | Defer              | Reason; risk/dependency/scope; revisit trigger where useful                                               |
| Rejected                                | Reject             | Reason; requirement/accessibility/security/correctness conflict or other evidence                         |
| Unevaluated                             | Pending            | Missing factual information / team decision and next action                                               |

Use the canonical impact definitions from the protocol:

| Severity      | Definition                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 — Critical | Prevents completion of a core workflow, causes data corruption, presents a security/privacy risk, or makes the tested functionality effectively unusable. |
| S2 — High     | Causes a major obstacle or repeated failure in an important workflow, but a workaround may exist.                                                         |
| S3 — Medium   | Creates significant confusion or unnecessary effort but does not normally prevent task completion.                                                        |
| S4 — Low      | Minor usability issue, wording problem, cosmetic problem or improvement suggestion.                                                                       |

Severity should be based on impact rather than how easy the issue is to fix.

Compare recurring navigation, terminology, validation, statistical trust, account-role and API findings across sessions. Link earlier Sprint findings as context only when there is evidence of recurrence; do not automatically attribute old defects to new participants. Check existing issues before creating duplicates. Present impact, scope, risk and recommendation to the responsible human for a decision.

For code changes: reproduce, state observable expectation, add smallest meaningful regression, run against unchanged code and retain RED command/failure, fix minimally, retain GREEN and adjacent checks, verify UI in browser and arrange human retest. Commit regression and passing fix together. Substantial defects use scoped issues/branches linked here. Pure editorial/visual changes use documented appropriate manual verification rather than trivial tests.

## AI Declaration

This preparation document was planned and generated with the assistance of Codex[GPT-6]. P15 review/decisions were approved by Gabriel. Further human sessions, implementation, retests and final acceptance remain pending.
