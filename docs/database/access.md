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

### Statement execution bound

`DATABASE_STATEMENT_TIMEOUT_MS` bounds how long one PostgreSQL statement may run before the server
cancels it. It must be between 1000 and 120000 milliseconds. The backend defaults to 15000 and the
asynchronous worker declares the same variable in its own configuration with a default of 60000.

The bound is applied as a `pg` pool option, which the driver sends as a PostgreSQL startup
parameter, so every connection a pool opens carries it and no per-statement configuration is
required. It may only be configured through the pool: it must not be placed in `DATABASE_URL` or in
`PGOPTIONS`, because committed migrations, operator scripts and the PostgreSQL integration tests
legitimately run longer than any application statement and must remain unbounded.

A statement that exceeds the bound is cancelled by PostgreSQL with SQLSTATE `57014`. The driver
reports it as a rejected query, `translateDatabaseError` reports it as `DATABASE_STATEMENT_TIMEOUT`,
and the API returns `503` with that code. The condition is temporary, so a caller may retry with
bounded backoff. The connection itself remains usable; only the statement is lost. A cancellation
inside a transaction aborts that transaction, and `withTransaction()` rolls it back.

The floor exists because the bound must stay above ordinary work: one warm round trip to the hosted
database is approximately 183 ms and a request makes several. A value of zero is rejected because
`pg` omits a falsy `statement_timeout` from the connection handshake, which would leave the session
inheriting the server default of no bound at all. The ceiling exists so the protection may not be
configured away.

The backend default is approximately 2.7 times the slowest response the platform has been measured
producing, a deployed participant-aggregate P95 of 5,588 ms recorded in
`evidence/sprints/sprint-3/issue-599-performance-revalidation.md` (§10.2). That response comprises
more than one statement, so the bound does not cancel any measured statement. The condition the
bound exists to contain is also measured: a participant aggregate planned before `ANALYZE` reached
its tables took minutes, which against a ten-connection pool is an exhausted pool rather than a slow
request.

Batch ingestion and the asynchronous worker are confirmed unaffected and require no per-session
override. Every worker statement is already bounded by a page or a chunk: release snapshot
materialisation and release page reads process 10,000 rows per statement behind a keyset cursor,
batch publication defaults to 100 items per chunk with `BATCH_CHUNK_SIZE` capped at 2,000, and the
outbox relay is capped at 100 rows by `OUTBOX_BATCH_SIZE`. The longest measured worker job is 16.2 s
of wall clock spread across many such statements (§8.6 of the same record), so no worker statement
approaches the 60000 ms worker default.

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
- the `viewer` default and the `viewer | submitter | admin` role constraint;
- guarded migration of approved submitters and legacy `administrator` accounts without coercing
  unknown roles or losing competition scopes;
- valid submitter-approval values;
- approval and revocation updates;
- automatic application-account update timestamps;
- unique competition grants;
- invalid account and competition references; and
- cascade removal of grants when an account or competition is deleted.

Account deletion does not execute `DELETE FROM app_user`. It updates the account through a
fail-closed deletion state machine and removes its scope rows. `submission.submitted_by` remains a
non-cascading foreign key so accepted submissions, deliveries, statistics, and provenance survive
the personal-account deletion request. A rollback guard prevents removal of the deletion columns
after any account has entered that lifecycle.

## Scope

This database foundation does not implement public HTTP endpoints.

Competition, fixture and participant HTTP reads are implemented separately through the handwritten API and consume these repository boundaries.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol]. The application-account repository section was updated with the
assistance of Codex[GPT-5.6 Sol].
