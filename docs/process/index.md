# Project Process & Evidence

This section is the primary discovery point for the project's methodology, Sprint
evidence, decisions, testing/validation evidence, and AI-use evidence. Where authoritative
evidence already exists elsewhere in the repository or in this documentation site, the pages
below link to that source rather than duplicating it, so the two cannot drift apart.

## Repository and developer guides

Every component's getting-started guide, including the root, frontend, backend, database,
shared-contracts, docs, tests, infra and scripts `README.md` files, is indexed in one table on
the [Local Development Setup](../development/setup.md#component-getting-started-audit) page.

## Project and technical documentation

- [Architecture overview](../architecture/overview.md) and
  [System architecture and roadmap](../architecture/system-architecture.md)
- [Repository structure](../architecture/repository-structure.md)
- [Technology stack](../development/technology-stack.md) and
  [Dependency policy](../development/dependencies.md) — third-party technology and the
  motivation for each dependency
- [API overview](../api/overview.md), [OpenAPI specification](../api/openapi.md) and the rest of
  the [API section](../api/overview.md)
- [Authentication and authorisation](../security/authentication.md) and
  [roles and permissions](../security/roles-and-permissions.md)
- [Database overview](../database/overview.md), [event model](../database/schema.md) and
  [entity relationships](../database/erd.md)
- [Fixture statistic calculations](../statistics/fixture-statistics.md)
- [Deployment overview](../deployment/overview.md)
- [Sport domain definition](../requirements/sport-domain-definition.md) — including the
  requirements the sport had to satisfy
- Known limitations are documented on each feature's own page under its **Status** line, per the
  note on the [documentation home page](../index.md)

## Project methodology and Sprint evidence

- [Project methodology](../project_methodology.md)
- [Git methodology](../git-methodology.md)
- [Project backlog and milestone plan](../planning/project-backlog.md)
- [**Sprint Evidence**](sprint-evidence.md) — planning, stakeholder meetings, stand-ups,
  close-outs and retrospectives, grouped by Sprint

## Decisions

- [**Decisions Index**](decisions.md) — every recorded Architecture Decision Record and other
  project-level decision, in one place

## Testing and validation

- [**Testing & Validation Evidence**](validation-and-user-testing.md) — requirements
  traceability, verification evidence and formal user-testing evidence
- [Automated & end-to-end testing strategy](../development/testing.md)
- [User testing protocol](../testing/user-testing-protocol.md) and
  [task bank](../testing/user-testing-task-bank.md)
- [Bug tracking](../testing/bug-tracking.md)
- [Sprint 1 requirements traceability](../planning/sprint-1-requirements-traceability.md)

## AI use and compliance

- [**AI Use & Evidence**](ai-use-evidence.md) — the central usage register, individual
  team-member registers and transcript evidence
- [AI use policy/process](../ai/usage.md)

## Third-party dependencies

Every direct dependency and its motivation is listed in
[Technology Stack](../development/technology-stack.md); the policy for adding and reviewing
dependencies is in [Dependencies](../development/dependencies.md).

The preceding page was planned and drafted with the assistance of Claude[Claude Sonnet 5],
resolving issue #254.
