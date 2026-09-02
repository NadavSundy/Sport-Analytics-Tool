# Issue #352 — frontend deployment quality gating verification

**Date:** 2 September 2026
**Issue:** #352 — Prevent duplicate flaky frontend tests from blocking post-merge deployment

## Defect observed

PR #349 passed the required Pull Request quality gate and was merged to `main`. The separate frontend
Azure deployment workflow then re-ran all 115 frontend unit tests during `Verify frontend workspace`.
One asynchronous anonymous-submission redirect assertion did not complete within Testing Library's
default wait on the hosted runner. The remaining 114 frontend tests passed, but the repeated unit-test
failure prevented the production build, Azure deployment and deployed smoke check from running.

A manual re-run of the same deployment workflow subsequently passed, confirming that the post-merge
failure was transient rather than a deterministic application defect.

## Root cause

The normal frontend deployment path duplicated source validation that was already authoritative in
`Sport Analytics CI / quality`. The deployment workflow also ran independently on `push` to `main`, so
it could begin without depending on the completed `main` quality result.

This created two avoidable failure modes:

1. repeated/flaky source tests could block deployment after a valid merge; and
2. deployment and quality verification could run independently rather than as one gated CI/CD chain.

## Resolution

The normal frontend deployment path is moved into `Sport Analytics CI` as a post-quality job.

The change-aware planner now exposes a separate `deployFrontend` decision. This decision represents
production impact rather than test scope:

- frontend implementation/configuration changes: deploy;
- shared contracts: deploy;
- root npm manifests/shared TypeScript configuration: deploy;
- frontend test-only changes: do not deploy;
- documentation/evidence/CI-only changes: do not deploy.

The automatic deployment job depends on both `plan` and `quality`, runs only for a qualifying `main`
push, and performs deployment-specific work only:

1. reproducible `npm ci` installation;
2. deployment-secret validation;
3. shared-contract build;
4. production frontend build using the deployment Vite configuration;
5. Azure App Service deployment; and
6. deployed public smoke check.

It deliberately does not repeat `npm run test:frontend` because that suite is already required by the
relevant CI validation lane before `quality` can succeed.

The standalone `.gitea/workflows/deploy-frontend.yml` workflow is retained as a manual
`workflow_dispatch` recovery/redeployment path and likewise avoids duplicate unit tests.

The specific anonymous submission redirect assertion receives a 5-second asynchronous wait so that it
continues to prove navigation to the sign-in heading without relying on the Testing Library default
wait under a loaded shared runner.

## Regression coverage

`tests/deployment/frontend-workflow.test.mjs` verifies that:

- automatic frontend deployment depends on `plan` and `quality`;
- automatic deployment is restricted to a `main` push with `deployFrontend=true`;
- the deployment job does not execute `npm run test:frontend`;
- the deployment job still builds contracts/frontend, deploys through Azure and smoke-checks the live
  site; and
- the standalone deployment workflow remains manual-only and does not duplicate frontend unit tests.

`tests/ci/change-plan.test.mjs` also verifies production deployment classification, including the
important distinction that frontend test-only and CI-only changes do not request deployment.

## Local verification required before push

Run:

```bash
npm run test:ci-routing
npm run test:deployment
npm run test:frontend
npm run format:check
npm run check
python -m mkdocs build --strict
```

## Hosted verification required before closure

Retain evidence showing:

1. the PR quality gate passes;
2. after merge, the `main` quality job passes before `deploy_frontend` starts;
3. the deployment job does not contain a repeated frontend unit-test step;
4. the Azure deployment and deployed frontend smoke check pass; and
5. a frontend test-only or documentation/evidence-only merge does not trigger automatic frontend
   deployment.

## AI Declaration

The preceding verification record was prepared with the assistance of ChatGPT-Web[GPT-5.6 Sol].
