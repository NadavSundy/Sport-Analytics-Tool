# Issue #43 application-account schema verification

**Date:** 15 August 2026  
**Scope:** provider-neutral application accounts, roles, submitter approval,
competition-scoped grants, constraints, indexes, migration rollback definition,
database documentation, and regression coverage.

## Implementation reconciliation

Issue #43's production schema was delivered incrementally by reviewed work that
landed before this verification task:

- the delivery-event migration introduced `app_user`, its provider-neutral
  identity key, timestamps, role column, and submission ownership;
- issue #44 / Pull Request #123 added the role and approval constraints,
  `last_authenticated_at`, `submitter_competition_scope`, its composite primary
  key, foreign keys, cascade rules, reverse lookup index, and down migration; and
- issue #51 / Pull Request #134 exercised approval and competition scope in the
  direct-submission path.

No existing applied migration was edited and no duplicate replacement migration
was introduced for issue #43.

## Added database verification

`apps/backend/tests/database/account-schema.database.test.ts` verifies against a
migrated isolated PostgreSQL test database that:

- required account, approval, scope, and timestamp columns exist and are not
  nullable;
- the account-authorisation migration applies, rolls back, and reapplies inside
  a dedicated temporary PostgreSQL schema;
- named checks, uniqueness constraints, foreign keys, primary keys, and scope
  indexes exist;
- one provider identity maps to one application account while the same subject
  may exist under a different provider;
- approval can be granted and revoked without replacing the authentication
  identity;
- unsupported roles and approval values are rejected;
- duplicate grants and invalid foreign-key references are rejected; and
- deleting an account or competition cascades to its grants.

Every mutating case runs inside a transaction that is rolled back, so the suite
does not leave test records behind.

## Commands and results

The following local checks are recorded after implementation:

```powershell
npx.cmd prettier --check apps/backend/tests/database/account-schema.database.test.ts `
  docs/database/access.md docs/development/testing.md `
  docs/requirements/sport-domain-definition.md `
  evidence/validation/issue-43-account-schema.md
npm.cmd run lint --workspace=@sport-analytics/backend
npm.cmd run typecheck --workspace=@sport-analytics/backend
npm.cmd run test:unit --workspace=@sport-analytics/backend
npm.cmd run test:api --workspace=@sport-analytics/backend
npm.cmd run structure:check
```

Result: passed.

- shared contracts build passed;
- backend typecheck and lint passed;
- 6 backend unit-test files passed with 18 tests;
- 6 backend API-test files passed with 34 tests; and
- the repository structure check passed with 24 required files.

The repository-wide `npm.cmd run format:check` remains blocked by the unrelated,
pre-existing `docs/deployment/azure-app-service-recovery.md`. That file was not
modified as part of issue #43.

`python -m mkdocs build --strict` could not run because MkDocs is not installed
in the local Python environment. The changed Markdown files passed the focused
Prettier check.

```powershell
npm.cmd run db:test:reset --workspace=@sport-analytics/backend
npm.cmd run test:database --workspace=@sport-analytics/backend
```

Result: passed against a local PostgreSQL 16 Docker container after exporting
`NODE_ENV=test` and `DATABASE_URL_TEST` into the Vitest process. All 3 database
test files and all 16 tests passed, including the 11 issue #43 tests and the
isolated migration apply/down/reapply round trip.

## Acceptance-criteria mapping

| Criterion                                    | Evidence                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| Account, role, approval, and scope migration | Existing reviewed migrations plus migrated-schema introspection test            |
| One account per Supabase identity            | Composite identity uniqueness test                                              |
| Approval can be granted and revoked          | Approval lifecycle database test                                                |
| Competition-scoped submitters                | Scope table, foreign keys, and direct-submission coverage                       |
| Invalid and duplicate records prevented      | Check, unique, primary-key, and foreign-key tests                               |
| Public reads require no account              | Existing issue #44 and #51 API regression suites                                |
| Migration and schema tests                   | Isolated apply/down/reapply round trip plus migrated public-schema verification |
| Database documentation                       | Testing, database-access, and sport-domain documents updated in this branch     |
| Pull Request review                          | Pending issue #43 Pull Request                                                  |

## Security and data safety

- No credentials, access tokens, or production identifiers are recorded.
- Database tests require `NODE_ENV=test`, a separate `DATABASE_URL_TEST`, and a
  database name containing `test`.
- No test or migration command targets the shared development database.
- Roles, approval, and scopes remain server-owned; authentication does not grant
  submission access.

## AI declaration

This verification suite and record were generated with the assistance of
Codex[GPT-5] and require human review before merge.
