# Deployment overview

The selected deployment architecture is:

| Component              | Hosting / service          | Deployment tool                                 |
| ---------------------- | -------------------------- | ----------------------------------------------- |
| React frontend         | Azure App Service (Linux)  | Gitea Actions / Azure deployment action         |
| Express backend API    | Azure App Service (Linux)  | Gitea Actions / Azure deployment action         |
| Asynchronous worker    | Azure Container Apps       | Bicep / ACR Tasks / Gitea Actions               |
| PostgreSQL database    | Supabase-hosted PostgreSQL | Database migrations through the backend tooling |
| Managed authentication | Supabase Auth              | Supabase/Google provider configuration          |
| Public documentation   | Cloudflare Pages           | Wrangler CLI                                    |

The Intermediate deployment boundaries are:

| Component              | Approved target                                                | Deployment responsibility                                                             |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Private object storage | Existing Azure Storage account with private Blob containers    | Managed identity/RBAC, lifecycle and recovery configuration                           |
| Durable job delivery   | PostgreSQL transactional outbox and Azure Service Bus Standard | Issue #365 provisions the broker; #278 implements job creation and relay behavior     |
| Batch worker           | Separate Node.js Azure Container App                           | Issue #365 provides the host, IaC and deployment workflow; #278 adds batch processing |

ADR-010 and ADR-011 select these targets for Intermediate implementation. The versioned Bicep target
and manual deployment workflow are defined under `infra/azure/worker/` and
`.gitea/workflows/deploy-worker.yml`; repository definitions are not evidence that a live Azure
deployment has succeeded.

Azure App Service was accepted in ADR 0003 for the frontend and backend. The documentation site is deliberately hosted separately on Cloudflare Pages and deployed from the generated MkDocs `site/` directory with Wrangler.

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
- Deploy frontend, backend and documentation independently by production impact, but only after the shared validated-main quality gate.
- Deploy the worker manually from a reviewed commit; verify its active revision, dependencies,
  recovery and scaling before recording it as operational.

See:

- `docs/adr/0003-azure-hosting.md`
- `docs/deployment/azure-backend.md`
- `docs/deployment/azure-worker.md`
- `docs/deployment/azure-fronted.md`
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

The automatic validation and affected-target deployments run through `Sport Analytics CI`. The standalone `Sport Analytics - Deploy Frontend`, `Sport Analytics - Deploy Backend` and `Sport Analytics - Deploy Docs` workflows use the same runner only for manual recovery/redeployment.

The Pull Request CI workflow is change-aware and preserves a stable required `quality` status. When
PostgreSQL integration is required, database validation may run in parallel with the normal
validation lane to reduce elapsed feedback time. See [CI/CD and quality gates](../development/ci-cd.md)
for the authoritative workflow and branch-protection behaviour.

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
6. affected frontend, backend and documentation deployment paths can execute after validated `main` quality

## AI Declaration

The preceding document was reviewed and aligned with the current repository architecture with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #356 approved Intermediate deployment targets were documented with the assistance of
Codex[GPT-5].
The issue #365 versioned worker target and deployment control were documented with the assistance
of Codex[GPT-5].
