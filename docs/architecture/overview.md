# Architecture overview

## Context

The project requires a separate frontend and backend, a team-designed hand-written HTTP API, a database, a public documentation website, authentication through an established provider or library, CI/CD, automated testing, and a relevant external API integration.

## Selected foundation

```mermaid
flowchart LR
    User[Browser user] -->|HTTPS| Frontend[React frontend]
    Consumer[External API consumer] -->|HTTPS + API credentials| API[Node.js HTTP API]
    Frontend -->|JSON over HTTPS| API
    API -->|SQL through server-side driver| DB[(PostgreSQL / Supabase-hosted Postgres)]
    API -->|Server-side request| External[Relevant external API]
    API -.->|Transactional outbox| Queue[[Future Azure Service Bus]]
    Queue -.-> Worker[Future background worker]
    Worker --> DB
    API -.-> Files[(Future Azure Blob Storage)]
    API -.-> Cache[(Future Azure Managed Redis)]
    Docs[Public MkDocs site] -. documents .-> Frontend
    Docs -. documents .-> API
    Docs -. documents .-> DB
```

A background worker is shown as a future deployment boundary for batch imports, large exports, and
expensive derivations. It should only be introduced when asynchronous work is implemented; it is not
required for the initial scaffold. The same adoption gate applies to object storage and caching.

## Planned advanced-service decisions

Issue #55 records the initial recommendations for later-tier services. These ADRs are proposals
pending project-team review; they do not claim that the services are provisioned or implemented.

| Concern         | Proposed direction                                                                                                                                       | Decision record                                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caching         | Measure and optimise PostgreSQL first; use versioned cache-aside reads in Azure Managed Redis only for demonstrated hot paths.                           | [ADR-009](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-009-cache-and-invalidation.md)          |
| Background jobs | Commit domain state and a PostgreSQL outbox atomically, relay identifiers through Azure Service Bus Standard, and process them with idempotent workers.  | [ADR-010](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-010-background-jobs-and-workers.md)     |
| File storage    | Keep metadata and provenance in PostgreSQL and private bytes in Azure Blob Storage behind a backend-owned adapter.                                       | [ADR-011](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-011-file-and-object-storage.md)         |
| Live ingestion  | Normalise provider input through the existing acceptance path, persist replay cursors in PostgreSQL, and deliver public updates with server-sent events. | [ADR-012](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-012-live-event-transport-and-replay.md) |

## Components and responsibilities

### React frontend

- Render accessible and responsive user journeys.
- Collect and perform user-friendly client-side validation.
- Call only documented backend endpoints for application data.
- Handle loading, empty, error, unauthorised, and offline/unreachable states.
- Never contain database credentials or authoritative business rules.

### Node.js backend

- Expose the versioned hand-written HTTP API.
- Validate input and authenticate/authorise protected requests.
- Enforce submitter scope, review workflows, traceability, and business rules.
- Read and write the database through server-side repositories.
- Call the external API while controlling credentials, retries, timeouts, and failure handling.
- Produce stable error responses, logs, metrics, and audit evidence.

### Shared contracts package

- Hold request/response and event schemas shared across applications.
- Provide TypeScript types derived from validation schemas.
- Contain no database access, secrets, business logic, or authorisation decisions.

### Database

- Store source event data, submissions, review/correction history, definitions, derived results, and releases.
- Enforce integrity with constraints and transactions.
- Support traceability and efficient filtered queries through deliberate indexes.

### Documentation site

- Publish architecture, API, database, setup, testing, dependencies, security, deployment, methodology, and AI-use documentation.
- Remain publicly accessible without requiring an account.

## Data flow

1. An account with the `submitter` or `admin` role uploads or sends event data to the backend API.
2. The backend authenticates the submitter and checks their authorised competition scope.
3. The backend validates the payload against the versioned event schema.
4. Valid data is staged or stored transactionally; invalid data returns actionable errors.
5. Accepted event changes trigger only the dependent statistic calculations.
6. Published API responses and dataset releases retain provenance to submissions, events, and definition versions.
7. The frontend and external consumers obtain data from the backend API, never directly from generated database endpoints.

## Security boundaries

- Treat all browser and external-consumer input as untrusted.
- Keep provider secrets, database credentials, external API keys, and service tokens server-side.
- Use an established authentication provider/library; do not create password hashing, reset tokens, or session cryptography from scratch.
- Authorise every protected route based on backend-verified identity and role/scope.
- Rate-limit public/consumer endpoints before exposing them broadly.
- Do not log credentials, tokens, full sensitive payloads, or unnecessary personal data.

## Deployment boundaries

The frontend, backend, database, and documentation site must be independently deployable. The
initial Azure deployment design is documented under `infra/azure/`. Any proposed advanced service
must pass its ADR adoption gate and gain provisioning, deployment, recovery, and cost evidence before
the deployed architecture is described as implemented.

## Trade-offs

A monorepo simplifies shared tooling, atomic Pull Requests, and contracts while preserving separate deployable applications. Its main risk is accidental coupling. The folder boundaries, backend-only database rule, and CI checks must be enforced during review.

## AI Declaration

The issue #55 advanced-service decision summary was drafted and reconciled with the repository with
the assistance of Codex[GPT-5].
