# Technology stack

This document records the technologies, direct third-party dependencies, development tools, hosted services, and external data sources currently selected for the Sport Analytics Tool.

The purpose is to make the project reproducible and auditable. `package.json` files define the direct JavaScript dependencies selected by the team, while `package-lock.json` is the authoritative record of the exact versions installed by `npm ci`.

## Stack boundaries

The project deliberately keeps the product applications separate:

```text
React frontend
    |
    | HTTPS requests to the handwritten API
    v
Express backend API
    |
    +--> Supabase Auth for managed identity verification
    |
    +--> PostgreSQL for application data
```

The frontend may communicate directly with Supabase Auth for managed sign-in and session handling. Application-domain data must pass through the handwritten Express API; generated Supabase Data API endpoints are not used as the application API.

## Languages and runtimes

| Technology           | Project version / requirement             | Purpose                                                                     | Motivation                                                                                                                                                                                                                                                                   |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript           | `5.5.4`                                   | Primary application language across frontend, backend and shared contracts. | One typed language across all workspaces allows schemas and types to be shared, catches interface errors before runtime, and fits the Node.js/React ecosystem already selected. It is pinned because the current `@typescript-eslint` version supports TypeScript below 5.6. |
| JavaScript / Node.js | Node.js `>=20`; Azure uses Node.js 22 LTS | Executes build tooling and the backend runtime.                             | Keeps the backend in the same ecosystem as the TypeScript frontend and is supported by the selected Azure App Service deployment.                                                                                                                                            |
| Python               | Project baseline: Python `>=3.10`         | Builds the MkDocs documentation and runs the Cricsheet acquisition script.  | Python is used only for documentation/data-support tasks; the product applications remain TypeScript/Node.js. The Cricsheet downloader uses only the Python standard library.                                                                                                |
| SQL                  | PostgreSQL SQL                            | Defines migrations, constraints and database queries.                       | Plain SQL keeps schema changes explicit, reviewable and portable between PostgreSQL hosts.                                                                                                                                                                                   |

## Frontend

| Technology / dependency      | Declared version | Purpose                                               | Motivation / notes                                                                                                                               |
| ---------------------------- | ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| React                        | `^18.3.1`        | Component-based web user interface.                   | Selected in the initial scaffold for a non-monolithic frontend. No formal framework comparison is currently recorded.                            |
| React DOM                    | `^18.3.1`        | Renders React components in the browser.              | Required runtime companion to React for the web application.                                                                                     |
| React Router DOM             | `^7.18.2`        | Client-side routing and navigation.                   | Provides route matching and navigation without coupling routing logic to individual components.                                                  |
| Vite                         | `^5.4.10`        | Development server and production frontend build.     | Provides a fast local development loop and a static production bundle suitable for the selected deployment model.                                |
| `@vitejs/plugin-react`       | `^4.3.3`         | React support in Vite.                                | Connects the selected React frontend to the Vite build pipeline.                                                                                 |
| `@supabase/supabase-js`      | `^2.112.1`       | Managed browser authentication and session handling.  | Reuses the selected Supabase Auth platform rather than implementing authentication. Application data still uses the handwritten API.             |
| `@sport-analytics/contracts` | `^0.1.0`         | Shared request/response schemas and TypeScript types. | Prevents the frontend and backend from independently redefining the same contracts. This is an internal workspace package, not third-party code. |

## Backend API

