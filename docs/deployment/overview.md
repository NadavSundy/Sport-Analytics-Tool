# Deployment overview

The project requires independently verifiable deployments for:

1. the React frontend;
2. the Node.js backend API;
3. the PostgreSQL-compatible database; and
4. the public MkDocs documentation website.

The team currently prefers Azure, but exact services must be selected through a documented architecture decision and validated with an early deployment prototype.

## Minimum environments

- **Local:** developer machines with local or shared-development dependencies.
- **Preview/test:** automated deployment suitable for Pull Request or milestone testing where feasible.
- **Production:** stable public frontend, API, database, and docs endpoints.

## Deployment controls

- Build and test before deployment.
- Store environment secrets outside the repository.
- Run database migrations deliberately and record outcomes.
- Add health checks and rollback/recovery instructions.
- Keep frontend and backend configuration environment-specific.
- Verify API availability, documentation links, authentication callbacks, account deletion, external integration failure handling, accessibility, responsiveness, and performance after deployment.

See [Azure Deployment Investigation](azure.md) for the initial decision checklist. The infrastructure working notes remain under `infra/azure/` in the repository.
