# Issue #871 — Frontend, Authentication and Role Verification

## Metadata

| Field                   | Value                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Execution issue         | #871                                                                                                 |
| Tester                  | Dean Feldman using Codex-assisted deterministic local verification                                   |
| Date/time               | 2026-10-07 SAST                                                                                      |
| Candidate commit/tag    | `955f30105ed02858e42ccf9f3605d48d136c0717` deployed `main`; local deterministic baseline `d963e138d` |
| Environment             | Windows local workspace; Node.js 24.13.0; fresh Vite production build and local preview              |
| Frontend URL            | Ephemeral `http://127.0.0.1:<Playwright-selected-port>` production preview                           |
| API URL                 | Deterministic Playwright route mocks; no deployed API write was made                                 |
| Test role(s)            | Anonymous/public; mocked authenticated viewer; submitter; administrator                              |
| Fixture/package/dataset | Deterministic fixture, statistics and account-response fixtures within the named tests               |

> No passwords, bearer tokens, OAuth credentials, API keys or service secrets were recorded. Test-only token strings remain inside existing deterministic tests and were not retained as evidence.

## Results

| Verification ID | Result (`PASS` / `FAIL` / `BLOCKED` / `N/A`) | Evidence / observation                                                                                                                                                                    | Linked bug / blocker | Retest        |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------- |
| AUTH-TECH-01    | PASS                                         | Anonymous public navigation, public records and public API Explorer were exercised in the 31-test Playwright set.                                                                         | None observed.       | Not required. |
| AUTH-TECH-02    | PASS                                         | OAuth start, callback completion, cancellation and provider-failure states are covered by `authentication.spec.ts`; callback tests use a deterministic managed-provider boundary.         | None observed.       | Not required. |
| AUTH-TECH-03    | PASS                                         | Stored identity navigation and local sign-out clear the private navigation state in `authentication.spec.ts`; account UI tests cover local session clearing.                              | None observed.       | Not required. |
| AUTH-TECH-04    | PASS                                         | Authenticated account/access journeys reload successfully in Playwright; focused frontend tests cover expired-session handling.                                                           | None observed.       | Not required. |
| AUTH-TECH-05    | PASS                                         | Viewer denial, submitter scope, administrator management and server-side 401/403 authorization boundaries passed in the browser and backend test sets.                                    | None observed.       | Not required. |
| AUTH-TECH-06    | PASS                                         | Focused frontend and backend tests verify explicit confirmation, owner-only deletion, recent-authentication handling, local session clearing and safe unavailable/partial-failure states. | None observed.       | Not required. |
| AUTH-TECH-07    | PASS                                         | Authentication UI routes to the configured managed Google provider; callback failures are safely redacted. No custom application password-reset path is exercised or exposed.             | None observed.       | Not required. |
| PUB-TECH-01     | PASS                                         | Public browsing Playwright journeys cover discovery, detail and direct related-record navigation without uncaught page errors.                                                            | None observed.       | Not required. |
| PUB-TECH-02     | PASS                                         | Anonymous fixture statistics and calculation-trace journeys render deterministic API data successfully.                                                                                   | None observed.       | Not required. |
| PUB-TECH-03     | PASS                                         | Public browse filtering, pagination, keyboard selection and reload behaviour passed.                                                                                                      | None observed.       | Not required. |
| PUB-TECH-04     | PASS                                         | Browser and frontend tests download CSV/JSON trace exports, verify the selected trace scope and filename, and cover export failures that must not produce a file.                         | None observed.       | Not required. |
| PUB-TECH-05     | PASS                                         | Public navigation to `/api`, direct route entry and production-preview route handling passed in `api-explorer.spec.ts`.                                                                   | None observed.       | Not required. |
| PUB-TECH-06     | PASS                                         | Public player-comparison and statistics tests verify compatible scope labels, units and selected-record context.                                                                          | None observed.       | Not required. |
| PUB-TECH-07     | PASS                                         | Public browsing, statistics, submission and correction tests exercise loading, valid-empty/absence and representative 403/API-error states without an application crash.                  | None observed.       | Not required. |

## Commands / deterministic steps

