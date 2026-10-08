# Sprint 4 final user-testing summary — provisional

Issue #803 has one reviewed public human session, one user-confirmed assisted local submitter/reviewer session, and one separately labelled AI browser simulation. The functional local upload/recovery/publication goals completed. The minimum real-session count and final acceptance remain outstanding; see the [completion audit](2026-10-07-completion-audit.md).

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

No S1/S2 product fix was introduced from these sessions. Existing S3/S4 follow-ups retain explicit implementation/retest states; no human retest was fabricated. Further session feedback and practical important-fix retests must be reconciled before the final conclusion.

## Completion status

Preparation, retained actual local results, assistance disclosure, supplemental AI observations and provisional analysis are complete. #803 remains open because its three-real-session requirement, full participant metadata/feedback, near-final tested-build evidence, required export/privacy review and final acceptance/review are not complete. Detailed criterion-by-criterion status and next inputs are in the [completion audit](2026-10-07-completion-audit.md).

## AI declaration

Codex (GPT-6) organized and analysed retained evidence and wrote this summary. P15 outcomes/decisions were approved by the facilitator. The user confirmed the local exercise was a real participant session. AI simulation is separately attributed and excluded from human counts; missing evidence and review are explicit.
