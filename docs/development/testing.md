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
```

The issue #51 verification record is in
`evidence/validation/issue-51-direct-event-submission.md` at the repository root.

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

## AI Declaration

The account and authorization testing section was generated with the assistance of
Codex[GPT-5.6 Sol].
