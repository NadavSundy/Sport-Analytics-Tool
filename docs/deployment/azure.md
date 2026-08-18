# Azure application hosting

Azure App Service (Linux) is the accepted hosting platform for both the frontend and backend application deployments.

The decision is recorded in `docs/adr/0003-azure-hosting.md`.

## Selected mapping

| Component           | Service                   | Runtime/build context                                |
| ------------------- | ------------------------- | ---------------------------------------------------- |
| React frontend      | Azure App Service (Linux) | Node.js 22 LTS build environment; Vite static bundle |
| Express backend API | Azure App Service (Linux) | Node.js 22 LTS runtime                               |

The PostgreSQL database and managed authentication remain on Supabase. The public MkDocs documentation site is hosted separately on Cloudflare Pages.

## Why App Service was selected

ADR 0003 records the main reasons:

- Azure student resources;
- managed HTTPS;
- native Node.js support; and
- a relatively simple deployment model for Sprint 1.

## Alternatives recorded

### Azure Container Apps

Advantages:

- container-based deployment;
- greater scaling flexibility.

Reason not selected for the current foundation:

- more operational complexity than required for Sprint 1.

### Azure Static Web Apps

Advantages:

- optimised for static frontend hosting.

Reason not selected for the current foundation:

- would introduce a separate hosting/deployment path while the team selected App Service for both application components.

## Deployment verification

The frontend and backend Gitea workflows build from the root npm workspace, deploy the current
monorepo application paths and run post-deployment checks. The frontend check verifies the expected
HTML response. The backend checks verify both `/api/v1/health` and a read-only database-backed
competition request.

Workflow definitions are not evidence of a successful release by themselves. Each release must
retain the corresponding passing Gitea Action link and smoke-check output. Rollback evidence and
runner availability remain operational evidence rather than claims made by this technology-selection
document.

## AI Declaration

The preceding document was reviewed and aligned with the accepted Azure ADR with the assistance of
ChatGPT-Web[GPT-5.6 Sol] and updated for the automated deployment checks with the assistance of
Codex[GPT-5].
