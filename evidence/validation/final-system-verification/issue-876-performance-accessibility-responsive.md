# Issue #876 - Performance, Accessibility and Responsive Verification

## Metadata

| Field                | Value                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Execution issue      | #876                                                                                          |
| Tester               | Dean Feldman with Codex assistance                                                            |
| Date/time            | 2026-10-09 (Africa/Johannesburg)                                                              |
| Candidate commit/tag | `83d02d5803cba7ecefd074cbb0a89dd5eb02c130`; branch `test/876-final-non-user-verification`     |
| Environment          | Windows; Node.js v24.13.0; local frontend production preview; Chromium; mocked E2E API routes |

> No passwords, bearer tokens, OAuth credentials, API keys or service secrets were used or retained.

## Results

| Verification ID | Result (`PASS` / `FAIL` / `BLOCKED` / `N/A`) | Evidence / observation                                                                                                                                                                                                                                                                                                          | Linked bug / blocker                                                      | Retest                                                               |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| PERF-TECH-01    | BLOCKED                                      | `npm run measure:api-response-times` requires an approved isolated representative database, imported corpus, running API and safe fixture/participant IDs. None was available, so the command was not aimed at an unapproved endpoint.                                                                                          | Approved representative environment/data required.                        | Run against the approved isolated environment.                       |
| PERF-TECH-02    | BLOCKED                                      | `npm run verify:production-scale-deployment` requires a runtime administrator token and creates or reuses a dataset release. It was not run locally or against hosted infrastructure.                                                                                                                                           | Final release mutation and hosted verification remain with #810.          | Run only with release-owner approval and a safe version.             |
| PERF-TECH-03    | BLOCKED                                      | Retained #797 production-preview evidence passes the representative public-route baseline, but does not prove Production Performance >=90 on every page: four parameterised mobile routes were below target and protected routes were not audited. No new final-candidate hosted audit or legitimate role state was available.  | Outstanding #797 acceptance disposition; final hosted candidate required. | Retain three-run medians and protected-route result under #797/#810. |
| PERF-TECH-04    | BLOCKED                                      | The coexistence exercise needs representative background release/ingestion work plus concurrent public reads. It was not simulated or run in an unapproved environment.                                                                                                                                                         | Approved background-work environment required.                            | Run with #810 release evidence.                                      |
| RESP-TECH-01    | PASS                                         | `npx playwright test tests/e2e/responsive-layout.spec.ts --project=desktop-chromium --reporter=line --workers=1`: 3/3 passed in 54.5s. Signed-out and administrator headers were checked at 320, 360, 390, 600, 768, 900, 960, 1024, 1100, 1180, 1280 and 1440 CSS pixels; reviewed routes had no page-level overflow at 320px. | None observed.                                                            | Not needed.                                                          |
| RESP-TECH-02    | PASS                                         | The same 320px reviewed-route reflow check covered mocked administrator workspace submission and review routes without page-level horizontal overflow. This is local mocked evidence, not deployed role-session verification.                                                                                                   | None observed in supported local coverage.                                | Hosted role-session verification remains with #810.                  |
| A11Y-TECH-01    | PASS                                         | `npx playwright test tests/e2e/accessibility.spec.ts --reporter=line --workers=1`: 69/69 passed in 2.5m. Axe found no serious or critical violation across reviewed public and administrator workspace routes, both themes, and mobile public/authentication/dialog cases.                                                      | None observed.                                                            | Not needed.                                                          |
| A11Y-TECH-02    | PASS                                         | Focused public-navigation, mobile-menu, combobox and route-focus assertions passed in the 39-test component run. The only failing assertion was the unrelated `/fixtures` document title, retained below; no keyboard/focus assertion failed.                                                                                   | `/fixtures` title regression requires release disposition.                | Retest after title correction.                                       |
| A11Y-TECH-03    | PASS                                         | The 69 Axe audits completed without serious/critical accessible-name or semantic finding. Reviewed routes wait for a visible heading and completed loading state; targeted component tests cover labelled navigation and combobox interaction.                                                                                  | None observed.                                                            | Not needed.                                                          |
| A11Y-TECH-04    | PASS                                         | Axe's colour-contrast rule ran within the 69 audits across day/night themes and mobile coverage; no serious/critical finding was reported. Production build output included only a non-blocking large-chunk advisory.                                                                                                           | None observed.                                                            | Monitor bundle-size advisory separately.                             |

## Commands and observations

```text
npm.cmd run build --workspace=@sport-analytics/contracts
npm.cmd run build --workspace=@sport-analytics/frontend
  Result: local production build completed after rebuilding the local contracts artifact.

npx.cmd playwright test tests/e2e/responsive-layout.spec.ts --project=desktop-chromium --reporter=line --workers=1
  Result: 3 passed (54.5s).

npx.cmd playwright test tests/e2e/accessibility.spec.ts --reporter=line --workers=1
  Result: 69 passed (2.5m).

npm.cmd run test --workspace=@sport-analytics/frontend -- --run src/components/PublicShell.test.tsx src/components/NameCombobox.test.tsx src/RouteExperience.test.tsx --maxWorkers=1
  Result: 38 passed; 1 failed. The failure expected `Fixtures | Stat'sTheGame` but received `Untitled` for `/fixtures`.
```

## Finding and disposition

The focused keyboard/focus support run retained one non-accessibility regression: the route-title assertion for
`/fixtures` failed. The result is not masked by the successful Axe or responsive suites. This issue does not
change application behaviour; release ownership must either correct the title and retest, or explicitly
accept its final-submission impact before release.

The local production build also emitted Vite's advisory that some generated chunks exceed 500 kB after
minification. It did not fail the build or the responsive/accessibility checks, but remains a performance
observation rather than evidence of a Lighthouse score.

## Untested / partial coverage

This record does not treat local automated evidence as deployed verification. It does not claim production
API timing, production-scale release behaviour, background-work coexistence, hosted Lighthouse results, or
authenticated browser verification with legitimate role sessions. The retained #797 baseline must not be
represented as universal all-route performance acceptance.

## AI Declaration

Codex[GPT-5] prepared this evidence record and matrix update from observed commands only. No performance,
deployment, authentication, or user-testing result was fabricated.
