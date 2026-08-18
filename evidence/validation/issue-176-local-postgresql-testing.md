# Issue #176 — Local PostgreSQL Database Integration Testing Verification

## Scope

Issue #176 adds a repository-managed disposable PostgreSQL 16 environment for local database integration testing.

The recommended developer workflow is:

```bash
npm run test:database:local
```

> Windows PowerShell users may use `npm.cmd run test:database:local`.

The workflow automatically provisions and prepares an isolated PostgreSQL test database before running the complete database integration suite.

Developers do not need to:

- create a Supabase test project;
- share hosted test-database credentials;
- manually install or configure PostgreSQL;
- manually create or reset a test database;
- manually set `NODE_ENV=test`; or
- modify the application's normal Supabase development database.

## Test Environment

Verification was performed with:

- PostgreSQL image: `postgres:16`
- Docker Compose
- Test database: `sport_analytics_test`
- Test host: `127.0.0.1`
- Test port: `55432`
- Environment: `NODE_ENV=test`
- Test connection variable: `DATABASE_URL_TEST`

The PostgreSQL major version matches the PostgreSQL 16 service used by CI.

The local connection is:

```text
postgresql://test_user:test_password@127.0.0.1:55432/sport_analytics_test
```

These are repository-defined local test credentials and are not development or production secrets.

## Local Workflow

Running:

```bash
npm run test:database:local
```

performs:

```text
start PostgreSQL 16
        ↓
wait until PostgreSQL is healthy
        ↓
supply NODE_ENV=test
        ↓
supply local DATABASE_URL_TEST
        ↓
reset the test schema
        ↓
apply all current migrations
        ↓
load deterministic test seed data
        ↓
run the database integration suite
        ↓
report PASS / FAIL
```

The workflow does not require a local `.env.test` file for normal Docker-based testing.

## Clean-Database Verification

The existing disposable environment was first removed completely:

```bash
docker compose -f compose.test.yml down --volumes
```

This removed the test container, test volume, and Compose network.

The workflow was then run from the newly removed database state:

```bash
npm run test:database:local
```

The following stages completed successfully:

- PostgreSQL 16 container creation;
- PostgreSQL health check;
- schema reset;
- application of all current migrations;
- deterministic test seeding; and
- execution of the complete database integration suite.

The applied migration set included:

```text
20260806084503355_baseline
20260806150357535_delivery-event-schema
20260812120000000_account-authorisation
20260813190000000_direct-event-submission
20260815133241837_add-app-user-updated-at
20260816120000000_standardise-application-role
20260816160000000_account-deletion-tombstone
20260816190000000_add-submitter-access-audit
```

Final database-test result:

```text
Test Files  7 passed (7)
Tests       30 passed (30)

DATABASE INTEGRATION TESTS: PASS
```

All database integration test files executed rather than being skipped.

The executed files were:

```text
account-schema.database.test.ts
admin-user-management.database.test.ts
fixture-statistics.database.test.ts
public-events.database.test.ts
submission.database.test.ts
submitter-access-request.database.test.ts
transaction.database.test.ts
```

## Integration Coverage Verified

The successful database suite verifies:

- account and schema behaviour;
- administrator user management;
- submitter access requests;
- transaction commit and rollback;
- submission and provenance persistence;
- rollback after conflicting event persistence;
- public ordered-event reads; and
- fixture statistics.

## Repeatability Verification

The Docker container and volume were left in place after the clean run.

The same command was then executed again:

```bash
npm run test:database:local
```

The workflow again reset the schema, reapplied migrations, reloaded deterministic seed data, and executed the complete integration suite.

Result:

```text
Test Files  7 passed (7)
Tests       30 passed (30)

DATABASE INTEGRATION TESTS: PASS
```

This confirms that the workflow is repeatable and does not depend on state left by a previous test run.

## Database Safety

Destructive test-database operations continue to use `DATABASE_URL_TEST`, not `DATABASE_URL`.

The safety guard requires:

- `NODE_ENV=test`;
- `DATABASE_URL_TEST` to be present;
- a PostgreSQL connection URL;
- a database name that clearly identifies the target as a test database; and
- the test target not to resolve to the same host, port, and database as `DATABASE_URL`.

Localhost aliases such as:

```text
localhost
127.0.0.1
```

are normalised when comparing database targets.

This prevents equivalent development and test targets from being treated as different merely because credentials or localhost formatting differ.

## Safety-Test Verification

The strengthened database-safety tests passed:

```text
tests/unit/test-database-safety.test.ts
9 passed / 9
```

During this verification, the backend unit suite also passed:

```text
Test Files  13 passed (13)
Tests       59 passed (59)
```

Safety coverage includes rejection of:

- execution outside the test environment;
- a missing test database URL;
- non-PostgreSQL URLs;
- database names that do not clearly identify a test database;
- incidental `test` text inside a non-test database name;
- matching development and test targets;
- matching targets with different credentials; and
- matching localhost targets using different localhost aliases.

## Development Database Isolation

The normal application development connection remains:

```text
DATABASE_URL
```

Database integration tests use:

```text
DATABASE_URL_TEST
```

The Docker workflow supplies its own `DATABASE_URL_TEST` automatically.

Running:

```bash
npm run test:database:local
```

does not require developers to replace or reconfigure their normal Supabase `DATABASE_URL`.

The local integration-test workflow targets the dedicated Docker PostgreSQL database rather than the Supabase-hosted development database.

## NODE_ENV Handling

Developers previously had to manually configure `NODE_ENV=test` in some local database-test situations.

The supported database-test npm commands now set:

```text
NODE_ENV=test
```

automatically.

No manual terminal environment change is required for the supported workflow.

## Existing Commands

The existing command remains available:

```bash
npm run test:database
```