| Technology / dependency      | Declared version | Purpose                                                         | Motivation / notes                                                                                                                                |
| ---------------------------- | ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Express                      | `^4.21.1`        | Handwritten HTTP API, routing and middleware.                   | Satisfies the requirement for a separately implemented backend and handwritten API. No formal backend-framework comparison is currently recorded. |
| `@supabase/supabase-js`      | `^2.112.1`       | Validates Supabase access tokens on protected backend requests. | Uses the same managed identity platform as the frontend without trusting browser-only claims.                                                     |
| `pg`                         | `^8.22.0`        | PostgreSQL driver and connection pooling.                       | Keeps database access provider-neutral and communicates with PostgreSQL directly instead of generated Supabase data endpoints.                    |
| Zod                          | `^3.23.8`        | Runtime validation and schema-derived TypeScript types.         | Shared validation at the API boundary reduces drift between declared types and runtime payload validation.                                        |
| CORS                         | `^2.8.5`         | Cross-origin request policy.                                    | Explicitly limits which browser origins may call the API.                                                                                         |
| Helmet                       | `^8.0.0`         | Secure HTTP response-header defaults.                           | Adds established defensive HTTP headers instead of reimplementing them manually.                                                                  |
| Pino HTTP                    | `^10.3.0`        | Structured HTTP request logging.                                | Produces machine-readable request logs and supports redaction of sensitive headers such as `Authorization`.                                       |
| dotenv                       | `^17.4.2`        | Loads ignored local backend environment files.                  | Keeps local configuration outside committed source while preserving a simple developer setup.                                                     |
| `@sport-analytics/contracts` | `0.1.0`          | Shared API schemas/types.                                       | Keeps backend responses and validation aligned with the shared contract boundary.                                                                 |

## Shared contracts

| Technology / dependency | Declared version    | Purpose                                         | Motivation / notes                                                                                                               |
| ----------------------- | ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Zod                     | `^3.23.8`           | Runtime schemas and TypeScript type derivation. | Allows the same contract definition to be consumed by frontend, backend and tests without storing business logic in the package. |
| TypeScript              | inherited from root | Builds the package and emits declarations.      | Makes the contracts package usable as a typed workspace dependency.                                                              |

## Database and authentication services

| Technology / service      | Current selection                                           | Purpose                                                                                        | Motivation and alternatives                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL                | Supabase-hosted PostgreSQL                                  | Persistent application data, event provenance, accounts, scopes and future derived statistics. | ADR-003 selected PostgreSQL on Supabase for provisioning speed and team familiarity while preserving a standard connection-string boundary. Azure Database for PostgreSQL and Neon were considered as hosting alternatives. |
| Supabase database hosting | Paid-plan Supabase project; session pooler on port 5432     | Hosts PostgreSQL with enough capacity for the planned event dataset.                           | The project moved away from the storage-constrained original project. The Data API is disabled so generated data endpoints are not available. ADR-005 records the migration decision and its alternatives.                  |
| Supabase Auth             | Managed Supabase Auth; Google is the initial OAuth provider | Sign-up/sign-in lifecycle, OAuth, sessions and token issuance.                                 | ADR-004 selected Supabase Auth after Firebase was superseded, avoiding a second identity platform while preserving the handwritten API boundary. Auth0 and custom authentication were also considered.                      |
| Supavisor session pooler  | Port 5432                                                   | Reliable PostgreSQL connectivity from developer machines and deployment environments.          | ADR-003 rejected the direct connection because IPv4 could not be assumed and rejected transaction-mode pooling because prepared statements are required.                                                                    |
| `node-pg-migrate`         | `^9.0.0`                                                    | Applies ordered SQL migrations.                                                                | ADR-003 selected explicit SQL migrations and rejected Drizzle Kit at this stage because it would introduce a schema-generation/ORM direction that had not been chosen.                                                      |

ADR-005 records the database host and authentication service as separate Supabase project concerns at the time of that decision. If the team later consolidates them into one project or changes account ownership/tier, that change must be recorded separately rather than silently rewriting the historical ADR.

## Testing and verification

