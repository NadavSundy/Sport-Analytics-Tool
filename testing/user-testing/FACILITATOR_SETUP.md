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
- [ ] Update `evidence/user-testing/sprint-2/sprint-2-user-testing-summary.md`.

## AI Declaration

The preceding checklist was generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
