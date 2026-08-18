# Local development setup

This is the canonical onboarding guide for a clean checkout of the Sport Analytics Tool.

## 1. Required software

| Tool    | Project requirement                                      | Why it is needed                                                                            |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Git     | Git 2.x                                                  | Clone, branch, commit and Pull Request workflow.                                            |
| Node.js | 20 or later                                              | Backend runtime and all JavaScript/TypeScript tooling. Azure currently uses Node.js 22 LTS. |
| npm     | 10 or later                                              | Workspace installation and repository scripts.                                              |
| Python  | 3.10 or later                                            | MkDocs documentation and the Cricsheet downloader.                                          |
| Docker  | Docker Desktop or compatible Docker runtime with Compose | Optional explicit PostgreSQL integration-test workflow.                                     |

Optional:

- the Supabase CLI/local Supabase stack, only if the team deliberately chooses to use it;
- an editor/IDE of your choice. The repository does not require VS Code, Qoder or any other editor.

Docker is **not** required to run the application, `npm run test`, or `npm run check`. It is required
only for the explicit `npm run test:database:local` alternative.

Record the exact versions used during onboarding:

```bash
git --version
node --version
npm --version
python --version
```

On Windows, `py --version` may be used if `python` is not on `PATH`.

## 2. Clean clone and reproducible install

Clone the repository and install exactly the dependency graph recorded in `package-lock.json`.

```bash
git clone https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool.git
cd Sport-Analytics-Tool
npm ci
```

For Issue #12 independent verification, check out the Pull Request branch after cloning:

```bash
git fetch origin
git switch docs/12-validate-developer-onboarding
```

Use `npm ci` rather than `npm install` for clean-clone verification. `npm ci` fails if the lock file and package manifests do not agree, which is useful evidence that the repository can be installed reproducibly.

## 3. Create local environment files

Real `.env` files are ignored and must never be committed.

### Windows PowerShell

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env
```

### macOS / Linux / Git Bash

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Populate the required values using the shared development configuration. See [Environment Variables](../environment.md) for the authoritative variable list.

## 4. Backend database connection

The application database is hosted on PostgreSQL through Supabase. Use the **session pooler on port 5432**. ADR-003 records why the direct connection and transaction-mode pooler were rejected for this project.

A typical development value has the form:

```text
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres
```

Use the current connection string supplied through the team's secret-sharing process rather than copying a host from an old document. Percent-encode reserved URL characters in the password.

TLS certificate verification uses the committed authority certificate:

```text
apps/backend/certs/supabase-ca.crt
```

Do **not** disable certificate verification to bypass a connection error.

Verify the configured database connection:

```bash
npm run db:check --workspace=@sport-analytics/backend
```

A successful run reports the database name and server version and confirms prepared-statement support.

## 5. Supabase Auth configuration

The frontend needs:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The backend needs:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

These are public/publishable project values, not elevated secret keys. Never commit database passwords, OAuth client secrets, user access tokens, Supabase secret keys or legacy `service_role` keys.

Google OAuth is configured in the Google and Supabase dashboards. Its client secret remains outside the repository.

## 6. Build shared contracts

The frontend and backend both import `@sport-analytics/contracts`.

The complete root check builds contracts before repository-wide type-checking, but when running an isolated workspace check on a fresh installation it is safe to build contracts first:

```bash
npm run build --workspace=@sport-analytics/contracts
```

## 7. Run the applications

Start the backend in one terminal:

```bash
npm run dev:backend
```

Start the frontend in a second terminal:

```bash
npm run dev:frontend
```

The root dispatcher also supports `npm run dev backend` and
`npm run dev frontend`. Arguments after `--` are forwarded to the selected
application, such as `npm run dev frontend -- --host 0.0.0.0`.

Default local endpoints:

- frontend: `http://localhost:5173`
- backend health: `http://localhost:3000/api/v1/health`
- current user profile: `http://localhost:3000/api/v1/auth/me`

A basic local smoke test is successful when the frontend loads and the backend health endpoint responds without a server error.

## 8. Repository checks

The normal pre-Pull-Request gate is:

```bash
npm run check
```

It currently runs, in order:

1. required-file structure check;
2. Prettier formatting check;
3. ESLint;
4. shared-contract build;
5. TypeScript type-checking;
6. unit/frontend/API/PostgreSQL/contract/deployment-helper tests;
7. OpenAPI linting; and
8. production builds for contracts, backend and frontend.

