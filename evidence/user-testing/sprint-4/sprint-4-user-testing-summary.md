# Sprint 4 final user-testing summary — approved two-session scope

The team unanimously approved reducing the internal #803 final human-testing target to **two sessions** on 9 October 2026, citing the 11 October submission deadline. Both were completed: one reviewed P15 public session and one assisted LOCAL-01 submitter/reviewer session. The separate AI browser simulation does not count. The functional local upload/recovery/publication goals completed; the evidence limitations below are not silently resolved by this scope decision.

## Scope and builds

The existing protocol and canonical task bank are reused. P15 tested the deployed public app on Chrome desktop, signed out, on 5 October 2026 (facilitator-corrected time 15:38 Africa/Johannesburg; original chronology retained). Exact deployed/browser versions remain unavailable.

The local human and AI testing used `http://localhost:5183`, API 3083 and isolated disposable PostgreSQL data, with root checkout `958c431482b6347abfbcae6ccf4fe3f50da6952a`. This is older than current main and is not asserted to be production-equivalent. The documentation branch was subsequently brought forward to main; that does not retroactively change the tested build.

## Session coverage and provenance

| Record                                                                                                       | Type                                                                    | Task coverage                             | Outcome boundary                                                     |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| [P15 public](2026-10-05-P15-public.md), [source](raw/2026-10-05-P15-public-notes.md)                         | Human public novice; facilitator-reviewed self-report                   | PUB-01/02/03/06                           | Four approved Success outcomes.                                      |
| [LOCAL-01 combined](2026-10-07-local-submitter-reviewer.md), [source](raw/2026-10-07-local-session-notes.md) | User-confirmed real assisted session, participant ID/experience pending | AUTH-01/02, SUB-01/02/03/04, REV-01/02/04 | Nine assisted Partial outcomes; one session spanning both roles.     |
| [AI-SIM-01](../../../testing/user-testing/local-803/evidence/2026-10-07-ai-simulation/README.md)             | Codex browser simulation with prior context disclosed                   | PUB-01/02/03/06/05                        | Five simulation goals completed; excluded from human outcomes/count. |

Two real session events are recorded. Distinct participant count is not inferred while the local participant mapping is unknown. AUTH-01 is not counted again for reviewer work; no separate reviewer login was tested. Participant post-test answers for the local session remain pending.

## Human task outcomes

| Task    | Human attempts | Success | Partial | Failure |
| ------- | -------------- | ------- | ------- | ------- |
| PUB-01  | 1              | 1       | 0       | 0       |
| PUB-02  | 1              | 1       | 0       | 0       |
| PUB-03  | 1              | 1       | 0       | 0       |
| PUB-06  | 1              | 1       | 0       | 0       |
| AUTH-01 | 1              | 0       | 1       | 0       |
| AUTH-02 | 1              | 0       | 1       | 0       |
| SUB-01  | 1              | 0       | 1       | 0       |
| SUB-02  | 1              | 0       | 1       | 0       |
| SUB-03  | 1              | 0       | 1       | 0       |
| SUB-04  | 1              | 0       | 1       | 0       |
| REV-01  | 1              | 0       | 1       | 0       |
| REV-02  | 1              | 0       | 1       | 0       |
| REV-04  | 1              | 0       | 1       | 0       |

Local mappings are retrospective to the task bank rather than verbatim canonical task delivery. Control/navigation instructions, faulty field, corrected file and review reason were supplied; functional completion does not establish unassisted usability Success. No task timing or independent explanation is invented.

## Findings, evaluation and changes

See the [feedback decisions](feedback-decisions.md) and [current audit](2026-10-07-completion-audit.md).

- P15 F01: S3, accepted team context concern linked to #800. Overall polish merged through #896; specific F01 implementation/human retest is not established.
- P15 F02: no product defect established after separate-score-count clarification; approved no-change decision retained.
- P15 F03: S4, accepted short-comparison scrolling concern linked to #800; specific fix/human retest not claimed.
- P15 F04: S3, accepted but explicitly non-blocking pagination follow-up #869; implementation #903 is in fetched main, human retest pending.
- Local sign-in detour was resolved through redirect-configuration guidance. Account synchronization, valid upload, invalid rejection, corrected resubmission and publication completed with assistance. No new participant product complaint or severity is fabricated.
- AI-only observations cover ambiguous duplicate fixture labels, existing missing team context, optional cricket-notation explanations and API Explorer server-port mismatch. These are evaluated as scoped technical follow-ups/deferred candidates, with reasons and revisit triggers in the audit; they are not human feedback or recurrence.

