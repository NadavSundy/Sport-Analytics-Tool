# Issue #565 — Production-scale deployment acceptance

> **Completed evidence record.** This record combines the automated acceptance result with retained
> browser and Azure Portal screenshots from the live deployment acceptance window. Historical gaps that
> were not separately captured remain identified rather than reconstructed after the fact.

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

## Retained screenshot evidence

The screenshots below were supplied from the original 24-25 September 2026 acceptance activity and
are retained under `evidence/sprints/sprint-3/issue-565/`.

| Evidence | Retained file | What it demonstrates |
| --- | --- | --- |
| Public release catalogue | [`01-release-catalogue-3.2m-events.png`](./issue-565/01-release-catalogue-3.2m-events.png) | Public catalogue contains the immutable `2026.09.24-issue-565-live` release with 3,207,110 events. |
| API metrics, full-day view | [`02-api-metrics-full-day.png`](./issue-565/02-api-metrics-full-day.png) | Azure metrics for API CPU, memory percentage and maximum replica count across the 24 September window. |
| API metrics, evening window | [`03-api-metrics-evening-window.png`](./issue-565/03-api-metrics-evening-window.png) | Zoomed API CPU/memory/replica observations during the live activity window. |
| Worker metrics, evening window | [`04-worker-metrics-evening-window.png`](./issue-565/04-worker-metrics-evening-window.png) | Worker CPU/memory/replica observations during the live activity window. |
| Authenticated admin list | [`05-admin-needs-review-list.png`](./issue-565/05-admin-needs-review-list.png) | Authenticated administrator UI successfully loads live review-queue data. |
| Authenticated review detail | [`06-admin-review-task-detail.png`](./issue-565/06-admin-review-task-detail.png) | Authenticated administrator review task/detail flow renders successfully. |
| Authenticated review queue | [`07-admin-review-queue.png`](./issue-565/07-admin-review-queue.png) | Full authenticated review-queue route renders multiple server-backed batches. |
| Worker metrics, morning window | [`08-worker-metrics-morning-window.png`](./issue-565/08-worker-metrics-morning-window.png) | Worker CPU/memory/replica observations on 25 September. |
| API Container App overview | [`09-api-container-app-overview.png`](./issue-565/09-api-container-app-overview.png) | `statsthegame-dev-api` is running in `rg-statsthegame-dev`, South Africa North. |
| API active revision | [`10-api-active-revision.png`](./issue-565/10-api-active-revision.png) | Active revision `statsthegame-dev-api--0000013` is running with one replica and 100% traffic. |
| Worker capacity metrics | [`11-worker-metrics-capacity.png`](./issue-565/11-worker-metrics-capacity.png) | Additional worker CPU/memory/replica capacity evidence. |
| Worker restart-count metrics | [`12-worker-metrics-restart-count.png`](./issue-565/12-worker-metrics-restart-count.png) | Worker maximum replica count is 1 and total replica restart count is 0 in the captured window. |
| API restart-count metrics | [`13-api-metrics-restart-count.png`](./issue-565/13-api-metrics-restart-count.png) | API maximum replica count is 1 and total replica restart count is 0 in the captured window. |

## Automated result

Attach or link the redacted JSON output from
`scripts/production-scale-deployment-acceptance.mjs` and record:

| Check                                        | Result                  | Evidence                                                                                                                                                                                             |
| -------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend health and CORS                      | passed                  | Successful `issue-565-live-result.json`: `/health` identified `sport-analytics-api`; the runner validates the deployed frontend CORS origin before writing its result.                               |
| Database-backed public read                  | passed                  | Successful runner completion requires the public `/competitions?limit=1` database-read smoke check.                                                                                                  |
| Authenticated administrator request          | passed                  | Successful runner completion requires an authenticated `/auth/me` request using the operator-supplied short-lived administrator token.                                                               |
| Frontend root and nested route               | passed                  | Successful runner completion requires the deployed frontend root and `/fixtures` route to return the `Stat'sTheGame` application marker.                                                             |
| Browser API-backed fixture/statistics screen | not separately captured | The acceptance runner made 48 successful public requests to `/fixtures/8937/statistics` while generation was active. The retained browser screenshots prove deployed API-backed UI rendering, but do not show this exact fixture-statistics route, so that narrower screenshot remains explicitly uncaptured. |
| Browser sign-in and authenticated action     | passed (captured)       | Authenticated administrator UI evidence is retained in [`05-admin-needs-review-list.png`](./issue-565/05-admin-needs-review-list.png), [`06-admin-review-task-detail.png`](./issue-565/06-admin-review-task-detail.png), and [`07-admin-review-queue.png`](./issue-565/07-admin-review-queue.png). The original sign-in form itself was not separately captured. |
| Asynchronous release lifecycle               | passed                  | The fresh runner release `2026.09.25-issue-565-acceptance-1` completed successfully; the result records 3,207,110 events. The original live recovery also completed for `2026.09.24-issue-565-live`, which is visible in [`01-release-catalogue-3.2m-events.png`](./issue-565/01-release-catalogue-3.2m-events.png). |
| Public read while generation runs            | passed                  | 48 successful `/fixtures?limit=1` samples while generating: 318.4–856.7 ms; 421.3 ms average.                                                                                                        |
| Public statistics read while generation runs | passed                  | 48 successful `/fixtures/8937/statistics` samples while generating: 1217.2–1359.5 ms; 1259.2 ms average.                                                                                             |
| Release metadata and artifact retrieval      | passed                  | Successful runner completion requires public metadata and artifact retrieval for `2026.09.25-issue-565-acceptance-1`; result records 3,207,110 events.                                               |
| SHA-256 artifact checksum                    | passed                  | Downloaded artifact SHA-256 matched published metadata: `e28271dca680cd69e5aca34cc47efed4bf18be9db7967a6014b1a1a916aad8b2`.                                                                          |

