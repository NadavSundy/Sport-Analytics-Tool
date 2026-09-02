# Deployment overview

The selected deployment architecture is:

| Component              | Hosting / service          | Deployment tool                                 |
| ---------------------- | -------------------------- | ----------------------------------------------- |
| React frontend         | Azure App Service (Linux)  | Gitea Actions / Azure deployment action         |
| Express backend API    | Azure App Service (Linux)  | Gitea Actions / Azure deployment action         |
| PostgreSQL database    | Supabase-hosted PostgreSQL | Database migrations through the backend tooling |
| Managed authentication | Supabase Auth              | Supabase/Google provider configuration          |
| Public documentation   | Cloudflare Pages           | Wrangler CLI                                    |

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
- Keep documentation deployment independent from application deployment.

See:

- `docs/adr/0003-azure-hosting.md`
- `docs/deployment/azure-backend.md`
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

The following workflows use this runner:

- `Sport Analytics CI`
- `Sport Analytics - Deploy Backend`
- `Sport Analytics - Deploy Frontend`
- `Sport Analytics - Deploy Docs`

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
6. backend and frontend deployment workflows can execute successfully

## AI Declaration

The preceding document was reviewed and aligned with the current repository architecture with the assistance of ChatGPT-Web[GPT-5.6 Sol].
