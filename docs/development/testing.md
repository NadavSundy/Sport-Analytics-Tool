# Testing

The repository keeps fast application tests and PostgreSQL integration tests in separate suites.
The normal repository quality gate remains database-independent, while CI runs the database suite
as its own required step.

## Quick start

Install the committed dependency graph:

```bash
npm ci
npm run hygiene
npm run check
```

`npm run hygiene` is the local monorepo-maintenance gate. It runs Knip to detect unused files,
dependencies, exports and types, syncpack to enforce consistent dependency versions across npm
workspaces, and dependency-cruiser to detect circular dependencies and inappropriate source imports
across the frontend, backend and shared-contract boundaries. Use `npm run hygiene:knip`,
`npm run hygiene:dependencies` or `npm run hygiene:architecture` to run an individual validator.
The hygiene gate remains separate from `npm run check`, so adding it to remote automation can be
reviewed independently.

Run the complete backend test workflow with the default disposable PostgreSQL runtime:

```bash
npm run test:backend
```

Use the repository-managed Docker PostgreSQL environment instead with:

```bash
npm run test:backend:local
```

Run the database suite directly with:

```bash
npm run test:database
```

An explicit Docker Compose path is also available for parity with the CI PostgreSQL service:

```bash
npm run test:database:local
```

That command requires Docker Desktop or another runtime supporting `docker compose`. It does not
require a Supabase test project, shared test password, manually created database, local `.env.test`
file, or manually configured `NODE_ENV`.

The command automatically:

1. starts an isolated PostgreSQL 16 container;
2. waits for PostgreSQL to become healthy;
3. supplies `NODE_ENV=test`;
4. supplies a dedicated local `DATABASE_URL_TEST`;
5. resets the test schema;
6. applies all current database migrations;
7. loads the deterministic integration-test seed;
8. runs every test under `apps/backend/tests/database`; and
9. returns a non-zero exit code and clear failure output if any stage fails.

The local container uses the dedicated database `sport_analytics_test` on
`127.0.0.1:55432`. Port `55432` is used to reduce conflicts with PostgreSQL installations already
using the normal `5432` port.

Both local workflows are completely separate from the Supabase-hosted development database. Test
tooling never falls back to the normal `DATABASE_URL`.

## Test command overview

| Command                        | Purpose                                                                                         | PostgreSQL provisioning          | Docker required |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------- | --------------- |
| `npm run hygiene`              | Knip, syncpack and dependency-cruiser monorepo-maintenance validation                           | None                             | No              |
| `npm run hygiene:knip`         | Unused files, dependencies, exports and types across the monorepo                               | None                             | No              |
| `npm run hygiene:dependencies` | Dependency-version consistency across npm workspace manifests                                   | None                             | No              |
| `npm run hygiene:architecture` | Circular-dependency and documented source-boundary validation                                   | None                             | No              |
| `npm run test`                 | Unit, frontend, API, contract, and deployment-helper suites                                     | None                             | No              |
| `npm run test:backend`         | Backend unit, API, and PostgreSQL integration suites                                            | Automatic or `DATABASE_URL_TEST` | No              |
| `npm run test:backend:local`   | Complete backend suite using the repository-managed PostgreSQL 16 Docker container              | Automatic Docker connection      | Yes             |
| `npm run test:deployment`      | Deployment workflow helper tests                                                                | None                             | No              |
| `npm run test:database`        | Provision and run only the database suite, or use an explicitly configured isolated database    | Automatic or `DATABASE_URL_TEST` | No              |
| `npm run test:database:local`  | Provision, prepare, and run only database tests against the repository-managed Docker container | Automatic Docker connection      | Yes             |
| `npm run test:e2e`             | Playwright browser and accessibility tests                                                      | No dedicated database workflow   | No              |
| `npm run test:coverage`        | Current configured coverage suites                                                              | None                             | No              |
| `npm run check`                | Structure, format, lint, types, database-independent tests, OpenAPI, and production builds      | None                             | No              |
| `npm run test:ci`              | Normal tests, database integration tests, and browser tests                                     | CI supplies `DATABASE_URL_TEST`  | No              |

