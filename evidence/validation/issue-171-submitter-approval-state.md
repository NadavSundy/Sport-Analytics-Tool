# Issue #171 Submitter Approval-State Validation

Date: 18 August 2026  
Branch: `fix/171-prevent-invalid-submitter-approval`

## Verified Behaviour

- `not_requested` and `rejected` viewers do not receive approval or competition-scope controls.
- A pending viewer can be approved with scope or rejected.
- An approved submitter can still be re-scoped or revoked.
- The backend evaluates the persisted role and approval state while the target row is locked.
- Direct approval attempts without a pending request return `409 SUBMITTER_REQUEST_NOT_PENDING`.

## Automated Verification

The complete `npm run check` passed with the documented frontend test API URL. This included:

- repository structure and formatting checks;
- workspace lint and TypeScript checks;
- 64 backend unit tests, including 8 approval-transition policy cases;
- 68 frontend tests, including 10 administrator-management cases;
- 77 backend API tests;
- 68 shared-contract tests;
- OpenAPI lint; and
- production builds for contracts, backend, and frontend.

The focused PostgreSQL integration case was added to
`apps/backend/tests/database/admin-user-management.database.test.ts`. It could not execute locally
because the configured safety-checked test database was unavailable at `localhost:5433`; the runner
failed with `ECONNREFUSED` before test setup or application queries ran.

## Evidence Boundary

The original incorrect interface is shown in the screenshots attached to Gitea Issue #171. This
record does not claim a new authenticated browser screenshot; automated component coverage verifies
the corrected control visibility for `not_requested`, `pending`, `approved`, and `rejected` states.
