# Infrastructure and deployment

The `infra/` directory is the repository entry point for infrastructure-specific notes. Application deployment is intentionally separate from application source code and is coordinated through Gitea Actions and the documented hosting platforms.

## Current boundaries

- React frontend: Azure App Service (Linux)
- Express backend: Azure App Service (Linux)
- PostgreSQL database: Supabase-hosted PostgreSQL
- Authentication: Supabase Auth
- Public documentation: Cloudflare Pages
- Asynchronous ingestion worker: Azure Container Apps with Azure Service Bus Standard
- CI/CD and deployment workflows: `.gitea/workflows/`

## Azure guidance

Start with [`azure/README.md`](azure/README.md) for Azure-specific infrastructure and operational notes.

Detailed deployment documentation is maintained under:

- [Deployment overview](../docs/deployment/overview.md)
- [Azure deployment guide](../docs/deployment/azure.md)
- [Azure backend deployment](../docs/deployment/azure-backend.md)
- [Azure asynchronous worker](../docs/deployment/azure-worker.md)
- [Azure frontend deployment](../docs/deployment/azure-fronted.md)
- [Azure App Service recovery guide](../docs/deployment/azure-app-service-recovery.md)
- [Cloudflare Pages deployment](../docs/deployment/cloudflare_pages.md)

## Safety and change rules

- Never commit Azure publish profiles, database passwords, Supabase secret keys, Cloudflare tokens or other credentials.
- Store deployment credentials in the relevant Gitea/Azure/Cloudflare secret mechanism.
- Infrastructure changes require a Gitea issue, a short-lived branch and Pull Request review under the repository Git methodology.
- Keep deployment documentation aligned with workflow changes.
- Record meaningful deployment failures, recovery actions and validation evidence rather than silently changing infrastructure notes.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The asynchronous worker boundary was documented with the assistance of Codex[GPT-5].
