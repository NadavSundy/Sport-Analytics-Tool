# Azure App Service Deployment Recovery and End-to-End Integration

**Status:** Working with a temporary backend startup workaround
**Incident period:** 10–13 August 2026
**Environment:** Development
**Resource group:** `rg-statsthegame-dev`
**Backend App Service:** `statsthegame-api-dev`
**Frontend App Service:** `statsthegame-web-dev`

---

## 1. Purpose

This document records the Azure deployment problems encountered while deploying the Sport Analytics Tool frontend and backend, the investigation performed by the team, the fixes applied, the evidence used to verify recovery, and the remaining work required to make the deployment reliable.

The immediate deployment is currently operational:

- the frontend is publicly reachable;
- the handwritten backend API is publicly reachable;
- the backend can connect to the PostgreSQL database;
- public competition data can be retrieved through the API;
- the deployed frontend can retrieve data from the deployed backend;
- CORS is configured for the deployed frontend origin.

The current backend deployment is **not yet considered a permanent CI/CD solution** because startup currently contains a workaround for an npm workspace dependency.

---

## 2. Relevant architecture

The deployed application currently follows this path:

```text
Browser
   |
   v
Azure App Service
Frontend: statsthegame-web-dev
   |
   | HTTPS requests
   v
Azure App Service
Backend: statsthegame-api-dev
   |
   +--> @sport-analytics/contracts
   |
   +--> PostgreSQL database
   |
   +--> authentication provider/services where required
```

The frontend and backend are deployed separately.

The browser communicates with the team's handwritten backend through HTTP endpoints under `/api/v1`.

The backend uses the shared workspace package:

```text
@sport-analytics/contracts
```

for shared API contracts and validation.

---

## 3. Deployment configuration

### Backend runtime variables

The backend requires environment configuration including:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
CORS_ORIGINS
NODE_ENV
API_VERSION
```

Secrets must remain in Azure App Service/Gitea secret storage and must not be committed to the repository.
`SUPABASE_SECRET_KEY` is optional for process startup but required for self-service account deletion.
Keep it server-side in App Service configuration; never add it to frontend build settings.

### Frontend build variables

The frontend requires build-time configuration including:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Because Vite variables are substituted into the frontend during the build, changes to these values generally require a new frontend build/deployment.

---

## 4. Important configuration inconsistency discovered

The backend code reads:

```text
CORS_ORIGINS
```

The relevant implementation is in:

```text
apps/backend/src/app.ts
apps/backend/src/config/env.ts
```

At the time of investigation, `.env.example` also contained:

```text
CORS_ALLOWED_ORIGINS
```

The backend does **not** use this second variable.

This creates a configuration risk because a developer may configure `CORS_ALLOWED_ORIGINS` believing that it controls the application.

### Required repository cleanup

Keep one authoritative variable:

```text
CORS_ORIGINS
```

Remove `CORS_ALLOWED_ORIGINS` from examples/documentation unless it later becomes an intentionally supported setting.

---

## 5. Initial Azure deployment problems

Several separate problems occurred during deployment. They must not be treated as one failure because each has a different cause.

### 5.1 Environment configuration

The deployed backend required its runtime environment variables to be configured in Azure App Service.

Missing or incorrect environment variables could cause startup or runtime failures.

The frontend also required its Vite variables to be available when the frontend bundle was built.

Environment configuration therefore needs to be considered part of deployment rather than an optional post-deployment task.

---

## 6. F1 App Service quota event

During deployment troubleshooting, the API App Service was observed in the following state:

```text
state: QuotaExceeded
usageState: Exceeded
```

This temporarily prevented useful backend recovery work.

The investigation established that an Azure F1 quota had been exhausted, but the available evidence did **not conclusively establish which exact workload consumed the quota**.

Therefore, this incident should not be documented as having a confirmed CPU/runtime-loop root cause unless further Azure metrics provide that evidence.

### Lesson

When an F1 instance reports `QuotaExceeded`:

1. inspect App Service plan usage before changing application code;
2. avoid repeated restart/redeploy loops;
3. distinguish an Azure quota failure from an application startup failure;
4. wait for or resolve the quota condition before drawing conclusions from application availability.

---

## 7. Diagnostic server test

A minimal Node diagnostic server was deployed during investigation.

The diagnostic server successfully returned:

```text
HTTP 200 OK
```

This proved that the following underlying Azure functionality was working:

- the App Service instance could run Node;
- Azure public routing worked;
- the application could listen on the Azure-provided port;
- requests could reach the application;
- the F1 platform itself was capable of serving the application.

This was important because it separated an Azure infrastructure problem from a problem in the real backend deployment.

Once the diagnostic server worked, investigation returned to the real backend.

---

## 8. Confirmed backend startup failure

The real backend subsequently failed with:

```text
Cannot find module '@sport-analytics/contracts'
```

This became the main runtime blocker.

The project uses npm workspaces, including:

```text
apps/backend
packages/contracts
```

The deployed backend expected the workspace package:

```text
@sport-analytics/contracts
```

to remain resolvable.

---

## 9. Oryx/npm workspace symlink problem

Azure/Oryx deployment produced/extracted runtime dependencies under:

```text
/node_modules
```

The npm workspace dependency for:

```text
@ sport-analytics/contracts
```

was represented using a workspace symlink.

After Oryx's deployment/extraction behaviour, the generated link no longer resolved to the deployed package correctly.

The actual package remained available in the application deployment under:

```text
/home/site/wwwroot/packages/contracts
```

but Node could not resolve:

```text
@sport-analytics/contracts
```

from the runtime dependency tree.

The resulting startup sequence was effectively:

```text
Azure starts backend
        |
        v
