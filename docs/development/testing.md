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

Run the focused checks with:

```text
npm run test:api --workspace=@sport-analytics/backend
npm run test:unit --workspace=@sport-analytics/backend
npm run typecheck --workspace=@sport-analytics/backend
npm run lint --workspace=@sport-analytics/backend
npm run openapi:lint
```

The recorded issue #44 result is in
`evidence/validation/issue-44-authorisation-tests.md` at the repository root.

## AI Declaration

The account and authorization testing section was generated with the assistance of
Codex[GPT-5.6 Sol].
