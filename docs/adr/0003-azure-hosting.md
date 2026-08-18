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

Accepted

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
