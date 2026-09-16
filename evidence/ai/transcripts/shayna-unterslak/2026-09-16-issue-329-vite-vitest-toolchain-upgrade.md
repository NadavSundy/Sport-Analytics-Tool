# Issue #329 — Vite/Vitest Toolchain Upgrade

**Date:** 2026-09-16
**Team member:** Shayna Unterslak
**Tool:** ChatGPT Web
**Model:** GPT-5.6 Sol
**Purpose:** Repository audit, dependency migration planning, configuration generation, security review, documentation and verification guidance.

## Request

Implement Issue #329 without committing or pushing on the student's behalf: identify a supported Vite/Vitest upgrade path, remove the remaining development-tool esbuild advisory without `npm audit fix --force`, preserve the existing testing/deployment workflow, document the change and prepare formal verification evidence.

## AI-assisted work used

ChatGPT reviewed the supplied repository snapshot, the existing Issue #274 security evidence, package manifests, lock-file dependency paths, frontend Vitest configuration, CI/runtime Node versions and project documentation. It generated changes that:

- move the frontend from Vite 5 to Vite 7;
- align Vitest and `@vitest/coverage-v8` on the Vitest 4 line across all current Vitest workspaces;
- refresh backend/worker `tsx` so a stale nested esbuild does not retain the same advisory through a second development-tool path;
- migrate the removed Vitest `poolOptions.forks.execArgv` setting to top-level `test.execArgv`;
- align the declared Node engine and setup documentation with Vite 7's supported runtime floor;
- retain @vitejs/plugin-react 4.7.0 for TypeScript 5.5.4 compatibility and use a root Vite 7 override so the frontend and Vitest resolve one supported Vite major
- scope the contracts test command to `src/tests` after Vitest 4 exposed generated CommonJS test copies under `dist/tests`;
- record the controlled migration rationale and avoid coupling the larger Vite 8/Rolldown migration to this security follow-up; and
- create and then finalize Issue #329 validation evidence using only locally observed verification results.

## Human review / adaptation completed

The student regenerated and reviewed the lock file, performed clean npm installs, inspected the dependency
tree, adapted the generated migration where local verification exposed issues, and ran the repository's
quality, browser, security, documentation, hygiene and local-CI gates.

Notable human-reviewed adaptations during verification were:

- adding explicit frontend Node typings because a source-located test imports `node:fs`;
- retaining @vitejs/plugin-react 4.7.0 after CI exposed a TypeScript 5.5.4 declaration-syntax incompatibility with plugin-react 5.x
- replacing an unused root Vite devDependency with `overrides.vite: "^7.3.6"`;
- scoping contract tests to `src/tests` so generated CommonJS output is not re-run by Vitest 4; and
- applying a normal, non-forced npm audit fix for separately reported fixable transitive advisories.

## Verification

Completed locally from the repository root:

```text
npm ls vite vitest @vitejs/plugin-react @vitest/coverage-v8 tsx esbuild
npm run test:frontend
npm run test:contracts
npm run check
npm run hygiene
npm audit --omit=dev
npm audit
npm run ci:local
```

Observed final results include Vite 7.3.6 throughout the frontend/Vitest tree, 196 frontend tests passing,
168 contracts tests passing, 51 Playwright tests passing, clean production/full npm audits, strict MkDocs
success, PostgreSQL 16 integration success, and `LOCAL CI: PASS`.

## Related evidence

- Issue #329
- Issue #274
- Issue #578
- `evidence/validation/issue-329-vite-vitest-toolchain-migration.md`
- `docs/development/dependencies.md`
- `docs/development/technology-stack.md`
