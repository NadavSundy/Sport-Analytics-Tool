# Issue #167 administrator user-management migration recovery

**Date:** 18 August 2026  
**Issue:** #167  
**Scope:** Restore administrator user management by bringing the configured shared development database schema in line with the committed backend requirements.

## Root cause

The administrator user-management implementation was already present in the repository, but the configured shared development database had not applied five committed migrations.

`GET /api/v1/admin/users` queried application-account fields introduced by those migrations, including:

- `app_user.updated_at`
- `app_user.submitter_access_updated_at`
- `app_user.submitter_access_updated_by`

Because the shared development schema was behind the backend repository requirements, authenticated administrator requests failed with an internal server error.

No compatibility fallback was added to the application code. The database was migrated to the schema expected by the current backend.

## Pre-migration verification

The database connection check passed against PostgreSQL 17.6.

A migration dry run identified exactly five pending migrations, in repository order:

1. `20260813190000000_direct-event-submission`
2. `20260815133241837_add-app-user-updated-at`
3. `20260816120000000_standardise-application-role`
4. `20260816160000000_account-deletion-tombstone`
5. `20260816190000000_add-submitter-access-audit`

Before applying them, a read-only preflight confirmed:

- 6 application accounts
- 4 competitions
- 1 submitter competition scope
- 4 submissions
- 955 deliveries
- existing application roles were `viewer`, `submitter`, or `admin`
- the existing `app_user_application_role_check` constraint accepted exactly `viewer`, `submitter`, and `admin`
- only the first three repository migrations were recorded as applied

The role-standardisation migration was therefore compatible with the existing account data and did not require guessing or remapping unsupported role values.

## Migration execution

The five pending migrations were applied to the configured shared development database using the repository migration command:

`npm.cmd run db:migrate --workspace=@sport-analytics/backend`

The migrations completed successfully in their committed order.

No migration file was edited and no ad-hoc compatibility schema or repository fallback was introduced.

## Result

After the migration, the shared development database contained the application-account schema required by the current backend, including:

- `app_user.updated_at`
- `app_user.submitter_access_updated_at`
- `app_user.submitter_access_updated_by`
- the application-account update timestamp trigger
- the submitter-access audit foreign key
- the submitter-access audit index
- all eight committed migrations applied

Existing application accounts, competition data, submissions, deliveries, and provenance were retained.

The administrator user-management page successfully loads registered users and available competition scopes again.

The authenticated administrator workflow is operational after migration.

## Authentication configuration discovered during validation

During browser validation, `/api/v1/auth/me` initially returned `401 Unauthorized`.

Investigation showed that the local frontend and backend `.env` files referenced different Supabase Auth projects.

The backend Auth configuration was corrected locally to use the same Supabase Auth project as the frontend.

After correcting the local configuration and restarting the development applications, authentication and the administrator page worked correctly.

This was a local environment configuration issue rather than the root cause of #167.

No `.env` files, authentication keys, database credentials, access tokens, or other secrets are included in this evidence.

## Automated verification

Frontend automated tests passed:

- 9 test files passed
- 65 tests passed

The dedicated PostgreSQL test database was reset and migrated through all eight committed migrations before testing.

Database integration tests passed:

- 7 test files passed
- 30 tests passed

The passing database suite included `admin-user-management.database.test.ts`, covering atomic administrator approval, competition re-scoping, revocation, and submitter-access audit information.

The dedicated test database was used for destructive integration testing. The shared development database was not used as the database-test target.

Other applicable project checks were also run successfully.

## Repository impact

No product-code change is required for #167 because the backend implementation and migrations required to resolve the defect were already committed before the issue was raised.

The defect was caused by deployment/schema drift between the repository migration state and the configured shared development database.

Developers using the same shared development database now receive the corrected schema centrally.

A developer using a separate database must apply the committed migrations using the repository's documented migration procedure.

## Follow-up observation

During validation, the database integration test command initially failed because `DATABASE_URL_TEST` was not loaded into the current process environment.

The test database itself was healthy. Once `.env.test` was loaded into the PowerShell process, all 30 database integration tests passed.

Any improvement to automatically load `.env.test` for `test:database` is a separate developer-experience concern and should not be mixed into #167.

## Security and privacy

Validation evidence records only aggregate counts and schema information.

No database credentials, Supabase keys, authentication tokens, account identifiers, email addresses, or personal account information are included.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
