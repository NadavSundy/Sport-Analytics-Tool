# Deployment overview

The selected deployment architecture is:

| Component              | Hosting / service          | Deployment tool                                 |
| ---------------------- | -------------------------- | ----------------------------------------------- |
| React frontend         | Cloudflare Pages           | Gitea Actions / Wrangler CLI                    |
| Express backend API    | Azure Container Apps       | Bicep / Docker + ACR / Gitea Actions            |
| Asynchronous worker    | Azure Container Apps       | Bicep / Docker + ACR / Gitea Actions            |
| PostgreSQL database    | Supabase-hosted PostgreSQL | Database migrations through the backend tooling |
| Managed authentication | Supabase Auth              | Supabase/Google provider configuration          |
| Public documentation   | Cloudflare Pages           | Wrangler CLI                                    |

The Intermediate deployment boundaries are:

| Component              | Approved target                                                | Deployment responsibility                                                             |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Private object storage | Existing Azure Storage account with private Blob containers    | Managed identity/RBAC, lifecycle and recovery configuration                           |
| Durable job delivery   | PostgreSQL transactional outbox and Azure Service Bus Standard | Issue #365 provisions the broker; #278 implements job creation and relay behavior     |
| Batch worker           | Separate Node.js Azure Container App                           | Issue #365 provides the host, IaC and deployment workflow; #278 adds batch processing |

ADR-010 and ADR-011 select these targets for Intermediate implementation. The versioned Bicep target is defined under `infra/azure/worker/`. Worker-affecting changes merged to
`main` are deployed automatically by the change-aware `Sport Analytics CI` workflow, while
`.gitea/workflows/deploy-worker.yml` remains available for manual recovery or deliberate redeployment.
Repository definitions are not evidence that a live Azure deployment has succeeded; the deployed
revision and exact commit-SHA image must still be verified.

Azure App Service was originally accepted in ADR 0003 for the frontend and backend. Both have since
moved off it: the backend now runs on Azure Container Apps (issue #563), with `statsthegame-api-dev`
retained as a manual App Service fallback during acceptance; the frontend has moved to Cloudflare Pages
(issue #564, see `docs/deployment/frontend-cloudflare-pages.md`) because its built output is static and
does not need continuously running compute, with the Azure frontend deployment retained in parallel
until Cloudflare Pages acceptance succeeds, then retired. The documentation site was already hosted
separately on Cloudflare Pages, deployed from the generated MkDocs `site/` directory with Wrangler, and
both migrations follow that same pattern.

## Minimum environments

- **Local:** developer machines with local configuration and shared development services.
- **Preview/test:** automated Pull Request and CI verification where feasible.
- **Production/stable deployment:** public frontend, API, database/authentication services and documentation endpoints.

## Deployment controls

- Build and test before deployment.
- Store environment secrets outside the repository.
- Run database migrations deliberately and record outcomes.
- Keep frontend and backend configuration environment-specific.
- Keep Supabase generated data endpoints outside the application API boundary.
- Verify HTTPS, CORS, logs, authentication callbacks and health endpoints after deployment changes.
- Deploy frontend, backend and documentation independently by production impact, but only after the shared post-merge quality and deployment gate.
- Automatically deploy the worker after a validated worker-affecting change reaches `main`; require the
  active healthy Container Apps revision to use the exact commit-SHA image. Retain the manual worker
  workflow for recovery and deliberate operational redeployment.
- Automatically deploy backend-affecting main commits to Container Apps only after quality succeeds;
  require the active healthy revision to use the exact commit-SHA image, then run health and
  database-backed smoke checks. Retain the manual App Service workflow for acceptance rollback.

See:

- `docs/adr/0003-azure-hosting.md`
- `docs/deployment/azure-backend.md`
- `docs/deployment/azure-worker.md`
- `docs/deployment/frontend-cloudflare-pages.md`
- `docs/deployment/cloudflare_pages.md`
- `docs/development/technology-stack.md`

## Gitea Actions runner configuration

The university provides global Gitea Actions runners for project CI/CD.

The available runners currently advertise the following labels:

- `ubuntu-latest`
- `ubuntu-24.04`
- `ubuntu-22.04`

The Sport Analytics Tool workflows are pinned to:

`ubuntu-24.04`

Using a fixed runner label provides a more reproducible CI environment than
`ubuntu-latest`, while targeting an environment currently supported by the
university-hosted runners.

The automatic validation and affected-target deployments run through `Sport Analytics CI`. The
standalone `Sport Analytics - Deploy Frontend`, `Sport Analytics - Redeploy App Service Backend
(Rollback)`, `Sport Analytics - Deploy Docs` and `Sport Analytics - Provision and Deploy Batch Worker`
workflows use the same runner for manual recovery/redeployment.

The Pull Request CI workflow is change-aware and preserves a stable required `quality` status. Cheap
structure, whitespace, routing and lockfile checks run during planning; application validation and the
required browser lane then remain parallel. Database integration is executed conditionally inside the
normal validation job using disposable PostgreSQL 16, avoiding a separate database job's setup overhead.

After an up-to-date protected Pull Request passes the required quality status and is merged, the `main`
push does not repeat the full application suite. It plans the merged change and runs only affected
deployment jobs plus their production build/artifact and live smoke checks. See
[CI/CD and quality gates](../development/ci-cd.md) for the authoritative workflow and branch-protection
behaviour.

Hosted runner scheduling, Node setup, PostgreSQL host-network operation, repository validation and
Playwright execution were established through Issue #10. New workflow changes must preserve that
baseline and retain a successful hosted run as evidence.

### Runner validation baseline

The established hosted baseline confirms:

1. the job is accepted by a university runner
2. repository checkout and Node setup succeed
3. PostgreSQL service-container networking works
4. linting, type checking, tests and builds succeed
5. Playwright can execute in the hosted environment
6. affected frontend, backend, worker and documentation deployment paths can execute after validated `main` quality

## AI Declaration

The preceding document was reviewed and aligned with the current repository architecture with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #356 approved Intermediate deployment targets were documented with the assistance of
Codex[GPT-5].
The issue #365 versioned worker target and deployment control were documented with the assistance
of Codex[GPT-5].
The Issue #563 backend Container Apps deployment and rollback boundary was documented with the
assistance of Codex[GPT-5].
