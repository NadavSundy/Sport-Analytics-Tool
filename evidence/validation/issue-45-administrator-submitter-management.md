# Issue #45 administrator submitter management verification

**Date:** 16 August 2026

**Scope:** administrator-only user listing, submitter approval and revocation, competition-scope
assignment, audit fields, responsive management UI, frontend development command repair,
documentation, and automated tests.

## Implemented workflow

Authenticated administrators can use:

```text
GET /api/v1/admin/users
PATCH /api/v1/admin/users/{userId}/submitter-access
```

The list response shows each account's role, approval state, disabled state, effective competition
scopes, and most recent administrator access change. The update request uses one explicit shape:

```json
{
  "approved": true,
  "competitionIds": ["7"]
}
```

Approval changes the authoritative role to `submitter` and replaces the user's scope. Revocation
changes the role to `viewer` and removes every scope. The account, audit fields, and scope rows are
changed in one PostgreSQL transaction, so the next authenticated request observes the new effective
permissions.

## Security and validation

- Authentication and the server-owned `admin` role are enforced before both endpoints.
- Viewers and submitters receive `403`; unauthenticated callers receive `401`.
- Administrators cannot change themselves or another administrator through this workflow.
- Disabled accounts cannot be approved or re-scoped.
- Approval requires at least one unique, well-formed competition identifier.
- Every requested competition must exist; a missing scope returns a useful `422` response and the
  transaction is rolled back.
- Revocation rejects retained scopes and always clears existing scope rows.
- The acting application-account identifier and change time are retained as nullable audit fields.

## Frontend verification

The `/admin/users` page checks the current application role before loading management data. It
provides loading, forbidden, retry, empty, validation, progress, success, and API-error states.
Every competition control has a visible label, actions have visible focus treatment, and successful
updates replace the affected card immediately.

Playwright exercised approval, keyboard activation, scope replacement, and revocation in both
configured Chromium projects. Both runs also verified that the page has no horizontal overflow and
has no serious or critical Axe findings:

```text
desktop-chromium: passed
mobile-chromium (Pixel 7): passed
```

Captured interface evidence:

- [Desktop administrator card](issue-45-admin-users-desktop-chromium.png)
- [Mobile administrator card](issue-45-admin-users-mobile-chromium.png)

## Repository verification

```powershell
$env:VITE_API_BASE_URL='http://localhost:3000/api/v1'
npm run check
```

Result: passed. This covered the repository structure and formatting checks, every workspace
linter and type-checker, OpenAPI validation, every production build, and 222 non-database tests:

- 34 backend unit tests;
- 60 frontend tests;
- 64 backend API tests; and
- 64 shared-contract tests.

The PostgreSQL integration tests include real migration, approval, re-scope, invalid-scope rollback,
revocation, and audit assertions. They could not run locally because Docker is unavailable and the
safety-checked test PostgreSQL service at `127.0.0.1:5433` refused the connection before a migration
or reset occurred. Gitea CI remains responsible for running that suite against its PostgreSQL
service.

## Frontend development command repair

The root command now dispatches an optional application name instead of accidentally passing it to
Vite as a directory. The formerly broken form is supported:

```text
npm run dev frontend
```

`npm run dev frontend -- --help` exited successfully and showed `vite --help` from the frontend
workspace. `npm run dev backend` and additional arguments after `--` use the same cross-platform
dispatcher.

The reported WSL failure was also reproduced: a dependency tree installed on Windows did not
contain Rollup's lockfile-declared Linux native package. The repair was run from the user's Node
24.18.0/npm 11.16.0 WSL login shell with `npm install --include=optional`. npm initially encountered
stale NTFS/WSL target-directory state, so only the exact missing `@esbuild/linux-x64` and
`@rollup/rollup-linux-x64-gnu` directories were pre-created; no lockfile or source dependency was
deleted. The exact command from `apps/frontend` then reached Vite 5.4.21 ready state in 1067 ms at
`http://127.0.0.1:5175/`.

## Pull Request

[Pull Request #157](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/pulls/157) was
opened from `feat/45-admin-submitter-management` into the still-open prerequisite role branch
`feat/154-application-roles`. It should be retargeted to `main` after prerequisite Pull Request #156
merges. CI database verification and independent human review remain required.

## AI declaration

This implementation and verification record were generated, reviewed, tested, and edited with the
assistance of Codex[GPT-5].
