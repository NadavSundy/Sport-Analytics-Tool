# Backend API

The backend is the handwritten Express HTTP API for Stat'sTheGame. It is the authoritative application boundary for validation, authorisation and application-domain data access.

## Responsibilities

- expose versioned HTTP endpoints under `/api/v1`;
- validate Supabase identities on protected routes;
- synchronize provider-neutral application accounts;
- enforce server-owned `viewer | submitter | admin` roles and competition scope;
- access PostgreSQL through the `pg` driver;
- return safe errors and structured request logs; and
- keep generated Supabase data endpoints outside the application architecture.

## Prerequisites

From the repository root:

- Node.js 20.19+ (20.x) or Node.js 22.12+;
- npm 10 or later;
- access to the shared Supabase Auth configuration; and
- access to the selected hosted PostgreSQL development database; and
- Docker Desktop or a compatible Docker Compose runtime only for the explicit container-based database-integration-test workflow.

Install all workspaces with:

```bash
npm ci
```

## Environment

Copy the example file before starting the API.

### Windows PowerShell

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
```

### macOS / Linux / Git Bash

```bash
cp apps/backend/.env.example apps/backend/.env
```

Current runtime variables are:

| Variable                                 | Required by current runtime                                              | Secret  | Purpose                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`                               | No (defaults to `development`)                                           | No      | Runtime mode: `development`, `test` or `production`.                                                                                                                                       |
| `DEPLOYMENT_ENVIRONMENT`                 | Yes in production; `local` for local development                         | No      | Namespaces releases so filesystem metadata cannot shadow a deployed Azure artifact when a database is accidentally shared.                                                                 |
| `PORT`                                   | No (defaults to `3000`)                                                  | No      | HTTP listen port. Azure may provide this value.                                                                                                                                            |
| `CORS_ORIGINS`                           | No (defaults to `http://localhost:5173`)                                 | No      | Comma-separated browser origins allowed by Express CORS middleware.                                                                                                                        |
| `SUPABASE_URL`                           | Yes                                                                      | No      | Supabase project URL used by backend token verification.                                                                                                                                   |
| `SUPABASE_PUBLISHABLE_KEY`               | Yes                                                                      | No      | Publishable key used with `supabase.auth.getUser(accessToken)`.                                                                                                                            |
| `SUPABASE_SECRET_KEY`                    | No at startup; yes to enable account deletion                            | Yes     | Server-only key used exclusively by the Supabase Auth Admin account-deletion client.                                                                                                       |
| `DATABASE_URL`                           | Required for database-backed routes/scripts                              | Yes     | PostgreSQL session-pooler connection string.                                                                                                                                               |
| `DATABASE_URL_TEST`                      | Optional for local tests; supplied by Docker/CI or for a managed test DB | Depends | Dedicated isolated test PostgreSQL connection. When absent, the normal database-test command provisions a disposable PostgreSQL 16 cluster. Must never point to development or production. |
| `OBJECT_STORAGE_PROVIDER`                | Required in production; select `filesystem` for local releases           | No      | Chooses the provider behind the existing private `ObjectStore` boundary.                                                                                                                   |
| `OBJECT_STORAGE_FILESYSTEM_ROOT`         | Required with the local filesystem provider                              | No      | Filesystem storage root. The example resolves to repository-local `.local/object-storage`, which is ignored by Git.                                                                        |
| `AZURE_STORAGE_ACCOUNT_NAME`             | Required with the Azure provider                                         | No      | Non-secret Azure account identifier used by the production adapter.                                                                                                                        |
| `AZURE_STORAGE_CONTAINER_NAME`           | Required with the Azure provider                                         | No      | Non-secret private Blob container identifier used by the production adapter.                                                                                                               |
| `AZURE_STORAGE_INGESTION_CONTAINER_NAME` | Preferred with Azure; old name remains an alias                          | No      | Private staged-ingestion container.                                                                                                                                                        |
| `AZURE_STORAGE_RELEASE_CONTAINER_NAME`   | Required with Azure                                                      | No      | Separate private immutable dataset-release container.                                                                                                                                      |
| `AZURE_CLIENT_ID`                        | Required in the Container Apps runtime                                   | No      | API runtime user-assigned managed identity client ID for `DefaultAzureCredential`.                                                                                                         |

The current `.env.example` also contains reserved placeholders (`EXTERNAL_API_KEY`, `API_VERSION`, `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`) that are not read by the current application runtime. Do not treat a reserved placeholder as an implemented configuration option. `CORS_ORIGINS` is the variable used by the code today.

