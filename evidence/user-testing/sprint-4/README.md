# Sprint 4 final structured user testing - Issue #803

**Final approved scope (9 October 2026): two genuine human sessions. Both are recorded; the separate AI simulation does not count.** The earlier three-session team plan was unanimously reduced due to the 11 October submission deadline. The [7 October completion audit](2026-10-07-completion-audit.md) remains a historical snapshot; its 9 October addendum records the decision. The record does not reopen #803 or manufacture absent evidence.

The [public session record](2026-10-05-P15-public.md) and [source excerpts](raw/2026-10-05-P15-public-notes.md) retain four reported task attempts and all six post-test answers. P15 allocation, reported date/time and independence are confirmed by Gabriel; all four outcomes and finding decisions are approved. Exact deployed build/browser version and original export remain unavailable.

Use the existing [protocol](../../../docs/testing/user-testing-protocol.md), [task bank](../../../docs/testing/user-testing-task-bank.md), [session template](../session-template.md) and ADR-013. No survey pipeline or parallel testing site is introduced.

## Execution order

1. Facilitator reads the [runbook](../../../testing/user-testing/SPRINT4_FACILITATOR_RUNBOOK.md) privately and completes the [scenario record](../../../testing/user-testing/sprint-4-scenario-record.md).
2. Resolve every selected workflow's readiness blocker in the [technical preparation record](technical-preparation.md). Source routes or a closed implementation issue do not prove deployment readiness.
3. Recruit suitable participants, allocate anonymous IDs, and supply only the selected [participant task sheet](../../../testing/user-testing/SPRINT4_PARTICIPANT_TASKS.md).
4. Copy the matching [public](templates/public-session-template.md), [submitter](templates/submitter-session-template.md), [reviewer](templates/reviewer-session-template.md) or [API consumer](templates/api-consumer-session-template.md) template. Record the actual date, environment/build and individual task outcomes.
5. Review/redact evidence using the [capture checklist](evidence-capture-checklist.md). Preserve source notes in raw/, session records at this directory root, supporting files in supporting/, analysis separately, and human retests in retests/.
6. Validate factual interpretation with the facilitator, evaluate findings in the [decision table](feedback-decisions.md), link fixes/issues and complete required [human retests](retest-template.md).
7. Populate the [final summary](sprint-4-user-testing-summary.md) only from retained evidence. Refer to the approved two-session scope and actual retained findings; Gitea remains authoritative for #803 status.

## Planned coverage

| Session         | Role               | Required tasks                                   | Completed sessions                             |
| --------------- | ------------------ | ------------------------------------------------ | ---------------------------------------------- |
| 1               | Public / analyst   | PUB-01; PUB-02; PUB-03; PUB-06                   | 1 reviewed human session                       |
| 2               | Approved submitter | AUTH-01; AUTH-02; SUB-01; SUB-02; SUB-03; SUB-04 | 1 assisted combined session                    |
| 3               | Reviewer           | AUTH-01; REV-01; REV-02; REV-04                  | Same combined session; not an additional count |
| 4 (recommended) | API consumer       | PUB-05; API-01; API-02                           | 0                                              |

**Revised final scope: two genuine human session events, met.** This was unanimously approved by the team on 9 October 2026 for deadline reasons; it changes the project plan, not the historical results. The combined submitter/reviewer exercise is one session, and Codex/AI runs are not counted. Unattempted tasks and known assistance/limitations stay recorded, never scored as success.

## Identifiers, naming and retention

P15 is allocated to the reviewed public session. The local session's participant mapping remains pending; LOCAL-01 is only an evidence key. Facilitator checks concurrent allocations before assigning another anonymous participant ID. Reuse an existing ID only for the same anonymous person; never identify a new person with a historical ID. No date is allocated in blank templates.

Completed records: `YYYY-MM-DD-PXX-ROLE.md`. Supporting files: matching prefix plus Task ID, e.g. `YYYY-MM-DD-PXX-public-PUB-02-01.png`. Retests use the same participant/date/role prefix plus Task ID and `retest`; distinguish them from original attempts. Do not overwrite earlier evidence.

All credentials stay outside Git/chat. Recordings require explicit consent. Raw notes retained in Git must already be anonymised/redacted; sensitive originals stay outside the repository. Check filenames, metadata and screen content as well as Markdown.

## Git and review boundary

Preparation is on `graz/test/803-final-structured-user-testing`, based on fetched origin/main e4cd199e. The environment-required `graz/` namespace precedes the repository `test/803-...` convention. Original checkout and unrelated work are preserved.

Assignee verified in Gitea: GabeRaz (Gabriel Raz); milestone Sprint 4; labels area: testing and priority: high. #800 is open; #801 and #802 are closed; #803 blocks open final gate #810. Recheck these states and builds before formal testing and final review.

Use `Refs #803` for preparation; do not use a closing keyword. The Git methodology requires issue acceptance before normal integration. A draft preparation PR may collect feedback, but is not mergeable; any proposed integration of partial scope needs the team to record an approved scope decision first. No methodology change is implied. Merge requires independent team approval, current main, green required quality CI and a merge commit.

AI register: Gabriel Raz's member CSV. Transcript import is pending; follow [AI handoff](ai-evidence-handoff.md) before merge.

## AI Declaration

Original preparation: Codex[GPT-6]; P15 decisions reviewed by Gabriel. The team-approved two-session scope reconciliation was drafted using ChatGPT-Web[GPT-6] on 9 October. The student auditor reported unanimous approval; no missing test evidence or review was inferred.

## Team-approved final scope — 9 October 2026

The team unanimously approved a time-constrained reduction of its **internal #803 plan** from three real participant sessions to **two**, as reported by the student auditor on 9 October 2026. The COMS3011A Milestone 4 rubric does not prescribe a numerical three-session minimum. This is an explicit change to the team's planned scope; it is **not** a statement that three sessions occurred or that earlier evidence gaps disappeared. The authoritative Gitea issue should retain this decision; this documentation change does not open, reopen, close or reassign any issue.

The revised two-session target is **met** by the retained evidence:

- **P15 public/analyst:** one human session, four facilitator-approved `Success` outcomes based on participant reports.
- **LOCAL-01 approved submitter/reviewer:** one human session spanning two workflows, nine coached `Partial` outcomes; reviewer work is **not** counted as a third participant session.
- **AI-SIM-01:** supplemental browser simulation, excluded from human participation totals.

The team accepts the **scope and evidence limitations** for final submission: the local session was on an older isolated build, and its participant metadata/post-session opinions are not retained; original exports and five account-bearing screenshots have unresolved privacy-review/retention steps; accepted usability findings and implemented fixes are not presented as human-retested without evidence. No scores, source observations, severity ratings, participant identities, timestamps, or retest results have been invented or changed. The final release/deployment and CI disposition remain separate under #810. **No further human session is required by the team's revised #803 scope.**

**Decision provenance:** unanimous team approval reported by the student on 9 October 2026; no independent meeting transcript or Gitea comment was reviewed by this audit. **AI assistance:** ChatGPT-Web[GPT-6] — documentation reconciliation; human team approves the scope and remains responsible for its accuracy.
