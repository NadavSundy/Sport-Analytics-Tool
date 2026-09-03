# CI/CD and quality gates

## Status

**Implemented:** change-aware Gitea Pull Request CI, required quality gating, PostgreSQL integration
validation, monorepo hygiene enforcement, independent browser/accessibility validation and
quality-gated automatic deployment of affected frontend, backend and documentation targets.

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

The CI graph separates cheap prerequisite validation from expensive test lanes. Browser and database
work does not begin until the hosted preflight succeeds, so formatting, hygiene, lockfile and static
quality failures stop the pipeline before consuming those longer-running lanes:

```text
plan -> preflight ----------------+-> validation --------+
                                  +-> browser (if required) ----+-> quality
                                  +-> database (if required) ---+
```

After `preflight` succeeds, validation, browser and database work may overlap when multiple runners are
available. They safely queue when capacity is constrained. The final `quality` job waits for every lane
that the change plan marked as required and also treats a required preflight failure as a merge-blocking
failure.

### Dedicated repository runner

The repository supplements the shared Wits Gitea runners with a
repository-scoped Azure-hosted runner named `sport-analytics-runner-1`.

The dedicated runner advertises the same `ubuntu-24.04` label as the shared
runners. This preserves the existing workflow definitions while adding
repository-specific capacity when the Azure VM is running.

The dedicated runner is intentionally supplementary:

- when it is running, repository jobs have additional available runner capacity;
- when it is stopped, workflows continue to use the shared Wits runners;
- runner capacity is limited to one concurrent job;
- the Azure VM is manually started when extra capacity is useful;
- Azure automatically shuts the VM down at 22:00 South Africa time.

The runner host uses:

- Azure Ubuntu Server 24.04 LTS;
- `Standard_B2als_v2` with 2 vCPU and 4 GiB RAM;
- 4 GiB swap;
- Docker-based Gitea Actions execution;
- persistent runner identity storage under `/opt/gitea-runner/data`.

The repository registration token is not retained after successful
registration. Runner restarts use the persisted `.runner` identity instead.

Team members who require the additional CI capacity receive Azure RBAC access
scoped to the runner VM. They can start or deallocate the VM without receiving
the Azure account owner's credentials, SSH private key, or Gitea registration
token.

Operational, recovery, security and cost-control procedures are documented in
[Dedicated CI runner operations](../deployment/runner-operations.md).

## Change-aware planning

`scripts/ci-change-plan.mjs` compares the Pull Request base with the current head and classifies the
changed paths. Its rules are regression-tested by `tests/ci/change-plan.test.mjs`.

The planner is conservative. Unknown files, root dependency changes and workflow/tooling changes
select full application validation rather than guessing that a check can be skipped. A manual
`workflow_dispatch` also selects full validation.

| Change class                                                             | Required hosted work                                                                          | Work normally skipped                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Lightweight evidence (`.csv`, images, PDFs, DOCX, ZIP under `evidence/`) | plan, required-file structure check, final quality gate                                       | npm install, app tests/builds, MkDocs, PostgreSQL, Playwright, coverage |
| Prettier-managed evidence / documentation                                | formatting and strict documentation checks as applicable                                      | unrelated app, database and browser suites                              |
| Frontend unit-test-only                                                  | contracts/hygiene as required, frontend lint/typecheck/unit                                   | production browser build, PostgreSQL and Playwright                     |
| Frontend implementation/browser                                          | contracts/hygiene, frontend lint/typecheck/unit plus browser-lane production build/Playwright | PostgreSQL                                                              |
| Backend source                                                           | contracts/hygiene, backend lint/typecheck/unit/API/build, OpenAPI, PostgreSQL integration     | Playwright unless another changed path requires it                      |
| Shared contracts                                                         | contracts plus affected frontend/backend and browser-lane validation                          | PostgreSQL unless another changed path requires it                      |
| Root dependency, shared tooling, CI workflow or unknown path             | full Pull Request application validation                                                      | nothing except duplicate PR coverage                                    |

Documentation-only changes still run a strict MkDocs build. OpenAPI-related documentation also runs
Redocly linting.

## Fail-fast hosted preflight

Hosted CI keeps required repository policy checks server-side even though developers can optionally run
local CI. The `preflight` job is the authoritative early owner for inexpensive failures that should be
known before browser or PostgreSQL work starts.

When selected by the change plan, preflight performs:

- a clean `npm ci`, which also validates `package.json` / `package-lock.json` consistency;
- repository formatting;
- monorepo hygiene and architecture checks;
- contracts, backend and frontend lint/typecheck as applicable;
- the shared-contract build needed by dependent workspace static analysis;
- deployment-helper regression tests when deployment tooling is affected; and
- OpenAPI linting when the API description can be affected.

