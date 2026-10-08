# Sprint 4 — assisted local submitter/reviewer session

## Metadata

The user explicitly confirmed that this was a real participant session. It is one session spanning two roles. Session key LOCAL-01 is an evidence key, not an allocated participant ID; anonymous participant identity and project/cricket familiarity await the user's answer. No new person or independent reviewer identity is inferred.

- Date: 2026-10-07, Africa/Johannesburg; exact task start/end and durations not measured.
- Browser/device: Chrome desktop on Windows, version not recorded.
- Environment: local frontend 5183, API 3083, worker 3084; isolated database `sport_analytics_803` on 55483.
- Tested checkout: `958c431482b6347abfbcae6ccf4fe3f50da6952a`; older root checkout, production equivalence not established.
- Data: disposable competition 1; fixtures 1 and 2, 7/8 October 2026; valid, invalid and corrected JSON packages in [local kit](../../../testing/user-testing/local-803/README.md).
- Facilitation: Codex supplied navigation, corrected input and local role commands. The user supplied command outputs and screenshots. See [source notes](raw/2026-10-07-local-session-notes.md) and [screenshot/results record](../../../testing/user-testing/local-803/evidence/2026-10-07-rehearsal/README.md).

## Task mapping and outcomes

The following mapping is retrospective to the existing task bank. Canonical tasks were not presented verbatim during this guided exercise. It establishes which goals were actually exercised; it does not imply adherence to an unassisted task-delivery protocol. Under the formal protocol, completion requiring intervention is Partial.

| Task    | Outcome | Evidence / assistance                                                                                                                                                                                                                                            |
| ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | Partial | Sign-in initially redirected to deployed site; Codex supplied local redirect-configuration guidance. Local account then appeared in accounts output. Successful account synchronization is evidenced; independent authentication comprehension was not elicited. |
| AUTH-02 | Partial | Local account listed as viewer; user ran supplied grant command for submitter. Competition scope confirmed by command output. No independent role/access explanation recorded.                                                                                   |
| SUB-01  | Partial | Codex supplied local submissions/new URL and navigation. Subsequent batch history evidences access.                                                                                                                                                              |
| SUB-02  | Partial | Supplied valid package uploaded; 2 accepted, 0 rejected, awaiting review. Exact fixture selection and upload steps were supplied.                                                                                                                                |
| SUB-03  | Partial | Invalid package rejected with 2 rejected and contractVersion error; Codex disclosed the faulty field before inspection.                                                                                                                                          |
| SUB-04  | Partial | Supplied corrected file uploaded through New submission for fixture 2; 2 accepted, no duplicate/conflict/unresolved items. Corrected version and recovery navigation were supplied.                                                                              |
| REV-01  | Partial | Codex supplied review-queue URL after local role change to admin. Review workspace screenshots supplied by user.                                                                                                                                                 |
| REV-02  | Partial | Corrected review summary shows 2 accepted, 2 resolved references, 0 blocking errors and intended fixture. Codex explained review readiness; participant's independent decision reasoning not recorded.                                                           |
| REV-04  | Partial | Codex supplied Review decision tab, reason text, Approve and publish steps. History shows both valid batches Published; fixture statistics verify expected results. Approval-dialog screenshot unavailable.                                                      |

AUTH-01 was not repeated as a separate reviewer attempt. Public fixture-statistics verification supports REV-04; no additional PUB task score is invented. Advanced corrections, unchanged-content idempotency and reviewer-requested replacement lineage were not tested.

## Results and feedback

Both published fixtures show 4 runs, 1 wicket, 2 legal balls (0.2 overs). The invalid upload remains rejected. Functional workflow completed with assistance; this is not unassisted usability Success. The sign-in redirect is the only difficulty reported during this local exercise; it was resolved by environment setup guidance. No actual participant post-session opinions, severity ratings or comfort-without-assistance answers have been supplied yet.

The account/scope preparation and tiny synthetic data limit production-equivalent conclusions. Separate previously reported dropdown scrolling (#907) and access-check error (#909) were not reproduced or retested here. No claim that this exercise resolved those issues is made.

## Evidence/privacy boundary

Five account-bearing original screenshots remain in the primary checkout pending redaction; their observed values are transcribed in the linked results record. Two synthetic statistics screenshots are retained in this branch. The original conversation export is pending. Participant ID, experience and feedback remain open; these gaps are explicit rather than filled with inferred answers.

## AI declaration

Codex (GPT-6) organized and analysed user-supplied evidence. The user confirmed the session was real; individual task scoring follows the protocol's assistance rule. Participant details, feedback and final factual review remain pending.
