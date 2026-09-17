# Azure Backend Deployment

## Hosting Platform

Azure App Service (Linux)

## Runtime

Node.js 22 LTS

## Resource

`statsthegame-api-dev`

## Environment

Development deployment

## Environment Variables

| Variable                                 | Current status                  | Description                                                                 |
| ---------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`                               | Used                            | Set to `production` for the deployed runtime.                               |
| `PORT`                                   | Platform-provided/defaulted     | HTTP listen port.                                                           |
| `CORS_ORIGINS`                           | Used                            | Comma-separated allowed browser origins; include the deployed frontend URL. |
| `SUPABASE_URL`                           | Used                            | Supabase Auth project URL.                                                  |
| `SUPABASE_PUBLISHABLE_KEY`               | Used                            | Supabase publishable key used for backend token verification.               |
| `SUPABASE_SECRET_KEY`                    | Required for issue #66          | Server-only Supabase key used by Auth Admin account deletion.               |
| `DATABASE_URL`                           | Used                            | PostgreSQL session-pooler connection string.                                |
| `AZURE_STORAGE_ACCOUNT_NAME`             | Required in production          | Non-secret Blob account name; `statsthegameblobdev` in development.         |
| `AZURE_STORAGE_CONTAINER_NAME`           | Required in production          | Non-secret private container name; `staged-ingestion` in development.       |
| `AZURE_STORAGE_INGESTION_CONTAINER_NAME` | Preferred; old name is an alias | Private staged-ingestion container.                                         |
| `AZURE_STORAGE_RELEASE_CONTAINER_NAME`   | Required in production          | Separate private `dataset-releases` container.                              |
| `DEPLOYMENT_ENVIRONMENT`                 | Required in production          | Stable namespace, currently `dev`, shared with the worker.                  |

## Approved Intermediate service boundary

Batch ingestion will keep the Express API on Azure App Service. The API will stream source bytes to
private Azure Blob Storage and commit batch/job metadata through PostgreSQL. A transactional outbox
relay will deliver batch-validation and dataset-release job identifiers to Azure Service Bus Standard, and a separately deployed Node.js
worker in Azure Container Apps will process them.

The API uses `DefaultAzureCredential` and the App Service managed identity for Blob Storage. Blob
account keys, connection strings, SAS tokens, and shared-key credentials are intentionally
unsupported. The separate worker has its own managed-identity/deployment boundary documented in
[Azure worker deployment](azure-worker.md).

The development Blob resources are provisioned outside this repository: backend identity
`statsthegame-api-dev`, storage account `statsthegameblobdev`, and private container
`staged-ingestion`, with **Storage Blob Data Contributor** assigned to the backend identity. The
repository does not create or mutate these Azure resources or RBAC assignments.

The issue #358 private object-storage adapter, streaming safeguards, durable metadata and production
runtime composition are implemented in the backend. Batch receipt, durable validation/reporting and
review/publication APIs now use that staged-ingestion boundary. See the
[private object-storage operations guide](object-storage-operations.md) for access, recovery and
credential-rotation requirements.

`API_VERSION`, `CORS_ALLOWED_ORIGINS` and `LOG_LEVEL` appear as reserved placeholders in the current backend example environment file but are not read by the current application runtime. In particular, deployed CORS configuration must use `CORS_ORIGINS` unless the application code is deliberately changed.

Database credentials and other secrets are configured through Azure App Service and are never committed.

## Public OpenAPI specification

The backend exposes the machine-readable OpenAPI contract publicly at:

```text
https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net/openapi.yaml
```

The equivalent local-development URL is `http://localhost:3000/openapi.yaml`. This documentation route
requires neither Supabase application authentication nor an API consumer key and does not change the
versioned `/api/v1` application API.

The authoritative source remains `docs/api/openapi.yaml`. `npm run build --workspace=@sport-analytics/backend`
copies that exact file to `apps/backend/dist/openapi.yaml`, and the deployment preparation step copies the
complete backend `dist` tree into `.deployment/backend`. The copy helper verifies byte-for-byte equality
with the version-controlled source so a production build cannot silently package a divergent contract.

## Logging

The Express application uses Pino HTTP for structured request logging. Azure App Service provides the hosting/runtime log surface.