The `plan` job also runs `git diff --check` against the committed Pull Request/push range before any
npm-backed lane begins.

Longer functional work remains outside preflight. The `validation` lane owns workspace tests, builds,
strict documentation validation and post-merge/manual coverage. Browser and database lanes own only
their specialised production-browser/accessibility and PostgreSQL integration responsibilities.

Formatting and hygiene are therefore authoritative once in hosted CI. Browser/database jobs still run
their own `npm ci` and prerequisite contract/application builds because Gitea jobs execute in isolated
runner workspaces; these are execution prerequisites rather than duplicated quality gates.

## Browser and accessibility execution strategy

Browser validation remains authoritative when the planner sets `e2e=true`, but the hosted execution
matrix avoids duplicating every journey at every viewport:

- desktop Chromium runs the complete Playwright suite;
- Pixel 7 Chromium runs the representative tests tagged `@mobile` for authentication, homepage,
  public browsing, player/statistics views, submission/access workflows, administrator feedback and
  accessibility;
- the dedicated accessibility matrix keeps all three core routes in both Day Match and Night Match
  on desktop, while mobile uses a focused public/sign-in scan and relies on the tagged responsive
  journeys for additional Axe coverage;
- CI defaults to two Playwright workers on the shared university runners. A hosted four-worker trial
  saturated the runner and caused unrelated Axe/navigation tests to exceed their 30-second limits.
  `PLAYWRIGHT_WORKERS=1` remains available for diagnosis, while higher values should only be adopted
  after hosted benchmarking; and
- the browser lane builds the shared contracts workspace first, then builds the production frontend once and
  sets `PLAYWRIGHT_REUSE_BUILD=1` so the Playwright preview server does not rebuild the same bundle.

Hosted Playwright allows 45 seconds per test and one retry. The longer hosted timeout is a runner-load
allowance rather than an application-performance target; one retry is retained for transient browser
flakiness without multiplying a persistent failure across three expensive attempts.

The representative mobile subset is a reduction in duplicate viewport execution, not removal of
mobile accessibility testing. New journeys whose behaviour materially changes at narrow widths should
be tagged `@mobile` and covered by the browser-strategy regression tests.

## Test and production environment separation

React Testing Library unit tests require the React test/development build because they use `act(...)`.
The normal validation job therefore keeps:

```text
NODE_ENV=test
```

for frontend unit tests. Only the browser lane's production frontend bundle and Playwright run override the
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

## Optional local CI parity before a push

Hosted Gitea CI remains the authoritative merge gate, but developers can optionally run the same
change-aware validation locally before spending hosted runner time. Local CI is a convenience, not a
mandatory step.

The native command is:

```bash
npm run ci:local
```

It compares the current branch and working tree with `origin/main` (falling back to local `main`),
reuses `scripts/ci-change-plan.mjs`, and runs only the validation lanes selected for that change set.
Native execution validates the frozen dependency graph with `npm ci --dry-run`, so
`package.json`/`package-lock.json` drift is caught without deleting or rebuilding the developer's
existing `node_modules`.

Native execution uses the developer's current operating system. Ubuntu/Linux gives the closest native
match to the hosted `ubuntu-24.04` jobs. Windows and macOS remain useful for early feedback but can
differ in filesystem, shell and platform-specific dependency behaviour. Database-selected native runs
use the repository's disposable embedded PostgreSQL 16 runtime and do not require Docker.

Docker execution uses a real `npm ci` inside its isolated Linux workspace, matching hosted dependency
installation without modifying the developer's host `node_modules`.

For higher Linux parity from any supported development host, use:

```bash
npm run ci:docker
```

The Docker command runs the same local CI orchestrator in an Ubuntu 24.04 Playwright image with
Node.js 22 pinned to match hosted CI. The repository is copied into the container before validation so
Linux `node_modules` and generated output do not overwrite the developer's host installation. Browser
validation uses the pinned Playwright 1.62.1 Noble image. Database validation uses the same migrations,
seed and integration-test suite with a disposable PostgreSQL 16 runtime inside the Linux environment.

Both commands are change-aware. Documentation-only changes do not deliberately start browser or
database suites, while unknown/root tooling changes conservatively select full validation just as the
hosted planner does. `CI_LOCAL_BASE=<ref>` may be supplied to override the normal `origin/main`/`main`
comparison when reproducing a special branch scenario.

### Optional pre-push hook

Developers who want automatic local feedback may opt in to the repository-owned pre-push hook:

```bash
npm run hooks:install
```

The hook only calls `npm run ci:local`; it does not define a second quality policy and it does not force
Docker execution. Developers who do not install the hook can push normally. Remove the opt-in hook for
the current clone with:

