# Azure infrastructure notes

Azure App Service (Linux) is the accepted hosting platform for the React frontend and Express backend. The decision is recorded in `docs/adr/0003-azure-hosting.md`.

Current deployment boundaries are:

- frontend application: Azure App Service;
- backend API: Azure App Service;
- PostgreSQL database: Supabase-hosted PostgreSQL;
- managed authentication: Supabase Auth;
- public documentation: Cloudflare Pages;
- asynchronous ingestion worker: Azure Container Apps, with Service Bus Standard job delivery.

This directory is for Azure-specific infrastructure and operational notes. It must not contain subscription credentials, publish profiles, database passwords, API tokens or other secrets.

The application deployment definitions are `.gitea/workflows/deploy-frontend.yml` and
`.gitea/workflows/deploy-backend.yml`. They build from the root npm workspace and deploy
`apps/frontend/dist` and the generated `.deployment/backend` artifact respectively. Both workflows
run retrying post-deployment checks; the backend also starts its generated artifact locally before
deployment.

The independently versioned worker target is `worker/main.bicep`, and the manual
`.gitea/workflows/deploy-worker.yml` workflow provisions its Service Bus queue, Container Apps
environment, managed identities, RBAC, Log Analytics and private registry before building and
deploying the Node.js 22 worker image. It references the existing private Blob container and a Key
Vault database secret; it does not embed credentials.

Publish profiles remain Gitea Action secrets. Backend runtime secrets remain Azure App Service
settings, while the public-safe frontend Vite configuration is supplied from Gitea secrets at build
time. Deployment results, smoke-check output, rollback evidence and future infrastructure changes
must be recorded through the relevant Gitea issue and Pull Request rather than by silently changing
these notes.

## AI Declaration

The preceding document was reviewed and updated with the assistance of ChatGPT-Web[GPT-5.6 Sol] and
Codex[GPT-5].
The worker infrastructure and secure deployment boundary were documented with the assistance of
Codex[GPT-5].
