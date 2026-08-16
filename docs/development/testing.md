# Testing

```text
npm ci

npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend

npm run test:unit
npm run test:frontend
npm run test:api
npm run test:contracts
npm run test:database
npm run test:e2e
npm run test:coverage
npm run check
```

## Account and authorization coverage

The backend API suite covers missing, invalid and expired credentials; account synchronization;
the `/api/v1/auth/me` profile; disabled accounts; viewers; approved in-scope and out-of-scope
submitters; administrators; and anonymous public reads.

The PostgreSQL integration suite additionally verifies the migrated application-account schema:

- provider-neutral identity uniqueness;
- allowed role and approval-state constraints;
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
- already-approved submitters returning a conflict;
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
  submitter approval state; and
- frontend rejection of malformed current-user responses rather than inferring access from
  incomplete data.

Run the focused checks with:

````text
npm run build --workspace=@sport-analytics/contracts
npm run test --workspace=@sport-analytics/contracts
npm run test:unit --workspace=@sport-analytics/backend
npm run test:api --workspace=@sport-analytics/backend
npm run test --workspace=@sport-analytics/frontend

## Direct submission coverage

The contract and API suites cover the versioned delivery schema, anonymous and unapproved users,
in-scope and out-of-scope submitters, detailed invalid-event responses, the JSON payload limit, and
the per-account rate limit. PostgreSQL integration tests verify stored provenance, submitted order,
duplicate event-ID rejection, and full rollback when a later event conflicts after an earlier insert.

Run the focused checks with:

```text
npm run test --workspace=@sport-analytics/contracts
npm run test:api --workspace=@sport-analytics/backend
npm run db:test:reset --workspace=@sport-analytics/backend
npm run test:database --workspace=@sport-analytics/backend
npm run openapi:lint
````

The issue #51 verification record is in
`evidence/validation/issue-51-direct-event-submission.md` at the repository root.

## Submitter interface coverage

The frontend suite covers anonymous redirection, persisted unapproved access, competition-scoped
fixture selection, valid submissions, event- and field-specific validation results, invalid JSON,
and backend failures. Browser tests additionally verify keyboard order, focus movement to results,
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
ChatGPT-Web[GPT-5.6 Sol].
The account-deletion testing section was documented with the assistance of Codex[GPT-5].