The backend workspace's ordinary command, `npm run test --workspace=@sport-analytics/backend`,
builds the shared contracts and runs only its unit and API suites. PostgreSQL tests run only through
`test:backend`, `test:backend:local`, `test:database`, or `test:database:local`, so a plain workspace
test cannot accidentally discover integration tests without a selected database workflow.

When `DATABASE_URL_TEST` is supplied, it must pass the safety checks and be reachable; the command
fails rather than falling back to another database. CI provisions its own PostgreSQL 16 service,
supplies that connection directly, and runs `npm run test:database` as an explicit step. Set
`DATABASE_TEST_VERBOSE=1` only when diagnostics from the default embedded server are needed.

## Deployment workflow helper coverage

The deployment helper suite verifies that HTTP smoke checks accept a successful response only when
its expected content is present, retry transient HTTP failures, preserve the final status/body in a
terminal error and reject non-HTTP targets. The backend workflow additionally assembles its generated
runtime artifact and starts it for a health check before Azure deployment.

Run the helper unit suite with:

```text
npm run test:deployment
```

## Local database lifecycle

The explicit Docker PostgreSQL container and its isolated test volume are reusable between runs.
Every `npm run test:database:local` invocation resets the schema before migrations and seeding, so
reusing the container does not make the tests depend on data from a previous run.

To stop the local database without deleting its volume:

```bash
docker compose -f compose.test.yml down
```

To stop it and remove all disposable test data:

```bash
docker compose -f compose.test.yml down --volumes
```

The next `npm run test:database:local` command recreates anything it needs.

## Database-test safety

Destructive database-test commands use `DATABASE_URL_TEST`, never `DATABASE_URL`.

The safety guard requires `NODE_ENV=test`, requires a PostgreSQL URL, requires the database name
to identify it clearly as a test database, and rejects a test connection that targets the same
host, port and database as `DATABASE_URL`. Localhost aliases such as `localhost` and
`127.0.0.1` are treated as the same host for this comparison.

The supported npm database-test commands set `NODE_ENV=test` automatically. Developers should
not need to change `NODE_ENV` manually in their terminal.

## Optional manually managed test database

The automatic `npm run test:database` workflow is the default. A developer may instead use another
dedicated PostgreSQL test database or the explicit Docker workflow.

In that case, supply a safe `DATABASE_URL_TEST` through the shell or approved local secret
configuration before running the database commands. The committed
`apps/backend/.env.test.example` documents the expected shape of this configuration; it contains
test-only examples and no real credentials.

Prepare an already configured test database with:

```bash
npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:migrate --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend
npm run test:database
```

`db:test:reset` is intentionally destructive and now performs only the schema reset.
Migration and deterministic seeding are separate commands so that each database operation has one
clear responsibility.

A manually managed test database must never point at development or production.

## Account and authorization coverage

The backend API suite covers missing, invalid and expired credentials; account synchronization;
the `/api/v1/auth/me` profile; disabled accounts; viewers; in-scope and out-of-scope submitters;
submitters denied from admin routes; admins allowed through administrator and permitted submission
policies; attempted role self-promotion; and anonymous public reads.

The PostgreSQL integration suite additionally verifies the migrated application-account schema:

- provider-neutral identity uniqueness;
- the `viewer | submitter | admin` role constraint and deprecated request-state constraint;
- approval and revocation transitions;
- automatic application-account update timestamps;
- competition-grant uniqueness and foreign keys;
- account-to-grant cascade behaviour; and
- the indexes required for account-first and competition-first scope lookups.

Account-deletion coverage verifies exact confirmation, recent authentication, owner-only targeting,
immediate disabling, authorization revocation, idempotent recovery across Auth/database partial
failures, local session clearing, and accessible loading/error states. The isolated PostgreSQL
retention test additionally proves that tombstoning preserves the stable account provenance key,
submission, fixture, delivery and derived run total; it also verifies the non-cascading submission
foreign key and guarded migration rollback.

Run the focused checks with:

