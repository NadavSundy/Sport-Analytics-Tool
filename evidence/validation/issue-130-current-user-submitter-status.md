# Issue #130 current-user submitter status verification

**Date:** 16 August 2026  
**Scope:** Persisted submitter approval and access-request state exposed through the authenticated current-user API.

## Implementation

The authenticated current-user endpoint:

```text
GET /api/v1/auth/me
```

returns the synchronized application account's persisted submitter approval state.

The supported states are:

```text
not_requested
pending
approved
rejected
```

The current application model uses `rejected` for rejected or revoked submitter access where applicable.

A shared `@sport-analytics/contracts` schema now defines the current-user profile response and submitter approval-state enum. The backend validates the `/auth/me` response against this shared contract, and the frontend consumes the same contract instead of maintaining a duplicate local definition.

## Automated verification

Shared contract tests verify:

- `not_requested` is accepted;
- `pending` is accepted;
- `approved` is accepted;
- `rejected` is accepted;
- unsupported approval states are rejected;
- the complete current-user response is validated; and
- duplicate competition-scope identifiers are rejected.

Backend API tests verify that `/api/v1/auth/me` returns the synchronized:

- `not_requested` state;
- `pending` state;
- `approved` state; and
- `rejected` state.

Backend repository unit tests verify that re-authentication updates allowed identity metadata without overwriting persisted:

- submitter approval state; or
- application role.

This protects approval state across a refreshed or newly authenticated session.

Frontend tests verify that:

- pending users remain blocked from submission;
- approved users receive their server-returned competition scope;
- the shared current-user response contract is consumed by the submission interface; and
- malformed or incomplete current-user responses fail safely instead of granting submission access.

## Regression verification

The branch was synchronized with the latest `origin/main` before final verification.

The repository quality gate:

```text
npm.cmd run check
```

passed locally.

This covers the configured:

- structure checks;
- formatting checks;
- linting;
- contracts build;
- TypeScript type-checking;
- backend unit tests;
- backend API tests;
- frontend tests;
- contracts tests;
- OpenAPI validation; and
- application builds.

The PostgreSQL integration suite:

```text
npm.cmd run test:database
```

was not executed locally because this development machine does not have a dedicated isolated `DATABASE_URL_TEST` configured.

The shared development database was not used as a disposable test database.

## Acceptance criteria

- Authenticated current-user API returns submitter/access-request state — verified.
- Pending requests are correctly reflected — verified.
- Approved submitters are correctly reflected — verified.
- State remains correct after re-authentication — protected by repository regression tests.
- Shared API contracts/types are updated — verified.
- Automated tests cover the relevant states — verified.

## Related work

- Issue #120 — submitter access request workflow
- Issue #129 — persist submitter access requests and implement request endpoint
- Issue #44 — account synchronization, profile API and role-based authorization
- Issue #45 — administrator submitter approval and scope management

## AI Declaration

The implementation and this verification record were generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
