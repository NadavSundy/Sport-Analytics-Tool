# Stat'sTheGame

Event-driven sports analytics platform providing validated submissions, derived statistics, dataset exports, and a versioned public API for COMS3011A.

> **Current status:** The Express API validates Supabase identities, synchronizes provider-neutral application accounts, exposes the current user profile, and enforces `viewer`, `submitter`, and `admin` roles with competition-scoped submissions. Administrators can review users and atomically approve or reject pending requests, re-scope approved submitters, or revoke access. Public reference data, accepted fixture events, and derived fixture statistics remain anonymous. Datasets and external API integration remain future work.

## Repository structure

```text
apps/frontend       React web application
apps/backend        Hand-written Node.js HTTP API
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

- Node.js 20 or later
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
npm run check
```

The normal database-independent test suite can also be run directly:

```bash
npm run test
```

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

URL: https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net/

- Platform: Azure App Service (Linux)
- Runtime: Node.js 22 LTS
- Environment: Development
- Deployment: Azure App Service
- Configuration: Environment variables managed through Azure App Service

### Frontend

URL: https://statsthegame-web-dev-dngxgqb2esbudsce.southafricanorth-01.azurewebsites.net/

- Platform: Azure App Service (Linux)
- Runtime: Node.js 22 LTS
- Environment: Development
- Deployment: Azure App Service
- Built using Vite.

### CI/CD

Deployment automation is configured using Gitea Actions.

The deployment workflow will:

1. install root workspace dependencies from `package-lock.json`;
2. lint, type-check and test the affected workspace and shared contracts;
3. build the application from its `apps/frontend` or `apps/backend` workspace;
4. deploy the prepared application bundle to Azure App Service; and
5. retry a content-aware smoke or health check against the deployed service.

Deployment credentials are stored securely using repository Action Secrets.

No deployment credentials are committed to source control.

See [Azure frontend deployment](docs/deployment/azure-fronted.md) and
[Azure backend deployment](docs/deployment/azure-backend.md) for workflow triggers, required Gitea
secrets, artifact contents and failure behaviour.

## Documentation

Project documentation is stored in the [`docs`](docs/) directory and is configured as a public MkDocs site.

```bash
python -m pip install -r requirements-docs.txt
mkdocs serve
```

### Component guides

- [Frontend application](apps/frontend/README.md)
- [Backend API](apps/backend/README.md)
- [Database](database/README.md)
- [Shared contracts](packages/contracts/README.md)
- [Documentation site](docs/README.md)
- [Repository testing](tests/README.md)
- [Infrastructure and deployment](infra/README.md)
- [Repository scripts](scripts/README.md)
- [Project evidence](evidence/README.md)

Important detailed documentation:

- [Git Methodology](docs/git-methodology.md)
- [Project Methodology](docs/project_methodology.md)
- [Architecture Overview](docs/architecture/overview.md)
- [Local Development Setup](docs/development/setup.md)
- [Technology Stack](docs/development/technology-stack.md)
- [Environment Variables](docs/environment.md)
- [Testing Strategy](docs/development/testing.md)
- [Authentication Foundation](docs/security/authentication.md)
- [Password Recovery Ownership](docs/security/password-recovery.md)
- [Authentication Provider Comparison](docs/security/auth-provider-comparison.md)

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

This repository makes use of AI code generation using the following tools recorded in the AI registers: ChatGPT-Web[GPT-5.6 Sol], Codex[GPT-5], Codex[GPT-5.6 Sol] and Claude-Web[Claude Opus 5]. Earlier planning/documentation sessions also record ChatGPT-Web[GPT-5.5], ChatGPT-Web[GPT-5.6 Thinking] and Claude.ai[Claude Sonnet 5].

This repository does not currently use AI in-line editing/autocomplete tools as a repository workflow.

This repository makes use of AI-assisted code review using tools recorded in the task-level registers, including Codex[GPT-5], Codex[GPT-5.6 Sol] and Claude-Web[Claude Opus 5]. Human review, testing and responsibility remain required.

See [`evidence/ai/registers/`](evidence/ai/registers/) for current task-level records. The earlier
shared register remains available while its entries are migrated.

The preceding README was reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