Useful individual commands:

```bash
npm run structure:check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run openapi:lint
npm run build
```

The extended CI/testing suite also includes Playwright browser/accessibility tests and coverage
generation. See [Testing](testing.md).

## 9. Local PostgreSQL integration tests

Database integration tests exercise the application against a real PostgreSQL database. The default
`npm run test:database` command provisions a disposable PostgreSQL 16 cluster without Docker. The
steps below describe the optional Docker Compose workflow, which is useful for parity with CI.

From the repository root, run the default workflow with:

```bash
npm run test:database
```

The runner chooses an available loopback port, applies migrations and deterministic seed data, runs
the database suite, and removes its temporary cluster after the tests finish.

### Optional Docker workflow

Start Docker Desktop before using `npm run test:database:local`.

On Windows:

1. Open **Docker Desktop** from the Start menu.
2. Wait until Docker Desktop reports that the Docker engine is running.
3. Open PowerShell in the repository and verify:

```powershell
docker --version
docker compose version
docker info
```

On macOS, start Docker Desktop from Applications and wait for the engine to become available before
running the same verification commands.

A different Docker-compatible runtime may be used if it provides the `docker compose` command used
by the repository.

### Run the database integration suite

From the repository root:

```bash
npm run test:database:local
```

On Windows PowerShell, `npm.cmd` may be used explicitly:

```powershell
npm.cmd run test:database:local
```

The command automatically:

1. starts the repository-managed PostgreSQL 16 test container;
2. waits until PostgreSQL is healthy;
3. supplies `NODE_ENV=test`;
4. supplies the local `DATABASE_URL_TEST`;
5. resets the test schema;
6. applies all migrations;
7. loads the deterministic test seed; and
8. runs the complete PostgreSQL integration suite.

No manual `NODE_ENV` change, `.env.test` file, hosted test database, Supabase test project or
shared database password is required for this normal workflow.

The local test database is:

```text
postgresql://test_user:test_password@127.0.0.1:55432/sport_analytics_test
```

These are repository-defined **test-only local credentials**, not application secrets. Port
`55432` is intentionally different from PostgreSQL's common `5432` port to reduce conflicts with
an existing local installation.

### Development database versus test database

`DATABASE_URL` is the normal application development database connection. In the team's current
configuration it points to the Supabase-hosted PostgreSQL development database.

`DATABASE_URL_TEST` is used only by PostgreSQL integration tests and destructive test-database
commands.

The disposable Docker workflow supplies `DATABASE_URL_TEST` itself. It does not replace, reset or
modify `DATABASE_URL`.

The database safety guard requires `NODE_ENV=test`, requires the target database name to identify it
as a test database, and rejects a test connection that resolves to the same PostgreSQL host, port and
database as the configured development connection.

### Stop or remove the local test database

The container may remain running between test runs. Each local database-test run resets the schema,
so tests do not depend on data left by the previous run.

Stop the container while keeping its disposable volume:

```bash
docker compose -f compose.test.yml down
```

Stop it and remove all local test-database data:

```bash
docker compose -f compose.test.yml down --volumes
```

The next `npm run test:database:local` command recreates the environment automatically.

### Using a different test database

A manually managed database is another alternative to the default embedded and explicit Docker
workflows.

A developer who already has a dedicated PostgreSQL test database may supply a safe
`DATABASE_URL_TEST` and run:

```bash
npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:migrate --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend
npm run test:database
```

The supported npm commands set `NODE_ENV=test` automatically.

See `apps/backend/.env.test.example` for the expected test configuration shape. Never use the
application development or production database for this workflow.

## 10. Documentation site

Create a Python virtual environment and install the documentation requirements.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-docs.txt
python -m mkdocs serve
```

### macOS / Linux / Git Bash

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-docs.txt
python -m mkdocs serve
```

Preview URL:

```text
http://127.0.0.1:8000
```

Before a documentation Pull Request, also run:

```bash
python -m mkdocs build --strict
```

The generated `site/` directory is build output and must not be committed as part of normal documentation changes.

## 11. Optional Cricsheet data download

Historical T20/IT20 source data is acquired with the committed Python script:

```bash
python scripts/download_cricsheet_t20.py
```

On Windows, `py scripts/download_cricsheet_t20.py` is also valid.

