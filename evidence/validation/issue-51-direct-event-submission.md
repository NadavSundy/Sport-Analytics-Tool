# Issue #51 direct event submission verification

## Scope

The implementation adds `POST /api/v1/submissions` for direct JSON delivery-event submissions.
Supabase bearer authentication, application-account approval, and server-owned competition scope are
enforced before storage. Approval and scope are checked again in the database transaction to close a
concurrent-revocation race.

## API evidence

See `docs/api/submissions.md` for a complete request and accepted provenance response. The endpoint
returns predictable `401`, `403`, `409`, `413`, `422`, and `429` errors. Public read routes retain
explicit anonymous access and are exercised by the same API suite.

## Database verification query

The following query demonstrates event-to-fixture, submission, submitter, timestamp, schema-version,
and submitted-order provenance:

```sql
SELECT
  d.delivery_id,
  d.source_event_id,
  d.submission_event_ordinal,
  i.fixture_id,
  d.submission_id,
  s.submitted_by,
  s.received_at,
  s.schema_version,
  s.status
FROM delivery d
JOIN innings i ON i.innings_id = d.innings_id
JOIN submission s ON s.submission_id = d.submission_id
WHERE d.source_event_id = '<accepted-event-uuid>';
```

This join is asserted directly in `apps/backend/tests/database/submission.database.test.ts`.

## Automated verification

Recorded locally on 13 August 2026:

```text
Contract tests: 4 files passed; 21 tests passed.
Backend API tests: 5 files passed; 30 tests passed.
Full non-database component suites: 18 files passed; 95 tests passed.
Backend and contract typechecks: passed.
Backend and contract lint: passed.
Production build (contracts, backend, and frontend): passed.
OpenAPI lint: valid (one repository-level ignored problem).
Prettier check for all changed implementation/documentation files: passed.
```

The PostgreSQL integration suite contains five tests across two files, including three new direct
submission cases for accepted provenance, mid-transaction conflict rollback, and duplicate event-ID
rejection. It requires the CI PostgreSQL 16 service and runs after `db:test:reset`; the local machine
used for this record had no PostgreSQL service, so database execution is left to the pull-request CI
rather than pointed at the hosted development database.

## Pull request

Implementation branch: `feat/51-approved-submitter-submissions`.

Add the Gitea pull-request URL here after the branch is pushed. The current environment could not
authenticate to the Gitea remote, so it did not create or modify a remote pull request.

## AI Declaration

The implementation and this verification record were produced with the assistance of
Codex[GPT-5.6 Sol].
