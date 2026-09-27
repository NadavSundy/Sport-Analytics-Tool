# Issue #608 API deprecation lifecycle transcript summary

## Scope

Codex[GPT-5] inspected the live Gitea issue and dependencies, the existing API
versioning/deprecation policy, OpenAPI contract, backend response path, recent
merged PR #755, and the repository AI-evidence convention.

The live tracker showed #608 assigned to GabeRaz. #598 was open and initially
blocked implementation; the user explicitly authorized proceeding despite that
gate. #612 remains an open deployed user-feedback closure gate and does not
block technical implementation or automated testing.

## Work performed

The existing public fixture-event JSON export was selected because its existing
consumer-key equivalent is a real route with the same response model. Focused
contract tests were added first for the deprecated response, successor Link,
unaffected v1 health response, OpenAPI metadata, and invalid replacement
configuration. The pre-implementation run failed because the lifecycle module
did not exist; the isolated worktree also required the repository lockfile
installation.

The implemented middleware validates static deprecation mappings and emits RFC
9745 `Deprecation: ?1` plus an RFC 8288 `successor-version` Link. The Link
substitutes path parameters and preserves the request query string. No Sunset
date was added because none has been approved. The OpenAPI operation, single
authoritative policy, consumer example, and gap analysis were updated.

## Verification status

The focused lifecycle contract test passed 4/4 after implementation. Remaining
repository checks and their exact outcomes are recorded in the final evidence
commit. No manual or deployed testing was performed in this work.

## Commands and outcomes

| Command | Outcome |
| --- | --- |
| `npm.cmd run test:contract --workspace=@sport-analytics/backend -- --run apps/backend/tests/contract/deprecation-lifecycle.contract.test.ts` | Failed before implementation: lifecycle middleware did not exist; the isolated worktree also lacked `ajv`. |
| `npm.cmd ci` | Initial sandbox attempt failed on the user npm cache; the approved retry completed from the lockfile with dependency deprecation warnings only. |
| `npx.cmd vitest run tests/contract/deprecation-lifecycle.contract.test.ts` | Passed after implementation: 1 file, 4 tests. |
| `npm.cmd run test:api --workspace=@sport-analytics/backend` | Passed: 19 files, 196 tests. Expected weather-error fixture logs appeared. |
| `npm.cmd run test:contract --workspace=@sport-analytics/backend` | Passed: 6 files, 77 tests. |
| `npm.cmd run lint` | Passed for backend, frontend, worker, contracts, batch-processing and object-storage workspaces. |
| `npm.cmd run typecheck --workspace=@sport-analytics/backend`, `npm.cmd run typecheck --workspace=@sport-analytics/frontend`, `npm.cmd run typecheck --workspace=@sport-analytics/worker` | Passed. Shared-package preparation passed before backend and worker checks. |
| `npm.cmd run openapi:lint` | Passed; Redocly reported the specification valid, with three existing explicitly ignored problems. |
| `npm.cmd run hygiene` | Passed: Knip, Syncpack and dependency-cruiser (327 modules; 1,085 dependencies). |
| `npm.cmd run format:check` and `npm.cmd run structure:check` | Passed: all files formatted; 39 required files present. |
| `npm.cmd run build --workspace=@sport-analytics/backend` | Passed; bundled `docs/api/openapi.yaml` into backend `dist`. |
| `git diff --check` | Passed with no whitespace errors before and after commits. |

Database tests were not run because no database behaviour or schema changed.

## Safety review

This summary contains no credentials, tokens, cookies, personal information,
or internal service values.
