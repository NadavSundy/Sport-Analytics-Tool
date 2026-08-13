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

## AI Declaration

The preceding document was reviewed and aligned with the current repository architecture with the assistance of ChatGPT-Web[GPT-5.6 Sol].
