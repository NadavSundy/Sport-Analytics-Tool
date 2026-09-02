# Azure Frontend Deployment

## Hosting Platform

Azure App Service (Linux)

## Runtime

Node.js 22 LTS is used by the deployment/build environment. The deployed frontend itself is the static browser bundle produced by Vite.

## Resource

`statsthegame-web-dev`

## Framework

- React
- Vite

## Environment Variables

| Variable                        | Current status | Description                                                                        |
| ------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`             | Used           | Backend Azure `/api/v1` base URL.                                                  |
| `VITE_SUPABASE_URL`             | Used           | Public Supabase Auth project URL.                                                  |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Used           | Public Supabase publishable key.                                                   |
| `VITE_APP_NAME`                 | Reserved       | Present in the example environment file but not currently read by frontend source. |
| `VITE_APP_ENV`                  | Reserved       | Present in the example environment file but not currently read by frontend source. |

Only public-safe configuration may be exposed through `VITE_` variables.

## Deployment

Automatic frontend deployment is gated by the change-aware `Sport Analytics CI` workflow. A
production-impacting frontend change merged to `main` must first complete the `quality` job
successfully. The planner exposes `deployFrontend=true` only for changes that can affect the deployed
browser application, such as frontend implementation, shared contracts and relevant root dependency
configuration. Test-only, documentation, evidence and CI-only changes do not redeploy the frontend.

After `quality` succeeds, the automatic deployment job:

1. installs the complete workspace reproducibly with `npm ci`;
2. validates the required deployment secrets;
3. builds `@sport-analytics/contracts`;
4. builds `apps/frontend/dist` with `NODE_ENV=production` and the deployed Vite configuration;
5. deploys that directory to `statsthegame-web-dev`, cleaning the old deployment first; and
6. retries the public frontend URL until it returns a successful response containing the expected
   `Stat'sTheGame` page title.

The deployment job deliberately does **not** re-run the frontend unit-test suite. Relevant unit tests,
linting, type checking, production build validation and browser checks are already enforced by the
required CI quality path before deployment is allowed to start. This avoids duplicate runner work and
prevents a repeated flaky unit test from blocking an otherwise validated deployment.

`.gitea/workflows/deploy-frontend.yml` remains available through `workflow_dispatch` as a manual
recovery/redeployment path. It performs the deployment-specific build, Azure publication and smoke
check without duplicating the authoritative unit-test suite.

The smoke-check helper reports each failed attempt and fails the workflow after the configured attempt
limit. This allows normal App Service restart time while keeping an unavailable or incorrect deployment
visible as a failed Action.

## Gitea Action secrets

| Secret                           | Purpose                                                |
| -------------------------------- | ------------------------------------------------------ |
| `AZURE_FRONTEND_PUBLISH_PROFILE` | Authenticates the Azure App Service deployment action. |
| `VITE_API_BASE_URL`              | Selects the deployed `/api/v1` backend at build time.  |
| `VITE_SUPABASE_URL`              | Selects the public Supabase Auth project.              |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Configures the browser-safe Supabase client key.       |

The workflow references these values only through the Gitea `secrets` context and does not print
them. A validation step reports the name of any missing secret and stops before verification or
deployment. Because Vite embeds its configuration in the browser bundle, only public-safe values may
use a `VITE_` name. A recreated App Service may receive a different unique hostname; update the
workflow's public smoke-check URL and the backend `CORS_ORIGINS` setting together if that happens.

## AI Declaration

The preceding document was reviewed and expanded with the assistance of ChatGPT-Web[GPT-5.6 Sol]
and updated for the automated deployment checks with the assistance of Codex[GPT-5].
