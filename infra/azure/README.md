# Azure infrastructure notes

Azure App Service (Linux) is the accepted hosting platform for the React frontend and Express backend. The decision is recorded in `docs/adr/0003-azure-hosting.md`.

Current deployment boundaries are:

- frontend application: Azure App Service;
- backend API: Azure App Service;
- PostgreSQL database: Supabase-hosted PostgreSQL;
- managed authentication: Supabase Auth;
- public documentation: Cloudflare Pages.

This directory is for Azure-specific infrastructure and operational notes. It must not contain subscription credentials, publish profiles, database passwords, API tokens or other secrets.

Deployment workflow verification, health checks, rollback evidence and any future infrastructure changes should be recorded through the relevant Gitea issue and Pull Request rather than by silently changing these notes.

## AI Declaration

The preceding document was reviewed and updated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
