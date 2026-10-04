# Sprint 4 feedback decisions and traceability

**Empty analysis table: no Sprint 4 findings have been observed.** Add rows only after facilitator source notes arrive. Pending is temporary; every meaningful finding requires an evaluated final outcome.

| Session / raw source | Finding ID | Task ID | Observation | Severity | Decision | Decision reason | Outcome state | Gitea issue | Fix PR / commit | Retest requirement / record | Recurs with | Owner / factual validation |
| -------------------- | ---------- | ------- | ----------- | -------- | -------- | --------------- | ------------- | ----------- | --------------- | --------------------------- | ----------- | -------------------------- |

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

This preparation document was planned and generated with the assistance of Codex[GPT-6]. Human sessions, review and factual sign-off remain pending.
