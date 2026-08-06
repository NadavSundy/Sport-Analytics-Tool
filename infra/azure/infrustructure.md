# ADR 0003

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
