# Issue #565 — Production-scale deployment acceptance

> **Evidence template.** Replace each `pending` value only with an observed result from the approved
> environment. Do not mark this acceptance complete from local contract tests.

## Run identity

| Field                                | Observed value                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| Date and UTC time range              | 2026-09-24 20:59 to approximately 21:10 UTC release run; catalogue displayed 23:10 SAST |
| Environment and resource group       | pending                                                                                 |
| Application commit SHA               | pending                                                                                 |
| API revision / health                | Revision pending; `/health` returned 200 with `status: ok`                              |
| Worker revision / health / replicas  | pending                                                                                 |
| Frontend URL                         | https://sport-analytics-tool-web.pages.dev                                              |
| Release version / job ID             | `2026.09.24-issue-565-live`; `236a8529-9e11-4c00-a5ad-688dabf6e973`                     |
| Corpus manifest command and checksum | pending                                                                                 |

## Automated result

Attach or link the redacted JSON output from
`scripts/production-scale-deployment-acceptance.mjs` and record:

| Check                                        | Result                        | Evidence                                                                                                                                                                                                                   |
| -------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend health and CORS                      | passed (baseline only)        | 2026-09-22 16:23 UTC; GET `/health` returned 200; `sport-analytics-api`; `access-control-allow-origin: https://sport-analytics-tool-web.pages.dev`                                                                         |
| Database-backed public read                  | pending                       | pending                                                                                                                                                                                                                    |
| Authenticated administrator request          | pending                       | pending                                                                                                                                                                                                                    |
| Frontend root and nested route               | passed (static baseline only) | 2026-09-22; GET `/` and `/fixtures` each returned 200 and the `Stat'sTheGame` marker                                                                                                                                       |
| Browser API-backed fixture/statistics screen | pending                       | pending                                                                                                                                                                                                                    |
| Browser sign-in and authenticated action     | pending                       | pending                                                                                                                                                                                                                    |
| Asynchronous release lifecycle               | passed                        | Administrator initiated the existing version; safe worker logs recorded snapshot materialisation start; the public catalogue displayed the completed immutable release with 3,207,110 events and format 1.1 on 2026-09-24. |
| Public read while generation runs            | pending                       | pending                                                                                                                                                                                                                    |
| Public statistics read while generation runs | pending                       | pending                                                                                                                                                                                                                    |
| Release metadata and artifact retrieval      | partially observed            | Public catalogue listed `2026.09.24-issue-565-live` with version, event count, format and published-accepted-deliveries scope. Artifact download and metadata-detail retrieval were not separately recorded.               |
| SHA-256 artifact checksum                    | pending                       | pending                                                                                                                                                                                                                    |

## Recovery and duplicate safety

| Check                                         | Result             | Evidence                                                                                                                                                                                      |
| --------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controlled worker interruption/restart        | passed (observed)  | The worker was redeployed while the existing job remained in `generating`; subsequent worker output resumed materialisation for the same job ID and the release completed.                    |
| Job recovery to completed                     | passed (observed)  | User-provided Azure worker-log screenshots show the original job’s failed retries before remediation and later materialisation start; the public catalogue then showed the completed release. |
| One immutable publication for release version | passed (observed)  | The public catalogue showed one entry for `2026.09.24-issue-565-live`, alongside the prior `2026.09.14v1Public` snapshot.                                                                     |
| No duplicate canonical release artifact       | partially observed | One catalogue entry was observed for the new version; direct metadata/artifact inspection was not separately captured.                                                                        |

## Capacity and availability

| Signal                                           | Observation        | Evidence                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API CPU / memory                                 | pending            | pending                                                                                                                                                                                                                                                                                     |
| Worker CPU / memory                              | pending            | pending                                                                                                                                                                                                                                                                                     |
| API / worker replicas and restart count          | pending            | pending                                                                                                                                                                                                                                                                                     |
| Failed requests / platform errors / Azure outage | partially observed | Azure worker logs captured the pre-remediation timeout/retry failure; after the indexed cursor remediation the same job completed and no further failure was shown in the supplied completion evidence. CPU, memory, replica and Azure Service Health metrics were not separately captured. |
| Public-read duration samples                     | pending            | pending                                                                                                                                                                                                                                                                                     |

## Acceptance conclusion

The previously blocked live asynchronous lifecycle is now observed as complete: the deployed worker
generated and published `2026.09.24-issue-565-live`, and the public catalogue exposed its immutable
3,207,110-event release. This result followed the worker snapshot recovery and indexed source-cursor
remediation after the initial live run exposed a repeatable approximately-120-second snapshot failure.

This is not a complete scripted #565 deployment-acceptance run. The automated runner output,
foreground public-read samples, direct artifact metadata/download retrieval, checksum verification,
and CPU/memory/replica metrics were not recorded and remain pending. The production recovery and
single-publication observations above are retained as the available live evidence.
