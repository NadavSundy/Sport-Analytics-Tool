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

- Node.js 20 or later;
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

| Variable                   | Required by current runtime                                              | Secret  | Purpose                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`                 | No (defaults to `development`)                                           | No      | Runtime mode: `development`, `test` or `production`.                                                                                                                                       |
| `PORT`                     | No (defaults to `3000`)                                                  | No      | HTTP listen port. Azure may provide this value.                                                                                                                                            |
| `CORS_ORIGINS`             | No (defaults to `http://localhost:5173`)                                 | No      | Comma-separated browser origins allowed by Express CORS middleware.                                                                                                                        |
| `SUPABASE_URL`             | Yes                                                                      | No      | Supabase project URL used by backend token verification.                                                                                                                                   |
| `SUPABASE_PUBLISHABLE_KEY` | Yes                                                                      | No      | Publishable key used with `supabase.auth.getUser(accessToken)`.                                                                                                                            |
| `DATABASE_URL`             | Required for database-backed routes/scripts                              | Yes     | PostgreSQL session-pooler connection string.                                                                                                                                               |
| `DATABASE_URL_TEST`        | Optional for local tests; supplied by Docker/CI or for a managed test DB | Depends | Dedicated isolated test PostgreSQL connection. When absent, the normal database-test command provisions a disposable PostgreSQL 16 cluster. Must never point to development or production. |

The current `.env.example` also contains reserved placeholders (`EXTERNAL_API_KEY`, `API_VERSION`, `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`) that are not read by the current application runtime. Do not treat a reserved placeholder as an implemented configuration option. `CORS_ORIGINS` is the variable used by the code today.

Never commit real `.env` files, database passwords, OAuth client secrets, bearer tokens or elevated Supabase keys.

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

- `http://localhost:3000/api/v1/health`
- `http://localhost:3000/api/v1/auth/me`
- `DELETE http://localhost:3000/api/v1/account` (currently returns `501`; see below)
- `http://localhost:3000/api/v1/admin/users` (administrator only)
- `http://localhost:3000/api/v1/fixtures/{fixtureId}/events` (public accepted events)

## Administrator user management

`GET /api/v1/admin/users` returns registered application accounts, their authoritative role,
legacy request state, assigned competition scopes, valid scope choices, and the latest submitter
access audit fields. `PATCH /api/v1/admin/users/:userId/submitter-access` approves or rejects a
pending request, re-scopes an approved submitter, or revokes submitter access in one database
transaction.

Both operations require a synchronized `admin` account. Approving requires at least one existing
competition. A viewer can only be approved or rejected while their request state is `pending`;
`not_requested` and `rejected` accounts receive `409 SUBMITTER_REQUEST_NOT_PENDING`. Revocation
assigns `viewer`, records the request state as `rejected`, and removes all scope rows. Administrator
and disabled accounts are protected from this submitter-specific update, and administrators cannot
update themselves through this route.

## Checks

```bash
npm run lint --workspace=@sport-analytics/backend
npm run typecheck --workspace=@sport-analytics/backend
npm run test:unit
npm run test:api
npm run build --workspace=@sport-analytics/backend
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
npm run test:database:local
```

It starts an isolated container on `127.0.0.1:55432`, supplies the test-only connection, resets and
migrates the schema, seeds deterministic data, and runs the same database suite. To use an
intentionally manually managed isolated database instead, supply `DATABASE_URL_TEST` and run:

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

The backend is hosted on Azure App Service.

## Common problems

### Backend fails immediately with invalid environment configuration

Populate `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The environment schema validates these
values at startup.

### Account deletion returns `501 ACCOUNT_DELETION_UNAVAILABLE`

The backend intentionally uses publishable-only Supabase access. Supabase Auth administrative user
deletion requires elevated provider access, so the current runtime rejects account deletion before
changing deletion state. Do not replace the publishable key with an elevated key.

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
ChatGPT-Web[GPT-5.6 Sol] and Codex[GPT-5].
