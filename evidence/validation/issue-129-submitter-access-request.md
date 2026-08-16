# Issue #129 submitter access request verification

**Date:** 16 August 2026  
**Scope:** authenticated submitter-access request persistence and API endpoint.

## Implementation

The implementation adds:

```text
POST /api/v1/submitter-access-requests
```

The route requires an authenticated Supabase identity and operates on the synchronized, provider-neutral application account.

Eligible approval-state transitions are:

```text
not_requested -> pending
rejected      -> pending
```

Existing `pending` requests and already-approved submitters are rejected with `409 Conflict`.

The repository uses a conditional PostgreSQL `UPDATE` so the eligibility condition is evaluated as part of the state change rather than through a separate read-then-write sequence.

## Automated verification

Focused API tests verify:

- unauthenticated requests return `401`;
- an authenticated account can create a pending request;
- the correct synchronized application account is supplied to the service;
- duplicate pending requests return `409`; and
- already-approved submitters return `409`.

Focused repository tests verify:

- the eligible transition uses the conditional database update;
- duplicate pending requests are rejected;
- approved accounts are rejected; and
- unsupported persisted states fail closed.

The focused API and repository suites passed locally.

The PostgreSQL integration suite additionally covers:

- persistence from `not_requested` to `pending`;
- prevention of a second active request;
- re-requesting after a previous rejection; and
- preservation of an already-approved state.

The local development machine does not currently have a configured isolated `DATABASE_URL_TEST`, so those database integration tests were not executed against the shared development database. The repository safety guard correctly refused to run them without a dedicated test database.

## Regression verification

After synchronizing the branch with the latest `origin/main`, the contracts package was rebuilt and the existing backend API suite passed.

The latest upstream changes included the approved-submitter frontend event-submission workflow and submission rejection-contract changes. They did not modify the #129 backend module.

## Related work

- Issue #120 — submitter access request workflow
- Issue #45 — administrator submitter approval and scope management
- Issue #43 — application account, role, approval and scope schema
- Issue #44 — account synchronization and role-based authorization

## AI Declaration

The implementation and this verification record were generated, reviewed and edited with the assistance of ChatGPT-Web[GPT-5.6 Sol].