Never commit real `.env` files, database passwords, OAuth client secrets, bearer tokens or elevated Supabase keys.

The example environment explicitly selects local filesystem storage:

```env
OBJECT_STORAGE_PROVIDER=filesystem
OBJECT_STORAGE_FILESYSTEM_ROOT=../../.local/object-storage
```

Because npm runs the workspace from `apps/backend`, this writes beneath
`.local/object-storage` at the repository root. Dataset artifacts are streamed to temporary files
and promoted only after successful completion. They are private local development output, expose no
public filesystem URL, are ignored by Git and must not be committed. Production instead requires
`OBJECT_STORAGE_PROVIDER=azure` and continues to use the private Azure Blob adapter with managed
identity; it rejects missing or filesystem provider configuration.

## Database connection

Use the Supabase session pooler on port 5432 and the committed CA certificate at:

```text
apps/backend/certs/supabase-ca.crt
```

Verify the configured development connection from the repository root:

```bash
npm run db:check --workspace=@sport-analytics/backend
```

Do not disable TLS certificate verification to bypass a connection error.

## Run locally

From the repository root:

```bash
npm run dev:backend
```

Default endpoints include:

- Health: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- Current user: [http://localhost:3000/api/v1/auth/me](http://localhost:3000/api/v1/auth/me)
- Account deletion: `DELETE http://localhost:3000/api/v1/account` (requires optional server-only Auth configuration)
- Administrator users: [http://localhost:3000/api/v1/admin/users](http://localhost:3000/api/v1/admin/users) (administrator only)
- Fixture event route template: `/api/v1/fixtures/{fixtureId}/events` (public accepted events)
- Participant fixture-history route template: `/api/v1/participants/{participantId}/fixtures` (public player match history)

### Publish a local dataset release

After applying migrations, start both the backend and the local database-transport worker. Azure and
Service Bus are not required:

```bash
npm run dev:backend
npm run dev:worker
```

Then an administrator can queue publication:

```bash
curl -X POST http://localhost:3000/api/v1/admin/dataset-releases \
  -H "Authorization: Bearer <administrator-access-token>" \
  -H "Content-Type: application/json" \
  --data '{"version":"local-test"}'
```

The POST returns `202` and a job identifier. Poll
`GET /api/v1/admin/dataset-release-jobs/{jobId}` with the administrator token until `completed`.
The artifact appears as `.local/object-storage/dataset-releases/<uuid>.json`. Retrieve the same
private stored bytes through the stable public backend endpoint:

```bash
curl http://localhost:3000/api/v1/dataset-releases/local-test/artifact.json \
  --output local-test.json
```

Compare the downloaded file's SHA-256 with
`GET /api/v1/dataset-releases/local-test`. Do not commit either generated file.

## Administrator user management

`POST /api/v1/submitter-access-requests` accepts an existing `competitionId`, stores it with the
pending request, and returns its identifier and name. `/api/v1/auth/me` exposes the same requested
competition separately from effective grants.

`GET /api/v1/admin/users` returns registered application accounts, their authoritative role,
legacy request state, requested competition, assigned competition scopes, valid scope choices, and
the latest submitter-access audit fields. `PATCH /api/v1/admin/users/:userId/submitter-access`
approves a pending request, replaces an approved submitter's complete scope, or revokes approved
access.
`POST /api/v1/admin/users/:userId/submitter-access/rejection` separately rejects a pending request.

Both operations require a synchronized `admin` account. Approving a pending request requires exactly
its stored existing competition; a legacy request without one cannot be approved. Rejection assigns
`viewer`, records `rejected`, removes all scopes, and permits a later
request. Revocation assigns `viewer`, retains the historical `approved` decision, and removes all
scopes. Invalid transitions return `409 INVALID_SUBMITTER_ACCESS_TRANSITION` without changing role,
request state, scopes, or audit data. Administrator and disabled targets are protected, and
administrators cannot manage themselves through either action.

## Checks

Run the database-independent backend unit and API suites from the repository root with:

```bash
npm run test --workspace=@sport-analytics/backend
```

The backend workspace's ordinary `test` command first builds the shared contracts, then runs only
the unit and API suites. It intentionally excludes PostgreSQL integration tests, which prevents
Vitest from discovering database suites when no database workflow was selected. The granular
checks remain available:

```bash
npm run lint --workspace=@sport-analytics/backend
npm run typecheck --workspace=@sport-analytics/backend
npm run test:unit
npm run test:api
npm run build --workspace=@sport-analytics/backend
```

Run the complete backend test workflow, including the PostgreSQL integration suite, with:

```bash
npm run test:backend
```

Database integration tests start a disposable local PostgreSQL 16 cluster when
`DATABASE_URL_TEST` is absent:

```bash
npm run test:database
```

The default workflow uses an available loopback port and removes its temporary data when the suite
finishes. It requires neither Docker nor administrator rights. Database tests remain separate from
the normal root `npm run test` and `npm run check` commands and run explicitly in CI.

An explicit Docker Compose workflow remains available for parity with the PostgreSQL 16 CI service:

```bash
npm run test:backend:local
```

That command runs the backend unit and API suites before using the established
`test:database:local` workflow. The lower-level `npm run test:database:local` command remains
available when only the database suite is needed. It starts an isolated container on
`127.0.0.1:55432`, supplies the test-only connection, resets and migrates the schema, seeds
deterministic data, and runs the same database suite. To use an intentionally manually managed
isolated database instead, supply `DATABASE_URL_TEST` and run:

```bash
npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:migrate --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend
npm run test:database
```

See `apps/backend/.env.test.example` for the optional manual configuration shape and
[`docs/development/testing.md`](../../docs/development/testing.md) for the complete testing policy,
both local workflows, Docker lifecycle commands, and safety behaviour.

For the full repository gate:

```bash
npm run check
```

## Database migrations

Migrations are stored under `database/migrations/` and managed with `node-pg-migrate`.

Useful commands include:

```bash
npm run db:migrate --workspace=@sport-analytics/backend
npm run db:migrate:dry --workspace=@sport-analytics/backend
npm run db:migrate:create --workspace=@sport-analytics/backend -- <migration-name>
```

Migration commands use the committed Supabase CA certificate. Coordinate shared database migrations with the database workstream before applying them.

## Build and production start

```bash
npm run build --workspace=@sport-analytics/backend
npm run start --workspace=@sport-analytics/backend
```

The production deployment uses `apps/backend/Dockerfile`, built from the repository root. It compiles
the backend and its required workspace packages in a Node 22 Bookworm build stage, prunes development
dependencies, copies the compiled runtime dependencies and Supabase CA certificate into a Node 22
runtime stage, and starts `node apps/backend/dist/index.js` directly as non-root `node` on port `3000`.
This preserves the existing production start behaviour while allowing Node to receive Container Apps
termination signals directly.

The normal backend target is Azure Container Apps. The runtime uses external HTTPS ingress and
`/api/v1/health` probes, Key Vault-backed `DATABASE_URL` and `SUPABASE_SECRET_KEY` references, and a
managed identity for Blob Storage. The existing App Service remains a manual acceptance-period
fallback. See [Azure backend deployment](../../docs/deployment/azure-backend.md) for deployment,
scaling, CI, rollback, and acceptance procedures.

## Common problems

### Backend fails immediately with invalid environment configuration

Populate `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The environment schema validates these
values at startup.

### Account deletion returns `501 ACCOUNT_DELETION_UNAVAILABLE`

Keep `SUPABASE_PUBLISHABLE_KEY` configured for normal token verification and add a separate
server-only `SUPABASE_SECRET_KEY` to enable Supabase Auth administrative deletion. When the secret
is absent, the backend still starts and all unrelated routes remain available, but account deletion
returns `501` before changing local state. Never use the secret key in the frontend or replace the
publishable key with it.

### `DATABASE_URL is not configured`

Populate the hosted PostgreSQL session-pooler connection string in `apps/backend/.env`.

### `self-signed certificate in certificate chain`

Confirm that the committed `apps/backend/certs/supabase-ca.crt` file exists and that the migration/connection command is being run from the documented workspace. Do not set certificate verification to false.

### CORS failure from the local frontend

Set `CORS_ORIGINS=http://localhost:5173` (or a comma-separated list containing the actual frontend origin). `CORS_ALLOWED_ORIGINS` is not the current runtime variable.

### Shared contracts cannot be resolved during an isolated check

Build the contracts workspace first:

```bash
npm run build --workspace=@sport-analytics/contracts
```

The root `npm run check` already performs that contracts build before repository-wide type-checking.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol] and Codex[GPT-5]. The issue #255 competition-scoped access behavior was
documented with the assistance of Codex[GPT-5].
The local filesystem object-storage configuration and dataset-release workflow were documented with
the assistance of Codex[GPT-5].
The Issue #563 production container and Container Apps runtime documentation was updated with the
assistance of Codex[GPT-5].
