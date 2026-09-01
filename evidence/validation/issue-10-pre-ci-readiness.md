# Issue #10 — Pre-runner CI readiness verification

**Date:** 28 August 2026  
**Branch:** `ci/10-pre-runner-readiness`  
**Issue:** #10 — Restore green CI and reproducible installation

## Purpose

Revalidate the current repository before Gitea Actions runners become available and remove repository-side causes that would prevent the CI workflow from succeeding.

Hosted Gitea Actions execution remains blocked by the external runner dependency.

## Findings and remediation

### 1. Generated MkDocs output had returned to source control

The repository already ignores `/site/`, but 17 generated MkDocs files were still tracked.

They were removed from Git tracking while remaining available locally as generated output.

Verification:

```text
git ls-files site
<no output>
```

The `/site/` ignore rule remains in `.gitignore`.

### 2. Clean installation initially failed

A clean installation using `npm ci` initially failed because the committed lockfile did not contain two required transitive package records:

```text
Missing: @emnapi/runtime@1.11.3 from lock file
Missing: @emnapi/core@1.11.3 from lock file
```

The lockfile was regenerated using:

```text
npm install --package-lock-only --ignore-scripts
```

The resulting diff was reviewed before retrying installation.

The subsequent clean installation succeeded:

```text
added 616 packages
npm ci: PASS
```

Local verification runtime:

- Node.js `v24.14.0`
- npm `11.9.0`

The root package continues to support Node.js `>=20`, avoiding an unnecessary change to developers' local environments.

The configured CI reference runtime is now Node.js 22, matching the existing backend and frontend deployment workflows.

### 3. Repository formatting drift

The first `npm run check` attempt stopped at the Prettier gate.

Formatting drift was found in:

- `docs/javascripts/external-links.js`
- `docs/README.md`
- `docs/stylesheets/extra.css`
- `mkdocs.yml`

Only the reported files were formatted.

A subsequent complete repository check passed.

## Core repository quality gate

`npm run check` completed successfully.

Verified:

- repository structure;
- Prettier formatting;
- backend linting;
- frontend linting;
- contracts linting;
- TypeScript type checking;
- contracts build;
- OpenAPI validation;
- backend production build;
- frontend production build;
- contracts production build.

Automated tests executed by the gate:

```text
Backend unit tests:    90 passed
Frontend tests:       102 passed
API tests:            104 passed
Contracts tests:       73 passed
Deployment tests:       4 passed
```

## Database integration

`npm run test:database:local` started an isolated PostgreSQL 16 test database, reset it, applied all current migrations, loaded the deterministic seed, and executed the database suite.

Result:

```text
Test Files  10 passed (10)
Tests       52 passed (52)

DATABASE INTEGRATION TESTS: PASS
```

The current CI workflow uses its PostgreSQL 16 service, explicitly resets, migrates and seeds that database, and then runs the configured database integration suite.

## Browser and accessibility verification

`npm run test:e2e` completed successfully.

Result:

```text
38 passed
```

The Playwright suite exercised desktop and mobile Chromium and includes responsive, keyboard and accessibility behaviour.

## Coverage execution

`npm run test:coverage` completed successfully.

Result:

```text
Test Files  27 passed (27)
Tests       194 passed (194)

Statements  49.07%
Branches    75.74%
Functions   67.82%
Lines       49.07%
```

No new coverage threshold was introduced under Issue #10. This verification confirms that coverage generation executes successfully.

## Documentation verification

The documentation was built locally using:

```text
python -m mkdocs build --strict
```

Local environment:

- Python `3.14.3`
- MkDocs `1.6.1`

Result:

```text
Documentation built successfully.
```

The CI workflow now:

- configures Python 3.12;
- installs the documented dependency set from `requirements-docs.txt`;
- runs `python -m mkdocs build --strict`.

This verifies documentation generation without committing `/site/` output.

## Environment-file verification

Tracked environment files are limited to templates:

```text
apps/backend/.env.example
apps/backend/.env.test.example
apps/frontend/.env.example
```

Local `.env` and `.env.test` files were present but were not tracked.

## Repository hygiene observation

`npm run hygiene` was run as an additional readiness observation.

Knip reported:

