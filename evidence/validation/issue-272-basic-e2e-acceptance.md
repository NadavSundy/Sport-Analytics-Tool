# Issue #272 Basic integration and end-to-end acceptance

**Date:** 2026-08-30  
**Branch:** `test/272-basic-e2e-acceptance`

## Purpose

Verify the completed Basic product as connected user journeys across the browser, handwritten API
and PostgreSQL persistence layers. The acceptance workflow covers public browsing and statistics,
authentication and submitter access, competition-scoped submission, file upload, rejected and
revoked access transitions, event correction, statistic refresh, filtered export and representative
failure paths.

Browser tests validate user-visible behaviour against deterministic API responses. API tests verify
the handwritten HTTP boundary independently, while PostgreSQL integration tests verify the
persistence, authorization, provenance, correction and derivation behaviour against a real isolated
database.

## Verification environment

The acceptance run was executed locally on Windows PowerShell with:

| Component                    | Version / configuration                         |
| ---------------------------- | ----------------------------------------------- |
| Node.js                      | `v24.14.0`                                      |
| npm                          | `11.9.0`                                        |
| Playwright                   | `1.62.1`                                        |
| Browser projects             | Desktop Chromium and Pixel 7 Chromium           |
| Docker                       | `29.7.2`                                        |
| Docker Compose               | `v5.3.1`                                        |
| Database integration runtime | Repository-managed PostgreSQL 16 test container |
| Test database                | `sport_analytics_test` on `127.0.0.1:55432`     |

PowerShell script execution on the verification machine blocks the `npm.ps1` and `npx.ps1`
wrappers, so the equivalent committed commands were executed through `npm.cmd` and `npx.cmd`.

## Acceptance-criteria traceability

| Acceptance criterion                                                                         | Verification evidence                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browser tests cover a representative public browse-to-statistics journey                     | `tests/e2e/public-browsing.spec.ts` exercises competition, season, team, filtering, pagination and keyboard browsing. `tests/e2e/statistics.spec.ts` opens the fixture overview, published statistics and calculation trace.                                                                                                                           |
| Browser/API tests cover submitter access request, approval and competition-scoped submission | `tests/e2e/submitter-access.spec.ts`, `tests/e2e/admin-users.spec.ts` and `tests/e2e/submissions.spec.ts` cover the user-facing request, administration and submission workflows. Backend API tests verify approval, revocation, competition scope and authorization at the handwritten API boundary. Database tests verify the persisted scope rules. |
| File-based submission is covered                                                             | `tests/e2e/submissions.spec.ts` covers an accepted JSON upload and rejected CSV row with accessible feedback. API tests cover file normalization and validation, while `apps/backend/tests/database/submission.database.test.ts` verifies stored JSON source-file provenance.                                                                          |
| A rejected or revoked user re-request scenario is covered                                    | Browser coverage verifies administrator rejection and revocation. `apps/backend/tests/database/submitter-access-request.database.test.ts` verifies that previously rejected and revoked accounts may request access again, while `admin-user-management.database.test.ts` verifies revocation history and the approve/revoke/re-request transition.    |
| An event correction and automatic statistic refresh scenario is covered                      | `tests/e2e/corrections.spec.ts` verifies an authorised keyboard-driven correction followed by refreshed statistics. `apps/backend/tests/database/submission.database.test.ts` verifies atomic supersession and targeted statistic refresh.                                                                                                             |
| Filtered export is covered                                                                   | `tests/e2e/statistics.spec.ts` verifies CSV and JSON export with active filters. Backend API tests verify filtered JSON and CSV exports, deterministic output, empty exports and invalid filter handling.                                                                                                                                              |
| Failure and validation paths are included                                                    | Browser coverage includes invalid submission data, rejected CSV rows, invalid corrections, viewer denial, authentication failures and rejected access requests. API and database suites additionally cover malformed payloads, invalid scopes, conflicts, rollback, not-found states and failure mapping.                                              |
| Exact commands and expected environment are documented                                       | This validation record and `docs/development/testing.md` record the acceptance sequence, environment and database/browser prerequisites.                                                                                                                                                                                                               |
| Real defects found during acceptance testing are logged separately                           | No product defect was discovered during this acceptance run. One invalid browser-test assertion was found and corrected as test maintenance after Git history proved that the expected text had never existed in the homepage implementation.                                                                                                          |

## Initial browser baseline and test-maintenance finding

The first complete Playwright run executed 54 tests across desktop Chromium and Pixel 7 Chromium.

Result:

