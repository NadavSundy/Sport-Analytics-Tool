# Issue #329 — Vite/Vitest Toolchain Migration

**Date:** 2026-09-16  
**Status:** VERIFIED — migration and full local CI completed successfully  
**Issue:** #329

## Purpose

Resolve the development-tooling esbuild advisory carried forward from Issue #274 through a supported,
reviewable Vite/Vitest migration. The change must avoid `npm audit fix --force`, preserve the established
React/Vite/Vitest workflow, and be validated against unit, browser, repository and dependency-security gates.

## Pre-change dependency evidence

The committed lock file in the reviewed repository resolved:

```text
vite 5.4.21 -> esbuild 0.21.5
apps/worker tsx 4.19.2 -> esbuild 0.23.1
vitest 2.1.9
@vitest/coverage-v8 2.1.9
```

GHSA-67mh-4wv8-2f99 affects esbuild versions through 0.24.2 and is patched from 0.25.0. The Vite path
therefore still reproduced the development-tooling finding documented in Issue #274. The worker's stale
nested `tsx` resolution also carried an affected esbuild and is refreshed as part of the same narrow
development-tool remediation.

## Supported migration decision

Selected target:

```text
Declared Vite range          ^7.3.6
Resolved Vite                7.3.6
Vitest                       4.1.11
@vitest/coverage-v8          4.1.11
@vitejs/plugin-react         5.0.4
tsx (resolved)               4.23.13
esbuild (resolved)           0.28.1
Node engine                  ^20.19.0 || >=22.12.0
```

Rationale:

- Vite 7 is the maintained previous major and fixes the original Vite/esbuild advisory path without the
  uncontrolled major jump proposed by `npm audit fix --force`.
- Vitest 4 is the appropriate paired test-runner migration: it supports Vite 6+ and Node 20+, and it is
  sufficient for the planned Issue #578 coverage work.
- Vitest 5 was not selected because it raises the runtime floor to Node 22.12+, which would unnecessarily
  remove the repository's supported Node 20 line.
- Vite 8 was not selected because it switches Vite's bundler architecture to Rolldown. That larger change
  is not required to resolve this advisory and would add unrelated regression surface.
- `@vitejs/plugin-react` was upgraded to 5.0.4, which remains compatible with Vite 7 and avoids the
  Vite 8/Oxc compatibility warnings observed when the older plugin line was exercised through Vitest 4.
- The root `package.json` uses `overrides.vite: "^7.3.6"` so Vitest and `@vitest/mocker` resolve the same
  supported Vite 7 line as the frontend instead of installing a separate Vite 8 toolchain.

Official references:

- Vite 7 migration: <https://v7.vite.dev/guide/migration>
- Vitest 4 migration: <https://vitest.dev/guide/migration.html>
- esbuild advisory: <https://github.com/advisories/GHSA-67mh-4wv8-2f99>

## Required configuration migration

Vitest 4 removes `test.poolOptions`. The frontend's Node 25+ jsdom workaround previously stored
`execArgv` under `poolOptions.forks`; the same argument is now configured directly as `test.execArgv`.
No application behaviour is changed by that edit.

Vitest 4 also discovers generated `dist/tests/*.test.js` files that the previous setup did not execute.
The contracts workspace therefore scopes its test script to the authoritative TypeScript sources with
`vitest run src/tests`. This prevents generated CommonJS test output from being executed as a second,
invalid copy of the same suites.

Vite 7 also raises its Node.js floor to Node 20.19+ / 22.12+, so the root engine declaration and setup
documentation are updated to match the supported toolchain rather than advertising unsupported early
Node 20 releases.

## Lock-file update

`package-lock.json` was regenerated with npm and verified with a clean `npm ci`. No integrity hashes or
transitive dependency entries were hand-edited. The final dependency tree resolves Vite 7.3.6 throughout
the frontend/Vitest toolchain, Vitest 4.1.11, `@vitest/coverage-v8` 4.1.11, `@vitejs/plugin-react` 5.0.4,
tsx 4.23.13 and esbuild 0.28.1. No affected esbuild `<=0.24.2` remains.

The root Vite override is a dependency-resolution constraint rather than an imported root dependency:

```json
"overrides": {
  "vite": "^7.3.6"
}
```

Reviewed with:

```bash
npm ls vite vitest @vitejs/plugin-react @vitest/coverage-v8 tsx esbuild
```

## Verification record

Verification was completed on 2026-09-16 from the repository root.

| Gate | Command | Result |
| --- | --- | --- |
| Lock/install | `npm install` / `npm ci` | **PASS** — clean install completed; 677 packages audited with 0 vulnerabilities |
| Dependency tree | `npm ls vite vitest @vitejs/plugin-react @vitest/coverage-v8 tsx esbuild` | **PASS** — Vite 7.3.6 is deduplicated across the frontend and Vitest; Vitest 4.1.11; plugin-react 5.0.4; coverage-v8 4.1.11; tsx 4.23.13; esbuild 0.28.1 |
| Frontend unit tests | `npm run test:frontend` | **PASS** — 23 files, 196 tests |
| Contracts tests | `npm run test:contracts` | **PASS** — 12 files, 168 tests |
| Browser E2E | `npm run test:e2e` | **PASS** — 51 Playwright tests |
| Repository quality | `npm run check` | **PASS** |
| Monorepo hygiene | `npm run hygiene` | **PASS** as part of the final successful local-CI run; Knip, Syncpack and architecture checks cleared |
| Production audit | `npm audit --omit=dev` | **PASS** — 0 vulnerabilities |
| Full audit | `npm audit` | **PASS** — 0 vulnerabilities |
| Strict docs | `python -m mkdocs build --strict` | **PASS** — strict build completed successfully |
| Local CI | `npm run ci:local` | **PASS** — includes lint/typecheck/build, unit/API/frontend/deployment checks, strict MkDocs, 51 Playwright tests and PostgreSQL 16 integration tests |
| Database integration | local-CI PostgreSQL 16 stage | **PASS** — 22 files passed, 1 skipped; 178 tests passed, 2 skipped |
| Patch whitespace | `git diff --check` | **PASS** before final evidence-only update; rerun once after this evidence update before commit |

The final `npm audit` results contain no remaining advisory, so no residual security exception is required.

## Acceptance-criteria traceability

| Acceptance criterion | Evidence status |
| --- | --- |
| Supported Vite/Vitest path identified | **VERIFIED** — Vite 7.3.6 / Vitest 4.1.11 path documented and resolved consistently |
| Upgrade without `npm audit fix --force` | **VERIFIED** — migration was performed deliberately without `--force`; a normal `npm audit fix` was later used only for separately reported fixable transitive advisories |
| React/Vite/Vitest configuration changes applied deliberately | **VERIFIED** — Vitest 4 `execArgv` migration, contracts source-test scoping, plugin-react 5.0.4 and root Vite 7 override are documented |
| Frontend unit tests pass | **VERIFIED** — 196/196 |
| Playwright E2E tests pass | **VERIFIED** — 51/51 |
| `npm run check` passes | **VERIFIED** |
| Audit rerun and advisory resolved/justified | **VERIFIED** — production and full npm audits report 0 vulnerabilities |
| Affected documentation updated | **VERIFIED** — setup, stack, dependency policy, validation index and migration evidence updated |
| Full local CI passes | **VERIFIED** — `LOCAL CI: PASS` |

## AI Declaration

The migration planning, repository audit, configuration edits, debugging guidance, documentation and
evidence were produced with the assistance of ChatGPT-Web[GPT-5.6 Sol]. The generated work was reviewed
and adapted by the student, and the final repository state was validated locally before commit using the
verification record above.
