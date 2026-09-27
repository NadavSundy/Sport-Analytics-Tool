# ADR 0003

> **Note:** This is a documentation-site ADR about **application hosting**. It is
> a different record from `evidence/decisions/ADR-003-database-host-connection-and-migrations.md`,
> which covers the **database host, connection method and migration tooling**.
> The two share the number "003" by coincidence of separate sequences (`docs/adr/`
> and `evidence/decisions/`); citations elsewhere in the documentation
> distinguish them as "ADR 0003" (this hosting record) and "ADR-003" (the
> database record).

## Title

Use Azure App Service for application hosting.

## Status

Superseded. Both original decisions below have since moved:

> **Backend hosting superseded (issue #563).** The backend Express API moved from Azure App Service to
> Azure Container Apps. `statsthegame-api-dev` (App Service) is retained only as a manual rollback path
> during acceptance. See `docs/deployment/azure-backend.md` for the current backend hosting decision and
> deployment process.

> **Frontend hosting superseded, 19 September 2026 (issue #564).** The frontend's Azure App Service
> decision below was superseded by a move to Cloudflare Pages: the built frontend is a static Vite
> bundle with no server-side runtime, so it does not need App Service compute, and hosting it there
> coupled its availability and cost to unnecessary compute. See
> `docs/deployment/frontend-cloudflare-pages.md` for the current frontend hosting decision and
> deployment process.

The "Alternatives" and "Consequences" sections below are retained as the historical record of the
original Sprint 1 decision and are not current guidance.

## Context

The project requires deployment, CI/CD and public hosting.

Azure provides free student resources, managed HTTPS and native Node.js support.

## Decision

Backend

Azure App Service (Linux)

Frontend

Azure App Service (Linux)

## Alternatives

Azure Container Apps

Pros

- Containers
- More scalable

Cons

- More operational complexity

Azure Static Web Apps

Pros

- Optimised for static sites

Cons

- Separate deployment pipeline
- Additional hosting service

## Consequences

Azure App Service provides a simple deployment model for Sprint 1 while supporting future CI/CD automation.

## AI Declaration

The preceding document was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