```text
npm run test:api --workspace=@sport-analytics/backend
npm run test:unit --workspace=@sport-analytics/backend
npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:migrate --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend
npm run test:database --workspace=@sport-analytics/backend
npm run typecheck --workspace=@sport-analytics/backend
npm run lint --workspace=@sport-analytics/backend
npm run openapi:lint
```

The schema verification for issue #43 is recorded in
`evidence/validation/issue-43-account-schema.md`. The recorded issue #44 API-authorisation result is in
`evidence/validation/issue-44-authorisation-tests.md` at the repository root.

## Submitter access request coverage

The submitter-access API and repository suites cover:

- anonymous requests being rejected before request processing;
- an authenticated application account selecting an existing competition and creating a `pending`
  request;
- the authenticated account and competition identifier being passed to the request service;
- duplicate `pending` requests returning a conflict;
- accounts with the legacy `approved` request state returning a conflict;
- invalid or fixture-shaped request bodies being rejected;
- eligible state and requested-competition changes being implemented as one conditional database
  update; and
- unsupported persisted approval states failing closed.

The PostgreSQL integration suite additionally verifies that `not_requested` and previously
`rejected` accounts persist the selected competition with `pending`, nonexistent competitions do
not change account state, a second active request is rejected, and an already-approved account is
not modified.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run typecheck --workspace=@sport-analytics/backend
npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
npm exec --workspace=@sport-analytics/backend -- vitest run tests/unit/submitter-access.repository.test.ts
npm run test:database --workspace=@sport-analytics/backend
```

An explicitly configured database integration run requires `NODE_ENV=test` and a dedicated
`DATABASE_URL_TEST`. It must not run against the shared development or production database. With no
configured URL, the embedded disposable workflow described above is used. The supported scripts set
`NODE_ENV=test` automatically, and destructive operations validate that the target is isolated from
the development database.

## Current-user submitter status coverage

The current-user profile contract and authentication suites verify that `/api/v1/auth/me`
exposes persisted submitter-access state for authenticated application accounts.

Coverage includes:

- `not_requested`, `pending`, `approved`, and `rejected` approval states;
- shared runtime validation of the complete current-user response through
  `@sport-analytics/contracts`;
- API responses reflecting the synchronized account approval state and named requested competition;
- account re-authentication updating identity metadata without overwriting persisted role or
  submitter approval state;
- current-user resolution during the ordered role and account-deletion migration rollout, including
  legacy approved submitters and administrators;
- frontend rejection of malformed current-user responses rather than inferring access from
  incomplete data;
- explicit unauthenticated and server-error status states; and
- a successful retry after a transient status-loading failure.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run test --workspace=@sport-analytics/contracts
npm run test:unit --workspace=@sport-analytics/backend
npm run test:api --workspace=@sport-analytics/backend
npm run test --workspace=@sport-analytics/frontend
```

## Submitter access frontend coverage

The Account-page suite verifies the complete user-facing request workflow:

- signed-out users do not load application account data;
- eligible users load and select competitions rather than fixtures before requesting access;
- successful requests reload the persisted `pending` profile and named requested competition;
- a remount restores `pending` without offering another request;
- stale eligible views refresh after the backend reports an active-request conflict;
- `submitter` and `admin` roles receive submission access without a request action;
- a legacy `approved` request state on a viewer does not grant submission access;
- rejected users receive a clear state and may request another review, while revoked viewers retain
  the historical approved decision without submission access; and
- malformed profiles and backend request failures produce safe, actionable feedback.

The request-response contract suite additionally verifies the competition-scoped request and that
only a persisted `pending` result with a named requested competition is accepted from the
submitter-access endpoint. The browser suite verifies keyboard selection and activation,
pending state after reload, narrow-screen overflow, and serious or critical Axe findings.