- `docs/javascripts/external-links.js` as unused. This is a false positive because MkDocs loads the file through `extra_javascript` in `mkdocs.yml`.
- `CorrectionTarget` as an unused exported type. The interface is used internally by `submission.repository.ts`, but its export appears unnecessary.

These findings were recorded against Issue #259.

No hygiene implementation or CI-enforcement changes were made under Issue #10 because that work belongs to Issue #259.

## Other observations

`npm ci` reported existing dependency audit findings:

```text
11 vulnerabilities
5 moderate
4 high
2 critical
```

No automated `npm audit fix` or forced dependency upgrade was performed under Issue #10 because that could introduce unrelated or breaking dependency changes.

The frontend production build also reports a bundle chunk larger than 500 kB. This is a non-failing performance warning and is not changed under Issue #10.

## CI workflow changes

The configured Pull Request CI workflow now:

1. checks out the repository;
2. uses Node.js 22;
3. installs the workspace using `npm ci`;
4. runs `npm run check`;
5. configures Python 3.12;
6. installs documentation dependencies from `requirements-docs.txt`;
7. runs a strict MkDocs build;
8. installs Playwright Chromium;
9. resets, migrates and seeds PostgreSQL 16;
10. runs database integration tests;
11. runs browser and accessibility tests; and
12. generates coverage.

The main repository check is deliberately run before Python and Playwright setup so ordinary source-quality failures stop the workflow before more expensive CI setup.

## Remaining blocker

The following acceptance evidence cannot be completed until the Wits Gitea Actions runner is available:

- confirm an Actions runner is online;
- confirm its runner labels;
- confirm `runs-on: ubuntu-latest` matches an available runner;
- execute the workflow on the hosted runner;
- capture the successful Gitea Actions result;
- resolve any runner-specific incompatibility revealed by hosted execution;
- enable required `main` status checks only after a successful hosted run.

## Gitea runner-readiness update — 31 August 2026

The repository-side CI/CD configuration was reviewed and updated in preparation
for the university-hosted Gitea Actions runners.

At the time of this validation, the university runner infrastructure was not
available, so hosted workflow execution could not yet be verified. The changes
therefore focus on removing unverified runner assumptions and reducing the
configuration required once runners are provisioned.

### Changes made

The following workflow configuration was updated:

- `.gitea/workflows/ci.yml`
- `.gitea/workflows/deploy-backend.yml`
- `.gitea/workflows/deploy-frontend.yml`

Changes include:

- replaced the provisional hard-coded `ubuntu-latest` runner label with the
  repository Actions variable `${{ vars.RUNNER_LABEL }}`
- added `workflow_dispatch` to the main CI workflow so it can be manually
  executed immediately after runner provisioning
- retained manual execution support for the frontend and backend deployment
  workflows
- renamed the workflows to:
  - `Sport Analytics CI`
  - `Sport Analytics - Deploy Backend`
  - `Sport Analytics - Deploy Frontend`
- documented the externally managed runner configuration in
  `docs/deployment/overview.md`
- documented PostgreSQL service networking as an item that must be confirmed
  during the first hosted runner execution

### Runner configuration approach

The correct runner label cannot currently be determined because the
university-hosted runners have not yet been provisioned.

Rather than hard-coding another assumed runner environment, all workflows now
reference:

`RUNNER_LABEL`

Once Gitea runners become available, this repository variable must be set to
an actual label advertised by the university runner.

This means that runner provisioning should not require a further source-code
change solely to select the runner.

### Local validation

The workflow files were checked using:

```text
npx prettier --check .gitea/workflows/*.yml

Issue #10 must therefore remain blocked by the server-side runner dependency until hosted verification is complete.

### Hosted runner availability update — 1 September 2026

The university Gitea Actions runner infrastructure is now available.

Two global runners were observed online:

- `sdp-runner-1`
- `sdp-runner-2`

Both runners advertise:

- `ubuntu-latest`
- `ubuntu-24.04`
- `ubuntu-22.04`

The project workflows have therefore been pinned to `ubuntu-24.04`.

This replaces the previous provisional `RUNNER_LABEL` configuration, which
was introduced while the available runner labels were unknown.

Hosted execution is now being validated.

Refs #10

The preceding document was generated with the assistance of: ChatGPT-Web[GPT-5.6 Sol]
```