## Deployment

Automatic backend deployment is part of `Sport Analytics CI`. After a production-impacting backend or
shared-contract change is merged, the change-aware planner validates the `main` commit and the
`deploy_backend` job runs only after the required `quality` job succeeds.

The automatic deployment job:

1. installs the committed workspace reproducibly with `npm ci`;
2. validates `AZURE_BACKEND_PUBLISH_PROFILE`;
3. builds `@sport-analytics/backend` for production (the backend prebuild prepares shared contracts);
4. creates `.deployment/backend` from the root lockfile with production dependencies, compiled backend
   output, the runtime CA certificate and a physical copy of the compiled contracts package;
5. starts that artifact with non-secret smoke configuration and verifies its local health endpoint;
6. creates and publishes the Azure ZIP using `scripts/deploy-backend-azure.py`; and
7. retries the deployed health endpoint before checking the read-only
   `/api/v1/competitions?limit=1` database path.

Backend lint, typecheck, unit, API and required PostgreSQL integration tests remain authoritative in the
change-aware CI lanes before `quality` succeeds and are not duplicated inside deployment.

`apps/backend/src/**`, runtime backend configuration and shared-contract changes can request backend
deployment. Backend test-only, frontend-only, documentation, evidence and CI-only changes do not
redeploy an unchanged API. Root dependency/configuration changes are handled conservatively when they
can affect the production backend.

`.gitea/workflows/deploy-backend.yml` is retained as a manual `workflow_dispatch` recovery/redeployment
path. It shares the same Azure ZIP/Kudu implementation through `scripts/deploy-backend-azure.py` but is
not an independent push-triggered deployment workflow.

The local artifact check proves that the compiled server and runtime dependency tree can start before
Azure is changed. The deployed checks report every failed attempt and fail the Action when the service
does not recover within the configured limit.

## Gitea Action secrets

`AZURE_BACKEND_PUBLISH_PROFILE` is the only backend secret consumed by the workflow. It is passed
directly from the Gitea `secrets` context to the Azure deployment action and is never printed. A
validation step reports the secret name and stops before verification when it is not configured.

Backend application secrets such as `DATABASE_URL` and Supabase configuration remain Azure App
Service settings. They are not copied into the deployment artifact or exposed to the workflow's
local artifact check.

The two Azure storage identifiers are also Azure App Service settings, but are non-secret. The ZIP
deployment workflow does not manage App Settings, identity assignment, or RBAC; an Azure operator
must confirm those external settings before deployment. Its local production-mode artifact smoke
check supplies inert non-secret storage identifiers and never calls Azure.

`SUPABASE_SECRET_KEY` is intentionally optional during process startup. This keeps health and public
routes available if the App Service setting is missing, while `DELETE /api/v1/account` returns a
safe `501` until the setting is configured. Deployed issue #66 verification must confirm that the
App Service secret belongs to the same Supabase project as `SUPABASE_URL`.

## Current startup limitation

The App Service still has the workspace-link recovery startup command recorded in
`docs/deployment/azure-app-service-recovery.md`. The prepared artifact now includes a physical
`node_modules/@sport-analytics/contracts` directory, but the Azure startup command must not be removed
until a merged deployment run proves the artifact on the live service and the normal startup command
is changed deliberately. That remaining Azure configuration change is not performed by a publish
profile deployment.

## Rollback

Azure supports redeploying a previous successful application package/workflow result. Any rollback procedure used for a release should be recorded with the deployment evidence.

## AI Declaration

The preceding document was reviewed and corrected with the assistance of ChatGPT-Web[GPT-5.6 Sol]
and updated for the automated deployment checks with the assistance of Codex[GPT-5].
The issue #356 Intermediate service boundary was documented with the assistance of Codex[GPT-5].
The issue #358 object-storage implementation status was documented with the assistance of
Codex[GPT-5].
The production managed-identity composition and deployed storage settings were documented with the
assistance of Codex[GPT-5].
The Issue #364 Intermediate ingestion deployment-status reconciliation was reviewed and edited with
the assistance of ChatGPT-Web[GPT-5.6 Sol].
The Issue #658 public OpenAPI endpoint and deployment-packaging documentation was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
