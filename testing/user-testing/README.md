# Formal User-Testing Facilitator Pack

This folder supports the canonical task-based process defined in `docs/testing/user-testing-protocol.md`. Sprint 2 uses the #416–#418 execution streams; Sprint 3 keeps the same process and adds feature-level user-feedback tasks #601–#607 and #612. The folder contains reusable, non-secret reference/validation inputs plus facilitator setup and scenario records.

## Rules

- Never commit passwords, OAuth tokens, API keys or participant personal information.
- Supply project test-account credentials separately from the repository.
- Record the deployed URL and commit/release in each session evidence file.
- Prepare all environment state before the participant arrives; do not manufacture a reviewer state while the participant waits.
- Do not mutate published production data unless the team has explicitly approved a disposable/restorable target.
- Fixture 5 below is a **reference and validation/conflict target**, not a safe successful-write target.

## Sprint 3 scenario preparation

Before a Sprint 3 user-feedback session:

1. Select the user-feedback issue and task IDs from the task bank.
2. Select a safe scenario from `SPRINT3_SCENARIOS.md`.
3. Copy `sprint-3-scenario-record.md` and fill in environment-specific IDs, package paths/checksums, expected state and reset method.
4. Supply account credentials/API keys separately from Git.
5. Complete `FACILITATOR_SETUP.md`.
6. Do not start the session until the functionality listed in the issue's `Cannot Begin Until` / readiness section is deployed and usable. This is a testing-readiness check, not an implementation-closure dependency.

The scenario record is intentionally metadata-only. It makes an environment-specific setup reproducible without committing secrets or pretending mutable database identifiers are portable between environments.

## Reusable fixture-5 reference

The reusable source pack comes from the live Thailand vs Singapore fixture used for the 8 September stakeholder review:

- Competition: ACC Eastern Region T20
- Fixture: Thailand vs Singapore
- Fixture ID: 5
- Singapore innings ID: 11
- Known published result: Singapore 139, Thailand 96; Singapore won by 43 runs.

`data/01_REFERENCE_fixture-5-accepted-events.json` is read-only source/reference evidence. It can support PUB-02/PUB-03/ADM-02 comparisons and facilitator verification. Do not upload it as a new successful submission.

## Advanced technical JSON inputs

The current Advanced technical JSON UI expects the canonical **events array only**; the selected fixture and schema version are added by the application. The files below are therefore ready to paste into that mode:

| File                                                      | Intended use                           | Expected behaviour                                                                                                                                   |
| --------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/02_WELL_FORMED_existing-published-slot-events.json` | SUB-05 conflict-protection observation | Structurally valid event targets a delivery position already published in fixture 5; the platform must not silently duplicate/change published data. |
| `data/03_INVALID_runs-total-events.json`                  | SUB-06 validation                      | `offBat=4`, `extras=0`, `total=5`; clear run-total rejection.                                                                                        |
| `data/04_INVALID_same-striker-nonstriker-events.json`     | SUB-06 validation                      | Striker and non-striker are the same participant; clear role rejection.                                                                              |
| `data/05_INVALID_two-errors-events.json`                  | SUB-06 multi-error validation          | Two independent invalid events; feedback should distinguish both problems where the API returns both.                                                |

These values deliberately reuse real fixture/participant references so that the errors are about the intended cricket rule rather than invented IDs.

## Guided single-fixture, season and back-catalogue packages

The current guided upload path uses the versioned package contract, not the Basic direct-submission wrapper used by older stakeholder test files. Start from the deployed/repository templates:

- `apps/frontend/public/season-upload-template.json`
- `apps/frontend/public/season-upload-template.csv`
- `apps/frontend/public/season-upload-manifest-template.json` where a manifest scenario is required

Before a formal session, prepare packages using the exact fixture date/team names and readable references available in the target environment.

A successful SUB-02/BAT-01/BAT-02 task requires a fixture/package that can be written safely. Do **not** repurpose fixture 5 as the successful target because its deliveries are already published. Use local/staging data or a designated disposable production test fixture.

## Environment-specific states that cannot be static files

The facilitator must prepare these before selecting the related task:

- SUB-02: a valid single-fixture package for a writable fixture.
- SUB-03/SUB-04: a deliberately invalid guided package plus a corrected replacement.
- SUB-05 successful-acceptance variant: a unique valid event in a disposable fixture/slot; the committed fixture-5 file is conflict-only.
- BAT-01: a valid season package in the submitter's authorised competition.
- BAT-02: a valid multi-season/back-catalogue package.
- BAT-03/BAT-04/BAT-05: batches already in the states needed to inspect success, rejection/correction and complete reports.
- COR-01: an accepted event in a disposable fixture that can be corrected without damaging published stakeholder data.
- REV-01/REV-02: a staged batch awaiting review.
- REV-03: a staged batch with an intentionally unresolved/ambiguous reference.
- REV-04: a publishable batch whose publication is safe.
- REV-05: a batch suitable for return/rejection.
- ADM-01: a pending submitter-access request in a test account.
- AUTH-03 destructive variant: a disposable account only; otherwise stop before permanent deletion.

Use `FACILITATOR_SETUP.md` to record that these prerequisites exist before the session.

## Historical inputs not carried forward as active UI fixtures

The 8 September stakeholder pack also contained Basic wrapper JSON and the older direct-upload CSV format. Those files were useful against the submission path available at the time, but the current guided single-fixture UI first validates the versioned package contract. Reusing the old CSV unchanged would now test the wrong failure boundary.

The active pack therefore keeps the useful live reference data and converts the deliberate cricket-rule examples into event-array inputs for the current Advanced technical JSON flow. Guided-package tests are prepared from the current committed templates.

## AI Declaration

The preceding facilitator pack and the derived advanced-event validation examples were reviewed and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol]. The underlying fixture-5 reference/events and deliberate error cases were supplied from the team's 8 September stakeholder test pack.
