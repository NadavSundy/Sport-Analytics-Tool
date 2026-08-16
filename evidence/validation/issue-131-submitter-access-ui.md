# Issue #131 submitter access request and status UI verification

**Date:** 16 August 2026
**Scope:** Authenticated submitter-access request, persisted status, feedback, and approved-state
frontend workflow.

## Implementation

The signed-in Account page now loads the shared current-user profile contract from:

```text
GET /api/v1/auth/me
```

It renders the server-owned state as follows:

| Persisted state | Account-page experience                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `not_requested` | Request action is available.                                               |
| `pending`       | Pending approval is shown and no request action is available.              |
| `approved`      | Approval is shown with a link to the scoped submission interface.          |
| `rejected`      | Rejected or revoked access is explained and a new review may be requested. |

The request action calls:

```text
POST /api/v1/submitter-access-requests
```

The control is disabled while the request is in progress. A successful response is validated
through `@sport-analytics/contracts`, shown as pending, and followed by a new current-user profile
read. A `409 Conflict` caused by an out-of-date eligible view also triggers a profile refresh, so a
pending or approved account cannot keep using a stale request action.

Signed-out users do not load application profile data. All frontend state remains an experience
control only; the backend continues to enforce authentication, approval, and competition scope.

## Automated verification

The shared contracts suite passed:

```text
5 files, 55 tests
```

This includes acceptance of the persisted `pending` request response and rejection of
`not_requested`, `approved`, or `rejected` endpoint results.

The complete frontend suite passed with the documented test-default API URL:

```text
8 files, 50 tests
```

The dedicated submitter-access suite contains seven tests covering:

- no account request while signed out;
- eligible request creation and progress;
- post-request profile refresh;
- pending state restored after remount;
- stale conflict recovery;
- approved and rejected/revoked states; and
- profile-contract and request failure feedback.

The focused browser suite passed in both configured projects:

```text
desktop-chromium: passed
mobile-chromium (Pixel 7): passed
```

It verifies keyboard request activation, pending state after a browser reload, no horizontal
overflow, and no serious or critical Axe findings.

The complete isolated backend API suite also passed:

```text
7 files, 44 tests
```

The complete repository quality gate passed with the documented test-default API URL:

```text
npm run check
```

This covered structure and formatting checks, all workspace linters and type-checkers, 26 backend
unit tests, the frontend and API suites above, all contract tests, OpenAPI validation, and all
production builds.

During integration verification, the submitter-access service was changed to create its default
database repository lazily. This prevents unrelated isolated API tests and routes from requiring a
database connection merely because the submitter-access router is registered.

## Acceptance criteria

- Eligible authenticated user can request access from the frontend — verified.
- Successful request displays pending — verified.
- API errors are clearly communicated — verified.
- Pending users cannot repeatedly submit requests — verified.
- Approved submitters do not see the request action — verified.
- Refreshing restores the persisted state — verified by component remount and browser reload.
- Relevant frontend tests cover request, pending, approved, rejected, loading, and error behaviour —
  verified.

## Related work

- Issue #120 — complete submitter access request workflow
- Issue #129 — persistence and request endpoint
- Issue #130 — current-user submitter status
- Issue #45 — administrator approval and scope management
- Issue #53 — approved-submitter event submission interface

## AI Declaration

The implementation and this verification record were generated, reviewed, tested, and edited with
the assistance of Codex[GPT-5].