Node loads backend
        |
        v
require/import @sport-analytics/contracts
        |
        v
broken workspace link
        |
        v
Cannot find module
        |
        v
backend exits
```

This was the confirmed application-level cause of the backend startup failure.

---

## 10. Temporary backend recovery workaround

A temporary startup command was added to the API App Service.

The current command is:

```bash
mkdir -p /node_modules/@sport-analytics \
&& ln -sfn /home/site/wwwroot/packages/contracts /node_modules/@sport-analytics/contracts \
&& node apps/backend/dist/index.js
```

The command performs three actions:

1. ensures `/node_modules/@sport-analytics` exists;
2. creates/repairs the `contracts` workspace link so that it points to the deployed package;
3. starts the compiled backend.

The resulting runtime mapping is:

```text
/node_modules/@sport-analytics/contracts
             |
             v
/home/site/wwwroot/packages/contracts
```

After this command was active, the backend started successfully.

### Important

This is a **recovery workaround**, not the desired final deployment architecture.

The final backend deployment must not depend on Azure preserving or repairing npm workspace links at application startup.

---

## 11. Verifying the backend

The backend default hostname should be discovered from Azure rather than manually constructed:

```bash
RG="rg-statsthegame-dev"
API_APP="statsthegame-api-dev"

APP_HOST=$(az webapp show \
  --resource-group "$RG" \
  --name "$API_APP" \
  --query defaultHostName \
  -o tsv)

echo "$APP_HOST"
```

As of 13 August 2026, the API hostname was:

```text
statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net
```

Azure may generate different default hostnames if resources are recreated, so scripts and documentation should prefer dynamic discovery.

### Health verification

```bash
curl -i \
  "https://${APP_HOST}/api/v1/health"
```

Successful result:

```text
HTTP/1.1 200 OK
```

with a response similar to:

```json
{
  "status": "ok",
  "service": "sport-analytics-api"
}
```

This proved that:

- Azure routing worked;
- Node was running;
- Express had started;
- the backend startup workaround allowed the application to load.

---

## 12. Database/API verification

The public competition endpoint was then tested:

```bash
curl -i \
  "https://${APP_HOST}/api/v1/competitions"
```

It returned:

```text
HTTP/1.1 200 OK
```

and real database data including competitions such as:

```text
Africa Continental Cup
Asian Games Men's Cricket Competition
Australia in New Zealand T20I Series
Indian Premier League
```

This was stronger evidence than the health endpoint alone.

It confirmed the working path:

```text
Public Internet
      |
      v
Azure App Service
      |
      v
