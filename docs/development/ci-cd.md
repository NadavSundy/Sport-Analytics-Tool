# CI/CD and quality gates

## Status

**Implemented:** change-aware Gitea Pull Request CI, required quality gating, PostgreSQL integration
validation, monorepo hygiene enforcement, Azure frontend deployment and Azure backend deployment
workflow foundations.

**Tracked separately:** automated MkDocs deployment to Cloudflare Pages is still handled by the
existing documentation-deployment work item and is not claimed as implemented here.

## Purpose and methodology relationship

This document describes how the repository implements the existing
[Git methodology](../git-methodology.md) and [project methodology](../project_methodology.md). It does
not replace or change those methodologies. Meaningful CI/CD work still follows the normal traceability
chain:

```text
Gitea issue -> issue branch -> atomic commits -> Pull Request -> automated checks -> peer approval -> merge
```

CI/CD configuration changes are infrastructure work. They require an issue, acceptance criteria,
local verification, a reviewed Pull Request, relevant documentation and retained hosted evidence in
exactly the same way as application changes.

## Required Pull Request quality gate

`main` is protected by the Gitea status:

```text
Sport Analytics CI / quality (pull_request)
```

The `quality` job is intentionally stable even though the checks before it are change-aware. A Pull
Request may not be merged merely because an expensive job was skipped; `quality` evaluates the
planner result and every job that the planner marked as required.

The workflow name and final job name must therefore not be changed casually. If either changes, the
branch-protection rule must be reviewed before merge.

## Hosted runner environment

The university provides two shared Gitea Actions runners. Project workflows target the fixed label:

```text
ubuntu-24.04
```

Node workflows use Node.js 22. Database integration uses PostgreSQL 16. The hosted runners use host
networking, so CI PostgreSQL listens on `55432` instead of the normally occupied `5432` port.

The CI graph is deliberately able to use both hosted runners when a database check is required. This
reduces elapsed feedback time for the project while retaining the same required quality gate:

```text
                         +-> validation --------+
plan --------------------+                      +-> quality
                         +-> database (if needed)+
```

The database lane no longer waits for the normal validation lane. Both start after planning and the
final `quality` job waits for whichever lanes the change plan requires.

## Change-aware planning

`scripts/ci-change-plan.mjs` compares the Pull Request base with the current head and classifies the
changed paths. Its rules are regression-tested by `tests/ci/change-plan.test.mjs`.

The planner is conservative. Unknown files, root dependency changes and workflow/tooling changes
select full application validation rather than guessing that a check can be skipped. A manual
`workflow_dispatch` also selects full validation.

| Change class                                                             | Required hosted work                                                                      | Work normally skipped                                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Lightweight evidence (`.csv`, images, PDFs, DOCX, ZIP under `evidence/`) | plan, required-file structure check, final quality gate                                   | npm install, app tests/builds, MkDocs, PostgreSQL, Playwright, coverage |
| Prettier-managed evidence / documentation                                | formatting and strict documentation checks as applicable                                  | unrelated app, database and browser suites                              |
| Frontend unit-test-only                                                  | contracts/hygiene as required, frontend lint/typecheck/unit/build                         | PostgreSQL and Playwright                                               |
| Frontend implementation/browser                                          | contracts/hygiene, frontend lint/typecheck/unit/build, Playwright                         | PostgreSQL                                                              |
| Backend source                                                           | contracts/hygiene, backend lint/typecheck/unit/API/build, OpenAPI, PostgreSQL integration | Playwright unless another changed path requires it                      |
| Shared contracts                                                         | contracts plus affected frontend/backend and browser validation                           | PostgreSQL unless another changed path requires it                      |
| Root dependency, shared tooling, CI workflow or unknown path             | full Pull Request application validation                                                  | nothing except duplicate PR coverage                                    |

Documentation-only changes still run a strict MkDocs build. OpenAPI-related documentation also runs
Redocly linting.

## Test and production environment separation

React Testing Library unit tests require the React test/development build because they use `act(...)`.
The normal validation job therefore keeps:

