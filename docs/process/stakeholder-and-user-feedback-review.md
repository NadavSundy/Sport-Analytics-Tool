# Stakeholder & User-Feedback Evidence Review

This page reviews retained stakeholder interaction and formal participant-based user-feedback evidence from the three development Sprints. It points to source records and their decisions; it does not treat an issue being closed as proof that a participant task passed or that a finding was resolved.

Gitea remains authoritative for the current state of linked issues. These records describe what was observed, decided and verified at the time of each interaction.

## Evidence model

| Evidence type | What it records | How it is used |
| --- | --- | --- |
| Stakeholder interaction | Requirement clarification, product-direction feedback and prioritisation | Records a decision and any resulting action or issue where retained. |
| Formal user testing | Anonymous participant task outcomes, observations, findings and retests | Preserves Success, Partial or Failure per task; a later code change does not rewrite that result. |
| Technical verification | Automated, integration or deployed system checks | Provides engineering evidence only; it is not substituted for participant feedback. |

The task-based evidence chain is `task -> observation -> finding -> decision -> issue/fix -> retest`. An accepted finding may be fixed and retested, deferred with its rationale, or rejected where the recorded decision says so. The [user-testing protocol](../testing/user-testing-protocol.md), [session template](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/session-template.md){ target="_blank" rel="noopener" } and [ADR-013](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-013-task-based-user-testing-evidence.md){ target="_blank" rel="noopener" } define the retained process.

## Stakeholder interactions and decisions

| Sprint | Retained interaction | Recorded decision or follow-up |
| --- | --- | --- |
| Sprint 1 | [4 August initial direction](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-1/2026-08-04-stakeholder-meeting.md){ target="_blank" rel="noopener" }; [11 August progress review](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-1/2026-08-11-stakeholder-meeting.md){ target="_blank" rel="noopener" }; [18 August requirements review](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-1/2026-08-18-stakeholder-meeting.md){ target="_blank" rel="noopener" } | The team selected the sport and prioritised visible frontend/authentication work; later records linked database capacity, approved-submitter access and statistics actions to their relevant Gitea issues. The roadmap was confirmed on 18 August. |
| Sprint 2 | [1 September review](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-2/Stakeholder/2026-09-01-stakeholder-meeting.md){ target="_blank" rel="noopener" }; [8 September asynchronous review](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-2/Stakeholder/2026-09-08-stakeholder-asynchronous-review.md){ target="_blank" rel="noopener" }; [15 September retrospective review](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-2/2026-09-15-stakeholder-review.md){ target="_blank" rel="noopener" } | The failed 1 September submission demonstration was treated as a real reliability priority, not completed functionality. The 8 September feedback supported retaining field-level validation detail and carried review/publication confirmation forward. The 15 September reviewer feedback was accepted into Sprint 3 issues #579, #580, #581, #582 and #513. |
| Sprint 3 | [22-24 September asynchronous review](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/sprint-3/2026-09-28-stakeholder-review.md){ target="_blank" rel="noopener" } | The stakeholder saw no major missing product/API capability but identified pagination-position clarity and API Explorer loading feedback. The source record retains these as minor follow-up feedback and does not claim implementation without linked issue/PR evidence. |

The chronological [Sprint Evidence](sprint-evidence.md) index provides the complete retained meeting, stand-up and close-out record. Stakeholder opinion is qualitative evidence and does not override failed tests, defects, user-feedback gates or the Definition of Done.

## Formal user-feedback outcomes

The published Sprint summaries are the main entry points to formal outcomes. Their canonical records contain task-level evidence, severity, decision, issue/fix traceability and retest detail.

| Sprint | Discoverable summary | Decision and improvement treatment |
| --- | --- | --- |
| Sprint 2 | [Sprint 2 User Testing Summary](../testing/user-testing-sprint-2-summary.md) and [canonical record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md){ target="_blank" rel="noopener" } | Twenty-five findings were accepted, thirty-nine deferred and five pending at Sprint close-out; no finding is presented as rejected. The summary distinguishes implemented/retested work (#463, #468, #498, #499, #501 and #519) from outstanding, deferred and blocking findings such as #467 and the new-fixture workflow gap. |
| Sprint 3 | [Sprint 3 User Testing Summary](../testing/user-testing-sprint-3-summary.md) and [canonical record](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md){ target="_blank" rel="noopener" } | Findings record accepted, deferred and rejected counts separately. Accepted work is linked to #713, #714, #743, #716 and #783; deferred findings remain visible through #613, #770 and related records. The #605 gate is explicitly not accepted. |

The Sprint 3 summary records later implementation for P08-F01/#716 and P11-F01/#770 without replacing their original Partial outcomes: no retained participant rerun exists. Likewise, the P13/API-consumer guidance change records a successful participant retest separately from the original Partial result. Issue closure or later implementation is therefore not misrepresented as a passed user result.

## Final-submission treatment

The [Final Submission plan](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints/final-submission/2026-09-30-planning.md){ target="_blank" rel="noopener" } prioritises material stakeholder/user feedback alongside release-blocking defects, rubric gaps and current verification. Its Definition of Done requires structured final user testing with findings dispositioned and current stakeholder/Scrum evidence; those conditions are not claimed complete here until corresponding retained evidence exists.

The [Final Submission Reference](../final-submission.md) keeps final release checks—including unresolved user-testing findings—visible rather than assuming historical or closed issues establish final acceptance.

## Evidence locations

| Need | Source |
| --- | --- |
| Stakeholder and Sprint interaction records | [Sprint Evidence](sprint-evidence.md) and [`evidence/sprints/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/sprints){ target="_blank" rel="noopener" } |
| Formal user-testing process and navigation | [User Testing Overview](../testing/user-testing-overview.md) |
| Task-level participant records | [`evidence/user-testing/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/user-testing){ target="_blank" rel="noopener" } |
| Decision records | [Decisions Index](decisions.md) |
| Technical, non-user validation | [Testing & Validation Evidence](validation-and-user-testing.md) |

## AI Declaration

The preceding evidence-review index was analysed, drafted and edited with the assistance of Codex[GPT-5]. Retained source records were reviewed without creating or altering participant results.