Backend
      |
      v
Shared contracts
      |
      v
PostgreSQL
      |
      v
API response
```

Pagination was also verified using:

```bash
curl -i \
  "https://${APP_HOST}/api/v1/competitions?limit=2"
```

The response returned a limited result set and a `nextCursor`, confirming that the deployed API's pagination functionality was operational.

---

## 13. Azure hostname investigation

During troubleshooting, requests were initially attempted against the conventional hostname:

```text
statsthegame-api-dev.azurewebsites.net
```

This did not resolve.

The deployed App Service uses Azure's unique default hostname format.

The correct hostnames were obtained with:

```bash
az webapp show \
  --resource-group "$RG" \
  --name "$API_APP" \
  --query enabledHostNames \
  -o tsv
```

This returned both the application hostname and SCM hostname.

The application's root endpoint returned:

```text
HTTP/1.1 404 Not Found
```

This was useful evidence rather than a failure: it showed that requests were reaching the real Express application, which simply did not define a `/` route.

The SCM endpoint returned:

```text
HTTP/1.1 401 Unauthorized
```

which showed that the SCM service itself was reachable.

---

## 14. SSH troubleshooting

The following command was also attempted:

```bash
az webapp ssh \
  --resource-group "$RG" \
  --name "$API_APP"
```

It reported:

```text
Connection Timed Out
```

However, subsequent HTTP tests showed that:

- the application hostname was reachable;
- the SCM hostname was reachable;
- SCM access restrictions allowed access.

The SSH timeout was therefore treated as a management/tunnel issue rather than evidence that the public application was down.

Deployment diagnosis should not rely on SSH availability alone.

---

## 15. Frontend-to-backend CORS failure

Once the backend and database were working, the deployed frontend still showed:

```text
Competitions could not be loaded
Failed to fetch
```

Browser DevTools showed:

```text
blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present
```

The request itself reached the backend successfully, but the browser was not permitted to expose the response to the frontend JavaScript.

---

## 16. Confirmed CORS root cause

The API App Service had:

```text
CORS_ORIGINS=https://statsthegame-web-dev.azurewebsites.net
```

However, the actual deployed frontend was running at the Azure-generated unique hostname:

```text
https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net
```

CORS origin matching requires the correct origin.

The frontend origin was discovered dynamically:

```bash
RG="rg-statsthegame-dev"
WEB_APP="statsthegame-web-dev"

WEB_HOST=$(az webapp show \
  --resource-group "$RG" \
  --name "$WEB_APP" \
  --query defaultHostName \
  -o tsv)

WEB_ORIGIN="https://${WEB_HOST}"

echo "$WEB_ORIGIN"
```

The backend App Service setting was then updated:

```bash
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$API_APP" \
  --settings "CORS_ORIGINS=${WEB_ORIGIN}"
```

---

## 17. CORS verification

CORS was verified independently of the browser.

```bash
curl -i \
  "https://${APP_HOST}/api/v1/competitions?limit=2" \
  -H "Origin: ${WEB_ORIGIN}"
```

The successful response contained:

```text
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net
Access-Control-Allow-Credentials: true
```

A comparison test was also performed against three origins:

```bash
for ORIGIN in \
  "$WEB_ORIGIN" \
  "https://statsthegame-web-dev.azurewebsites.net" \
  "http://localhost:5173"
do
  echo
  echo "Testing: $ORIGIN"

  curl -sS -D - -o /dev/null \
    "https://${APP_HOST}/api/v1/competitions?limit=1" \
    -H "Origin: ${ORIGIN}" \
    | grep -Ei \
      'HTTP/|Access-Control-Allow-Origin|Access-Control-Allow-Credentials|Vary:'
done
```

Results:

```text
Actual deployed frontend
    -> Access-Control-Allow-Origin returned

Old Azure frontend hostname
    -> no Access-Control-Allow-Origin

localhost:5173
    -> no Access-Control-Allow-Origin
```

This confirmed that the production backend was allowing the intended deployed frontend rather than using a wildcard origin.

---

## 18. Preflight verification

The API's CORS preflight behaviour was checked with:

```bash
curl -i -X OPTIONS \
  "https://${APP_HOST}/api/v1/competitions" \
  -H "Origin: ${WEB_ORIGIN}" \
  -H "Access-Control-Request-Method: GET"
