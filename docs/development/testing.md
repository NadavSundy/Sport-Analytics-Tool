# Testing

```text
npm ci

npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend

npm run test:unit
npm run test:frontend
npm run test:api
npm run test:contracts
npm run test:deployment
npm run test:database
npm run test:e2e
npm run test:coverage
npm run check
```

## Deployment workflow helper coverage

The deployment helper suite verifies that HTTP smoke checks accept a successful response only when
its expected content is present, retry transient HTTP failures, preserve the final status/body in a
terminal error and reject non-HTTP targets. The backend workflow additionally assembles its generated
runtime artifact and starts it for a health check before Azure deployment.

Run the helper unit suite with:

```text
npm run test:deployment
```

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
- an authenticated application account creating a `pending` request;
- the authenticated account being passed to the request service;
- duplicate `pending` requests returning a conflict;
- accounts with the legacy `approved` request state returning a conflict;
- eligible state changes being implemented as a conditional database update; and
- unsupported persisted approval states failing closed.

The PostgreSQL integration suite additionally verifies that `not_requested` and previously `rejected` accounts persist as `pending`, a second active request is rejected, and an already-approved account is not modified.

Run the focused checks with:

```text
npm run build --workspace=@sport-analytics/contracts
npm run typecheck --workspace=@sport-analytics/backend
npm exec --workspace=@sport-analytics/backend -- vitest run tests/api/submitter-access-request.test.ts
npm exec --workspace=@sport-analytics/backend -- vitest run tests/unit/submitter-access.repository.test.ts
npm run test:database --workspace=@sport-analytics/backend
```

Database integration tests require `NODE_ENV=test` and a dedicated `DATABASE_URL_TEST`. They must not be run against the shared development or production database.

## Current-user submitter status coverage

The current-user profile contract and authentication suites verify that `/api/v1/auth/me`
exposes persisted submitter-access state for authenticated application accounts.

Coverage includes:

- `not_requested`, `pending`, `approved`, and `rejected` approval states;
- shared runtime validation of the complete current-user response through
  `@sport-analytics/contracts`;
- API responses reflecting the synchronized account approval state;
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
- eligible users can request access and see an in-progress state;
- successful requests reload the persisted `pending` profile;
- a remount restores `pending` without offering another request;
- stale eligible views refresh after the backend reports an active-request conflict;
- `submitter` and `admin` roles receive submission access without a request action;
- a legacy `approved` request state on a viewer does not grant submission access;
- rejected or revoked users receive a clear state and may request another review; and
- malformed profiles and backend request failures produce safe, actionable feedback.

The request-response contract suite additionally verifies that only a persisted `pending` result is
accepted from the submitter-access endpoint. The browser suite verifies keyboard activation,
pending state after reload, narrow-screen overflow, and serious or critical Axe findings.

The administrator-management suites verify that `not_requested` and `rejected` viewers have no
approval or competition-scope controls, pending viewers can be approved or rejected, and approved
submitters can still be re-scoped or revoked. Backend policy, API, and PostgreSQL integration tests
also verify that a direct approval attempt without a pending request returns a conflict and cannot
bypass the state transition.

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

The public frontend suite covers anonymous access, known Basic fixture and participant results,
partial and empty fixtures, API failure and retry, related-record links, and contributing-event
traces. Its browser test additionally covers keyboard navigation, desktop and mobile overflow, and
serious or critical Axe findings.

Run the focused frontend checks with:

```text
npm run test --workspace=@sport-analytics/frontend
npm run test:e2e -- tests/e2e/statistics.spec.ts --workers=1
```

The issue #54 frontend verification and screenshots are recorded in
`evidence/validation/issue-54-public-statistics.md`.

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
