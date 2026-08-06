# Sport Analytics Tool

Event-driven sports analytics platform providing validated submissions, derived statistics, dataset exports, and a versioned public API for COMS3011A.

> **Current status:** Foundation scaffold with a Firebase Authentication backend proof. The Express API validates Firebase identities and protects one proof-of-concept endpoint. Final account screens, roles, sport-specific event schemas, submissions, derivation, datasets, and external API integration are not yet implemented.

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

The frontend and backend are separate applications. The frontend must access application data through the backend HTTP API. The database must not be exposed to the frontend through generated Supabase or Firebase data endpoints.

See [Repository Structure](docs/architecture/repository-structure.md) for the detailed tree and boundaries.

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- Python 3 and MkDocs Material for the documentation site
- A PostgreSQL-compatible development database
- Java JDK 11 or later for the Firebase Emulator Suite
- Access to the development Firebase project

## Initial setup

```bash
npm install
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
- Protected identity endpoint: `http://localhost:3000/api/v1/auth/me`
- Firebase Emulator UI: `http://127.0.0.1:4000`

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
- [Testing Strategy](docs/development/testing.md)
- [Authentication Foundation](docs/security/authentication.md)
- [Authentication Provider Comparison](docs/security/auth-provider-comparison.md)

The public documentation for this project is available at:

https://sports-analytics-tool.pages.dev

The documentation is generated using MkDocs and deployed via Cloudflare Pages.

## Development rules

- Create a Gitea issue before significant work begins.
- Create a short-lived branch from the latest `main`.
- Use Pull Requests and peer review; do not develop directly on `main`.
- Keep API, database, security, testing, and deployment documentation aligned with the implementation.
- Add or update tests for behavioural changes.
- Record stakeholder decisions and feedback under `evidence/`.
- Attribute AI-assisted code in commit messages and maintain the AI register.

## AI usage

This repository makes use of AI code generation using the following tools: ChatGPT-Web[GPT-5.6 Thinking] and Codex[GPT-5].

This repository does not currently use AI in-line editing tools.

This repository does not currently use AI code review.

See [`evidence/ai/ai-usage-register.csv`](evidence/ai/ai-usage-register.csv) for task-level records.