The administrator-management suites verify that `not_requested` and `rejected` viewers have no
approval or competition-scope controls, pending viewers expose a read-only requested competition
that must be granted exactly, legacy pending rows without a competition cannot be approved, and
approved submitters can still be re-scoped or revoked. Rejection coverage includes in-progress, success,
authentication, authorisation, conflict, and validation feedback. The administrator browser
scenario activates rejection from the keyboard at desktop and mobile widths, checks the immediate
persisted-state update and horizontal overflow, and scans the result for serious or critical Axe
findings. Backend policy, API, and PostgreSQL integration tests
also verify that a direct approval attempt without a pending request, or approval with a different
competition, returns a conflict and cannot bypass the state transition. Direct-submission database
coverage separately proves that persisted role and competition grants are both required, permitting
an in-scope fixture and rejecting an out-of-scope fixture.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run test --workspace=@sport-analytics/contracts
npm run test --workspace=@sport-analytics/frontend
npm run test:e2e -- tests/e2e/submitter-access.spec.ts --workers=1
```

## Direct submission coverage

The contract and API suites cover the versioned delivery schema, anonymous users and viewers,
in-scope and out-of-scope submitters, permitted admin submission, detailed invalid-event responses,
the JSON payload limit, and
the per-account rate limit. PostgreSQL integration tests verify stored provenance, submitted order,
duplicate event-ID rejection, and full rollback when a later event conflicts after an earlier insert.

Run the focused checks with:

```text
npm run test --workspace=@sport-analytics/contracts
npm run test:api --workspace=@sport-analytics/backend
npm run db:test:reset --workspace=@sport-analytics/backend
npm run test:database --workspace=@sport-analytics/backend
npm run openapi:lint
```

The issue #51 verification record is in
`evidence/validation/issue-51-direct-event-submission.md` at the repository root.

## Submitter interface coverage

The frontend suite covers anonymous redirection, role-denied viewers, submitter/admin role gates,
competition-scoped fixture selection, valid submissions, event- and field-specific validation
results, invalid JSON, and backend failures. Browser tests additionally verify keyboard order,
focus movement to results,
error association, narrow-screen overflow, and serious or critical Axe findings.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run test --workspace=@sport-analytics/frontend
npm run test:e2e -- tests/e2e/submissions.spec.ts --workers=1
```

## Accepted event correction coverage

The correction frontend suite covers the submitter/admin presentation gate, prefilled event values,
readable participant labels, event-only request payloads, field-associated validation, denied or
revoked scope, refreshed event values, and a fresh fixture-statistics request after success. The
browser suite runs success, validation failure, and viewer denial at the configured desktop and
Pixel 7 widths. It additionally checks keyboard submission and result focus, horizontal overflow,
and serious or critical Axe findings on the successful workflow.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run test --workspace=@sport-analytics/frontend -- --run src/features/submissions/SubmissionPage.test.tsx
npm run test:e2e -- tests/e2e/corrections.spec.ts --workers=1
```

## Fixture statistics coverage

The Basic fixture-statistics suite includes a manually verified golden fixture, deterministic replay,
accepted-revision repository checks, anonymous API access, stable statistic detail lookup, opt-in
event traces, incomplete-data behaviour and shared contract validation.

Run the focused checks with:

```text
npm run test:unit --workspace=@sport-analytics/backend
npm run test:api --workspace=@sport-analytics/backend
npm run test --workspace=@sport-analytics/contracts
```

The public frontend suite covers automatic anonymous loading in the match overview, known Basic
innings and player results, participating players, partial and empty fixtures, independently handled
statistics failure and retry, readable related-record links, and contributing-event traces. Its
browser test additionally covers the combined overview without a separate statistics action,
keyboard trace navigation, Day Match and Night Match behavior, desktop and mobile overflow, and
serious or critical Axe findings.

Run the focused frontend checks with:

```text
npm run test --workspace=@sport-analytics/frontend
npm run test:e2e -- tests/e2e/statistics.spec.ts --workers=1
```

The issue #54 frontend verification and screenshots are recorded in
`evidence/validation/issue-54-public-statistics.md`.

## Participant fixture-history coverage

The public player fixture-history suites cover anonymous pagination, participant-bound cursors,
readable competition and team context, squad participation, correct fixture association for batting
and bowling figures, null figures for a selected player who did not bat or bowl, partial and missing
published-statistic states, privacy-safe responses, and consistency with the existing fixture
statistics derivation rules.

The frontend page suite additionally covers the player heading with independently loading,
error/retry, empty, and cursor-paginated match history; named fixture, competition, season, and team
links; reused batting and bowling figures; partial-data notices; and unavailable figures. The
Playwright player journey runs at desktop and Pixel 7 sizes, opens the player and complete fixture
overview by keyboard within three purposeful interactions, exercises both themes and 200 percent
desktop reflow, checks horizontal overflow, and scans for serious or critical Axe findings.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm exec --workspace=@sport-analytics/backend -- vitest run tests/unit/public-read.service.test.ts
npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/public-read.test.ts
npm run test --workspace=@sport-analytics/contracts
npm run test:database --workspace=@sport-analytics/backend
npm run openapi:lint
```

