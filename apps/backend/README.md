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
- access to the selected hosted PostgreSQL development database.

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

| Variable                   | Required by current runtime                 | Secret | Purpose                                                                                     |
| -------------------------- | ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | No (defaults to `development`)              | No     | Runtime mode: `development`, `test` or `production`.                                        |
| `PORT`                     | No (defaults to `3000`)                     | No     | HTTP listen port. Azure may provide this value.                                             |
| `CORS_ORIGINS`             | No (defaults to `http://localhost:5173`)    | No     | Comma-separated browser origins allowed by Express CORS middleware.                         |
| `SUPABASE_URL`             | Yes                                         | No     | Supabase project URL used by backend token verification.                                    |
| `SUPABASE_PUBLISHABLE_KEY` | Yes                                         | No     | Publishable key used with `supabase.auth.getUser(accessToken)`.                             |
| `DATABASE_URL`             | Required for database-backed routes/scripts | Yes    | PostgreSQL session-pooler connection string.                                                |
| `DATABASE_URL_TEST`        | Required for database integration tests     | Yes    | Dedicated isolated test PostgreSQL database. Must never point to development or production. |

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

## Checks

```bash
npm run lint --workspace=@sport-analytics/backend
npm run typecheck --workspace=@sport-analytics/backend
npm run test:unit
npm run test:api
npm run build --workspace=@sport-analytics/backend
```

Database integration tests require an isolated test database:

```bash
npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend
npm run test:database
```

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

Populate `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The environment schema validates these values at startup.

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

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
