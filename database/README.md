# Database

The `database/` directory contains team-controlled PostgreSQL schema artefacts used by the handwritten backend API. It is the repository entry point for migrations, deterministic seeds and human-readable database-model documentation.

```text
migrations/  Ordered schema changes managed with node-pg-migrate
seeds/       Deterministic development and integration-test data
schema/      Human-readable database/event-model documentation
```

## Boundary rule

Supabase is used to host PostgreSQL and Supabase Auth is used for managed identity. The application must not use generated Supabase data endpoints as its product API. Frontend application data flows through the handwritten backend HTTP API.

## Prerequisites

From the repository root:

- Node.js 20 or later;
- npm 10 or later;
- a configured `apps/backend/.env` when using the shared development database; and
- Docker Desktop or a compatible Docker Compose runtime only for the explicit `test:database:local` workflow.

Install dependencies with:

```bash
npm ci
```

For development-database work, create the backend environment file and populate the approved shared configuration. Never commit the real file or credentials.

### Windows PowerShell

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
```

### macOS / Linux / Git Bash

```bash
cp apps/backend/.env.example apps/backend/.env
```

See [`../docs/environment.md`](../docs/environment.md) for the authoritative environment-variable list.

## Verify the development connection

The project uses the Supabase PostgreSQL session pooler and the committed CA certificate. From the repository root:

```bash
npm run db:check --workspace=@sport-analytics/backend
```

Do not disable TLS certificate verification to work around a connection error. Do not copy database credentials into documentation or command history intended for evidence.

## Migrations

Migrations live in `database/migrations/` and are managed with `node-pg-migrate` through backend workspace scripts.

Useful commands from the repository root are:

```bash
npm run db:migrate:dry --workspace=@sport-analytics/backend
npm run db:migrate --workspace=@sport-analytics/backend
npm run db:migrate:down --workspace=@sport-analytics/backend
npm run db:migrate:create --workspace=@sport-analytics/backend -- <migration-name>
```

Migration rules:

- never edit a migration after it has been applied to a shared environment;
- create a new migration for each schema change;
- review constraints, indexes, ownership and data-retention impact;
- use the dry-run command before applying a risky migration where practical;
- coordinate shared-database migrations with the database workstream; and
- include rollback/recovery notes where the change could be destructive or difficult to reverse.

See [`migrations/README.md`](migrations/README.md) and [`../docs/database/overview.md`](../docs/database/overview.md) for detailed migration and schema guidance.

## Development seeding

The committed development seed is intentionally small and deterministic. Load it with:

```bash
npm run db:seed --workspace=@sport-analytics/backend
```

The seed writes to the database identified by the backend `DATABASE_URL`. Confirm the target before running it against any shared environment.

See [`seeds/README.md`](seeds/README.md) for the fixtures covered and seed expectations.

## PostgreSQL integration testing

Database integration tests are separate from the normal database-independent `npm run test` and `npm run check` quality gate.

The standard database-test command can provision a disposable local PostgreSQL 16 runtime automatically:

```bash
npm run test:database
```

The repository also provides an explicit Docker Compose workflow, which is the preferred local verification command when using the repository-managed PostgreSQL 16 container:

```bash
npm run test:database:local
```

That workflow:

1. starts an isolated PostgreSQL 16 container;
2. waits for it to become healthy;
3. supplies `NODE_ENV=test` and a test-only `DATABASE_URL_TEST`;
4. resets the test schema;
5. applies all migrations;
6. loads deterministic test data; and
7. runs the complete backend database integration suite.

The Docker database is isolated from the normal development database. Never alter the workflow to point at development or production data merely to make a test pass.

For a deliberately managed isolated test database, the backend also exposes:

```bash
npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:migrate --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend
npm run test:database
```

The database-test safety checks require a test environment and reject unsafe targets. Do not bypass them.

See [`../docs/development/testing.md`](../docs/development/testing.md) for the full testing policy, Docker lifecycle commands and safety behaviour.

## Dataset import

The full Cricsheet corpus is not the normal developer seed. Downloading and importing it is an explicit data workflow documented in [`../docs/development/setup.md`](../docs/development/setup.md) and [`../docs/data/cricsheet.md`](../docs/data/cricsheet.md).

The importer writes to the configured development `DATABASE_URL`; confirm team agreement, target and storage implications before a full import.

## Application account authorisation

`app_user.application_role` is server-owned, non-null, defaults to `viewer`, and accepts only `viewer`, `submitter`, or `admin`. The role is authoritative for application-wide submission and administrative capability. A `submitter` or `admin` must still have a matching row in `submitter_competition_scope` for a scoped event submission.

`submitter_approval_state` remains deprecated workflow data rather than an authorisation source. Current role/request transition behaviour is documented by the relevant migrations and backend access-control documentation.

## Related documentation

- [Database overview](../docs/database/overview.md)
- [Database schema](../docs/database/schema.md)
- [Database ERD](../docs/database/erd.md)
- [Database access and connection](../docs/database/access.md)
- [Testing guide](../docs/development/testing.md)
- [Backend API getting started](../apps/backend/README.md)

## AI Declaration

The preceding document was reviewed, expanded and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
