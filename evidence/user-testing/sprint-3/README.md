# Sprint 3 Formal User-Testing Evidence

This folder retains reviewed, anonymised Sprint 3 formal user-testing evidence produced under `docs/testing/user-testing-protocol.md`.

## Naming

Session records use:

`YYYY-MM-DD-PXX-ROLE.md`

Examples:

- `2026-09-20-P07-public.md`
- `2026-09-21-P08-submitter.md`
- `2026-09-22-P09-api-consumer.md`

Supporting screenshots use the same prefix followed by the Task ID where useful.

## Feature-gate evidence rule

Each Sprint 3 feedback-gate issue (#601–#607 and #612) links to the formal session records that exercise its user goal.

A gate must not close until:

- linked implementation work is deployed and remains in Review/awaiting user validation;
- attempted tasks have individual Success / Partial / Failure outcomes;
- findings are severity-rated S1–S4;
- every S1/S2 or otherwise actionable finding has an explicit Accept / Defer / Reject outcome and reason;
- accepted S1/S2 changes have retest evidence;
- participant names and credentials are absent;
- `sprint-3-user-testing-summary.md` has been updated.

The gate is a closure gate for implementation work. The gate itself uses `Cannot Begin Until` rather than hard Gitea dependencies on the implementation issues so the project does not create circular dependencies.

## Authoritative records

- Process: `docs/testing/user-testing-protocol.md`
- Task bank: `docs/testing/user-testing-task-bank.md`
- Facilitator catalogue: `testing/user-testing/SPRINT3_SCENARIOS.md`
- Session template: `evidence/user-testing/session-template.md`
- Consolidated summary: `evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md`

## AI Declaration

The preceding evidence guide was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
