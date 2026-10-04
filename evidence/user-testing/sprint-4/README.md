# Sprint 4 final structured user testing - Issue #803

**Status: preparation only; zero retained Sprint 4 human sessions. Issue #803 remains open.**

Use the existing [protocol](../../../docs/testing/user-testing-protocol.md), [task bank](../../../docs/testing/user-testing-task-bank.md), [session template](../session-template.md) and ADR-013. No survey pipeline or parallel testing site is introduced.

## Execution order

1. Facilitator reads the [runbook](../../../testing/user-testing/SPRINT4_FACILITATOR_RUNBOOK.md) privately and completes the [scenario record](../../../testing/user-testing/sprint-4-scenario-record.md).
2. Resolve every selected workflow's readiness blocker in the [technical preparation record](technical-preparation.md). Source routes or a closed implementation issue do not prove deployment readiness.
3. Recruit suitable participants, allocate anonymous IDs, and supply only the selected [participant task sheet](../../../testing/user-testing/SPRINT4_PARTICIPANT_TASKS.md).
4. Copy the matching [public](templates/public-session-template.md), [submitter](templates/submitter-session-template.md), [reviewer](templates/reviewer-session-template.md) or [API consumer](templates/api-consumer-session-template.md) template. Record the actual date, environment/build and individual task outcomes.
5. Review/redact evidence using the [capture checklist](evidence-capture-checklist.md). Preserve source notes in raw/, session records at this directory root, supporting files in supporting/, analysis separately, and human retests in retests/.
6. Validate factual interpretation with the facilitator, evaluate findings in the [decision table](feedback-decisions.md), link fixes/issues and complete required [human retests](retest-template.md).
7. Populate the [final summary](sprint-4-user-testing-summary.md) only from retained evidence. Keep #803 open until its acceptance criteria and review requirements are met.

## Planned coverage

| Session         | Role               | Required tasks                                   | Completed sessions |
| --------------- | ------------------ | ------------------------------------------------ | ------------------ |
| 1               | Public / analyst   | PUB-01; PUB-02; PUB-03; PUB-06                   | 0                  |
| 2               | Approved submitter | AUTH-01; AUTH-02; SUB-01; SUB-02; SUB-03; SUB-04 | 0                  |
| 3               | Reviewer           | AUTH-01; REV-01; REV-02; REV-04                  | 0                  |
| 4 (recommended) | API consumer       | PUB-05; API-01; API-02                           | 0                  |

Minimum: three real completed sessions representing more than one relevant workflow where practical. Automated checks and Codex walkthroughs are technical preparation only. Unattempted tasks and environmental blockers are recorded, never scored as success.

## Identifiers, naming and retention

Latest fetched main contains P01-P14 across Sprint 2/3. P15 is the next candidate, **not an allocated participant**. Facilitator checks concurrent/uncommitted allocations before reserving it. Reuse an existing ID only for the same anonymous person; never identify a new person with a historical ID. No date is allocated in these templates.

Completed records: `YYYY-MM-DD-PXX-ROLE.md`. Supporting files: matching prefix plus Task ID, e.g. `YYYY-MM-DD-PXX-public-PUB-02-01.png`. Retests use the same participant/date/role prefix plus Task ID and `retest`; distinguish them from original attempts. Do not overwrite earlier evidence.

All credentials stay outside Git/chat. Recordings require explicit consent. Raw notes retained in Git must already be anonymised/redacted; sensitive originals stay outside the repository. Check filenames, metadata and screen content as well as Markdown.

## Git and review boundary

Preparation is on `graz/test/803-final-structured-user-testing`, based on fetched origin/main e4cd199e. The environment-required `graz/` namespace precedes the repository `test/803-...` convention. Original checkout and unrelated work are preserved.

Assignee verified in Gitea: GabeRaz (Gabriel Raz); milestone Sprint 4; labels area: testing and priority: high. #800 is open; #801 and #802 are closed; #803 blocks open final gate #810. Recheck these states and builds before formal testing and final review.

Use `Refs #803` for preparation; do not use a closing keyword. The Git methodology requires issue acceptance before normal integration. A draft preparation PR may collect feedback, but is not mergeable; any proposed integration of partial scope needs the team to record an approved scope decision first. No methodology change is implied. Merge requires independent team approval, current main, green required quality CI and a merge commit.

AI register: Gabriel Raz's member CSV. Transcript import is pending; follow [AI handoff](ai-evidence-handoff.md) before merge.

## AI Declaration

This preparation document was planned and generated with the assistance of Codex[GPT-6]. Human sessions, review and factual sign-off remain pending.