```text
cmd.exe /d /s /c "npm.cmd run test:e2e -- tests/e2e/authentication.spec.ts tests/e2e/public-browsing.spec.ts tests/e2e/api-explorer.spec.ts tests/e2e/statistics.spec.ts tests/e2e/submitter-access.spec.ts tests/e2e/admin-users.spec.ts tests/e2e/admin-submitter-rejection.spec.ts tests/e2e/corrections.spec.ts"
  Result: retained Playwright artifact status passed; no failed tests.

cmd.exe /d /s /c "set PLAYWRIGHT_REUSE_BUILD=1&& npm.cmd exec -- playwright test tests/e2e/authentication.spec.ts tests/e2e/public-browsing.spec.ts tests/e2e/api-explorer.spec.ts tests/e2e/statistics.spec.ts tests/e2e/submitter-access.spec.ts tests/e2e/admin-users.spec.ts tests/e2e/admin-submitter-rejection.spec.ts tests/e2e/corrections.spec.ts"
  Result: 31 selected tests passed against the fresh local production build.

cmd.exe /d /s /c "npm.cmd exec --workspace=@sport-analytics/frontend -- vitest run --reporter=json --outputFile=test-results/issue-871-frontend-vitest.json src/App.test.tsx src/features/auth/AuthProvider.test.tsx src/features/submitter-access/SubmitterAccessPanel.test.tsx src/features/submissions/SubmissionPage.test.tsx"
  Result: 72 passed; 0 failed (JSON artifact).

cmd.exe /d /s /c "npm.cmd exec --workspace=@sport-analytics/frontend -- vitest run --reporter=json --outputFile=test-results/issue-871-public-states-vitest.json src/pages/PublicBrowsePages.test.tsx src/RouteExperience.test.tsx src/features/statistics/StatisticsPages.test.tsx src/features/statistics/PlayerComparisonPage.test.tsx"
  Result: 75 passed; 0 failed (JSON artifact).

cmd.exe /d /s /c "npm.cmd exec --workspace=@sport-analytics/backend -- vitest run --maxWorkers=2 --reporter=json --outputFile=test-results/issue-871-backend-vitest.json tests/auth.test.ts tests/authorization.test.ts tests/api/account-deletion.test.ts"
  Result: 30 passed; 0 failed (JSON artifact).
```

## Evidence and boundary

- Playwright `test-results/.last-run.json` records `passed` with no failed tests.
- Frontend JSON result artifacts record 147 passed and 0 failed tests across the account/role and public-state sets; the backend artifact records 30 passed and 0 failed tests.
- Deployed viewer check on 2026-10-07 against `955f30105ed02858e42ccf9f3605d48d136c0717`: the signed-in account reported only the `viewer` role; public `/api` loaded after direct entry and refresh; public `/dataset-releases` listed three immutable snapshots after direct entry and refresh; and direct `/admin/users` entry displayed `Administrator access required` without user-management controls. No account email, credentials, tokens or personal details are retained.
- Deployed submitter check on 2026-10-07 against the same SHA: the signed-in account reported `submitter` with approved persisted competition scope; `/submissions/new` exposed the real guided and advanced submission workspace with its authorised-competition selector; and direct `/admin/users` entry displayed `Administrator access required` without user-management controls. No upload, submission, mutation or account detail was retained.
- Deployed administrator/reviewer check on 2026-10-07 against the same SHA: the signed-in session reported `admin`; `/reviews/batches` loaded the review queue's pending and history surfaces, and `/admin` loaded the administration dashboard with its access-control, API-consumer and data-governance navigation. In this deployed role model, reviewer functionality is administrator-only. No review decision, batch publication, user change, batch/user identifier or account detail was retained.
- Dean confirmed that deployed account deletion works. It was not independently repeated because deletion is destructive and was outside this read-only verification pass.
- The local deterministic checks prove the source candidate's production bundle and mocked frontend/API contracts. The deployed checks prove the stated public, viewer, submitter and administrator/reviewer boundaries only; they do not substitute for the remaining live session-expiry or out-of-scope server-rejection checks.
- No product defect was observed in this execution, so there is no defect link or retest to record. The final verification documentation test had a pre-existing stale navigation-label expectation; it was corrected to accept the current `Final System Verification Bank` label and is retested below.

## Untested / partial coverage

The deployed candidate plus viewer, submitter and administrator/reviewer identities are now verified. A submitter out-of-scope server rejection and sign-out/expired-session observation remain pending; they will be recorded only when actually observed.

## AI Declaration

This execution record and the accompanying deterministic verification test were prepared with Codex[GPT-5]. Codex was also used to run the recorded local checks; only their observed results are stated above.
