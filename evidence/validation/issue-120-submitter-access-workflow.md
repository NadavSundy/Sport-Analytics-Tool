# Issue #120 submitter access workflow verification

**Date:** 16 August 2026
**Scope:** Integrated submitter access request workflow across persistence, API contracts, current
user state, and frontend experience.

## Integrated workflow

Issue #120 is implemented by the three tracked delivery slices:

| Issue | Delivered capability                                                                                              | Verification                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| #129  | Conditional PostgreSQL transition to `pending`, authenticated request endpoint, and duplicate/approved conflicts. | `evidence/validation/issue-129-submitter-access-request.md`      |
| #130  | Persisted `not_requested`, `pending`, `approved`, and `rejected` state in the shared `/auth/me` contract.         | `evidence/validation/issue-130-current-user-submitter-status.md` |
| #131  | Account-page request action, persisted status views, refresh recovery, feedback, and approved submission link.    | `evidence/validation/issue-131-submitter-access-ui.md`           |

The current data model uses `rejected` for both rejected and revoked access where applicable. A
rejected/revoked account may request another review. Administrator approval, rejection, revocation,
and competition-scope assignment remain owned by issue #45.

## Acceptance matrix

| Feature acceptance criterion                                           | Result                                                                                                     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Authenticated non-approved user can request access                     | Verified by API and frontend tests.                                                                        |
| Request is persisted                                                   | Verified by the #129 PostgreSQL integration suite.                                                         |
| Duplicate active requests are prevented                                | Verified by conditional update, API conflicts, repository tests, and stale-UI refresh.                     |
| Current status is available to the frontend                            | Verified by the shared #130 current-user contract.                                                         |
| Frontend shows request, pending, approved, and rejected/revoked states | Verified by the #131 component and browser suites.                                                         |
| State survives refresh or a new authenticated session                  | Server-owned state is loaded on every Account-page mount; remount and browser reload tests pass.           |
| Request is consumable by administrator workflow                        | State is stored on the provider-neutral `app_user` record used by #45.                                     |
| Tests and API/contracts documentation are complete                     | Shared contract, backend API, frontend, browser, OpenAPI, security, and testing documentation are present. |

## Verification summary

- Shared contracts: 55 tests passed.
- Frontend: 50 tests passed.
- Backend API: 44 tests passed.
- Submitter-access browser workflow: desktop and mobile projects passed.
- Frontend and backend type-checking and linting passed.
- Complete repository `npm run check` quality gate passed.
- Shared request and current-user responses are runtime validated.
- The OpenAPI request endpoint and current-user schemas remain aligned with the shared contracts.

The PostgreSQL integration suite was not rerun for this UI slice because no database schema or
repository query changed. Persistence evidence and isolated-database results remain recorded under
issue #129; the shared development database was not used as a disposable test database.

## Out-of-scope work preserved

- Administrator review, approval, rejection, revocation, and scope assignment remain in #45.
- Submission validation and storage remain in #49–#51.
- The approved-submitter event interface remains in #53.
- Authentication provider implementation is unchanged.

## AI Declaration

This integration verification record was generated, reviewed, and edited with the assistance of
Codex[GPT-5].
