# Issue #66 secure account-deletion validation

## Scope

Issue #66 adds permanent self-service account deletion across the handwritten API, Supabase Auth,
the provider-neutral application account, and the signed-in account page. Validation used only
mocked Auth administration and a placeholder browser configuration; no real user, Supabase Auth
identity, shared development database, or production system was mutated.

## Retention and security assertions

- The authenticated user can target only their own account; the endpoint accepts no account ID.
- The request requires the exact `DELETE` confirmation and a sign-in no more than 15 minutes old.
- The application account is disabled and its authorization grants are removed before the external
  Auth operation begins.
- Auth administration uses a backend-only secret and a hard-delete request; provider details and
  credentials are never returned in API errors.
- Partial failures remain disabled and record a recoverable stage. Retrying an already-completed
  Auth deletion is idempotent.
- Finalization clears the display name, replaces the external subject with a unique tombstone, and
  retains a one-way old-subject revocation marker so an unexpired JWT cannot create a new account.
- The stable `app_user_id`, submissions, fixtures, deliveries, derived statistics, and provenance
  relationships remain. The submission foreign key is still `NO ACTION`, not cascading.
- The migration down path refuses to discard revocation/deletion state once deletion has started.

## Automated validation

`npm run check` passed in full:

- repository structure and Prettier formatting: passed;
- backend, frontend, and shared-contract lint and type checking: passed;
- backend unit tests: 41 passed in 9 files;
- backend API tests: 50 passed in 8 files, including a disabled deletion-pending retry;
- frontend tests: 46 passed in 7 files;
- shared-contract tests: 53 passed in 5 files;
- OpenAPI lint: passed; and
- contracts, backend, and frontend production builds: passed.

The frontend production build reports the existing advisory that its approximately 535 kB
minified JavaScript chunk exceeds Vite's 500 kB warning threshold. This is not an account-deletion
failure.

The database suite is configured for a dedicated local test database whose name passes the
repository safety rule. Its PostgreSQL service was unavailable at `localhost:5433`, so migration
application and database integration execution were blocked with `ECONNREFUSED`. The new isolated
retention test typechecks and lints but still requires a running dedicated test database before
merge. The shared development and production databases were not reset or mutated.

MkDocs strict rendering could not run because MkDocs is not installed in the current Python
environment. OpenAPI and Markdown formatting checks passed.

## Rendered frontend validation

The in-app Browser loaded `http://127.0.0.1:5173/account` at the desktop viewport using placeholder
public Supabase settings. The route rendered the signed-out account card and navigation without a
blank page, framework overlay, or console warning/error. Activating the in-page `Login or Sign up`
link navigated to `/sign-in` and rendered the expected managed-authentication screen.

The signed-in deletion panel was not exercised against a live identity. React tests cover its
checkbox and exact-text confirmation, disabled/in-flight state, duplicate prevention, success and
error announcements, local Supabase sign-out, and navigation to the public home page.

## Known limitations and human checks

- Start the dedicated test PostgreSQL service, apply migrations to that database, and run
  `npm run test:database` before merge.
- A reviewer should confirm deployment secrets include `SUPABASE_SECRET_KEY` only on the backend.
- Supabase Storage objects owned by a user can block Auth deletion. The product currently creates no
  such objects; reassess this workflow before adding user-owned storage.
- A rare failure after Auth deletion and before any local success-stage write requires operator
  reconciliation of the already-disabled account.
- Gitea CI status must be recorded on the pull request; local results must not be presented as CI.

## AI Declaration

This implementation and validation record were prepared with the assistance of Codex[GPT-5].
