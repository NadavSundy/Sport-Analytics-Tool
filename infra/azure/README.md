# Azure deployment planning

No Azure service choice is approved by this scaffold. Create an ADR after the team validates cost, student credits, deployment complexity, logs, custom domains, secret management, database connectivity, preview environments, and rollback support.

## Candidate mapping to investigate

- Static frontend hosting suitable for Vite output
- Container or managed Node.js hosting for the backend API
- Supabase-hosted PostgreSQL or an Azure PostgreSQL option
- Static hosting for MkDocs documentation
- Azure Key Vault or platform secret configuration
- Gitea Actions runner access to the selected deployment targets

## Early risk prototype

Before Milestone 1, deploy the health-check frontend, API, and docs site, then record:

- exact commands and configuration;
- public URLs;
- environment variable handling;
- CORS and HTTPS behaviour;
- logs and health monitoring;
- failed deployment recovery; and
- cost/credit impact.

Do not place subscription credentials or deployment secrets in this directory.
