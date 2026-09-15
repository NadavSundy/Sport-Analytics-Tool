# Formal User-Testing Facilitator Setup

Complete this checklist before a participant begins. Copy relevant values into the retained session evidence; do not commit credentials here.

## Common setup

- [ ] Participant has an anonymous ID (`PXX`).
- [ ] Selected Task IDs are listed before the session.
- [ ] Target environment is running and smoke-checked.
- [ ] URL is recorded.
- [ ] Commit/release under test is recorded.
- [ ] Browser/device is recorded.
- [ ] Project test-account credentials are available separately where authentication is required.
- [ ] No password/token/API key appears in notes, screenshots or this repository.
- [ ] Prepared data is copied locally for the facilitator/participant where needed.
- [ ] Destructive actions have a disposable/restorable target or are stopped at the confirmation boundary.

## #416 — Public / analyst

- [ ] Select `PUB-*` tasks appropriate to the participant.
- [ ] Confirm public browsing works signed out.
- [ ] Confirm at least one fixture has events/statistics visible.
- [ ] If using fixture 5, confirm the reference result still reads Singapore 139, Thailand 96 before the session.
- [ ] Confirm export/API documentation routes needed by selected tasks are available.
- [ ] Optional `AUTH-04` only if the participant also starts authenticated.

## #417 — Submission / batch / correction

- [ ] Approved submitter test account is available and scoped to the intended competition.
- [ ] `AUTH-01`/`AUTH-02` selected if authentication/access comprehension is being tested.
- [ ] SUB-02 has a **writable** fixture plus a valid package prepared from the current template.
- [ ] SUB-03 has an invalid guided package whose expected failure is known.
- [ ] SUB-04 has the corrected replacement ready, but do not show it to the participant unless the scenario requires it.
- [ ] SUB-05/SUB-06 advanced-event files are copied from `testing/user-testing/data/` where selected.
- [ ] BAT-01 has a valid season package.
- [ ] BAT-02 has a valid back-catalogue package.
- [ ] BAT-03/BAT-04/BAT-05 have durable batch references in the required states.
- [ ] COR-01 uses a disposable accepted event, not fixture 5/live stakeholder data.
- [ ] Expected system state is recorded before any mutating task.

## #418 — Review / administration

- [ ] Reviewer/admin test account is available.
- [ ] Review queue contains a staged batch for REV-01/REV-02.
- [ ] REV-03 has an intentionally unresolved/ambiguous reference with known correct mapping.
- [ ] REV-04 has a safe publishable batch.
- [ ] REV-05 has a batch suitable for return/rejection.
- [ ] ADM-01 has a pending submitter-access request.
- [ ] ADM-02 has known provenance/submission information to compare against.
- [ ] Publication/access decisions are safe to execute and can be restored/recreated if a retest is needed.

## Sprint 3 feature-gate preflight

Use `testing/user-testing/SPRINT3_SCENARIOS.md` and copy the chosen scenario into `testing/user-testing/sprint-3-scenario-record.md` before the participant arrives.

- [ ] Feedback-gate issue number is recorded (`#601`–`#607` or `#612`).
- [ ] Every implementation issue listed in the gate's `Cannot Begin Until` section is deployed to the intended environment.
- [ ] Those implementation issues are in **In Review / awaiting user validation** and remain open.
- [ ] Scenario ID and expected starting state are recorded.
- [ ] Test-account role/scope is known; credentials remain outside Git.
- [ ] Every prepared package/file is versioned or has a recorded SHA-256 checksum.
- [ ] Mutating scenarios have a documented reset/recreate method.
- [ ] No scenario requires changing stakeholder/production data that cannot be restored.
- [ ] Session evidence destination under `evidence/user-testing/sprint-3/` is ready.

## Sprint 3 gate-specific setup

### #601 — Navigation / authentication / frontend flow

- [ ] Public signed-out state is available.
- [ ] Viewer and, where selected, approved-role test states are available.
- [ ] AUTH tasks stop before irreversible account deletion unless a disposable identity is supplied.

### #602 — Public statistics and fixture analytics

- [ ] At least two meaningful comparable players/fixtures are available for `PUB-06`.
- [ ] Expected values/scope are facilitator-checked before the session.
- [ ] Export and statistics routes used by selected tasks are operational.

### #603 — Genuinely new fixture submission / onboarding

- [ ] Approved submitter is scoped to the intended disposable test competition.
- [ ] Proposed fixture is confirmed absent before `SUB-07`.
- [ ] Valid new-fixture package and a known-invalid variant are prepared.
- [ ] Reviewer/admin account is available for `REV-06`.
- [ ] The proposed fixture can be created/onboarded, rejected and recreated without contaminating production data.

### #604 — Season / multi-season back catalogue

- [ ] Valid season package and valid multi-season/back-catalogue package are prepared.
- [ ] At least one rejected/correction-required batch state is available where selected.
- [ ] Durable batch references and expected counts are recorded.
- [ ] Re-running the scenario has a safe idempotency/reset plan.

### #605 — Correction / identity / provenance

- [ ] A disposable published event with known expected statistics is available.
- [ ] The corrected value and expected downstream statistic change are known.
- [ ] Submission/event provenance can be inspected before and after correction.
- [ ] Stable identifiers to be checked are recorded without relying on participant memory.

### #606 — Dataset releases

- [ ] A versioned release exists with schema, field descriptions and checksum.
- [ ] The release can be downloaded/read without mutation.
- [ ] A small reproducibility question and expected source fields are prepared for `DATA-02`.

### #607 — API consumer key / quota / rate limit

- [ ] Test API consumer exists.
- [ ] Key is supplied separately and will not be retained in evidence.
- [ ] Known quota/rate-limit state can be inspected safely.
- [ ] A successful request and a safe quota/rate-limit interpretation scenario are prepared.

### #612 — Advanced API consumer capabilities

- [ ] Aggregate operation selected for `API-02` is deployed and documented.
- [ ] Deprecated operation plus replacement is available for `API-03`.
- [ ] Test consumer has known non-sensitive usage history for `API-04`.
- [ ] No task requires exposing the raw API key in administrator views or retained evidence.

## Disposable/staging data rules

- Prefer local or staging data for every mutating Sprint 3 scenario.
- Production may be used only for a project-owned test target the team has explicitly approved and can restore/recreate.
- Never use fixture 5 or other stakeholder reference data as a successful mutation target.
- Record enough metadata to reproduce the scenario, but never commit passwords, OAuth tokens, API keys or participant personal information.
- If reset requires privileged database or cloud access, record the reset procedure/path, not the secret used to perform it.
- If a scenario cannot be restored reliably, do not use it for a mutating formal task.

## Authentication/account lifecycle

- [ ] AUTH-01 uses a project test identity, not a participant's personal account where avoidable.
- [ ] AUTH-02 account state is known before the session (viewer/pending/submitter/admin as required).
- [ ] AUTH-03 stops before permanent deletion unless a disposable account is explicitly prepared.
- [ ] AUTH-04 can be completed without blocking later authenticated tasks; schedule it last if needed.

## After the session

- [ ] Copy observations into `evidence/user-testing/session-template.md`.
- [ ] Give every attempted Task ID an independent Success / Partial / Failure outcome.
- [ ] Link each finding to the Task ID that produced it.
- [ ] Remove credentials/personal information from retained evidence.
- [ ] Create/link issues for accepted actionable findings.
- [ ] Schedule retest for accepted S1/S2 findings.
- [ ] Update the applicable Sprint summary: `evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md` or `evidence/user-testing/sprint-3/sprint-3-user-testing-summary.md`.

## AI Declaration

The preceding checklist was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
