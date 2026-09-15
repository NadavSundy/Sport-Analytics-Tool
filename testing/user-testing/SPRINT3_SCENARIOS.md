# Sprint 3 User-Testing Scenarios

This catalogue defines the **safe, reproducible setup contract** for Sprint 3 formal user testing. It does not contain credentials, API keys or mutable production identifiers.

Before a session, copy `sprint-3-scenario-record.md`, choose the relevant scenario IDs below, and fill in the actual environment-specific values.

## Safety rules

- Prefer local or staging for every mutating scenario.
- A production test target is allowed only when it is project-owned, explicitly approved and restorable/recreatable.
- Never mutate fixture 5 or other stakeholder/reference data as a successful-write scenario.
- Credentials and API keys are supplied separately and are never pasted into retained evidence.
- Record package/file SHA-256 checksums when the file is not already version-controlled.
- Record starting state and reset/recreate method before the participant starts.
- If reset cannot be demonstrated, use a different scenario.
- Participant names never appear in Gitea issues or committed evidence.

## Scenario catalogue

| Scenario ID     | Primary gates/tasks        | Required role/account state                             | Required prepared state/data                                                                           | Reset / reproducibility requirement                                                                         |
| --------------- | -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `S3-NAV-01`     | #601, `AUTH-*`             | Public plus test viewer; optional submitter/admin state | Known signed-out landing state; disposable account only for destructive AUTH-03                        | Sign out/reset role state; never delete a real participant account                                          |
| `S3-PUB-01`     | #602, `PUB-01`–`PUB-06`    | Public                                                  | At least two fixtures/players with facilitator-verified comparable statistics                          | Read-only; record fixture/player identifiers and expected comparison scope                                  |
| `S3-NEWFIX-01`  | #603, `SUB-07`, `REV-06`   | Approved submitter + reviewer/admin                     | Fixture confirmed absent; valid new-fixture package; known-invalid variant; competition scope          | Use disposable competition/fixture namespace; record how proposal/onboarded fixture can be removed/reseeded |
| `S3-SINGLE-01`  | #603, `SUB-02`–`SUB-04`    | Approved submitter                                      | Writable existing fixture; valid package; invalid package; corrected replacement                       | Restore/recreate fixture and submission state before retest                                                 |
| `S3-BATCH-01`   | #604, `BAT-01`–`BAT-05`    | Approved submitter + reviewer/admin where required      | Valid season package; valid multi-season package; known rejection/correction state; durable batch IDs  | Inputs remain stable/versioned; reset or create a fresh disposable batch for each destructive run           |
| `S3-COR-01`     | #605, `COR-01`, `ADM-02`   | Approved correction/reviewer/admin role as implemented  | Disposable published event; known original value; known corrected value; expected downstream statistic | Record stable event/submission identity before change and a restore/reseed path                             |
| `S3-DATA-01`    | #606, `DATA-01`, `DATA-02` | Public or analyst as implemented                        | Versioned dataset release; schema; field descriptions; checksum; small reproducibility question        | Read-only; record release version/checksum and expected source fields                                       |
| `S3-API-01`     | #607, `API-01`             | Test API consumer                                       | Consumer exists; key supplied out-of-band; known quota/rate-limit state; safe request                  | Rotate/reissue key if exposed; record consumer label/ID, never raw key                                      |
| `S3-API-ADV-01` | #612, `API-02`–`API-04`    | Test API consumer + admin/reviewer for usage view       | Aggregate operation; deprecated operation + replacement; known non-sensitive consumer usage history    | Read-only where possible; generate fresh test usage if history must be recreated                            |

## Preparing packages

Use the currently deployed/repository version of the guided package templates:

- `apps/frontend/public/season-upload-template.json`
- `apps/frontend/public/season-upload-template.csv`
- `apps/frontend/public/season-upload-manifest-template.json` where applicable

Do not keep an old package simply because it worked in a previous Sprint. The facilitator must confirm that the package matches the current contract before the participant arrives.

For invalid-package scenarios, introduce only the deliberate error being tested and record the expected validation boundary. A file that fails earlier for an unrelated schema/version problem is not a valid facilitator scenario.

## Account matrix

| Account label         | Required state                                            | Used by                                |
| --------------------- | --------------------------------------------------------- | -------------------------------------- |
| `viewer-test`         | Authenticated viewer/no submitter scope                   | #601 authentication/access-state tasks |
| `submitter-test`      | Approved for the disposable target competition            | #603/#604 submission tasks             |
| `reviewer-admin-test` | Review/admin capability in the deployed build             | #603/#604/#605 review/provenance tasks |
| `api-consumer-test`   | Active consumer with known quota/rate-limit configuration | #607/#612 API tasks                    |

Actual email addresses, passwords, OAuth tokens and API keys stay outside Git.

## Minimum pre-session record

For every selected scenario, retain:

- scenario ID;
- environment/URL;
- commit or release;
- anonymous participant ID and role;
- account label/role/scope, but not credentials;
- fixture/competition/batch/release/consumer identifiers needed to reproduce the setup;
- package/file path and SHA-256 checksum where applicable;
- expected starting state;
- expected safe mutation/outcome;
- reset/recreate method;
- linked feedback gate and implementation issues in Review.

## AI Declaration

The preceding scenario catalogue was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
