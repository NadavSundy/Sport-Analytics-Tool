# Stat'sTheGame

Event-driven sports analytics platform providing validated submissions, derived statistics, dataset exports, and a versioned public API for COMS3011A.

[![Repository coverage](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/raw/branch/coverage-badge/badge.svg)](https://sports-analytics-tool.pages.dev/testing/code-coverage/)

> **Current status:** The Express API validates Supabase identities, synchronizes provider-neutral application accounts, exposes the current user profile, and enforces `viewer`, `submitter`, and `admin` roles with competition-scoped submissions. Administrators can review users and manage submitter access. Approved submitters use the staged batch workflow for season and back-catalogue packages, with asynchronous validation, reference resolution, reviewer decisions, correction resubmission, and publication; administrators retain privileged direct/import routes. Public competition, season, fixture, event, competitor, participant, derived fixture-statistics, and participant season/competition/career aggregate reads are available without authentication. Filtered fixture-event and calculation-trace exports are available as JSON and CSV, and immutable versioned dataset releases can be generated and downloaded. External consumers can use administrator-issued API keys with per-minute rate limits and UTC daily quotas. The backend also provides the required runtime external API integration through Open-Meteo via `GET /api/v1/weather`. Advanced analyst-defined statistics, live-feed and bitemporal processing, change feeds, and other Advanced-tier functionality remain future work.

## Repository structure

```text
apps/frontend       React web application
apps/backend        Hand-written Node.js HTTP API
apps/worker         Independently deployable asynchronous ingestion worker
packages/contracts  Shared API schemas and TypeScript types
database            Migrations, seeds, and schema documentation
docs                Source for the public MkDocs documentation site
evidence            Stakeholder, sprint, testing, decision, and AI evidence
infra                Deployment and infrastructure documentation
scripts              Repository validation scripts
tests                Cross-application and non-unit testing assets
```

The frontend and backend are separate applications. The frontend may contact Supabase Auth for managed sign-in, but all application data must pass through the handwritten backend HTTP API. Generated Supabase data endpoints must not be used as the application API.

See [Repository Structure](docs/architecture/repository-structure.md) for the detailed tree and boundaries.

## Prerequisites

- Node.js 20.19+ (20.x) or Node.js 22.12+; hosted CI/deployment use Node.js 22 LTS
- npm 10 or later
- Python 3.10 or later and MkDocs Material for the documentation site
- Access to the current Supabase-hosted PostgreSQL development database
- Access to the shared Supabase Auth project
- Docker Desktop or a compatible Docker Compose runtime only for the explicit container-based PostgreSQL integration-test workflow

> **Windows PowerShell:** Commands use portable `npm`/`npx` syntax. If PowerShell blocks
> `npm.ps1` or `npx.ps1`, use `npm.cmd` or `npx.cmd` instead, for example
> `npm.cmd run check`. Windows-specific file-copy commands are shown where needed.

## Getting started

This section is the complete quick-start path for a normal local checkout. For explanations,
troubleshooting and clean-clone verification detail, use the canonical
[Local Development Setup](docs/development/setup.md). If you are working on only one part of the
monorepo, use the [component guides](#component-guides) instead of repeating the whole setup.

### 1. Install dependencies

From the repository root:

```bash
npm ci
```

### 2. Create local environment files

Real `.env` files are ignored by Git and must never be committed.

On Windows PowerShell:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env
```

On macOS, Linux or Git Bash:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Populate the required values using the team's approved development configuration and the
[Environment Variables](docs/environment.md) guide. Do not place database passwords, elevated
Supabase keys or other server credentials in the frontend environment file.

### 3. Run the applications

Start the backend and frontend in separate terminals from the repository root:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

The asynchronous worker is started separately after its PostgreSQL, Service Bus, Blob and Azure
identity settings are configured:

```bash
npm run dev:worker
```

See [Azure asynchronous batch worker](docs/deployment/azure-worker.md) for the local dependency and
recovery walkthrough.

Once both are running, verify the local services:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend health: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- Current-user endpoint: [http://localhost:3000/api/v1/auth/me](http://localhost:3000/api/v1/auth/me)

The root development dispatcher also accepts the application name, so `npm run dev frontend` and
`npm run dev backend` are equivalent. Additional arguments are forwarded to the selected workspace
after `--`, for example `npm run dev frontend -- --host 0.0.0.0`.

### 4. Verify the repository

Run the normal database-independent quality gate:

```bash
npm run hygiene
npm run check
```

The separate hygiene command checks for unused monorepo files, dependencies and exports with Knip,
checks workspace dependency-version consistency with syncpack, and validates circular dependencies
and documented application boundaries with dependency-cruiser.

The normal database-independent test suite can also be run directly:

```bash
npm run test
```

To run every backend unit, API, and PostgreSQL integration test with the default disposable
PostgreSQL runtime, use:

```bash
npm run test:backend
```

Use `npm run test:backend:local` for the same backend workflow with the repository-managed Docker
Compose database instead.

PostgreSQL integration tests are explicit rather than hidden inside the normal gate. The standard
workflow provisions a disposable local PostgreSQL 16 runtime when an isolated `DATABASE_URL_TEST`
is not supplied:

```bash
npm run test:database
```

The repository-managed Docker Compose alternative is:

```bash
npm run test:database:local
```

Docker is not required for normal application development, `npm run test`, or `npm run check`.
See [Testing Strategy](docs/development/testing.md) for database-test safety rules and all supported
execution modes.

### 5. Run the documentation site when needed

Documentation development is optional for normal application startup. To preview the public docs:

```bash
python -m pip install -r requirements-docs.txt
python -m mkdocs serve
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Before documentation changes are submitted,
validate them with `python -m mkdocs build --strict`.

## Deployment

The Sport Analytics Tool uses Microsoft Azure for hosting.

### Backend

URL: https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io

API base URL: https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io/api/v1

- Platform: Azure Container Apps
- Runtime: Node.js 22 LTS production container
- Environment: Development
- Deployment: immutable ACR image and Bicep through Gitea Actions
- Configuration: Container Apps configuration; Key Vault-backed secrets; managed identities for ACR and Blob access
- Manual recovery: `.gitea/workflows/deploy-backend.yml` redeploys the selected commit to the existing `statsthegame-dev-api` Azure Container App through the same immutable ACR-image and Bicep path as automatic CI

### Frontend

URL: https://sport-analytics-tool-web.pages.dev/

- Platform: Cloudflare Pages
- Runtime: Node.js 22 LTS
- Environment: Development
- Deployment: Gitea Actions with Wrangler
- Built using Vite.

### Asynchronous ingestion worker

- Platform: Azure Container Apps
- Runtime: Node.js 22 LTS container
- Job delivery: Azure Service Bus Standard with peek-lock and bounded KEDA scaling
- Data access: Supabase PostgreSQL and private Azure Blob Storage
- Deployment: manual reviewed Gitea workflow using Bicep and immutable ACR images

### CI/CD

Deployment automation is configured using Gitea Actions.

The deployment workflow will:

1. install root workspace dependencies from `package-lock.json`;
2. lint, type-check and test the affected workspace and shared contracts;
3. build the frontend bundle or the backend production container from the root workspace;
4. deploy the frontend to Cloudflare Pages and the backend immutable container image to Azure Container Apps; and
5. retry content-aware health and database smoke checks against the deployed backend service.

Deployment credentials are stored securely using repository Action Secrets.

No deployment credentials are committed to source control.

See [Cloudflare Pages frontend deployment](docs/deployment/frontend-cloudflare-pages.md) and
[Azure backend deployment](docs/deployment/azure-backend.md) for workflow triggers, required Gitea
secrets, artifact contents and failure behaviour.

## Documentation

Project documentation is stored in the [`docs`](docs/) directory and is configured as a public MkDocs site.

```bash
python -m pip install -r requirements-docs.txt
python -m mkdocs serve
```

### Component guides

- [Frontend application](apps/frontend/README.md)
- [Backend API](apps/backend/README.md)
- [Asynchronous worker](apps/worker/README.md)
- [Database](database/README.md)
- [Shared contracts](packages/contracts/README.md)
- [Documentation site](docs/README.md)
- [Repository testing](tests/README.md)
- [Infrastructure and deployment](infra/README.md)
- [Repository scripts](scripts/README.md)
- [Project evidence](evidence/README.md)

Documentation paths:

- [Getting Started](docs/getting-started.md) — setup, environment, repository structure and component guides
- [Product & API](docs/product-and-api.md) — public API, submissions, statistics, exports and contracts
- [Architecture & Data](docs/architecture-and-data.md) — architecture, database, event model and security
- [Development](docs/development/index.md) — contributor workflow, tooling, CI/CD and design references
- [Deployment & Operations](docs/deployment/overview.md) — hosting, recovery, capacity and deployment
- [Testing & Quality](docs/testing/index.md) — automated testing, coverage, performance and user testing
- [Project Process & Evidence](docs/process/index.md) — Sprint evidence, decisions, validation and AI evidence

The project documentation is publicly available at:

https://sports-analytics-tool.pages.dev

The documentation is built with MkDocs and deployed to Cloudflare Pages using Wrangler.

To build locally:

```bash
python -m pip install -r requirements-docs.txt
python -m mkdocs build --strict
```

To deploy:

```bash
npx wrangler pages deploy site --project-name=sports-analytics-tool
```

## Development rules

- Create a Gitea issue before significant work begins.
- Create a short-lived branch from the latest `main`.
- Use Pull Requests and peer review; do not develop directly on `main`.
- Keep API, database, security, testing, and deployment documentation aligned with the implementation.
- Add or update tests for behavioural changes.
- Record stakeholder decisions and feedback under `evidence/`.
- Attribute AI-assisted code in commit messages and maintain the AI register.

## AI usage

This repository makes use of AI code generation. Reconciliation against the task-level registers records the following tool/model pairs for code-generation or implementation work: ChatGPT-Web[GPT-5.5], ChatGPT-Web[GPT-5.6 Luna], ChatGPT-Web[GPT-5.6 Thinking], ChatGPT-Web[GPT-5.6 Sol], Codex[GPT-5], Codex[GPT-5.6 Sol], Codex[GPT-5.6 Terra], Codex[GPT-6], Claude-Web[Claude Sonnet 5], Claude-Web[Claude Opus 5], Claude-Web[Claude Opus 5.5], Claude-Code[Claude Opus 5], Claude-Code[Claude Opus 5 (1M context)], Claude-Code[Claude Opus 5.5] and Claude.ai[Claude Sonnet 5]. Historical register rows use a few spelling variants for the same web/code tools; the task-level CSVs remain authoritative for the exact label recorded for each task.

This repository does not use AI in-line editing/autocomplete tools as a repository workflow. No such usage is recorded in the current per-member registers.

This repository makes use of AI-assisted code review. The task-level registers record code-review assistance from ChatGPT-Web[GPT-5.6 Thinking], ChatGPT-Web[GPT-5.6 Sol], Codex[GPT-5], Codex[GPT-5.6 Sol], Claude-Web[Claude Opus 4.5], Claude-Web[Claude Opus 5], Claude-Web[Claude Opus 5.5], Claude-Code[Claude Opus 5] and Claude-Code[Claude Opus 5.5]. Human review, testing and responsibility remain required.

See [`evidence/ai/registers/`](evidence/ai/registers/) for current task-level records and
[`evidence/ai/transcripts/`](evidence/ai/transcripts/) for the supporting transcript evidence. The
earlier shared register remains available while its entries are migrated.

The preceding README was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The documentation information architecture was reorganised and cross-linked with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The asynchronous worker setup and deployment summary were added with the assistance of Codex[GPT-5].
The Issue #563 backend Container Apps deployment summary was updated with the assistance of Codex[GPT-5].
The Claude-Code[Claude Opus 5 (1M context)] code-generation declaration was added for issue #817 with
the assistance of that same tool and model, after reconciling the natural-language query feature's
register rows against this list.
