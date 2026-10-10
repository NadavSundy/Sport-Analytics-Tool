# Issue #877 Automated Test, Coverage and Quality-Gate Audit

## Metadata

| Field                                            | Value                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Execution issue                                  | #877                                                                                                                 |
| Tester                                           | Dean Feldman with Codex assistance                                                                                   |
| Date/time                                        | 2026-10-07, Africa/Johannesburg                                                                                      |
| Pre-remediation baseline                         | `ab216b987`; verified ancestor of the tested candidate.                                                              |
| Tested candidate commit/tag                      | `26fc2857b`; local PASS evidence applies to this candidate, including the two-worker configuration and lockfile fix. |
| Later documentation/evidence preservation commit | `4a676b554`; documentation/test-only preservation update, not a new audit candidate or a new test run.               |
| Environment                                      | Clean local `npm ci` on Windows; Node 24.13.0; no deployment credentials used                                        |

> No passwords, bearer tokens, OAuth credentials, API keys or service secrets are recorded.

## Results

| Verification ID | Result (`PASS` / `FAIL` / `BLOCKED` / `N/A`) | Evidence / observation                                                                                                                                                            | Linked bug / blocker                                                   | Retest                              |
| --------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| AUTO-TECH-01    | PASS                                         | The exact CI two-worker command passed 45 files and 460 tests. `vite.config.ts` now makes that established worker limit the local default; no retry or assertion change was used. | None.                                                                  | Not needed.                         |
| AUTO-TECH-02    | PASS                                         | Full `npm run check` passed, including backend unit/API/API-contract suites.                                                                                                      | None.                                                                  | Not needed.                         |
| AUTO-TECH-03    | PASS                                         | Full `npm run check` passed, including the worker suite.                                                                                                                          | None.                                                                  | Not needed.                         |
| AUTO-TECH-04    | PASS                                         | Full `npm run check` passed, including contracts.                                                                                                                                 | None.                                                                  | Not needed.                         |
| AUTO-TECH-05    | PASS                                         | `npm run test:database` passed in Dean's terminal.                                                                                                                                | None.                                                                  | Not needed.                         |
| AUTO-TECH-06    | PASS                                         | `npm run test:e2e` passed in Dean's terminal.                                                                                                                                     | None.                                                                  | Not needed.                         |
| AUTO-TECH-07    | PASS                                         | Full `npm run check` passed, including deployment-helper tests.                                                                                                                   | None.                                                                  | Not needed.                         |
| AUTO-TECH-08    | PASS                                         | `npm run ci:local` completed with `LOCAL CI: PASS`.                                                                                                                               | None.                                                                  | Not needed.                         |
| AUTO-TECH-09    | PASS                                         | `npm run check` passed.                                                                                                                                                           | None.                                                                  | Not needed.                         |
| AUTO-TECH-10    | PASS                                         | `npm run hygiene` passed: Knip; syncpack; and dependency-cruiser.                                                                                                                 | None.                                                                  | Not needed.                         |
| COV-TECH-01     | PASS                                         | Regenerated coverage completed with all five required workspaces.                                                                                                                 | None.                                                                  | Not needed.                         |
| COV-TECH-02     | PASS                                         | Combined coverage: 80.77% lines; 79.49% statements; 84.92% functions; 72.27% branches. Thresholds remain informational.                                                           | None.                                                                  | Not needed.                         |
| COV-TECH-03     | PASS                                         | This record explicitly registers the frontend regressions, incomplete suite matrix and production dependency findings.                                                            | None.                                                                  | Update after remediation.           |
| CI-TECH-01      | PASS                                         | `npm run ci:local` completed with `LOCAL CI: PASS`.                                                                                                                               | None.                                                                  | Not needed.                         |
| CI-TECH-02      | BLOCKED                                      | No branch was pushed and no hosted run exists for this candidate.                                                                                                                 | Push/PR permission and a green local candidate are required.           | Required later.                     |
| DEP-TECH-01     | PASS                                         | `python -m mkdocs build --strict` passed after the final evidence link was corrected.                                                                                             | None.                                                                  | Not needed.                         |
| DEP-TECH-02     | PASS                                         | `npm run openapi:lint` passed.                                                                                                                                                    | None.                                                                  | Not needed.                         |
| DEP-TECH-03     | BLOCKED                                      | Final deployed smoke remains owned by #810; no matching deployment candidate was asserted.                                                                                        | No final deployed candidate.                                           | #810.                               |
| DEP-TECH-04     | PASS                                         | Reviewed non-breaking `npm audit fix` removed the critical, low and direct advisories. Post-fix production audit: 4 moderate advisories; 0 high/critical.                         | `swagger-ui-react` dependency chain requires a forced breaking change. | Explicitly deferred; no force used. |

## Commands / deterministic steps

```text
npm.cmd ci --include=dev
  completed: added 979 packages; audited 986 packages

npm.cmd run check
  passed: structure; format; lint; typecheck; complete normal suite; OpenAPI; production builds

npm.cmd run test:database; npm.cmd run test:e2e; npm.cmd run ci:local
  passed in Dean's terminal; local CI reported LOCAL CI: PASS

npm.cmd run test:coverage
  combined: 80.77% lines; 79.49% statements; 84.92% functions; 72.27% branches

npm.cmd audit --omit=dev --json
  production dependency advisories: 1 critical; 5 moderate; 1 low
```

## Failures and disposition

The initial unrestricted-worker frontend failures were preserved without retries, skips or assertion changes:

- `App.test.tsx`: protected internal deep-link OAuth callback;
- `RouteExperience.test.tsx`: `/fixtures` page naming;
- `PublicBrowsePages.test.tsx`: fixture-to-statistics/player local navigation;
- `BatchReviewWorkspacePage.test.tsx`: reviewer workspace keyboard navigation; and
- `SubmissionPage.test.tsx`: anonymous sign-in routing without data load.

The reviewed non-breaking `npm audit fix` updated `proxy-addr`, `multer`, `dompurify` and related
lockfile resolutions. The post-fix production audit has no high or critical finding. Four moderate
advisories remain in the `swagger-ui-react` -> `remarkable` -> `argparse` -> `sprintf-js` chain;
npm offers only a forced breaking change, which this audit did not apply.

## Untested / partial coverage

- The local release-candidate matrix is complete and passed. Coverage is intentionally informational;
  no threshold was added or lowered.
- Hosted CI and final deployed smoke have no exact pushed/deployed #877 candidate. Hosted proof must
  not be inferred from the local PASS or a later documentation/evidence update; #810 owns final
  deployment and production smoke testing.

## AI Declaration

This audit record and the documentation regression test were prepared with Codex[GPT-5]. The command
results above were observed in this execution; no failing test was hidden and no deployment result is claimed.
