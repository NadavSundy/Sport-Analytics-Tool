# Issue #154 application-role verification

**Date:** 16 August 2026  
**Scope:** revised `viewer | submitter | admin` application roles, guarded legacy-data migration,
submission and administrator policies, frontend role gates, privilege-escalation protection,
documentation, and WSL frontend startup.

## Authorization model verified

- New synchronized accounts are inserted explicitly as `viewer`.
- `submitter` and `admin` are the only roles accepted by submission middleware.
- The submission service independently enforces the fixture's competition scope.
- Only `admin` passes administrator middleware.
- A viewer remains denied when the deprecated request state is `approved`.
- User-controlled Supabase metadata, registration payloads, and profile payloads cannot assign a
  role.
- Re-authentication does not overwrite the persisted role or competition scopes.
- `submitter_approval_state` remains temporarily as deprecated request-workflow data and is not
  used as a submission authorization source.

## Migration coverage

`database/migrations/20260816120000000_standardise-application-role.sql`:

- aborts before changing data when a `NULL` or unknown role exists;
- converts legacy `administrator` accounts to `admin`;
- converts legacy viewers with `submitter_approval_state = approved` to `submitter`;
- leaves ordinary viewers as `viewer`;
- preserves application-account identity and competition-scope rows;
- restores practical legacy values in the down migration; and
- replaces the constraint with exactly `viewer`, `submitter`, and `admin`, while preserving the
  non-null `viewer` default.

The PostgreSQL integration suite includes migration, rollback, unknown-value, role-default,
constraint, and scope-preservation cases. It could not run locally because the safety-checked test
database at `127.0.0.1:5433` was not running; the reset command stopped with `ECONNREFUSED` before
applying a schema change. Gitea CI is expected to provide PostgreSQL for this suite.

## Commands and results

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1 npm run check
```

Result: passed. This covered repository structure, formatting, lint, TypeScript checks, OpenAPI
validation, all production builds, and 196 non-database tests:

- 31 backend unit tests;
- 53 frontend tests;
- 51 backend API tests; and
- 61 shared-contract tests.

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1 npm exec playwright test \
  tests/e2e/submissions.spec.ts tests/e2e/submitter-access.spec.ts
```

Result: 6 Playwright tests passed across desktop and mobile Chromium, covering the role-gated
submission workflow, validation accessibility, and the submitter-access request flow.

```bash
npm install --include=optional
npm exec --workspace=@sport-analytics/frontend vite -- --version
timeout 12s npm run dev --workspace=@sport-analytics/frontend -- --host 127.0.0.1
```

Result: the already-locked Linux Rollup optional package was installed. Vite reported
`vite/5.4.21 linux-x64 node-v24.18.0` and the development server reached ready state in 697 ms on
`http://127.0.0.1:5174/`; port 5173 was already occupied. No dependency declaration or lockfile
change was required.

```text
python -m mkdocs build --strict --site-dir <temporary-directory>
```

Result: not run because `mkdocs` is not installed in either available Python environment. The
repository documentation files did pass the Prettier and link/navigation inputs exercised by
`npm run check`.

## Pull Request

[Pull Request #156](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/156) was
opened from `feat/154-application-roles` into `main`. CI and independent human review remain
required before merge.

## AI declaration

This implementation and verification record were produced with the assistance of Codex[GPT-5].
