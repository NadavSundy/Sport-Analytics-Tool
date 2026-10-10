# Stat'sTheGame

Event-driven T20 cricket analytics platform providing validated submissions, derived statistics, dataset exports, and a versioned public API for COMS3011A.

**Public documentation:** [sports-analytics-tool.pages.dev](https://sports-analytics-tool.pages.dev/) ·
**Web application:** [sport-analytics-tool-web.pages.dev](https://sport-analytics-tool-web.pages.dev/) ·
**Local setup:** [Getting started](#getting-started)

[![Repository coverage](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/raw/branch/coverage-badge/badge.svg)](https://sports-analytics-tool.pages.dev/testing/code-coverage/)

## Current status — Milestone 4 submission preparation

The agreed core **Stat'sTheGame** product is implemented and has retained automated, specialist and deployment evidence. The public React application and API Explorer, handwritten versioned Express API, Supabase Auth roles/scopes, PostgreSQL-backed statistics, asynchronous batch review/publication and immutable dataset exports are available through the documented environments. Public competitions, fixtures, events, competitors, participants, statistics and export queries can be browsed without an account; authorised submitters and administrators have separate protected workflows.

Additional delivered capabilities include public API-key consumers with limits and quotas, a bounded natural-language question interface backed by published statistics, and the Open-Meteo weather integration. The backend and batch worker are independently deployed Azure Container Apps; the application and documentation are hosted on separate Cloudflare Pages projects. See the [final submission review guide](docs/final-submission.md) and [release-readiness record](evidence/validation/issue-810-release-readiness-2026-10-10.md) for evidence and deployment details.

**What “complete” means here:** the planned submission implementation and independent evidence re-audit (#808) are integrated; the final #810 release approval/tag is **still in progress** as of 10 October 2026. The deployed services were observed operational, but a public HTTP `200` alone is not exact frontend-build attribution. Retained limitations remain visible rather than being reclassified as passes: #874 found one public response/OpenAPI contract mismatch (`totalRecords` on participant items); #876 left four performance checks blocked; the strict all-route Lighthouse Performance >=90 goal is not universally verified; and Advanced analyst-defined statistics, live feeds and general bitemporal querying remain outside the shipped scope. The team-approved final human-testing scope comprised two real sessions, with its recorded limitations. Consult [rubric traceability](docs/planning/final-requirements-rubric-traceability.md), the [final execution summary](docs/testing/final-system-verification.md#6-final-execution-summary) and the [Milestone 4 close-out reflection](evidence/sprints/final-submission/2026-10-10-release-owner-close-out.md) rather than treating this summary as blanket release acceptance.

## Repository structure

```text
apps/frontend               React web application (Vite)
apps/backend                Handwritten Express HTTP API
apps/worker                 Independently deployable asynchronous ingestion worker
packages/contracts          Shared API schemas and TypeScript types
packages/batch-processing   Batch-ingestion logic shared by the backend and worker
packages/object-storage     Provider-independent object-storage interface
database                    Migrations, seeds, and schema documentation
docs                        Source for the public MkDocs documentation site
evidence                    Stakeholder, sprint, testing, decision, and AI evidence
infra                       Azure Bicep templates and deployment documentation
scripts                     Development, CI, verification, and data-support scripts
testing                     Facilitated user-testing packs and session inputs
tests                       Cross-application E2E, accessibility, performance, and CI tests
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
Copy-Item apps/worker/.env.example apps/worker/.env
```

On macOS, Linux or Git Bash:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
cp apps/worker/.env.example apps/worker/.env
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

Staged batch validation, publication and dataset-release generation run in the asynchronous worker.
Start it in a third terminal when you need those workflows:

```bash
npm run dev:worker
```

Locally the worker uses `WORKER_TRANSPORT_PROVIDER=database` and the filesystem object store shared
with the backend, so no Azure resources are needed. Set its `DATABASE_URL` to the same development
database as the backend. See [Azure asynchronous batch worker](docs/deployment/azure-worker.md) for
the production Service Bus and Blob configuration and the recovery walkthrough.

Once the backend and frontend are running, verify the local services:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend health: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- Current-user endpoint: [http://localhost:3000/api/v1/auth/me](http://localhost:3000/api/v1/auth/me)
- Worker readiness (when started): [http://localhost:3001/health/ready](http://localhost:3001/health/ready)

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
and documented application boundaries with dependency-cruiser. `npm run check` runs the
required-file check, Prettier, ESLint, TypeScript, the database-independent tests, Redocly OpenAPI
linting and every workspace build. `npm run ci:local` reproduces the change-aware CI plan before a
push, and `npm run hooks:install` installs it as an optional pre-push hook; see
[Local CI](docs/development/local-ci.md).

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

The application is delivered across **Cloudflare Pages** (the static frontend and separate MkDocs documentation site), **Azure Container Apps** (handwritten backend API and internal batch worker) and **Supabase** (PostgreSQL and managed authentication). The historical Azure App Service resources are not the supported frontend or backend deployment targets. The currently documented live URLs are development-named endpoints; release-specific revision verification belongs to [#810 evidence](evidence/validation/issue-810-release-readiness-2026-10-10.md).

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
- Build toolchain: Node.js 22 LTS; the deployed frontend is static HTML/CSS/JavaScript
- Environment: Development
- Deployment: Gitea Actions with Wrangler (automatic for frontend-affecting merged changes)
- Built using Vite.

### Asynchronous ingestion worker

- Platform: Azure Container Apps (internal only; no public endpoint)
- Runtime: Node.js 22 LTS container
- Job delivery: Azure Service Bus Standard with peek-lock and bounded KEDA scaling
- Data access: Supabase PostgreSQL and private Azure Blob Storage
- Deployment: automatic on worker-affecting merges through Gitea Actions, Bicep and immutable ACR images; manual recovery workflow retained

### CI/CD

Deployment automation is configured using Gitea Actions.

Gitea Actions runs change-aware validation on Pull Requests, with a required `quality` status and peer review before merging. After a reviewed change reaches `main`, the push workflow deploys **only affected components**: Cloudflare Pages for the frontend/documentation, immutable Azure Container Registry images and Azure Container Apps revisions for backend/worker. Deployment jobs check availability and, where applicable, database compatibility and active healthy container revisions. Documentation-only changes are not evidence that the frontend, backend or worker was rebuilt.

The repository-wide coverage job runs late as **non-blocking evidence**; its thresholds are informational rather than enforced release thresholds. See [CI/CD](docs/development/ci-cd.md) and the [final release-readiness record](evidence/validation/issue-810-release-readiness-2026-10-10.md) for the exact observed runs, limitations and verification boundary.

Deployment credentials are stored securely using repository Action Secrets.

No deployment credentials are committed to source control.

See [Cloudflare Pages frontend deployment](docs/deployment/frontend-cloudflare-pages.md) and
[Azure backend deployment](docs/deployment/azure-backend.md) and
[Azure worker deployment](docs/deployment/azure-worker.md) for workflow triggers, required Gitea
secrets, artifact contents and failure behaviour.

## Documentation

The public documentation site is **[sports-analytics-tool.pages.dev](https://sports-analytics-tool.pages.dev/)**.
Its source is the [`docs`](docs/) directory, built with MkDocs Material.

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

- [Getting Started](docs/getting-started.md) — setup, technology stack, environment and repository structure
- [Product & API](docs/product-and-api.md) — public API, submissions, statistics, exports, analytics query and weather
- [Architecture, Data & Security](docs/architecture-and-data.md) — architecture, database, event model and security
- [Testing & Quality](docs/testing/index.md) — automated testing, coverage, performance and user testing
- [Deployment & CI/CD](docs/deployment/overview.md) — hosting, CI/CD quality gates, recovery and deployment
- [Methodology](docs/process/methodology-overview.md) — project and Git methodology in practice
- [Project Records & Evidence](docs/process/index.md) — decisions, stakeholder records, validation and AI evidence
- [Final Submission](docs/final-submission.md) — final review path, traceability and verification bank

The documentation is built with MkDocs and deployed to Cloudflare Pages using Wrangler.

To preview or build locally:

```bash
python -m pip install -r requirements-docs.txt
python -m mkdocs serve
python -m mkdocs build --strict
```

To deploy manually (CI normally deploys `docs/` changes merged to `main`):

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

Sprint 4 user testing for #803 also uses Codex[GPT-6] for local test preparation, evidence documentation and browser technical verification. Its member-register entry distinguishes real assisted participant evidence from AI simulation and pending acceptance/review.

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
The Issue #879 documentation review (overview, repository structure, worker quick start, documentation
paths and tooling summary) was carried out with the assistance of Claude-Web[Claude Opus 5.5].
The Issue #810 current product-status, hosting/deployment and release-boundary reconciliation was
reviewed and drafted with the assistance of ChatGPT-Web[GPT-6].