```text
50 passed
4 failed
```

All four failures were the same assertion in `tests/e2e/homepage.spec.ts`, repeated across both
browser projects:

```text
Visual metaphor, not ball-tracking data
```

Git history was inspected before changing the test:

```text
git grep -n "Visual metaphor, not ball-tracking data"
git log --all -S"Visual metaphor, not ball-tracking data" --oneline -- apps/frontend/src/features/home tests/e2e/homepage.spec.ts
git log -p -S"Visual metaphor, not ball-tracking data" -- apps/frontend/src/features/home tests/e2e/homepage.spec.ts
git grep -n "Visual metaphor, not ball-tracking data" 4e26611
```

The phrase existed only in `tests/e2e/homepage.spec.ts`, including in the commit that originally
introduced the homepage test. It had never existed in the homepage implementation.

The assertion was therefore corrected to verify the existing rendered fallback explanation:

```text
Event → derived values
```

This was classified as acceptance-test maintenance rather than a product defect, so no separate
product bug was created.

Focused verification after the correction:

```text
npx.cmd playwright test tests/e2e/homepage.spec.ts

10 passed
```

The complete browser suite was then rerun successfully.

## Browser acceptance results

Command:

```text
npm.cmd run test:e2e
```

Result:

```text
54 passed
```

The configured Playwright workflow builds the frontend and exercises every committed E2E
specification in both desktop Chromium and the Pixel 7 Chromium profile.

Passing coverage includes public browsing, statistics and export, authentication, submitter access,
administrator approval/rejection/revocation, file and direct submission, event correction,
validation and failure feedback, keyboard interaction, responsive behaviour and automated
accessibility checks.

## Handwritten API acceptance results

Command:

```text
npm.cmd run test:api
```

Result:

```text
Test Files  11 passed (11)
Tests       114 passed (114)
```

The suite includes public reads and export, fixture statistics, direct and file-based submissions,
competition-scope authorization, submitter access requests, administrator user management,
authentication, account deletion, health and weather integration behaviour.

Expected error logging from deliberate upstream-weather, timeout and database-failure cases was
observed during the run. Those cases passed and confirm safe failure mapping.

## PostgreSQL integration acceptance results

Command:

```text
npm.cmd run test:database:local
```

Result:

```text
Test Files  11 passed (11)
Tests       60 passed (60)

DATABASE INTEGRATION TESTS: PASS
```

The repository-managed workflow reset, migrated and seeded its isolated PostgreSQL 16 database
before running the suite.

Relevant passing scenarios include:

- access request persistence and duplicate prevention;
- rejected-user re-request;
- revoked-user re-request with retained revocation history;
- administrator approve, revoke and re-request transitions;
- competition-scope enforcement;
- atomic direct submission and event provenance;
- uploaded JSON source-file provenance;
- invalid-submission rollback;
- event correction without mutating the accepted source event;
- atomic event supersession and targeted statistic refresh; and
- published fixture-statistic reference comparisons.

## Repository quality gate

Command:

```text
npm.cmd run check
```

Result:

```text
PASS
```

The gate passed repository structure validation, Prettier, workspace ESLint, shared-contract build,
workspace TypeScript checks, all normal database-independent test suites, OpenAPI validation and
backend/frontend production builds.

Test totals inside the gate were:

| Suite              |     Result |
| ------------------ | ---------: |
| Backend unit       |  94 passed |
| Frontend           | 113 passed |
| API                | 114 passed |
| Shared contracts   |  73 passed |
| Deployment helpers |   4 passed |

The frontend production build emitted the existing non-failing Vite advisory for chunks larger than
500 kB. The build itself completed successfully.

## Acceptance outcome

All functional acceptance criteria for Issue #272 are covered by the combined browser, handwritten
API and PostgreSQL integration suites.

The dedicated acceptance executions completed with:

```text
Browser E2E             54 passed
API                    114 passed
Database integration    60 passed
                       ----------
Acceptance tests       228 passed
```

No product defect was found during the acceptance run. The single discovered problem was an
impossible homepage test assertion, which was investigated through repository history, corrected
without changing production behaviour and successfully retested.

## Remaining Definition of Done steps

- Run final repository and documentation validation.
- Commit the Issue #272 changes.
- Create the Pull Request.
- Obtain peer review and required verification.
- Merge into `main`.
- Close Issue #272.

## AI Declaration

The acceptance analysis, traceability mapping, validation record and test-maintenance investigation
were produced with the assistance of ChatGPT-Web[GPT-5.6 Sol].