| Technology / dependency           | Declared version                             | Purpose                                                                  | Motivation / notes                                                                                                                                                    |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest                            | `^2.1.4`                                     | Frontend, backend and contract unit/integration tests.                   | One test runner across TypeScript workspaces reduces duplicated configuration.                                                                                        |
| Docker / Docker Compose           | Docker Desktop or compatible Compose runtime | Provisions the disposable local PostgreSQL integration-test environment. | Gives each developer an isolated, reproducible database without a hosted test project or shared credentials while keeping normal development independent from Docker. |
| PostgreSQL container image        | `postgres:16`                                | Runs the repository-managed local integration-test database.             | Uses the same PostgreSQL major version as CI so local database behaviour closely matches the automated pipeline.                                                      |
| React Testing Library             | `^16.0.1`                                    | React component behaviour tests.                                         | Encourages testing through user-observable component behaviour rather than implementation details.                                                                    |
| `@testing-library/jest-dom`       | `^6.6.3`                                     | DOM-specific assertions.                                                 | Improves readability of frontend tests.                                                                                                                               |
| jsdom                             | `^25.0.1`                                    | Browser-like DOM environment for Vitest.                                 | Allows React tests to run without launching a full browser.                                                                                                           |
| Supertest                         | `^7.0.0`                                     | HTTP assertions against the Express application.                         | Exercises API behaviour through HTTP without requiring a separately deployed server.                                                                                  |
| Playwright                        | `@playwright/test ^1.62.1`                   | Browser end-to-end testing.                                              | Verifies actual navigation and user flows in a real browser engine.                                                                                                   |
| axe-core / `@axe-core/playwright` | `^4.13.0` / `^4.12.1`                        | Automated accessibility checks.                                          | Adds repeatable detection of serious accessibility violations to browser-level verification.                                                                          |
| `@vitest/coverage-v8`             | `^2.1.9`                                     | Test coverage reporting.                                                 | Uses V8 coverage with the existing Vitest test runner.                                                                                                                |

## Code quality and build tooling

| Technology / dependency            | Declared version         | Purpose                                                               | Motivation / notes                                                                               |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ESLint                             | `^8.57.1`                | Static linting.                                                       | Enforces shared code-quality rules before review.                                                |
| `@typescript-eslint/parser`        | `^7.18.0`                | Parses TypeScript for ESLint.                                         | Required for TypeScript-aware linting.                                                           |
| `@typescript-eslint/eslint-plugin` | `^7.18.0`                | TypeScript lint rules.                                                | Extends ESLint with TypeScript-specific checks.                                                  |
| `eslint-plugin-react-hooks`        | `^4.6.2`                 | React Hooks lint rules.                                               | Detects invalid Hook usage and missing dependency patterns.                                      |
| Prettier                           | `^3.3.3`                 | Repository formatting.                                                | Gives the team one deterministic formatting command and avoids style-only review debates.        |
| `.editorconfig`                    | repository configuration | Basic editor-independent whitespace/line-ending rules.                | Keeps common formatting behaviour consistent even when team members use different editors.       |
| `cross-env`                        | `^10.1.0`                | Cross-platform environment variables in npm scripts.                  | Keeps database/test scripts usable on Windows and Unix-like systems.                             |
| `tsx`                              | `^4.19.2`                | Executes TypeScript backend development and support scripts directly. | Avoids a separate manual compile step for local scripts and watch mode.                          |
| npm workspaces                     | npm `>=10`               | Monorepo dependency and script orchestration.                         | Allows frontend, backend and contracts to share one lock file while remaining separate packages. |

## API documentation tooling

| Technology / dependency | Declared version        | Purpose                               | Motivation / notes                                                                         |
| ----------------------- | ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| OpenAPI                 | `docs/api/openapi.yaml` | Machine-readable public API contract. | Gives API consumers a version-controlled specification independent of implementation code. |
| Redocly CLI             | `^2.46.0`               | Lints the OpenAPI specification.      | Makes API contract validation part of `npm run check`.                                     |

## Documentation tooling

