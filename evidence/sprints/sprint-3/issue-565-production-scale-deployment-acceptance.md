# Issue #565 — Production-scale deployment acceptance

> **Evidence template.** Replace each `pending` value only with an observed result from the approved
> environment. Do not mark this acceptance complete from local contract tests.

## Run identity

| Field                                | Observed value                                             |
| ------------------------------------ | ---------------------------------------------------------- |
| Date and UTC time range              | 2026-09-22 16:23 UTC baseline smoke                        |
| Environment and resource group       | pending                                                    |
| Application commit SHA               | pending                                                    |
| API revision / health                | Revision pending; `/health` returned 200 with `status: ok` |
| Worker revision / health / replicas  | pending                                                    |
| Frontend URL                         | https://sport-analytics-tool-web.pages.dev                 |
| Release version / job ID             | pending                                                    |
| Corpus manifest command and checksum | pending                                                    |

## Automated result

Attach or link the redacted JSON output from
`scripts/production-scale-deployment-acceptance.mjs` and record:

| Check                                        | Result                        | Evidence                                                                                                                                           |
| -------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend health and CORS                      | passed (baseline only)        | 2026-09-22 16:23 UTC; GET `/health` returned 200; `sport-analytics-api`; `access-control-allow-origin: https://sport-analytics-tool-web.pages.dev` |
| Database-backed public read                  | pending                       | pending                                                                                                                                            |
| Authenticated administrator request          | pending                       | pending                                                                                                                                            |
| Frontend root and nested route               | passed (static baseline only) | 2026-09-22; GET `/` and `/fixtures` each returned 200 and the `Stat'sTheGame` marker                                                               |
| Browser API-backed fixture/statistics screen | pending                       | pending                                                                                                                                            |
| Browser sign-in and authenticated action     | pending                       | pending                                                                                                                                            |
| Asynchronous release lifecycle               | pending                       | pending                                                                                                                                            |
| Public read while generation runs            | pending                       | pending                                                                                                                                            |
| Public statistics read while generation runs | pending                       | pending                                                                                                                                            |
| Release metadata and artifact retrieval      | pending                       | pending                                                                                                                                            |
| SHA-256 artifact checksum                    | pending                       | pending                                                                                                                                            |

## Recovery and duplicate safety

| Check                                         | Result  | Evidence |
| --------------------------------------------- | ------- | -------- |
| Controlled worker interruption/restart        | pending | pending  |
| Job recovery to completed                     | pending | pending  |
| One immutable publication for release version | pending | pending  |
| No duplicate canonical release artifact       | pending | pending  |

## Capacity and availability

| Signal                                           | Observation | Evidence |
| ------------------------------------------------ | ----------- | -------- |
| API CPU / memory                                 | pending     | pending  |
| Worker CPU / memory                              | pending     | pending  |
| API / worker replicas and restart count          | pending     | pending  |
| Failed requests / platform errors / Azure outage | pending     | pending  |
| Public-read duration samples                     | pending     | pending  |

## Acceptance conclusion

Pending a live run. Local runner contract tests are not deployment acceptance evidence.