No application change was made by this evidence update. Relevant pre-existing #800/#869 changes are traced without claiming they resulted from this new local session. Previously reported #907/#909 defects were not reproduced or retested here.

## Functional evidence and limitations

The [local kit evidence](../../../testing/user-testing/local-803/evidence/2026-10-07-rehearsal/README.md) retains batch references and observed states. Both valid packages published two records; invalid contractVersion input remained rejected. Public scorecards show **4 runs, 1 wicket, 2 legal balls** in both fixtures.

Five original screenshots with an account name remain local pending privacy redaction. Two synthetic-statistics screenshots are in this branch, alongside source notes and AI DOM/screenshot evidence. Original AI export/privacy review is pending. The local package retry was through New submission, not an evidenced linked reviewer-requested replacement. Tiny synthetic fixtures and older source limit production-equivalent conclusions.

## Cross-session findings and retests

Public and assisted local sessions cover complementary workflows. Repeated human difficulties cannot yet be established without local participant feedback. AI comparison observations technically corroborate P15 F01 but do not establish a second human occurrence. Deliberate invalid input is not an application defect.

No S1/S2 product fix was introduced from these sessions. Existing S3/S4 follow-ups retain their actual implementation/retest states; no human retest was fabricated. The team accepted the two-session scope and its limited ability to assess recurring issues; follow-up fixes remain tracked without claiming that the missing feedback or human retests were obtained.

## Completion status

The **revised two-session human-testing target is satisfied**, as unanimously approved by the team on 9 October 2026. The original 7 October completion audit remains an accurate record of the earlier plan, with a dated approval addendum. Real session evidence and outcomes remain unchanged: four public `Success`, nine coached `Partial`; no third human session or simulated user is counted. The team accepts the narrower evidence sample for submission. Outstanding participant metadata/feedback, source-export/privacy review, exact near-final build equivalence and unperformed human retests are transparently reported as limitations, not claimed complete; Gitea remains authoritative for issue status and #810 for final release verification.

## AI declaration

Codex (GPT-6) organized and analysed retained evidence and wrote this summary. P15 outcomes/decisions were approved by the facilitator. The user confirmed the local exercise was a real participant session. AI simulation is separately attributed and excluded from human counts; missing evidence and review are explicit.

## Team-approved final human-testing scope — 9 October 2026

The team unanimously approved a time-constrained reduction of its **internal #803 plan** from three real participant sessions to **two**, as reported by the student auditor on 9 October 2026. The COMS3011A Milestone 4 rubric does not prescribe a numerical three-session minimum. This is an explicit change to the team's planned scope; it is **not** a statement that three sessions occurred or that earlier evidence gaps disappeared. The authoritative Gitea issue should retain this decision; this documentation change does not open, reopen, close or reassign any issue.

The revised two-session target is **met** by the retained evidence:

- **P15 public/analyst:** one human session, four facilitator-approved `Success` outcomes based on participant reports.
- **LOCAL-01 approved submitter/reviewer:** one human session spanning two workflows, nine coached `Partial` outcomes; reviewer work is **not** counted as a third participant session.
- **AI-SIM-01:** supplemental browser simulation, excluded from human participation totals.

The team accepts the **scope and evidence limitations** for final submission: the local session was on an older isolated build, and its participant metadata/post-session opinions are not retained; original exports and five account-bearing screenshots have unresolved privacy-review/retention steps; accepted usability findings and implemented fixes are not presented as human-retested without evidence. No scores, source observations, severity ratings, participant identities, timestamps, or retest results have been invented or changed. The final release/deployment and CI disposition remain separate under #810. **No further human session is required by the team's revised #803 scope.**

**Decision provenance:** unanimous team approval reported by the student on 9 October 2026; no independent meeting transcript or Gitea comment was reviewed by this audit. **AI assistance:** ChatGPT-Web[GPT-6] — documentation reconciliation; human team approves the scope and remains responsible for its accuracy.
