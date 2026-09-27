# Issue #565 — Production-scale deployment acceptance

> **Evidence template.** Replace each `pending` value only with an observed result from the approved
> environment. Do not mark this acceptance complete from local contract tests.

## Run identity

| Field                                | Observed value                                                                                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Date and UTC time range              | 2026-09-25 09:24:04 to 09:43:50 UTC full acceptance run; `issue-565-live-result.json`                                                                                                                                                            |
| Environment and resource group       | Development; Azure resource group `rg-statsthegame-dev`                                                                                                                                                                                          |
| Application commit SHA               | `793a2212eaadf91a6684fa88c01d38111f00dc7c`                                                                                                                                                                                                       |
| API revision / health                | `statsthegame-dev-api--0000013`; Azure Container Apps showed Running (at max) with one replica on 2026-09-25; `/health` returned 200 with `status: ok`                                                                                           |
| Worker revision / health / replicas  | Revision name not separately captured; Azure Metrics showed maximum one replica and total replica restart count zero on 2026-09-25.                                                                                                              |
| Frontend URL                         | https://sport-analytics-tool-web.pages.dev                                                                                                                                                                                                       |
| Release version / job ID             | Live recovery: `2026.09.24-issue-565-live`; `236a8529-9e11-4c00-a5ad-688dabf6e973`. Full acceptance run: `2026.09.25-issue-565-acceptance-1`; job ID was not retained in the redacted runner output.                                             |
| Corpus manifest command and checksum | `npm.cmd run data:performance:generate -- --fixtures 300 --output data/performance/issue-565-representative-t20`; 300 fictional fixtures; 72,000 deliveries; manifest SHA-256 `724737C5F574F184968B82D883A2634FA5AB007CEAE73824820149ED0C0D48AF` |

## Automated result

Attach or link the redacted JSON output from
`scripts/production-scale-deployment-acceptance.mjs` and record:

| Check                                        | Result                  | Evidence                                                                                                                                                                                             |
| -------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend health and CORS                      | passed                  | Successful `issue-565-live-result.json`: `/health` identified `sport-analytics-api`; the runner validates the deployed frontend CORS origin before writing its result.                               |
| Database-backed public read                  | passed                  | Successful runner completion requires the public `/competitions?limit=1` database-read smoke check.                                                                                                  |
| Authenticated administrator request          | passed                  | Successful runner completion requires an authenticated `/auth/me` request using the operator-supplied short-lived administrator token.                                                               |
| Frontend root and nested route               | passed                  | Successful runner completion requires the deployed frontend root and `/fixtures` route to return the `Stat'sTheGame` application marker.                                                             |
| Browser API-backed fixture/statistics screen | not separately captured | The acceptance runner made 48 successful public requests to `/fixtures/8937/statistics` while generation was active; a separate browser-rendering screenshot was not retained.                       |
| Browser sign-in and authenticated action     | passed (observed)       | On 2026-09-25 at 11:39 SAST, an authenticated user was granted access to the Africa Cricket Association Cup competition and the access flow passed. A browser screenshot was not retained.           |
| Asynchronous release lifecycle               | passed                  | The fresh runner release `2026.09.25-issue-565-acceptance-1` completed successfully; the result records 3,207,110 events. The original live recovery also completed for `2026.09.24-issue-565-live`. |
| Public read while generation runs            | passed                  | 48 successful `/fixtures?limit=1` samples while generating: 318.4–856.7 ms; 421.3 ms average.                                                                                                        |
| Public statistics read while generation runs | passed                  | 48 successful `/fixtures/8937/statistics` samples while generating: 1217.2–1359.5 ms; 1259.2 ms average.                                                                                             |
| Release metadata and artifact retrieval      | passed                  | Successful runner completion requires public metadata and artifact retrieval for `2026.09.25-issue-565-acceptance-1`; result records 3,207,110 events.                                               |
| SHA-256 artifact checksum                    | passed                  | Downloaded artifact SHA-256 matched published metadata: `e28271dca680cd69e5aca34cc47efed4bf18be9db7967a6014b1a1a916aad8b2`.                                                                          |

## Recovery and duplicate safety

| Check                                         | Result            | Evidence                                                                                                                                                                                      |
| --------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controlled worker interruption/restart        | passed (observed) | The worker was redeployed while the existing job remained in `generating`; subsequent worker output resumed materialisation for the same job ID and the release completed.                    |
| Job recovery to completed                     | passed (observed) | User-provided Azure worker-log screenshots show the original job’s failed retries before remediation and later materialisation start; the public catalogue then showed the completed release. |
| One immutable publication for release version | passed (observed) | The public catalogue showed one entry for `2026.09.24-issue-565-live`, alongside the prior `2026.09.14v1Public` snapshot.                                                                     |
| No duplicate canonical release artifact       | passed (observed) | The fresh version returned an asynchronous job and completed with one published checksum; the public catalogue showed one entry for the prior live version.                                   |

## Capacity and availability

| Signal                                           | Observation             | Evidence                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API CPU / memory                                 | observed                | Azure Metrics screenshot for `statsthegame-dev-api`: average CPU 0.02 cores; average memory 4.4071%. The displayed chart covered a 2026-09-25 SAST morning window; the exact portal range selection was not retained.                                                                                |
| Worker CPU / memory                              | observed                | Azure Metrics screenshot for `statsthegame-dev-batch-worker`: average CPU 7.01m cores; average memory 4.5717%. The displayed chart covered a 2026-09-25 SAST morning window; the exact portal range selection was not retained.                                                                      |
| API / worker replicas and restart count          | observed                | The supplied Azure Metrics screenshots reported maximum replica count 1 and total replica restart count 0 for both `statsthegame-dev-api` and `statsthegame-dev-batch-worker`.                                                                                                                       |
| Failed requests / platform errors / Azure outage | not separately captured | Azure worker logs captured the pre-remediation timeout/retry failure; after the indexed cursor remediation the same job completed and no further failure was shown in the supplied completion evidence. Separate API failed-request/platform-error and Azure Service Health views were not retained. |
| Public-read duration samples                     | observed                | Runner recorded 48 fixture samples: 318.4–856.7 ms; 421.3 ms average. It recorded 48 statistics samples: 1217.2–1359.5 ms; 1259.2 ms average.                                                                                                                                                        |

## Acceptance conclusion

The previously blocked live asynchronous lifecycle is now observed as complete: the deployed worker
generated and published `2026.09.24-issue-565-live`, and the public catalogue exposed its immutable
3,207,110-event release. This result followed the worker snapshot recovery and indexed source-cursor
remediation after the initial live run exposed a repeatable approximately-120-second snapshot failure.

The scripted deployment-acceptance run completed successfully for
`2026.09.25-issue-565-acceptance-1`, including asynchronous generation, foreground public reads,
metadata/artifact retrieval, and SHA-256 verification. Browser rendering, worker revision name, API
failed-request/platform-error, and Azure Service Health views were not separately retained; their
absence is documented above rather than treated as further work. API and worker CPU/memory,
maximum-replica, and zero-restart observations were captured separately, but their exact portal range
was not retained. The production recovery and single-publication observations above are retained as
the available live evidence.
