# Issue #66 secure account-deletion validation

> **Follow-up note (18 August 2026):** Production composition now enables the validated deletion
> state machine when an optional server-only Supabase secret is present. Without it, only the
> deletion route returns `501`; backend startup and unrelated routes remain available.

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
- frontend tests: 53 passed in 8 files, including the account page with both deletion and
  submitter-access controls;
- shared-contract tests: 57 passed in 5 files;
- OpenAPI lint: passed; and
- contracts, backend, and frontend production builds: passed.

The frontend production build reports the existing advisory that its approximately 539 kB
minified JavaScript chunk exceeds Vite's 500 kB warning threshold. This is not an account-deletion
failure.

The database was reset, migrated, and seeded successfully in the dedicated
`sport_analytics_test` database provided by a disposable PostgreSQL 16 Alpine container on
`localhost:5433`. The focused account-schema suite passed all 13 tests, including migration
round-trip and retention after tombstoning. The complete database suite then passed all 22 tests
across 5 files. The shared development and production databases were not reset or mutated.

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

## Follow-up regression validation

The 18 August correction adds coverage proving that:

- the backend environment remains valid without an elevated key;
- a configured server-only key selects the real deletion workflow rather than the `501` fallback;
- the Admin client performs hard deletion, treats `user_not_found` idempotently, and hides provider
  details on failure; and
- the deletion repository is initialized lazily, so enabling provider administration does not
  reintroduce an unrelated startup dependency.

`npm run check` passed with 73 backend unit tests, 78 backend API tests, 68 frontend tests, 68
contract tests, and 4 deployment-helper tests. Formatting, linting, type checking, OpenAPI linting,
and all production builds passed. The prepared backend deployment artifact also returned HTTP 200
from its health route both with and without `SUPABASE_SECRET_KEY` present.

The PostgreSQL integration suite was not rerun for this follow-up because Docker is unavailable on
the validation machine. This correction does not change the previously validated migration or SQL;
CI must rerun the existing database suite before merge.

## Known limitations and human checks

- Azure App Service must receive `SUPABASE_SECRET_KEY` for the same project as `SUPABASE_URL` before
  deployed deletion can satisfy the acceptance criteria.
- Supabase Storage objects owned by a user can block Auth deletion. The product currently creates no
  such objects; reassess this workflow before adding user-owned storage.
- A rare failure after Auth deletion and before any local success-stage write requires operator
  reconciliation of the already-disabled account.
- Gitea CI status must be recorded on the pull request; local results must not be presented as CI.

## AI Declaration

This implementation and validation record were prepared with the assistance of Codex[GPT-5].