```text
NODE_ENV=test
```

for frontend unit tests. Only the frontend production bundle and Playwright browser run override the
environment with:

```text
NODE_ENV=production
```

This boundary is intentional. Applying `NODE_ENV=production` to the frontend unit-test step causes
React Testing Library to fail before meaningful assertions execute.

## Monorepo hygiene

Issue #259 is enforced through the existing root command:

```bash
npm run hygiene
```

The gate contains:

- Knip unused-file/dependency/export validation;
- syncpack workspace dependency consistency; and
- dependency-cruiser architecture/boundary validation.

Relevant application, contracts, dependency, configuration and full-validation changes request the
hygiene gate. Lightweight evidence does not consume a hosted runner merely to re-run architecture
analysis that the evidence cannot affect.

A hygiene failure is a required validation failure and therefore makes `quality` fail.

## Coverage policy

`npm run test:coverage` currently duplicates unit suites and does not enforce a repository-wide
coverage threshold. Running it on every Pull Request would consume runner time without changing the
merge decision.

The policy is therefore:

- Pull Requests: run the relevant functional/unit/browser/database checks, but do not duplicate them
  solely for coverage;
- relevant pushes to `main`: generate coverage after merge;
- `workflow_dispatch`: generate coverage as part of deliberate full validation.

If a repository-wide coverage threshold is introduced later, this policy must be reviewed because
coverage may then become a merge-affecting gate.

## Local parity before opening or updating a Pull Request

Developers should select checks based on the affected area, while CI remains authoritative. For a
CI/CD or cross-cutting change, use:

```bash
npm ci
npm run test:ci-routing
npm run hygiene
npm run check
npm run test:database:local
npm run test:e2e
```

A smaller feature change may use the focused workspace/test commands documented in
[Testing](testing.md), but required hosted CI still makes the final merge decision.

Git hooks may be used for fast developer feedback but are not a replacement for hosted validation;
local hooks can be skipped and do not provide repository-level merge evidence.

## Deployment relationship

Frontend and backend deployment workflows are separate from the Pull Request quality gate. They run
on `main` only when paths relevant to that deployable component change, and they also support manual
`workflow_dispatch` recovery.

A deployment failure occurs after the Pull Request has already been merged and cannot undo that
merge. It must instead be recorded and resolved through the normal bug/infrastructure issue process.
Deployment smoke checks remain part of each deployment workflow.

Application deployment paths are documented in:

- [Azure backend](../deployment/azure-backend.md)
- [Azure frontend](../deployment/azure-fronted.md)
- [Deployment overview](../deployment/overview.md)

The public MkDocs site is deliberately separate. Until the tracked Cloudflare automation work is
completed, this CI document must not claim that documentation deployment is automated.

## Failure interpretation

The job graph should be read as follows:

- `plan` failure: changed paths could not be safely planned or planner regression tests failed;
- `validation` skipped: expected only when the plan requires no npm-based validation, such as a
  lightweight evidence-only change;
- `validation` failure: one or more required formatting, hygiene, workspace, documentation,
  Playwright or coverage checks failed;
- `database` skipped: expected when the change cannot affect the persisted backend data path;
- `database` failure: required PostgreSQL reset/migration/seed/integration validation failed;
- `quality` failure: at least one required predecessor did not complete successfully.

A failed required check must be corrected in the branch. It must not be bypassed by changing branch
protection or weakening the planner merely to obtain a green Pull Request.

## Evidence and change control

For meaningful CI/CD changes, retain:

- the related issue and acceptance criteria;
- local command results;
- the Pull Request and peer approval;
- hosted Gitea Actions results/screenshots;
- before/after runner timing where optimisation is part of the issue;
- any discovered runner-specific defect and its resolution; and
- updated CI/testing/deployment documentation.

CI routing changes must add or update regression tests in `tests/ci/change-plan.test.mjs`. Changes
that alter what is required before merge must be reviewed against the Git methodology rather than
silently changing project process in YAML.

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