```

The backend returned:

```text
HTTP/1.1 204 No Content
```

along with the appropriate CORS response configuration.

After the server-side origin configuration was corrected and the frontend refreshed, the deployed frontend successfully loaded competition data.

---

## 19. Final verified working path

At the end of the recovery process, the following path was verified:

```text
Browser
   |
   v
Deployed frontend
   |
   | HTTPS
   | correct API base URL
   | permitted CORS origin
   v
Deployed handwritten API
   |
   | shared contracts
   v
PostgreSQL
   |
   v
competition records
   |
   v
API JSON response
   |
   v
browser renders competition data
```

### Verified status on 13 August 2026

| Component                  | Status      | Evidence                                       |
| -------------------------- | ----------- | ---------------------------------------------- |
| Azure App Service          | Working     | Application reachable publicly                 |
| Frontend deployment        | Working     | Application loads in browser                   |
| Backend process            | Working     | `/api/v1/health` returns `200`                 |
| Shared contracts           | Working     | Backend starts using temporary link repair     |
| PostgreSQL connectivity    | Working     | Competition records returned                   |
| Public API                 | Working     | `/api/v1/competitions` returns `200`           |
| Pagination                 | Working     | `limit` and `nextCursor` verified              |
| CORS                       | Working     | Exact deployed frontend origin allowed         |
| Frontend → API integration | Working     | Competition data visible in frontend           |
| Permanent backend artifact | Outstanding | Temporary startup workaround remains           |
| Deployment CI/CD hardening | Outstanding | Must be verified/fixed before final submission |

---

## 20. Gitea deployment workflow repair

The deployment workflows now use the current `apps/backend` and `apps/frontend` paths. Changes to
`packages/contracts`, the root npm manifests, shared TypeScript configuration and the relevant
deployment helpers also trigger the affected deployment.

Both workflows install from the root lockfile and address workspaces by their package names:

```text
@sport-analytics/backend
@sport-analytics/frontend
@sport-analytics/contracts
```

They run focused lint, type-check and test commands before building and deploying. Each workflow can
also be started manually through `workflow_dispatch` when configuration-only recovery requires a
redeployment.

The implementation is only one part of the evidence. The repair must not be described as deployed or
successful until it is merged and the corresponding Gitea Actions runs and smoke-check output pass.

---

## 21. Permanent backend deployment fix

The current startup workaround must eventually be removed.

### Current temporary design

```text
Oryx deployment
     |
     v
workspace link becomes unusable
     |
     v
startup script recreates link
     |
     v
backend starts
```

### Implemented artifact design

```text
Gitea Actions
     |
     v
install reproducible dependencies
     |
     v
build shared contracts
     |
     v
build backend
     |
     v
assemble production runtime artifact
     |
     v
smoke-test artifact
     |
     v
deploy artifact
     |
     v
configured Azure startup launches backend
```

The backend workflow creates `.deployment/backend` from the root `package-lock.json`. It contains the
compiled backend, compiled shared contracts, the runtime CA certificate and production dependencies.
During assembly, the npm workspace link for `@sport-analytics/contracts` is replaced with a physical
directory. The workflow then starts this artifact and checks its health endpoint before deployment.

The existing Azure startup workaround remains configured until a merged live deployment proves the
artifact and the App Service startup command is changed deliberately. The publish-profile workflow
does not make that Azure configuration change.

### Remaining criteria for removing the workaround

The recovery workaround may be removed only when:

- CI builds `@sport-analytics/contracts`;
- CI builds the backend;
- the merged Gitea workflow generates and deploys the clean runtime artifact;
- the artifact contains all runtime dependencies and a physical contracts package;
- the artifact passes its pre-deployment startup health check;
- a live Gitea deployment and its post-deployment checks pass;
- Azure starts using a normal backend startup command;
- `/api/v1/health` returns `200`;
- `/api/v1/competitions` returns database data;
- the deployed frontend can access the API;
- CORS is verified;
- deployment documentation is updated;
- no secrets are committed.

Only after the live evidence and configuration change are complete should the temporary Azure startup
workaround be removed.

---

## 22. Backend CI deployment checks

The backend deployment pipeline performs:

```text
dependency installation
        |
        v