## Recovery and duplicate safety

| Check                                         | Result            | Evidence                                                                                                                                                                                      |
| --------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controlled worker interruption/restart        | passed (observed) | The worker was redeployed while the existing job remained in `generating`; subsequent worker output resumed materialisation for the same job ID and the release completed.                    |
| Job recovery to completed                     | passed (observed) | The live recovery evidence records failed retries before remediation and subsequent materialisation for the same job; the completed immutable release is retained in [`01-release-catalogue-3.2m-events.png`](./issue-565/01-release-catalogue-3.2m-events.png). |
| One immutable publication for release version | passed (captured) | [`01-release-catalogue-3.2m-events.png`](./issue-565/01-release-catalogue-3.2m-events.png) shows one entry for `2026.09.24-issue-565-live`, alongside the prior `2026.09.14v1Public` snapshot. |
| No duplicate canonical release artifact       | passed (captured) | The fresh version returned an asynchronous job and completed with one published checksum; [`01-release-catalogue-3.2m-events.png`](./issue-565/01-release-catalogue-3.2m-events.png) shows one catalogue entry for the live version. |

## Capacity and availability

| Signal                                           | Observation             | Evidence                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API CPU / memory                                 | observed (captured)     | [`13-api-metrics-restart-count.png`](./issue-565/13-api-metrics-restart-count.png) records average CPU 0.02 cores and average memory 4.4071%; [`02-api-metrics-full-day.png`](./issue-565/02-api-metrics-full-day.png) and [`03-api-metrics-evening-window.png`](./issue-565/03-api-metrics-evening-window.png) retain the broader activity windows. |
| Worker CPU / memory                              | observed (captured)     | [`12-worker-metrics-restart-count.png`](./issue-565/12-worker-metrics-restart-count.png) records average CPU 7.01m cores and average memory 4.5717%; [`04-worker-metrics-evening-window.png`](./issue-565/04-worker-metrics-evening-window.png), [`08-worker-metrics-morning-window.png`](./issue-565/08-worker-metrics-morning-window.png), and [`11-worker-metrics-capacity.png`](./issue-565/11-worker-metrics-capacity.png) retain additional windows. |
| API / worker replicas and restart count          | observed (captured)     | [`13-api-metrics-restart-count.png`](./issue-565/13-api-metrics-restart-count.png) and [`12-worker-metrics-restart-count.png`](./issue-565/12-worker-metrics-restart-count.png) report maximum replica count 1 and total replica restart count 0 for the API and worker respectively. |
| Failed requests / platform errors / Azure outage | not separately captured | Azure worker logs captured the pre-remediation timeout/retry failure; after the indexed cursor remediation the same job completed and no further failure was shown in the supplied completion evidence. Separate API failed-request/platform-error and Azure Service Health views were not retained. |
| Public-read duration samples                     | observed                | Runner recorded 48 fixture samples: 318.4–856.7 ms; 421.3 ms average. It recorded 48 statistics samples: 1217.2–1359.5 ms; 1259.2 ms average.                                                                                                                                                        |

## Acceptance conclusion

The previously blocked live asynchronous lifecycle is now observed as complete: the deployed worker
generated and published `2026.09.24-issue-565-live`, and the public catalogue exposed its immutable
3,207,110-event release. This result followed the worker snapshot recovery and indexed source-cursor
remediation after the initial live run exposed a repeatable approximately-120-second snapshot failure.

The scripted deployment-acceptance run completed successfully for
`2026.09.25-issue-565-acceptance-1`, including asynchronous generation, foreground public reads,
metadata/artifact retrieval, and SHA-256 verification. The retained screenshot set now captures the
public 3,207,110-event release, the deployed API resource and active revision, authenticated
administrator UI routes, API and worker CPU/memory, maximum replica count, and zero-restart
observations. These screenshots are linked above and stored under `./issue-565/`.

The exact browser-rendered `/fixtures/8937/statistics` screen, worker revision name, separate API
failed-request/platform-error view, and Azure Service Health view were not separately retained. Their
absence is documented rather than reconstructed after the fact and does not invalidate the successful
automated and observed deployment acceptance recorded here.

## AI Declaration

The preceding evidence document was reviewed and edited with the assistance of:
ChatGPT-Web[GPT-5.6 Thinking]. The measured results and screenshots remain the team's observed
evidence; AI assistance was used only to organise and cross-reference the retained material.
