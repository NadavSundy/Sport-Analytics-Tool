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

| Variable                   | Current status              | Description                                                                 |
| -------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`                 | Used                        | Set to `production` for the deployed runtime.                               |
| `PORT`                     | Platform-provided/defaulted | HTTP listen port.                                                           |
| `CORS_ORIGINS`             | Used                        | Comma-separated allowed browser origins; include the deployed frontend URL. |
| `SUPABASE_URL`             | Used                        | Supabase Auth project URL.                                                  |
| `SUPABASE_PUBLISHABLE_KEY` | Used                        | Supabase publishable key used for backend token verification.               |
| `SUPABASE_SECRET_KEY`      | Required for issue #66      | Server-only Supabase key used by Auth Admin account deletion.               |
| `DATABASE_URL`             | Used                        | PostgreSQL session-pooler connection string.                                |

`API_VERSION`, `CORS_ALLOWED_ORIGINS` and `LOG_LEVEL` appear as reserved placeholders in the current backend example environment file but are not read by the current application runtime. In particular, deployed CORS configuration must use `CORS_ORIGINS` unless the application code is deliberately changed.

Database credentials and other secrets are configured through Azure App Service and are never committed.

## Logging

The Express application uses Pino HTTP for structured request logging. Azure App Service provides the hosting/runtime log surface.

## Deployment

`.gitea/workflows/deploy-backend.yml` deploys the backend after a push to `main` changes the backend
workspace, shared contracts, root npm manifests, shared TypeScript configuration, either deployment
helper or the workflow itself. It can also be started manually with `workflow_dispatch`.

The workflow runs from the repository root and:

1. installs the complete workspace reproducibly with `npm ci`;
2. lints, type-checks, tests and builds `@sport-analytics/contracts`;
3. lints, type-checks, runs the non-database backend unit/API suites and builds
   `@sport-analytics/backend`;
4. creates `.deployment/backend` from the root lockfile with production dependencies, compiled
   backend output, the runtime CA certificate and a physical copy of the compiled contracts package;
5. starts that artifact with non-secret smoke configuration and verifies its local health endpoint;
6. deploys the artifact to `statsthegame-api-dev`, cleaning the old deployment first; and
7. retries the deployed health endpoint before checking the read-only
   `/api/v1/competitions?limit=1` database path.

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