```bash
npm run hooks:remove
```

The installer refuses to overwrite a different existing `core.hooksPath`. As with any local Git hook,
the pre-push check can be bypassed and therefore never replaces the hosted required status.

Recommended use is:

```text
normal development -> optional npm run ci:local -> git push -> authoritative hosted CI
                                   |
                                   +-> npm run ci:docker when Linux parity is important
```

For command selection, optional pre-push setup and troubleshooting, see
[Local CI validation](local-ci.md).

## Deployment relationship

Pull Request validation and deployment have separate responsibilities. Pull Request CI proves that a
change satisfies the required quality gate. After merge, the same change-aware planner runs against the
`main` push and automatic deployment is permitted only after that commit's `quality` job succeeds.

The validated-main flow is:

```text
Pull Request quality -> review/merge -> main change-aware quality
                                      -> affected deployment target(s)
                                      -> target-specific live smoke checks
```

The planner records independent production-impact decisions for `deployFrontend`, `deployBackend` and
`deployDocs`. A deployment job depends on both `plan` and `quality`, runs only for a push to `main`, and
runs only when its own production target is affected.

| Change                                          | Automatic deployment after main quality          |
| ----------------------------------------------- | ------------------------------------------------ |
| Frontend production implementation              | Frontend only                                    |
| Frontend test-only                              | None                                             |
| Backend production implementation/configuration | Backend only                                     |
| Backend test-only                               | None                                             |
| Shared contracts                                | Frontend and backend                             |
| Published MkDocs content/configuration          | Documentation only                               |
| Evidence-only                                   | None                                             |
| CI/workflow-only                                | None merely because CI changed                   |
| Root production dependency manifests            | Conservatively affected application/docs targets |

Deployment jobs do not repeat authoritative unit/API/browser suites already used to make the quality
decision. They retain deployment-specific work: reproducible installation, production builds/artifact
preparation, secret validation, publication and live verification.

### Frontend

Automatic frontend deployment builds shared contracts and the production Vite bundle with deployment
secrets, publishes to Azure App Service and smoke checks the public site. It intentionally does not
re-run `npm run test:frontend`.

### Backend

Automatic backend deployment builds the production backend (whose prebuild prepares shared contracts),
creates and locally smoke checks the deployment artifact, publishes the ZIP to Azure and verifies both
`/api/v1/health` and the read-only database path. It intentionally does not repeat backend lint,
typecheck, unit or API suites after `quality` has already passed.

The Azure ZIP/Kudu implementation is shared by automatic and manual recovery deployment through
`scripts/deploy-backend-azure.py`, preventing those paths from drifting.

### Documentation

Published `docs/**`, `mkdocs.yml` and `requirements-docs.txt` changes can request documentation
deployment. Pull Request/main validation performs the strict MkDocs quality check; the deployment job
builds the site strictly again because the generated `site/` directory is the artifact that Wrangler
publishes, then smoke checks Cloudflare Pages. Application-only and evidence-only changes do not deploy
documentation.

The standalone `.gitea/workflows/deploy-frontend.yml`, `deploy-backend.yml` and `deploy-docs.yml`
workflows are manual `workflow_dispatch` recovery/redeployment paths. They are not independent push
pipelines and therefore cannot race or deploy before the shared validated-main quality decision.

Application deployment paths are documented in:

- [Azure backend](../deployment/azure-backend.md)
- [Azure frontend](../deployment/azure-fronted.md)
- [Cloudflare Pages](../deployment/cloudflare_pages.md)
- [Deployment overview](../deployment/overview.md)

An environment-specific deployment failure still occurs after the source commit has been merged and
cannot undo that merge. Record and resolve the deployment failure through the normal bug/infrastructure
process; do not weaken the required quality gate to hide it.

## Failure interpretation

The job graph should be read as follows:

- `plan` failure: changed paths could not be safely planned, committed patch whitespace failed, or
  planner regression tests failed;
- `preflight` skipped: expected only when the plan requires no npm-backed validation, such as a
  lightweight evidence-only change;
- `preflight` failure: dependency installation/lockfile validation, formatting, hygiene, static
  lint/typecheck, deployment-helper regression or OpenAPI validation failed; expensive required lanes
  do not start;
- `validation` skipped: expected when npm-backed validation is not required, or when required preflight
  did not succeed;
- `validation` failure: one or more required workspace tests/builds, documentation checks or coverage
  checks failed;
- `browser` skipped: expected when browser validation is not required, or when required preflight did
  not succeed;
- `browser` failure: the production browser build, Playwright journey or accessibility validation failed;
- `database` skipped: expected when database validation is not required, or when required preflight did
  not succeed;
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
