# Issue #354 — Backend and documentation deployment alignment

**Date:** 2 September 2026
**Issue:** #354 — Align backend and documentation deployments with validated change-aware main CI

## Objective

Align the remaining backend and documentation deployment paths with the validated-main architecture
already used by frontend deployment. A successful Pull Request remains the source-quality gate; after
merge, `main` is planned and validated again, and only production targets affected by the merged change
may deploy.

## Implemented architecture

The change-aware planner now emits three independent production-impact decisions:

- `deployFrontend`;
- `deployBackend`; and
- `deployDocs`.

All automatic deployment jobs live in `Sport Analytics CI`, depend on both `plan` and `quality`, require
a push to `main`, and require their target-specific planner output to be `true`.
Full-validation files do not stop target discovery: the planner continues across the entire changed-file set so a CI/configuration change combined with real backend/docs changes still deploys those production targets after quality.

The resulting path is:

```text
Pull Request quality -> review/merge -> main quality
                                      -> affected deployment target(s)
                                      -> live smoke verification
```

The standalone frontend/backend/docs deployment workflows are manual `workflow_dispatch` recovery
paths only.

## Backend deployment changes

Backend runtime changes can request Azure deployment; backend test-only changes cannot. Shared
contracts request both frontend and backend deployment. Backend deployment no longer repeats the lint,
typecheck, unit and API suites already enforced before `quality` succeeds.

The deployment path retains:

- production backend/contract build;
- deployment artifact preparation;
- local artifact smoke verification;
- Azure ZIP/Kudu deployment;
- deployed `/api/v1/health` verification; and
- deployed read-only database-path verification.

The existing Azure ZIP/Kudu logic was extracted unchanged from workflow YAML into
`scripts/deploy-backend-azure.py` so automatic and manual recovery paths share one implementation.

## Documentation deployment changes

Published MkDocs inputs (`docs/**`, `mkdocs.yml`, `requirements-docs.txt`) can request Cloudflare Pages
deployment. Application-only, evidence-only and CI-only changes do not deploy docs.

The deployment job still runs `python -m mkdocs build --strict` because it must generate the `site/`
artifact on the deployment runner, then deploys with Wrangler and smoke checks the public site.

## Regression verification

Repository-level Node regression tests cover:

- target-specific backend/docs planning;
- backend test-only no-deploy behaviour;
- published docs deployment routing;
- CI-only no-app-deploy behaviour;
- automatic backend/docs jobs waiting for `quality`;
- no duplicate authoritative backend test suites in deployment;
- manual backend/docs workflows remaining dispatch-only; and
- required production build/artifact/deploy/smoke stages.

Local structural verification performed while preparing the change:

- workflow YAML parses successfully;
- `scripts/deploy-backend-azure.py` compiles with Python;
- CI/deployment regression tests pass.

## Hosted closure evidence required

Before closing #354, retain successful hosted evidence for:

1. the Pull Request quality gate;
2. a published documentation change reaching `quality` and Cloudflare deployment;
3. a production-impacting backend change reaching `quality` and Azure deployment, including health and
   database smoke checks; and
4. confirmation that unrelated/test-only changes do not deploy unaffected targets.

If a separately tracked Azure environment/runtime defect remains open, #354 should not be represented
as proving backend deployment success until that deployment path is green. The architecture change does
not weaken or bypass such a defect.

## AI Declaration

The preceding CI/CD architecture, implementation plan, regression tests and documentation were prepared
with the assistance of ChatGPT-Web[GPT-5.6 Sol] and reviewed by the student before submission.