The downloader uses the Python standard library and requires internet access. Downloaded archives, extracted match data and generated manifests are ignored by Git. See [Cricsheet T20 data](../data/cricsheet.md).

## 12. Optional local Supabase stack

A local Supabase stack is **not required** for normal onboarding. If the team deliberately chooses to use it, the Supabase CLI requires a Docker-compatible runtime and the work must be coordinated with the database workstream. Do not initialize or reset a shared environment without team agreement.

## 13. Common setup problems

### `npm ci` fails because Node/npm is too old

Check:

```bash
node --version
npm --version
```

Use Node.js 20+ and npm 10+.

### PowerShell blocks virtual-environment activation

You may run MkDocs without activating the environment by calling the environment's Python executable directly, or use a shell configuration permitted by your machine policy. Do not weaken organisation security controls merely to follow this guide.

### `Cannot find module '@sport-analytics/contracts'`

Build the contracts workspace:

```bash
npm run build --workspace=@sport-analytics/contracts
```

The root `npm run check` already performs this build before type-checking.

### Frontend reports missing Supabase variables

Populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `apps/frontend/.env`.

### Backend fails with invalid environment configuration

Populate `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `apps/backend/.env`. The backend validates these at startup.

### `DATABASE_URL is not configured`

Populate the current hosted PostgreSQL session-pooler connection string in `apps/backend/.env`.

### Database hostname/connection fails

Use the current **session pooler** connection string rather than the direct database host. Do not copy a stale region-specific host from old notes.

### `self-signed certificate in certificate chain`

Confirm that `apps/backend/certs/supabase-ca.crt` exists and that the documented migration/connection command is being used. Do not disable TLS verification.

### Browser requests fail with CORS errors

The backend currently reads `CORS_ORIGINS`, not `CORS_ALLOWED_ORIGINS`. For local development, the default is `http://localhost:5173`.

### `npm run check` reports formatting failures

Run:

```bash
npm run format
npm run format:check
```

Review the resulting diff before committing. Formatting should not be used to hide unrelated changes.

### Docker command is not found

Install or start Docker Desktop, then open a new terminal and verify:

```bash
docker --version
docker compose version
```

Docker is needed only for the explicit `npm run test:database:local` alternative.

### Docker cannot connect to the engine

Start Docker Desktop and wait until the Docker engine is running. Then verify:

```bash
docker info
```

Retry `npm run test:database:local` only after `docker info` succeeds.

### Port 55432 is already in use

The repository deliberately uses port `55432` rather than the usual PostgreSQL port `5432`.
If another process already uses `55432`, stop that process before running the local database
workflow. Do not change the test workflow to point at an unknown existing database.

### Database test safety check fails

Do not bypass the safety check. Confirm that the command is using a dedicated test database and that
`DATABASE_URL_TEST` does not resolve to the same PostgreSQL database as `DATABASE_URL`.

For the Docker workflow, do not manually set `DATABASE_URL_TEST`; run:

```bash
npm run test:database:local
```

### Playwright cannot find a browser

Install the configured Chromium browser:

```bash
npx playwright install chromium
```

CI uses `npx playwright install --with-deps chromium` on Linux.

### MkDocs command is not found

Install documentation requirements inside the active virtual environment:

```bash
python -m pip install -r requirements-docs.txt
```

Then prefer `python -m mkdocs ...` so the command uses the intended Python environment.

## 14. Onboarding verification record

Issue #12 requires a second team member to follow this guide from a clean clone. The verifier must record:

- name;
- date;
- operating system;
- shell/terminal;
- editor/IDE used, if any;
- Git, Node.js, npm and Python versions;
- whether `npm ci` succeeded;
- whether environment setup was understandable;
- whether frontend/backend start commands worked;
- whether `npm run check` succeeded;
- whether the MkDocs strict build succeeded;
- any unclear step or failure; and
- the final result after fixes.

The repository evidence template is `evidence/validation/issue-12-onboarding-verification.md`.

## Related documentation

- [Technology Stack](technology-stack.md)
- [Dependencies](dependencies.md)
- [Testing](testing.md)
- [Environment Variables](../environment.md)
- [Authentication and Authorisation](../security/authentication.md)
- [Deployment Overview](../deployment/overview.md)

## AI Declaration

The preceding document was reviewed, reorganised and expanded with the assistance of ChatGPT-Web[GPT-5.6 Sol].
