# Database access and transactions

## Application database boundary

Application data is accessed through the handwritten backend and its repository layer.

The application-data path is:

```text
Frontend or API consumer
        ↓ HTTP
Handwritten Express API
        ↓
Service
        ↓
Repository
        ↓
pg
        ↓
PostgreSQL
```

The frontend does not access PostgreSQL directly and does not use generated Supabase Data API endpoints.

## Connection and configuration

The application uses the standard PostgreSQL `pg` driver.

The accepted connection approach remains the one recorded in ADR-003:

- `DATABASE_URL` is the application database connection-string source;
- the hosted development database is PostgreSQL on Supabase;
- the backend connects through the Supavisor session-mode pooler;
- TLS certificate verification remains enabled;
- the committed CA certificate is used from `apps/backend/certs/supabase-ca.crt`;
- generated PostgREST/Data API endpoints are not used for application data.

The reusable application pool is implemented in:

```text
apps/backend/src/database/pool.ts
```

Pool creation is lazy so importing a module does not itself establish a database connection.

## Database-access boundaries

SQL used by application features belongs behind repository boundaries.

The initial repository boundaries are:

| Application area    | Database source                           |
| ------------------- | ----------------------------------------- |
| Application account | `app_user`, `submitter_competition_scope` |
| Competition         | `competition`                             |
| Fixture             | `fixture`                                 |
| Fixture participant | `person`, `fixture_squad`, `team`         |

The participant repository maps the existing sport-domain schema to an application participant record. It does not introduce or require a separate `participant` table.

Controllers must remain thin and must not contain SQL.

Services may coordinate repositories and transaction boundaries, but direct application queries remain in repositories.

## Query execution

Repositories use the shared query executor:

```text
apps/backend/src/database/query.ts
```

Queries use PostgreSQL parameters such as:

```sql
WHERE fixture_id = $1
```

instead of interpolating input into SQL strings.

The query helper translates PostgreSQL failures into safe application database errors before they can cross the database-access boundary.

## Identifiers

PostgreSQL `bigint` identifiers are converted to strings when read into application records.

For example:

```sql
fixture_id::text AS "fixtureId"
```

This follows the shared API identifier convention and avoids unsafe JavaScript number conversion.

## Transactions

Atomic multi-step operations use:

```text
withTransaction()
```

from:

```text
apps/backend/src/database/transaction.ts
```

The helper:

1. checks out a client from the shared pool;
2. begins a transaction;
3. runs all supplied operations using the same client;
4. commits when all operations succeed;
5. rolls back when an operation fails; and
6. releases the checked-out client in all cases.

A service can therefore coordinate multiple repository operations without placing transaction logic inside individual repositories.

Conceptually:

```text
BEGIN
  repository operation A
  repository operation B
  repository operation C
COMMIT
```

If any operation fails:

```text
BEGIN
  repository operation A
  repository operation B
  failure
ROLLBACK
```

This supports the project requirement that multi-record acceptance is atomic: all related records are persisted or none are.

## Error handling

Raw PostgreSQL errors are translated into stable application-level database errors.

Current categories include:

```text
DATABASE_UNAVAILABLE
DATABASE_CONFLICT
DATABASE_REFERENCE_ERROR
DATABASE_CONSTRAINT_ERROR
DATABASE_OPERATION_FAILED
DATABASE_TRANSACTION_FAILED
```

Public API code must not expose raw PostgreSQL messages, connection strings, credentials, SQL fragments or internal driver details.

Feature-specific services and API middleware may translate these database errors further into the shared API error contract where appropriate.

## Connection cleanup

The application closes the shared PostgreSQL pool during graceful shutdown after it stops accepting new HTTP requests.

Checked-out transaction clients are released in a `finally` block so successful and failed operations both return their connection to the pool.

## Testing

Unit tests verify database error translation and application-account synchronization mapping.

Database integration tests verify the reusable transaction helper and application-account
authorisation schema against the isolated test database.

Run:

```text
npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend
npm run test:database
```

The transaction integration tests cover:

- successful commit; and
- rollback after a failed operation.

The account-schema integration tests cover:

- one application account per provider identity;
- provider-neutral identity mapping;
- valid role and submitter-approval values;
- approval and revocation updates;
- unique competition grants;
- invalid account and competition references; and
- cascade removal of grants when an account or competition is deleted.

## Scope

This database foundation does not implement public HTTP endpoints.

Competition, fixture and participant HTTP reads are implemented separately through the handwritten API and consume these repository boundaries.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol]. The application-account repository section was updated with the
assistance of Codex[GPT-5.6 Sol].
