# Issue #348 — Change-aware hosted CI verification

**Date:** 2 September 2026  
**Related issues:** #348, #259  
**Branch:** `chore/348-change-aware-ci`

## Purpose

Verify that hosted Pull Request CI can reduce unnecessary runner work without weakening the required
`Sport Analytics CI / quality (pull_request)` merge gate, while also enforcing the monorepo hygiene
checks required by #259.

## Baseline

The previous complete hosted quality workflow took approximately 10–11 minutes because every Pull
Request update executed the complete npm, documentation, PostgreSQL, Playwright and coverage path.
This included evidence-only and documentation-only changes.

The optimisation therefore targets elapsed runner time and unnecessary work rather than deleting
quality checks.

## First hosted #348 run — discovered environment defect

The first hosted change-aware run reached frontend validation but failed 106 of 115 frontend tests
with:

```text
act(...) is not supported in production builds of React.
```

The failure was caused by setting `NODE_ENV=production` on the combined frontend lint/typecheck/unit
and build step. React Testing Library unit tests require the React build that supports `act(...)`.

The correction keeps the validation job at `NODE_ENV=test`, runs frontend unit tests in that
environment, and applies `NODE_ENV=production` only to the frontend production build and Playwright
browser step.

This was a CI-environment defect, not an application-test failure.

## Parallel runner optimisation

The original #348 draft made PostgreSQL integration wait for the normal validation lane. The updated
graph starts both independent lanes immediately after planning:

```text
                         +-> validation --------+
plan --------------------+                      +-> quality
                         +-> database (if needed)+
```

This allows a database-relevant Pull Request to use both university-hosted runners concurrently and
reduces wall-clock feedback time. The final `quality` job remains the single required branch
protection result.

Lightweight evidence changes skip the npm-based `validation` job entirely. Documentation, frontend,
backend, shared-contract and cross-cutting changes retain the relevant checks selected by the planner.
Unknown paths continue to fail safely to full Pull Request application validation.

## Coverage optimisation

Coverage currently duplicates unit suites and has no repository-wide threshold. It is therefore not
used as a duplicate Pull Request gate. Coverage is generated for relevant pushes to `main` and manual
full validation.

If a coverage threshold becomes merge-affecting later, this decision must be reviewed.

## #259 hygiene enforcement

`npm run hygiene` is now selected for relevant application, contracts, dependency, configuration and
full-validation changes. It runs:

- Knip;
- syncpack; and
- dependency-cruiser.

Known unused-export findings identified during #10/#259 preparation were remediated before hosted
enforcement was enabled.

## Local verification completed before hosted rerun

The following checks were completed successfully on the branch before the hosted rerun:

```text
npm run test:ci-routing
npm run hygiene
npm run check
npm run test:e2e
```

The Playwright suite passed all 54 tests on rerun. The database-local check should also be retained
with the Pull Request evidence when run for the final CI configuration.

## Hosted verification still required

Before #348/#259 are closed, retain evidence that:

- `plan` succeeds on the university runner;
- `validation` and `database` start independently when both are required;
- frontend unit tests pass with `NODE_ENV=test`;
- production build and Playwright run with `NODE_ENV=production`;
- hygiene succeeds remotely;
- the final `Sport Analytics CI / quality (pull_request)` status is green;
- an evidence-only or documentation-only follow-up demonstrates the reduced path; and
- before/after elapsed times are recorded.

Do not close #348 or #259 solely from local validation.

## Documentation

The implementation and maintenance rules are documented in:

- `docs/development/ci-cd.md`;
- `docs/development/testing.md`; and
- `docs/deployment/overview.md`.

This documentation implements the existing Git/project methodology and does not silently change the
team's merge methodology.

## AI Declaration

The preceding evidence record was planned, generated, reviewed and edited with the assistance of
ChatGPT-Web[GPT-5.6 Sol].
