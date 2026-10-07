# Issue #877 Automated Test, Coverage and Quality-Gate Audit

## Metadata

| Field | Value |
| --- | --- |
| Execution issue | #877 |
| Tester | Dean Feldman with Codex assistance |
| Date/time | 2026-10-07, Africa/Johannesburg |
| Candidate commit/tag | `ab216b987` |
| Environment | Clean local `npm ci` on Windows; Node 24.13.0; no deployment credentials used |

> No passwords, bearer tokens, OAuth credentials, API keys or service secrets are recorded.

## Results

| Verification ID | Result (`PASS` / `FAIL` / `BLOCKED` / `N/A`) | Evidence / observation | Linked bug / blocker | Retest |
| --- | --- | --- | --- | --- |
| AUTO-TECH-01 | FAIL | `npm.cmd run test:frontend`: 40 files passed; 5 failed; 455 tests passed; 5 failed. | Current frontend failures listed below. | Not run; no assertion was weakened. |
| AUTO-TECH-02 | BLOCKED | Backend units passed 57 files; 535 tests. API and API-contract suites were not reached because the aggregate test command stopped at frontend failure. | AUTO-TECH-01. | Required after frontend repair. |
| AUTO-TECH-03 | BLOCKED | Not reached after frontend failure. | AUTO-TECH-01. | Required after frontend repair. |
| AUTO-TECH-04 | BLOCKED | Not reached after frontend failure. | AUTO-TECH-01. | Required after frontend repair. |
| AUTO-TECH-05 | BLOCKED | Database integration was not run in this short audit window after the blocking frontend failure. | AUTO-TECH-01. | Required after frontend repair. |
| AUTO-TECH-06 | BLOCKED | Playwright was not run in this short audit window after the blocking frontend failure. | AUTO-TECH-01. | Required after frontend repair. |
| AUTO-TECH-07 | BLOCKED | Deployment suite was not reached after frontend failure. | AUTO-TECH-01. | Required after frontend repair. |
| AUTO-TECH-08 | BLOCKED | Intermediate-ingestion gate was not run after frontend failure. | AUTO-TECH-01. | Required after frontend repair. |
| AUTO-TECH-09 | BLOCKED | `npm run check` was not run because it includes the failing aggregate test suite. | AUTO-TECH-01. | Required after frontend repair. |
| AUTO-TECH-10 | BLOCKED | Hygiene was not run after the blocking test result. | AUTO-TECH-01. | Required after frontend repair. |
| COV-TECH-01 | BLOCKED | Coverage was not regenerated because it would report an incomplete release candidate while the required frontend suite fails. | AUTO-TECH-01. | Regenerate after green suites. |
| COV-TECH-02 | BLOCKED | No new release-candidate coverage report exists. Historical values are not reused as final evidence. | AUTO-TECH-01. | Review regenerated report. |
| COV-TECH-03 | PASS | This record explicitly registers the frontend regressions, incomplete suite matrix and production dependency findings. | None. | Update after remediation. |
| CI-TECH-01 | BLOCKED | Local CI plan was not run after the required aggregate suite failed. | AUTO-TECH-01. | Required after frontend repair. |
| CI-TECH-02 | BLOCKED | No branch was pushed and no hosted run exists for this candidate. | Push/PR permission and a green local candidate are required. | Required later. |
| DEP-TECH-01 | BLOCKED | Strict MkDocs build was not run after the release-candidate failure. | AUTO-TECH-01. | Required after frontend repair. |
| DEP-TECH-02 | BLOCKED | OpenAPI lint was not run after the release-candidate failure. | AUTO-TECH-01. | Required after frontend repair. |
| DEP-TECH-03 | BLOCKED | Final deployed smoke remains owned by #810; no matching deployment candidate was asserted. | No final deployed candidate. | #810. |
| DEP-TECH-04 | FAIL | `npm.cmd audit --omit=dev --json` found 7 production-tree advisories: 1 critical; 5 moderate; 1 low. | `proxy-addr` critical advisory; direct `multer`; direct `swagger-ui-react` chain; direct `dompurify` transitive package. | No unsafe forced upgrade applied. |

## Commands / deterministic steps

```text
npm.cmd ci --include=dev
  completed: added 979 packages; audited 986 packages

npm.cmd run test
  backend units: 57 files; 535 tests passed
  frontend: 40 files; 455 tests passed; 5 files; 5 tests failed

npm.cmd audit --omit=dev --json
  production dependency advisories: 1 critical; 5 moderate; 1 low
```

## Failures and disposition

The frontend failures were preserved without retries, skips, assertion changes or production edits:

- `App.test.tsx`: protected internal deep-link OAuth callback;
- `RouteExperience.test.tsx`: `/fixtures` page naming;
- `PublicBrowsePages.test.tsx`: fixture-to-statistics/player local navigation;
- `BatchReviewWorkspacePage.test.tsx`: reviewer workspace keyboard navigation; and
- `SubmissionPage.test.tsx`: anonymous sign-in routing without data load.

The dependency audit found a critical `proxy-addr` advisory and production-tree findings involving
`multer`, `dompurify`, and the `swagger-ui-react` chain. This audit did not run `npm audit fix` or a
forced upgrade: remediation needs a separately reviewed dependency change and full regression run.

## Untested / partial coverage

- The release-candidate quality suite is incomplete because its frontend component suite fails.
- Database, browser, deployment, intermediate-ingestion, hygiene, coverage, local CI, strict docs and
  OpenAPI checks remain unexecuted for this candidate; they must be rerun after the frontend failures
  are resolved.
- Hosted CI and final deployed smoke have no exact pushed/deployed #877 candidate. Hosted proof must
  not be inferred from prior branches; #810 owns release sign-off.

## AI Declaration

This audit record and the documentation regression test were prepared with Codex[GPT-5]. The command
results above were observed in this execution; no failing test was hidden and no deployment result is claimed.