This runs the integration suite against an already-prepared `DATABASE_URL_TEST`.

The recommended local workflow is:

```bash
npm run test:database:local
```

This automatically provisions and prepares the local PostgreSQL environment before running the same integration suite.

Normal tests remain available through:

```bash
npm run test
```

Normal unit, frontend, API, contract, and deployment-helper testing does not require the disposable PostgreSQL workflow.

## Optional Non-Docker Test Database

Docker is the recommended local workflow, but developers may still use an intentionally prepared PostgreSQL test database.

The repository provides:

```text
apps/backend/.env.test.example
```

as configuration guidance for that optional route.

A manually prepared database can be prepared and tested with:

```bash
npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:migrate --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend
npm run test:database
```

Any manually supplied `DATABASE_URL_TEST` must point to a dedicated test database and must never target development or production.

## CI Compatibility

CI continues to provision its own temporary PostgreSQL 16 service.

CI does not depend on `compose.test.yml` or a developer's Docker Desktop installation.

CI provides:

```text
NODE_ENV=test
DATABASE_URL_TEST=postgresql://test_user:test_password@localhost:5432/sport_analytics_test
```

The CI preparation flow explicitly performs:

```text
reset
→ migrate
→ seed
→ database integration tests
```

The local and CI workflows therefore use the same PostgreSQL major version and the same underlying database reset, migration, seed, and test tooling while retaining separate provisioning mechanisms.

## Test Output

The local runner provides clear stage output:

```text
[1/5] Starting PostgreSQL 16 test database
[2/5] Resetting test database
[3/5] Applying database migrations
[4/5] Loading deterministic test seed
[5/5] Running database integration tests
```

Vitest uses verbose reporting for this workflow so individual database-test names are visible.

Automatic Pino HTTP request logging is disabled while `NODE_ENV=test`, keeping test results readable while preserving normal application logging outside the test environment.

## Documentation Updated

Issue #176 updated:

```text
README.md
apps/backend/README.md
apps/backend/.env.test.example
docs/development/setup.md
docs/development/testing.md
docs/development/technology-stack.md
```

The documentation explains:

- when Docker is required;
- when Docker is not required;
- how to verify Docker is running;
- how to run `npm run test:database:local`;
- what the command does;
- `DATABASE_URL` versus `DATABASE_URL_TEST`;
- local disposable PostgreSQL versus the Supabase development database;
- automatic `NODE_ENV=test`;
- the optional manually managed database workflow;
- how to stop the test container;
- how to remove the disposable volume;
- database safety protections;
- test-command differences; and
- troubleshooting.

Docker / Docker Compose and the official `postgres:16` image were also documented and motivated in the technology-stack documentation.

## Additional Verification

Backend lint passed:

```bash
npm run lint --workspace=@sport-analytics/backend
```

Backend TypeScript type-check passed:

```bash
npm run typecheck --workspace=@sport-analytics/backend
```

The normal repository test suite passed:

```bash
npm run test
```

The documentation site passed strict validation:

```bash
python -m mkdocs build --strict
```

The generated `site/` output was removed/restored after verification and was not included in the Issue #176 source changes.

Whitespace verification also passed:

```bash
git diff --check
```

## Latest-Main Integration

Additional team Pull Requests were merged while Issue #176 was being implemented.

The branch was synchronised with the latest `origin/main` before finalisation.

Concurrent changes relating to deployment tooling and deployment-test documentation were preserved while resolving the resulting conflicts.

Git reported no unresolved merge paths after the final sync.

## Verification Summary

| Verification                                  | Result         |
| --------------------------------------------- | -------------- |
| Docker Compose configuration                  | PASS           |
| PostgreSQL 16 provisioning                    | PASS           |
| PostgreSQL health check                       | PASS           |
| Clean-volume recreation                       | PASS           |
| Automatic `NODE_ENV=test`                     | PASS           |
| Automatic local `DATABASE_URL_TEST`           | PASS           |
| Test-schema reset                             | PASS           |
| Migration application                         | PASS           |
| Deterministic test seed                       | PASS           |
| Database test files                           | 7 / 7 passed   |
| Database tests                                | 30 / 30 passed |
| Repeatability run                             | PASS           |
| Database safety tests                         | 9 / 9 passed   |
| Backend unit tests during safety verification | 59 / 59 passed |
| Backend lint                                  | PASS           |
| Backend type-check                            | PASS           |
| Normal repository tests                       | PASS           |
| MkDocs strict build                           | PASS           |
| `git diff --check`                            | PASS           |
| Hosted Supabase test project required         | NO             |
| Manual PostgreSQL setup required              | NO             |
| Manual `NODE_ENV=test` required               | NO             |
| Shared test credentials required              | NO             |

## Remaining Independent Verification

Before Issue #176 is considered fully complete, at least one other team member must follow the documented workflow.

The verifier should:

1. pull the Issue #176 branch or merged change;

2. install/start Docker Desktop or another compatible Docker environment;

3. verify `docker compose` is available;

4. run:

   ```bash
   npm run test:database:local
   ```

5. confirm that PostgreSQL is provisioned automatically;

6. confirm that no manual Supabase/PostgreSQL test database setup was required;

7. confirm that all database integration tests execute; and

8. record the result on the Pull Request or Issue #176.

Expected result:

```text
Test Files  7 passed (7)
Tests       30 passed (30)

DATABASE INTEGRATION TESTS: PASS
```

## Final Result

The repository now provides a repeatable and isolated PostgreSQL 16 integration-test workflow through:

```bash
npm run test:database:local
```

The command provisions its own test database, prepares the schema and deterministic test data, executes the complete integration suite, and reports a clear result without requiring a hosted Supabase test database.

Implementation verification:

```text
PASS
```

Independent team-member verification remains to be recorded before Issue #176 is closed.

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
