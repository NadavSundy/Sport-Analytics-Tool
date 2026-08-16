# Stat'sTheGame

Event-driven sports analytics platform providing validated submissions, derived statistics, dataset exports, and a versioned public API for COMS3011A.

> **Current status:** The Express API validates Supabase identities, synchronizes provider-neutral application accounts, exposes the current user profile, and enforces `viewer`, `submitter`, and `admin` roles with competition-scoped submissions. Public reference-data browsing remains anonymous. Administrator management screens, datasets, and external API integration remain future work.

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
- A Docker-compatible runtime if using the optional local Supabase stack

## Initial setup

```bash
npm ci
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
npm run check
```

Run the applications in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

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

1. Install dependencies
2. Run project checks
3. Build the application
4. Deploy to Azure App Service

Deployment credentials are stored securely using repository Action Secrets.

No deployment credentials are committed to source control.

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend health endpoint: `http://localhost:3000/api/v1/health`
- Current user profile endpoint: `http://localhost:3000/api/v1/auth/me`

## Documentation

Project documentation is stored in the [`docs`](docs/) directory and is configured as a public MkDocs site.

```bash
python -m pip install -r requirements-docs.txt
mkdocs serve
```

Important starting documents:

- [Git Methodology](docs/git-methodology.md)
- [Project Methodology](docs/project_methodology.md)
- [Architecture Overview](docs/architecture/overview.md)
- [Local Development Setup](docs/development/setup.md)
- [Technology Stack](docs/development/technology-stack.md)
- [Frontend README](apps/frontend/README.md)
- [Backend README](apps/backend/README.md)
- [Shared Contracts README](packages/contracts/README.md)
- [Environment Variables](docs/environment.md)
- [Testing Strategy](docs/development/testing.md)
- [Authentication Foundation](docs/security/authentication.md)
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
