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

## Verification still required

Deployment workflow correctness, smoke checks, rollback evidence and runner availability are tracked separately from this technology-selection document. The existence of an Azure workflow file must not be presented as proof that automated deployment has successfully executed.

## AI Declaration

The preceding document was reviewed and aligned with the accepted Azure ADR with the assistance of ChatGPT-Web[GPT-5.6 Sol].