lint/type checks
        |
        v
shared-contract tests
        |
        v
backend unit/API tests
        |
        v
shared-contract build
        |
        v
backend build
        |
        v
runtime artifact creation
        |
        v
artifact smoke test
        |
        v
Azure deployment
        |
        v
post-deployment health test
```

A failed artifact or deployed health check fails the workflow. The deployed workflow also verifies the
read-only database-backed path:

```text
GET /api/v1/competitions?limit=1
```

so that deployment verifies both the process and database connectivity. The helper retries normal
App Service warm-up failures, reports each attempt and exits unsuccessfully after the configured
limit.

---

## 23. Frontend CI deployment checks

The frontend workflow:

1. install dependencies reproducibly;
2. run frontend tests;
3. build with the intended deployment environment;
4. provide `VITE_API_BASE_URL` at build time;
5. deploy the resulting frontend artifact;
6. verify the frontend URL is reachable;
7. fails if the deployed response does not contain the expected application title.

The value of:

```text
VITE_API_BASE_URL
```

must point to the actual deployed API hostname. `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` are also provided from Gitea secrets during the Vite build. These
values are not printed by the workflow.

---

## 24. CORS deployment policy

CORS should continue to be controlled by the handwritten Express backend rather than being duplicated across multiple independently maintained configuration systems.

For the deployed development environment:

```text
CORS_ORIGINS=<exact deployed frontend origin>
```

If multiple legitimate frontend origins are required, the backend already parses a comma-separated list and they can be supplied explicitly.

Avoid:

```text
CORS_ORIGINS=*
```

when credentialed browser requests are used.

The allowed production/development origins should be documented as part of deployment configuration.

---

## 25. Useful recovery commands

### Discover current hosts

```bash
RG="rg-statsthegame-dev"
API_APP="statsthegame-api-dev"
WEB_APP="statsthegame-web-dev"

APP_HOST=$(az webapp show \
  --resource-group "$RG" \
  --name "$API_APP" \
  --query defaultHostName \
  -o tsv)

WEB_HOST=$(az webapp show \
  --resource-group "$RG" \
  --name "$WEB_APP" \
  --query defaultHostName \
  -o tsv)

WEB_ORIGIN="https://${WEB_HOST}"
```

### Check backend state

```bash
az webapp show \
  --resource-group "$RG" \
  --name "$API_APP" \
  --query "{state:state,usageState:usageState,host:defaultHostName}" \
  -o table
```

Expected healthy state:

```text
Running
Normal
```

### Inspect startup command

```bash
az webapp config show \
  --resource-group "$RG" \
  --name "$API_APP" \
  --query appCommandLine \
  -o tsv
```

### Test health

```bash
curl -i \
  "https://${APP_HOST}/api/v1/health"
```

### Test database-backed endpoint

```bash
curl -i \
  "https://${APP_HOST}/api/v1/competitions?limit=2"
```

### Test frontend CORS origin

```bash
curl -i \
  "https://${APP_HOST}/api/v1/competitions?limit=2" \
  -H "Origin: ${WEB_ORIGIN}"
```

Expected:

```text
Access-Control-Allow-Origin: <WEB_ORIGIN>
```

### Tail startup/application logs

```bash
az webapp log tail \
  --resource-group "$RG" \
  --name "$API_APP"