## Readable collection-filter coverage

The public collection filter suites cover the shared competition, season, fixture, team, and player
name-combobox pattern; fuzzy typing; opening without text; direct and keyboard selection; dismissal;
individual and parent-dependent clearing; readable routed summaries; validation; option loading;
no-match, request-failure, and retry states; and the resulting handwritten-API requests. The browser
suite runs the interaction in Day Match and Night Match at the configured desktop and mobile sizes
and scans the rendered page for serious or critical Axe findings.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run test --workspace=@sport-analytics/frontend -- --run src/features/browse/NameCombobox.test.tsx src/pages/PublicBrowsePages.test.tsx
npm run test:e2e -- tests/e2e/public-browsing.spec.ts --workers=1
```

## Related public detail-overview coverage

The competition, season, and team detail-page suites verify readable related seasons, fixtures,
teams, and players; season-grouped competition fixtures; direct fixture-overview links; fixture-first
season content; independent loading, empty, error, retry, and cursor-pagination states; and the
absence of visible technical identifiers and backend resource terminology. The public-browsing
browser suite follows the competition-to-season-to-fixture journey in three keyboard activations,
visits the team overview, checks desktop and mobile overflow, and scans the result for serious or
critical Axe findings.

Run the focused checks with:

```text
npm run test --workspace=@sport-analytics/frontend -- --run src/pages/PublicBrowsePages.test.tsx
npm run test:e2e -- tests/e2e/public-browsing.spec.ts --workers=1
```

## Connected public-data journey coverage

The issue #199 browser verification treats the completed competition, season, fixture, team,
player, statistics, and calculation-trace redesign as connected tasks. The public-browsing journey
starts at Competitions and reaches a season and complete fixture overview in three keyboard
activations, then starts at Teams and reaches the same inline statistics in two. The player journey
starts at Players and reaches the player overview, named match, inline statistics, and calculation
trace in three keyboard activations.

Both journeys run in desktop and Pixel 7 Chromium. Day Match and Night Match are selected and
checked independently; each representative view is audited for readable headings, labels, facts,
filters, links, and messages, horizontal overflow, and serious or critical Axe findings. The
interaction matrix, command results, screenshot index, usability walkthrough, and deliberately
deferred follow-up are recorded in `evidence/validation/issue-199-public-data-journeys.md`.

Run the focused checks with:

```text
npm run test:e2e -- tests/e2e/public-browsing.spec.ts tests/e2e/player-overview.spec.ts --workers=1
```

## Public homepage coverage

The issue #314 component suite verifies the approved headline, primary and secondary actions,
existing public route targets, principle and event-derivation content, implemented API paths, the
no-fetch static page, and the intentional fallback used when WebGL is unavailable or reduced motion
is selected.

The browser suite runs at the configured desktop and Pixel 7 widths. It checks Day Match and Night
Match, semantic heading and navigation content, keyboard entry into Fixtures, serious or critical
Axe findings, page-level horizontal overflow, 200 percent desktop reflow, reduced motion without a
Three.js canvas or running fallback animation, and the WebGL-unavailable fallback. The production
build output is also inspected to confirm that `HeroScene` and Three.js remain outside the initial
application chunk. Lifecycle coverage holds the StrictMode scene open beyond its initial animation,
checks that it pauses off-screen and disposes on navigation, and deliberately loses and restores the
WebGL context to verify that the static fallback replaces the canvas presentation without creating a
second canvas.

Run the focused checks with:

```text
npm run test --workspace=@sport-analytics/frontend -- --run src/features/home/HomePage.test.tsx src/App.test.tsx
npm run test:e2e -- tests/e2e/homepage.spec.ts tests/e2e/smoke.spec.ts tests/e2e/accessibility.spec.ts --workers=1
npm run build --workspace=@sport-analytics/frontend
```

## Basic end-to-end acceptance workflow

The Sprint 2 Basic acceptance workflow verifies the completed user journeys across three separate
layers rather than treating browser mocks alone as full integration proof:

1. Playwright verifies the user-visible browser journeys in desktop Chromium and the Pixel 7
   Chromium profile.
2. The backend API suite verifies the handwritten HTTP boundary, validation and authorization.
3. The PostgreSQL integration suite verifies persistence, competition scope, provenance,
   corrections and statistic refresh against a real isolated PostgreSQL database.

From a prepared repository, run:

```text
npm run test:e2e
npm run test:api
npm run test:database:local
npm run check
```

On Windows PowerShell installations where script execution blocks the npm or npx PowerShell
wrappers, use:

```text
npm.cmd run test:e2e
npm.cmd run test:api
npm.cmd run test:database:local
npm.cmd run check
```

Playwright requires its managed Chromium installation. The browser suite builds and previews the
frontend automatically and runs the complete `tests/e2e/` suite against both configured browser
projects.

The Docker database workflow requires Docker with Compose support. It provisions the dedicated
PostgreSQL 16 test database `sport_analytics_test` on `127.0.0.1:55432`, resets it, applies current
migrations, loads deterministic seed data and runs every database integration test. It must never
be redirected to development or production data.

`npm run check` remains the database-independent repository quality gate; the explicit database and
browser commands are therefore retained as separate acceptance steps.

A genuine product defect discovered during formal acceptance testing must be logged as a separate
bug issue and linked to the acceptance work rather than silently fixed or hidden inside the
acceptance issue.

The executed Issue #272 environment, acceptance-criteria traceability, command results and
test-maintenance investigation are retained in
`evidence/validation/issue-272-basic-e2e-acceptance.md`.

## AI Declaration

The account and authorization testing section was generated with the assistance of
Codex[GPT-5.6 Sol]. The submitter interface coverage was documented with the assistance of
Codex[GPT-5.6 Sol].
The current-user submitter status coverage section was generated with the assistance of
ChatGPT-Web[GPT-5.6 Sol] and updated for issue #166 with the assistance of Codex[GPT-5.6 Sol].
The account-deletion testing section was documented with the assistance of Codex[GPT-5].
The submitter access frontend coverage section and corrected code fences were updated with the
assistance of Codex[GPT-5].
The deployment workflow helper coverage was documented with the assistance of Codex[GPT-5].
The disposable PostgreSQL workflow and Basic vertical-slice check integration were documented with
the assistance of Codex[GPT-5].
The disposable local PostgreSQL testing workflow, command guidance and database-test safety
documentation were added with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The readable collection-filter coverage was documented with the assistance of
Codex[GPT-5.6 Sol].
The related public detail-overview coverage was documented with the assistance of
Codex[GPT-5.6 Sol].
The combined match-overview coverage was documented with the assistance of Codex[GPT-5.6 Sol].
The public player-overview coverage was documented with the assistance of Codex[GPT-5.6 Sol].
The connected public-data journey coverage was documented with the assistance of
Codex[GPT-5.6 Sol].
The issue #255 competition-scoped submitter access coverage was documented with the assistance of
Codex[GPT-5].
The accepted-event correction coverage was documented with the assistance of
Codex[GPT-5.6 Sol].
The issue #314 homepage component, browser, accessibility, fallback and bundle coverage was
documented with the assistance of Codex[GPT-5.6 Sol].
The Basic end-to-end acceptance workflow was documented with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
