# Frontend Deployment (Cloudflare Pages)

## Hosting Platform

Cloudflare Pages. The deployed frontend is a static browser bundle produced by Vite; it does not
require a continuously running application server, so it is no longer coupled to Azure App Service
compute. See `docs/adr/0003-azure-hosting.md` for the original hosting decision and this document for
the frontend's subsequent migration off it.

> **Migration status:** the existing Azure App Service frontend (`statsthegame-web-dev`) is kept running
> in parallel until Cloudflare Pages passes acceptance (see "Cutover and Azure retirement" below). Do not
> remove the Azure frontend deployment path until that has happened. The backend already migrated from
> Azure App Service to Azure Container Apps (issue #563; see `docs/deployment/azure-backend.md`), which
> is what this issue was originally blocked on — that dependency is now resolved.

## Runtime

Node.js 22 LTS is used by the build environment. The deployed artifact itself is pre-built static
HTML/CSS/JS with no server-side runtime.

## Cloudflare Pages Project

```
sport-analytics-tool-web
```

Public frontend URL:

```
https://sport-analytics-tool-web.pages.dev
```

If a custom domain is later attached to the Pages project, update `FRONTEND_URL` in
`.gitea/workflows/ci.yml` and `.gitea/workflows/deploy-frontend.yml`, the backend
`AZURE_BACKEND_CORS_ORIGINS` secret, and the Supabase Auth redirect URL allow-list together — these
three must always describe the
same origin.

## Framework

- React
- Vite
- React Router (`BrowserRouter`), which requires the SPA fallback described below.

## Client-side routing (SPA fallback)

Cloudflare Pages serves static files by default, so a direct request or browser refresh on a
client-side route (for example `/fixtures/42` or `/competitions/7`) would otherwise be resolved as a
missing file and return a platform `404`, even though the route exists inside the deployed React app.

`apps/frontend/public/_redirects` declares a catch-all rewrite:

```text
/*    /index.html   200
```

Vite copies everything under `apps/frontend/public/` into `apps/frontend/dist/` unchanged during the
build, so this file ships as `dist/_redirects` and Cloudflare Pages applies it automatically. The rule
returns HTTP `200` (a rewrite, not a redirect), so the browser's address bar keeps showing the
originally requested URL and React Router take over client-side routing from `index.html`. This is
covered by `tests/deployment/frontend-spa-routing.test.mjs`.

## Environment Variables

| Variable                        | Current status | Description                                                                        |
| ------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`             | Used           | Deployed backend `/api/v1` base URL.                                               |
| `VITE_SUPABASE_URL`             | Used           | Public Supabase Auth project URL.                                                  |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Used           | Public Supabase publishable key.                                                   |
| `VITE_APP_NAME`                 | Reserved       | Present in the example environment file but not currently read by frontend source. |
| `VITE_APP_ENV`                  | Reserved       | Present in the example environment file but not currently read by frontend source. |

Only public-safe configuration may use a `VITE_` name, because Vite inlines every `VITE_`-prefixed
value directly into the built JavaScript bundle at build time; anything with that prefix should be
treated as visible to any visitor. Configuration values are supplied at build time as Gitea Actions
secrets (see below), not committed to the repository.

### Guarding against embedded secrets

Because the risk is a _future_ accidental leak (someone hardcoding or logging a server-only value in
frontend source) rather than the normal Vite build path, CI also runs
`node scripts/check-frontend-bundle-secrets.mjs apps/frontend/dist` against the built output before
every deployment. It scans the built JS/CSS/HTML for backend-only configuration names (for example
`SUPABASE_SECRET_KEY`, `DATABASE_URL`, `AZURE_STORAGE_*`, `CLOUDFLARE_API_TOKEN`) and for
generic secret shapes such as embedded database connection strings or private key blocks, and fails
the deployment if any are found. See `tests/deployment/frontend-bundle-secrets.test.mjs`.

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
5. scans `apps/frontend/dist` for embedded server-only secrets and fails the deployment if any are
   found;
6. deploys that directory to the `sport-analytics-tool-web` Cloudflare Pages project using
   `npx wrangler pages deploy apps/frontend/dist --project-name=sport-analytics-tool-web`; and
7. retries the public frontend URL until it returns a successful response containing the expected
   `Stat'sTheGame` page title.

The deployment job deliberately does **not** re-run the frontend unit-test suite. Relevant unit tests,
linting, type checking, production build validation and browser checks are already enforced by the
required CI quality path before deployment is allowed to start.

`.gitea/workflows/deploy-frontend.yml` remains available through `workflow_dispatch` as a manual
recovery/redeployment path. It performs the same deployment-specific build, secret scan, Cloudflare
publication and smoke check without duplicating the authoritative unit-test suite.

The smoke-check helper reports each failed attempt and fails the workflow after the configured attempt
limit, keeping an unavailable or incorrect deployment visible as a failed Action. This contract is
verified in `tests/deployment/frontend-workflow.test.mjs`.

## Gitea Action secrets

| Secret                          | Purpose                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`          | Authenticates the Wrangler Cloudflare Pages deployment.       |
| `CLOUDFLARE_ACCOUNT_ID`         | Identifies the Cloudflare account/Pages project to deploy to. |
| `VITE_API_BASE_URL`             | Selects the deployed `/api/v1` backend at build time.         |
| `VITE_SUPABASE_URL`             | Selects the public Supabase Auth project.                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Configures the browser-safe Supabase client key.              |

The Cloudflare API token should be scoped to only the permissions required to deploy the
`sport-analytics-tool-web` Pages project (the same principle already applied to the documentation
site's token).

## Backend origin

`VITE_API_BASE_URL` must point at the backend's Container Apps ingress FQDN
(`https://<fqdn>/api/v1`). `.gitea/workflows/ci.yml`'s `deploy_backend` job resolves this FQDN with
`az containerapp show` on every deploy rather than hardcoding it, but the FQDN itself is stable for the
life of the Container App resource — it does not change between revisions/redeployments, only if the
Container App itself is recreated. So `VITE_API_BASE_URL` only needs to be set once (after the first
backend Container Apps deployment) and re-checked if the backend Container App is ever recreated, not
on every deploy.

## Backend CORS

The backend now runs on Azure Container Apps (see `docs/deployment/azure-backend.md`) and reads its
`CORS_ORIGINS` allow-list from the `AZURE_BACKEND_CORS_ORIGINS` Gitea secret at deploy time (passed as
the Bicep `corsOrigins` parameter — see the `deploy_backend` job in `.gitea/workflows/ci.yml`), so
adding the Cloudflare Pages origin is an operational secret change, not a code change:

```
AZURE_BACKEND_CORS_ORIGINS=https://sport-analytics-tool-web.pages.dev,<any other required origins>
```

Add the new origin without removing the existing Azure frontend origin until Azure retirement (see
below), and do not widen `AZURE_BACKEND_CORS_ORIGINS` to a wildcard merely to make the migration
easier — only the
specific deployed frontend origin(s) should be allowed.

## Supabase Auth configuration

Supabase Auth enforces its own allow-list for redirect/callback URLs independent of backend CORS. In the
Supabase project dashboard (Authentication → URL Configuration), add:

- `https://sport-analytics-tool-web.pages.dev` as an additional **Site URL** or **Redirect URL**, and
- `https://sport-analytics-tool-web.pages.dev/auth/callback` (the route handled by
  `AuthenticationCallbackPage`) as an allowed redirect URL.

Do this before treating the Cloudflare deployment as accepted — sign-in, sign-up, password reset and
session persistence all depend on Supabase recognizing the new origin, and this step cannot be
automated from this repository since it is external dashboard configuration.

## Acceptance checklist

Before retiring the Azure frontend, verify against the Cloudflare Pages deployment:

- [ ] Public URL loads (`/`).
- [ ] Direct navigation to a nested client-side route works (for example a fixture or statistics route).
- [ ] Refreshing a nested client-side route does not return a Cloudflare `404`.
- [ ] Public, unauthenticated API-backed functionality works end to end against the deployed backend.
- [ ] Sign-up, sign-in, sign-out and (where applicable) password reset all work.
- [ ] Authenticated session persists across a reload.
- [ ] Auth redirect/callback behaviour completes correctly (no redirect-URL rejection from Supabase).
- [ ] Authenticated functionality (for example submissions/admin routes) works.
- [ ] No server-only secret is present in the deployed bundle
      (`node scripts/check-frontend-bundle-secrets.mjs apps/frontend/dist` passes).

## Cutover and Azure retirement

The Azure App Service frontend (`statsthegame-web-dev`) is kept live during acceptance so there is a
known-good fallback while Cloudflare Pages is verified. Once every item in the acceptance checklist
passes against the Cloudflare Pages URL:

1. remove the Azure frontend origin from `AZURE_BACKEND_CORS_ORIGINS` (after confirming nothing else
   depends on it);
2. remove the Azure frontend origin from the Supabase Auth redirect allow-list;
3. decommission the `statsthegame-web-dev` Azure App Service; and
4. update `docs/deployment/overview.md` and `docs/adr/0003-azure-hosting.md` to record that the frontend
   no longer uses Azure App Service.

The backend already migrated off Azure App Service onto Container Apps (issue #563), with
`statsthegame-api-dev` retained only as its own manual rollback path (see
`docs/deployment/azure-backend.md`). Once the frontend also stops using App Service, neither normal
frontend nor backend hosting depends on the shared App Service Plan any longer, so it can be removed
entirely provided no other documented workload still depends on it — check for one before deleting the
plan itself.

## AI Declaration

This document was drafted with the assistance of Claude (Anthropic) migrating the previous
Azure App Service frontend deployment documentation to Cloudflare Pages.
