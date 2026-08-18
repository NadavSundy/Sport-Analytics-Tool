# Issue #182 submitter-access transition validation

## Scope

Issue #182 separates rejection of a pending submitter request from revocation of already-approved
access and enforces the persisted role and approval-state lifecycle inside a locked PostgreSQL
transaction.

## Verified behaviour

- `POST /api/v1/admin/users/{userId}/submitter-access/rejection` changes a pending viewer to a
  rejected viewer and removes any defensive stale competition scopes; the admin UI uses this
  dedicated action rather than the revocation payload.
- Approval is limited to pending viewers; scope replacement is limited to approved submitters; and
  revocation is limited to approved submitters.
- Invalid lifecycle changes return `409 INVALID_SUBMITTER_ACCESS_TRANSITION` without changing role,
  approval state, competition scopes, or audit fields.
- Self-management, administrator targets, disabled targets, missing targets, authentication, and
  administrator authorization remain protected.

## Validation

On 2026-08-18, the complete `npm run check` gate passed with 72 backend unit tests, 68 frontend
tests, 81 backend API tests, 68 contract tests, and 4 deployment-helper tests, together with
repository structure, formatting, lint, type checks, OpenAPI lint, and all production builds.

The database suite was then run against a disposable PostgreSQL 16 cluster after reset, migration,
and seed. All 7 files and 33 database integration tests passed, including lifecycle success cases,
invalid-transition rollback snapshots, audit updates, and atomic competition-scope replacement.