```

---

## 26. Azure CLI issue observed during recovery

During investigation, one invocation of:

```bash
az webapp config appsettings list
```

failed with:

```text
InvalidApiVersionParameter
```

and reported that API version:

```text
2025-05-01
```

was unsupported.

This was a local Azure CLI/management API tooling issue and was **not evidence of application failure**.

At the same time, runtime HTTP tests proved that the API remained healthy and that the new CORS origin had become active.

When diagnosing the application, prefer direct runtime evidence such as health/API requests over assuming that a failed Azure management command means the deployed application is down.

---

## 27. Evidence that should be retained

The team should retain evidence of this incident and recovery, including:

- Azure state showing the earlier quota condition;
- startup logs showing the `@sport-analytics/contracts` module error;
- the diagnostic server returning `200`;
- the temporary startup command;
- `/api/v1/health` returning `200`;
- `/api/v1/competitions` returning real database records;
- pagination test results;
- browser screenshot showing the CORS failure;
- CORS matrix showing the corrected origin;
- a screenshot of the now-working deployed competitions page;
- relevant Gitea issues;
- pull requests that implement the permanent deployment fix;
- Gitea Actions runs demonstrating successful CI/CD;
- deployment/configuration documentation changes.

Do not create or alter evidence retrospectively. Preserve the actual commands, screenshots, logs, commits, pull requests and workflow runs produced during the work.

---

## 28. Known follow-up work

### High priority

- Merge the repaired frontend and backend deployment workflows and retain their passing Gitea Action
  links and smoke-check output.
- Verify the generated backend artifact on Azure, switch the App Service to the normal startup command
  and then remove the runtime workspace-link repair.
- Remove the obsolete `CORS_ALLOWED_ORIGINS` example if it remains unused.
- Verify the configured frontend build-time secrets in Gitea without exposing their values.
- Capture evidence of successful automated deployments and the database-backed backend check.

### Before Milestone 2

- Ensure the public API remains externally available.
- Publish/update API documentation.
- Add meaningful automated API tests.
- Add meaningful UI tests.
- Continue database documentation.
- Document third-party dependencies/integrations.
- Ensure deployment is reproducible by CI rather than dependent on manual Azure repair.
- Record deployment bugs and fixes in the issue tracker.

### Before final submission

- Remove temporary recovery configuration.
- Verify frontend, backend, database and documentation deployments.
- Verify authentication journeys.
- Verify CORS and secret handling.
- Verify external API integration and failure handling.
- Run accessibility and responsive-design checks.
- Run performance tests.
- Verify production error handling.
- Run automated deployment smoke tests.
- Review all deployment documentation against the real production configuration.

---

## 29. Lessons learned

### Treat deployment failures as separate layers

The incident included several independent issues:

```text
Azure quota
     !=
backend startup
     !=
database connection
     !=
CORS
     !=
frontend rendering
     !=
CI workflow correctness
```

Fixing one layer does not prove the others work.

### Test from the bottom upward

The most useful recovery sequence was:

```text
Azure/Node diagnostic
        |
        v
backend startup
        |
        v
health endpoint
        |
        v
database-backed API endpoint
        |
        v
CORS
        |
        v
frontend integration
```

This prevented unrelated failures from being confused with each other.

### Prefer runtime evidence

A successful:

```text
GET /api/v1/health
```

proved process health.

A successful:

```text
GET /api/v1/competitions
```

proved significantly more because it exercised the backend and database together.

A browser successfully rendering those competitions provided the final end-to-end proof.

### Deployment must be reproducible

Manual Azure configuration was useful for recovery, but the final project must be deployable predictably through CI/CD.

The current symlink startup command therefore remains technical debt and must not be mistaken for the final solution.

---

## 30. Current conclusion

As of 13 August 2026, the development deployment is operational.

The team successfully restored:

```text
frontend
    |
    v
handwritten backend API
    |
    v
PostgreSQL
```

and verified API health, database-backed competition retrieval, pagination, CORS, and frontend data display.

The main outstanding deployment risk is the temporary npm-workspace symlink repair in the backend App Service startup command.

The repaired workflows create a deterministic, tested deployment path. The next deployment objective
is to merge them, retain passing live evidence and then remove the temporary Azure startup workaround
through a deliberate configuration change.

---

## AI Declaration

The preceding document was generated with the assistance of:

**ChatGPT Web[GPT-5.6 Thinking]**

Purpose: review of deployment troubleshooting, technical documentation, organisation of recovery evidence, and CI/CD follow-up planning.

The workflow repair, artifact packaging and smoke-check sections were updated with the assistance of
**Codex[GPT-5]**.

The project team must review this document against the repository, Azure configuration, logs and Gitea evidence before merging it.
