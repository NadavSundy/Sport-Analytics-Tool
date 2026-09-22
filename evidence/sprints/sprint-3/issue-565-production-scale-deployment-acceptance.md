# Issue #565 — Production-scale deployment acceptance

> **Evidence template.** Replace each `pending` value only with an observed result from the approved
> environment. Do not mark this acceptance complete from local contract tests.

## Run identity

| Field                                | Observed value |
| ------------------------------------ | -------------- |
| Date and UTC time range              | pending        |
| Environment and resource group       | pending        |
| Application commit SHA               | pending        |
| API revision / health                | pending        |
| Worker revision / health / replicas  | pending        |
| Frontend URL                         | pending        |
| Release version / job ID             | pending        |
| Corpus manifest command and checksum | pending        |

## Automated result

Attach or link the redacted JSON output from
`scripts/production-scale-deployment-acceptance.mjs` and record:

| Check                                   | Result  | Evidence |
| --------------------------------------- | ------- | -------- |
| Backend health and CORS                 | pending | pending  |
| Database-backed public read             | pending | pending  |
| Authenticated administrator request     | pending | pending  |
| Frontend root and nested route          | pending | pending  |
| Asynchronous release lifecycle          | pending | pending  |
| Public read while generation runs       | pending | pending  |
| Release metadata and artifact retrieval | pending | pending  |
| SHA-256 artifact checksum               | pending | pending  |

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
