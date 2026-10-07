# Sprint 4 final user-testing summary - INCOMPLETE SKELETON

Current close-out status, assisted local task outcomes, AI-only observations and remaining acceptance gaps are consolidated in the [7 October completion audit](2026-10-07-completion-audit.md) and [local participant record](2026-10-07-local-submitter-reviewer.md). This summary remains provisional until the required human evidence is complete.

**One reviewed public session plus a user-confirmed assisted local participant session covering submitter/reviewer workflows. Overall Sprint 4 remains incomplete: the local session's participant details, task mapping and feedback, remaining session coverage and final validation are outstanding.**

## Objective and tested environment/build

Final representative workflows under #803 using the existing protocol and task bank. P15 tested the deployed public URL signed out using Chrome desktop on the facilitator PC, recorded 2026-10-05 15:38 Africa/Johannesburg after user-requested correction; original 03:26 report retained in raw chronology. Exact frontend/API/worker commits and browser version remain unavailable; remaining workflow environments/scenarios are pending readiness checks. Local preparation base is e4cd199e; this is not claimed as the deployed version.

## Participant and workflow coverage

| Anonymous ID                  | Actual date                                                                                  | Role / experience                                        | Workflow                              | Session / raw evidence                                                                    | Exact tasks attempted                        | Unattempted tasks / blockers                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P15, allocated by facilitator | Corrected by user to 2026-10-05 15:38 Africa/Johannesburg; exact task start/end not measured | Public / novice; no cricket/project familiarity reported | Public browsing/statistics/comparison | [Reviewed record](2026-10-05-P15-public.md); [source](raw/2026-10-05-P15-public-notes.md) | PUB-01; PUB-02; PUB-03; PUB-06 self-reported | Four attempts reported; Chrome desktop and signed-out confirmed by self-report; exact build/version unavailable; outcomes and decisions approved; separate score counts clarified |

Minimum three real completed sessions; public, submitter and reviewer baseline, API consumer recommended. Public session with facilitator-reviewed outcomes/decisions: 1. On 2026-10-07 the user confirmed that the local upload/recovery/publication exercise was a real participant session. This is one additional assisted session spanning submitter and reviewer workflows, not two sessions. Participant identity/familiarity, exact task mapping and feedback remain to be confirmed; do not yet infer a distinct participant count. Functional results and seven original screenshots are recorded in `testing/user-testing/local-803/evidence/2026-10-07-rehearsal/README.md` in the primary checkout. The protocol requires Partial for tasks requiring facilitator intervention. The linked kit is currently in the primary checkout and must be included when assembling the final PR; it is not yet present in this worktree.

## Per-task outcomes

| Session | Task ID | Outcome | Assistance / evidence                                                                             | Finding IDs        |
| ------- | ------- | ------- | ------------------------------------------------------------------------------------------------- | ------------------ |
| P15     | PUB-01  | Success | Starting-state and fixture-term clarification recorded; participant self-report, Gabriel-approved | —                  |
| P15     | PUB-02  | Success | Interpretation elicited without supplying answer during task; separate counts later clarified     | F02                |
| P15     | PUB-03  | Success | Canonical task; relevant leaders selected; no particular control prescribed                       | —                  |
| P15     | PUB-06  | Success | Canonical task; reasoned batting comparison; team-context concern retained                        | F01; F03 follow-up |

## Outcome counts by Task ID

| Task ID | Attempts | Success | Partial | Failure |
| ------- | -------- | ------- | ------- | ------- |
| PUB-01  | 1        | 1       | 0       | 0       |
| PUB-02  | 1        | 1       | 0       | 0       |
| PUB-03  | 1        | 1       | 0       | 0       |
| PUB-06  | 1        | 1       | 0       | 0       |

Only facilitator-reviewed attempted tasks are counted. Other selected sessions have not occurred.

## Findings, severity, decisions and reasons

See [decision table](feedback-decisions.md). The reviewed public record retains F01 (team context in comparison), F02 (score counts clarified; novice domain note, no-change decision approved by Gabriel) and F03 (unnecessary scrolling on comparison page; both cards corroborated technically; original participant viewport unknown). Gabriel approved F01 S3 Accept and F03 S4 Accept, linked to existing #800; F02 is Reject (no change), accepted behaviour. No fix or retest is claimed.

## Cross-session recurring findings

Pending comparison of genuine session findings: navigation; terminology; validation; trust/comprehension of statistics; authentication/roles; API/docs. Cite contributing sessions/Task IDs and underlying shared issue; avoid duplicates.

## Integrated product changes and traceability

| Finding / Task ID | Decision / reason | Issue | PR / commit | RED evidence | GREEN / adjacent / browser checks | Actual product change | Human retest |
| ----------------- | ----------------- | ----- | ----------- | ------------ | --------------------------------- | --------------------- | ------------ |

No product change resulting from Sprint 4 feedback is claimed yet.

## Feedback deliberately not implemented

| Finding | Acceptable behaviour / Defer / Reject | Reason | Remaining impact | Revisit trigger |
| ------- | ------------------------------------- | ------ | ---------------- | --------------- |

## Retest results

| Original finding / Task ID | Corrected build | Actual date / participant | New outcome | Resolved / Improved / Not resolved | Retest evidence |
| -------------------------- | --------------- | ------------------------- | ----------- | ---------------------------------- | --------------- |

## Limitations and final conclusion

Pending sessions, account/data readiness, exact tested build evidence, facilitator factual sign-off, decisions and required human retests. Earlier Sprint evidence is context only. #800 remains open at preparation inspection; #801/#802 closed; final gate #810 depends on #803. Recheck at close-out.

## Completion audit

- [ ] At least three genuine completed final sessions and more than one relevant workflow represented.
- [ ] Raw/session evidence retained; every attempted task individually scored with assistance recorded.
- [ ] All meaningful findings evaluated, reasons retained, actionable issues/fixes linked.
- [ ] Accepted S1/S2 changes have required human retests; recurring findings and resulting changes summarised.
- [ ] Sprint 4 documentation/navigation current; prior Sprint evidence intact.
- [ ] AI register and actual transcript imported/reviewed; responsible member verifies content.
- [ ] Required local checks and quality CI green; branch current; independent peer approval recorded.
- [ ] All #803 acceptance criteria audited before final closing PR / issue / board completion.

## AI Declaration

This preparation document was planned and generated with the assistance of Codex[GPT-6]. P15 outcomes and decisions were approved by Gabriel. Further sessions and overall acceptance remain pending.

Additional follow-up: F04 missing Previous page in fixture 8937 Players list, supported by two participant-supplied screenshots and separate technical reproduction. S3; accepted for follow-up at Gabriel's request on 2026-10-06 and tracked in [#869](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/869), explicitly non-blocking for #803/project submission, with medium severity and low priority. Implementation and retest remain pending; no original task outcomes changed or additional session counted.
