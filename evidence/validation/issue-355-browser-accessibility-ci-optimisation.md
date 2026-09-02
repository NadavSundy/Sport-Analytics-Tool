# Issue #355 — hosted browser and accessibility CI optimisation

**Date:** 2 September 2026
**Issue:** #355 — Optimise hosted browser and accessibility validation without reducing coverage

## Purpose

Reduce hosted Playwright wall-clock time without removing the required browser, responsive,
keyboard or accessibility quality gates.

## Baseline reviewed

The pre-change repository had:

- 27 Playwright test declarations;
- both `desktop-chromium` and `mobile-chromium` running the complete suite, producing 54 browser test
  executions on a passing full run;
- one hosted Playwright worker;
- browser execution at the end of the general `validation` job;
- the frontend production bundle built once by validation and then rebuilt by Playwright's
  `webServer` command before preview;
- 34 expected Axe analyses across the complete two-project matrix based on the deterministic test
  control flow: 12 from the dedicated three-route/two-theme accessibility matrix, 4 from the
  two-theme homepage test, and 18 from the remaining Axe scan points across both projects.

## Implemented optimisation

### Independent required browser lane

Browser validation is moved into a `browser` job that depends only on `plan`. Normal validation,
browser validation and PostgreSQL validation can therefore overlap when hosted runners are available.
The required `quality` job explicitly validates the browser result whenever `e2e=true`.

The graph remains safe with one runner: independent lanes queue and `quality` waits for all required
results.

### Representative mobile matrix

Desktop Chromium retains all 27 Playwright tests. Pixel 7 Chromium runs 9 representative tests tagged
`@mobile`, covering:

- the dedicated accessibility matrix;
- administrator rejection feedback;
- signed-out authentication;
- the primary homepage/theme journey;
- player overview;
- representative public browsing;
- fixture statistics;
- direct submission; and
- submitter-access request state.

This changes the normal passing matrix from 54 browser executions to 36, a reduction of 18 duplicate
viewport executions (33.3%) while retaining mobile coverage for responsive-critical journeys.

### Focused mobile Axe coverage

Desktop keeps the dedicated `/`, `/sign-in` and `/account` matrix in both Day Match and Night Match.
The mobile dedicated matrix checks `/` and `/sign-in` in Day Match, while tagged mobile journeys retain
additional Axe scans and the homepage still checks both themes.

Based on deterministic test control flow, the expected Axe analysis count changes from 34 to 27:
17 desktop analyses plus 10 mobile analyses. This removes 7 duplicate scans (20.6%) without removing
mobile or theme-sensitive accessibility coverage.

### Hosted worker and build reuse

Local benchmarking selected four hosted Playwright workers as the default. The optimised 36-test matrix
completed in 28.5 seconds with four workers versus 35.2 seconds with two workers, while remaining close
to the 27.4-second unconstrained local run using eight workers. Four workers therefore provided most of
the local parallelism benefit without adopting the more aggressive eight-worker setting.
`PLAYWRIGHT_WORKERS=1` remains an explicit diagnostic fallback if a university runner shows resource
contention.

The browser job builds the frontend production bundle once and sets `PLAYWRIGHT_REUSE_BUILD=1` before
Playwright. The preview server therefore reuses that bundle instead of rebuilding it.

## Regression protection

Pure Node regression tests verify that:

- browser validation is a separate required lane;
- `quality` fails when required browser validation fails;
- hosted browser CI requests four workers and production-build reuse;
- mobile Chromium is restricted to the representative `@mobile` subset;
- nine representative mobile tests remain tagged; and
- the focused mobile accessibility matrix retains the broader desktop route/theme matrix.

The existing change planner continues to skip Playwright for docs, lightweight evidence, backend-only
and frontend test-only changes, while frontend implementation, shared contracts, browser-suite,
root/CI/unknown and manual full-validation changes request browser coverage as appropriate.

## Local verification

Run before opening the Pull Request:

```text
npm run format
npm run test:ci-routing
npm run test:e2e
npm run check
python -m mkdocs build --strict
git diff --check
```

Also verify the hosted-style browser configuration locally where practical:

```powershell
$env:CI='true'
$env:PLAYWRIGHT_WORKERS='4'
npm.cmd run test:e2e
Remove-Item Env:PLAYWRIGHT_WORKERS
Remove-Item Env:CI
```

## Hosted verification to retain before closure

Record from the Pull Request run:

- `plan`, `validation`, `browser`, optional `database`, and required `quality` results;
- browser job elapsed time;
- confirmation that validation and browser can overlap when two runners are available;
- 27 desktop + 9 mobile = 36 passing browser executions;
- any retries or worker-resource failures; and
- before/after full/frontend-focused CI wall-clock timing.

If four workers prove unstable on the university runner, reduce only the hosted worker count and retain
the matrix/build/job-graph optimisations. Do not remove browser or accessibility gates to obtain a
faster green run.

## AI Declaration

The preceding optimisation design, workflow changes, regression tests, documentation and evidence
record were developed with the assistance of ChatGPT-Web[GPT-5.6 Sol] and require human review and
hosted verification before Issue #355 is closed.
