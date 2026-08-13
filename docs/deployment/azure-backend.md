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
| `DATABASE_URL`             | Used                        | PostgreSQL session-pooler connection string.                                |

`API_VERSION`, `CORS_ALLOWED_ORIGINS` and `LOG_LEVEL` appear as reserved placeholders in the current backend example environment file but are not read by the current application runtime. In particular, deployed CORS configuration must use `CORS_ORIGINS` unless the application code is deliberately changed.

Database credentials and other secrets are configured through Azure App Service and are never committed.

## Logging

The Express application uses Pino HTTP for structured request logging. Azure App Service provides the hosting/runtime log surface.

## Deployment

The repository contains a Gitea Actions workflow intended to automate backend deployment to Azure App Service.

## Rollback

Azure supports redeploying a previous successful application package/workflow result. Any rollback procedure used for a release should be recorded with the deployment evidence.

## AI Declaration

The preceding document was reviewed and corrected with the assistance of ChatGPT-Web[GPT-5.6 Sol].