| Technology / dependency | Version / requirement                            | Purpose                                                       | Motivation / alternatives                                                                                                                                        |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MkDocs                  | installed through `mkdocs-material` requirements | Builds the public documentation site from Markdown.           | Keeps documentation version-controlled alongside the code. Docusaurus and mdBook were course-suggested alternatives; no formal comparison is currently recorded. |
| Material for MkDocs     | `>=9,<10`                                        | Documentation theme, navigation and search integration.       | Adds a readable documentation UI without requiring the team to build a docs frontend.                                                                            |
| Cloudflare Pages        | hosted service                                   | Publicly hosts the generated MkDocs `site/` output.           | Already deployed and independently accessible; avoids an account-gated documentation platform.                                                                   |
| Wrangler                | `^4.119.0`                                       | Deploys the generated documentation site to Cloudflare Pages. | Provides a repeatable CLI deployment command suitable for local use and future automation. Wrangler is not used to deploy the React frontend or Express backend. |

## Deployment, collaboration and CI/CD

| Technology / service          | Purpose                                                                  | Motivation / notes                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Git                           | Version control.                                                         | Required project history and traceability mechanism.                                                                                                                     |
| Gitea                         | Repository hosting, issues, Pull Requests, project board and milestones. | University-hosted collaboration platform used as the authoritative project record.                                                                                       |
| GitHub Flow adapted for Gitea | Branch/PR methodology.                                                   | Selected over Git Flow to keep review and traceability without permanent `develop`/release branches. See `docs/git-methodology.md`.                                      |
| Gitea Actions                 | Continuous integration and Azure deployment workflows.                   | Keeps automated checks and deployment definitions in the same repository.                                                                                                |
| Azure App Service (Linux)     | Hosts the React frontend and Express backend.                            | ADR 0003 selected App Service for managed HTTPS, Node.js support and a simple Sprint 1 deployment model. Azure Container Apps and Azure Static Web Apps were considered. |
| Cloudflare Pages              | Hosts public documentation.                                              | Keeps the documentation deployment independent from the application deployments.                                                                                         |

## External data and integrations

| Source / service              | Current use                                       | Notes                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cricsheet                     | Historical event-level T20/IT20 JSON data source. | Downloaded by `scripts/download_cricsheet_t20.py`; generated bulk data remains ignored. Cricsheet is a data source, not the required runtime external API integration. |
| Google OAuth                  | Identity provider through Supabase Auth.          | OAuth client secrets remain in provider dashboards and are never committed.                                                                                            |
| Required runtime external API | Not yet selected.                                 | The project brief requires a relevant external API integration. The architecture currently records this choice as undecided; it must be documented when selected.      |

## Type-only support packages

The following direct packages provide TypeScript declarations for JavaScript libraries or runtimes. They do not add separate runtime behaviour:

- `@types/react ^18.3.12`
- `@types/react-dom ^18.3.1`
- `@types/cors ^2.8.17`
- `@types/express ^4.17.21`
- `@types/node ^22.9.0`
- `@types/pg ^8.20.4`
- `@types/supertest ^6.0.2`

## Version policy

- `package-lock.json` is committed and defines the exact JavaScript dependency graph used by `npm ci`.
- Developers must use `npm ci` for clean-clone verification and CI-equivalent checks.
- Direct dependencies must not be added without a clear project purpose.
- Significant technology changes require a Gitea issue and, where they affect architecture, a decision record.
- New third-party code/services must be added to this document and to the relevant specialist documentation.
- Dependency upgrades must be tested before merge.

## Editor and operating-system policy

No IDE or operating system is required by the repository. The setup guide provides Windows PowerShell and Unix-like command equivalents where the command differs. Team members should record the OS, terminal/shell, editor/IDE and exact tool versions used during onboarding verification so the team can identify environment-specific problems without making one editor a project dependency.

## AI tooling

AI usage is governed separately by the course AI policy and the repository AI evidence process. The root README records the repository-level AI code-generation, inline-editing and code-review declarations, while task-level tool/model/purpose records and transcripts are stored under `evidence/ai/`.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
