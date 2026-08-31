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

The university-hosted Gitea Actions runner infrastructure is managed
externally to this repository and is not currently available.

The CI/CD workflows use the repository Actions variable:

`RUNNER_LABEL`

This value must match a label advertised by an available Gitea Actions
runner. The value must not be guessed or hard-coded into the workflows.

When the university runners become available:

1. Identify the available runner label in Gitea.
2. Set the repository Actions variable `RUNNER_LABEL` to that exact value.
3. Manually run the `Sport Analytics CI` workflow.
4. Resolve any runner-specific compatibility issues.
5. Verify pull-request CI.
6. Verify CI on the `main` branch.
7. Verify the backend deployment workflow.
8. Verify the frontend deployment workflow.
9. Configure branch protection so that the successful CI check is required.

Until hosted runners are available, the repository-side workflow
configuration and local quality checks can be prepared and validated, but
hosted CI/CD execution cannot be confirmed.

### Runner validation note

The PostgreSQL test-service hostname must be verified during the first hosted
runner execution. The required hostname may depend on how the university
runner executes workflow and service containers.

## AI Declaration

The preceding document was reviewed and aligned with the current repository architecture with the assistance of ChatGPT-Web[GPT-5.6 Sol].
