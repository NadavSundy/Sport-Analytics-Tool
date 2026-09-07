# Issue #382 — Optional change-aware local CI parity verification

Date: 2026-09-03

## Objective

Provide optional local reproduction of the hosted change-aware CI plan so
developers can detect failures before consuming hosted Gitea runner time.

Hosted Gitea CI remains the authoritative merge gate.

## Implemented commands

```text
npm run ci:local
npm run ci:docker
```

`ci:local` executes the existing change-aware CI plan natively.

`ci:docker` executes the same plan inside an Ubuntu 24.04 / Node.js 22 /
Playwright 1.62.1 Docker environment for closer hosted-CI parity.

## Change-aware routing

Both commands reuse `scripts/ci-change-plan.mjs`.

The local implementation does not define an independent set of change-routing
rules.

CI routing regression tests passed after adding local-CI coverage.

## Native dependency validation

Native local CI uses:

```text
npm ci --dry-run --ignore-scripts --no-audit --no-fund
```

This detects `package.json` / `package-lock.json` inconsistencies without
deleting or rebuilding the developer's existing `node_modules`.

This behavior was introduced after testing identified that a real native
`npm ci` could interfere with a developer's active dependency installation.

## Docker dependency validation

Docker local CI executes a real `npm ci` inside an isolated Linux workspace.

Host `node_modules` is excluded when copying the repository into the container,
preventing Windows/macOS dependencies from contaminating Linux parity
validation.

## Database behavior

Native `ci:local` uses the repository's disposable embedded PostgreSQL 16
runtime and does not require Docker.

Docker `ci:docker` uses the same database integration suite within the isolated
Linux environment.

## Optional pre-push integration

The repository provides:

```text
npm run hooks:install
npm run hooks:remove
```

The pre-push hook is opt-in.

It invokes `npm run ci:local` and does not force Docker validation.

Developers who do not install the hook can continue to push normally.

## Verification

Verified successfully on:

- Windows native execution;
- WSL native execution;
- Docker/Linux parity execution.

The Docker parity image was built successfully and the complete change-aware
validation plan passed.

The following were also verified:

- local CI routing regression tests;
- frozen dependency validation;
- repository formatting;
- hygiene and architecture checks;
- application validation;
- database integration tests;
- browser validation;
- strict MkDocs documentation build;
- optional hook installation and removal;
- host `node_modules` isolation from Docker parity execution.

## Result

Issue #382 provides optional early local feedback without weakening or
replacing hosted CI.

Developers can choose native execution for convenience or Docker execution for
closer Linux parity, while Gitea CI remains the final authoritative quality
gate.

## AI declaration

ChatGPT-Web[GPT-5.6 Sol] assisted with the local CI architecture, Docker parity
implementation, change-aware routing reuse, optional Git hook design,
troubleshooting, regression-test design and documentation.

All implementation changes and validation commands were reviewed and executed by Shayna Unterslak.
