# Azure application hosting

Azure Container Apps is the backend platform (issue #563 migrated it off Azure App Service). The
frontend has separately moved off Azure App Service entirely, onto Cloudflare Pages (issue #564; see
`docs/deployment/frontend-cloudflare-pages.md`), because its build output is a static bundle with no
server-side runtime. The historical frontend and backend App Service resources are both retained as
acceptance-period/rollback targets — see the per-component docs for details — but neither is the normal
deployment path any longer.

ADR 0003 records the original App Service decision for both components and has been marked superseded
for both; see `docs/adr/0003-azure-hosting.md`.

## Selected mapping

| Component            | Service              | Runtime/build context                                |
| -------------------- | -------------------- | ---------------------------------------------------- |
| React frontend       | Cloudflare Pages     | Node.js 22 LTS build environment; static Vite bundle |
| Express backend API  | Azure Container Apps | Node.js 22 non-root production container             |
| Async batch worker   | Azure Container Apps | Node.js 22 LTS non-root container                    |
| Private object bytes | Azure Blob Storage   | Backend managed identity and private container       |

The PostgreSQL database and managed authentication remain on Supabase. The public MkDocs documentation site is hosted separately on Cloudflare Pages, alongside the frontend application (a separate Pages project).

## App Service history, Container Apps migration and frontend static hosting

ADR 0003 records the original App Service reasons:

- Azure student resources;
- managed HTTPS;
- native Node.js support; and
- a relatively simple deployment model for Sprint 1.

The backend now uses the existing Container Apps environment, ACR, Key Vault and Blob Storage with
separate pull and runtime managed identities. Its ingress is external HTTPS-only, its probes use
`/api/v1/health`, and its normal deployment is an immutable container image. The worker remains a
separate Container App with the Service Bus boundary; the API has no Service Bus configuration.

The historical backend App Service `statsthegame-api-dev` is retained during acceptance so that it
can be redeployed manually if revision recovery is insufficient. It must not be removed or treated as
an automatic rollback guarantee. See [Azure backend deployment](azure-backend.md) for capacity,
configuration, rollout and rollback detail.

The frontend is a pre-built static bundle with no server-side runtime, so it does not need App Service
compute at all: it is now deployed to a Cloudflare Pages project and served from Cloudflare's edge, with
client-side routing preserved through a Pages `_redirects` SPA fallback. The historical frontend App
Service `statsthegame-web-dev` is kept live in parallel only until Cloudflare Pages acceptance succeeds,
then retired — see [Frontend deployment (Cloudflare Pages)](frontend-cloudflare-pages.md) for the
acceptance checklist, required secrets, backend CORS and Supabase Auth configuration, and the retirement
sequence.

Once the frontend's Azure App Service deployment is retired, neither the frontend nor the backend's
normal deployment path depends on Azure App Service; the shared App Service Plan can then be reviewed
for removal (see the same document's retirement section).

## Other alternatives recorded

### Azure Static Web Apps

Advantages:

- optimised for static frontend hosting.

Reason not selected for the original foundation:

- would have introduced a separate hosting/deployment path while the team initially selected App Service
  for both application components. The frontend has since moved to Cloudflare Pages instead, which the
  project already used for its documentation site, avoiding introducing a third hosting provider.

## Deployment verification

The frontend workflow builds the Vite bundle, scans it for embedded server-only secrets, then deploys it
to Cloudflare Pages with Wrangler and smoke checks the public URL. The backend workflow builds a Node 22
container, proves its local health endpoint with inert configuration, pushes an immutable SHA image,
deploys Bicep, waits for the matching healthy revision, then verifies both `/api/v1/health` and a
read-only database-backed competition request.

Workflow definitions are not evidence of a successful release by themselves. Each release must
retain the corresponding passing Gitea Action link and smoke-check output. Rollback evidence and
runner availability remain operational evidence rather than claims made by this technology-selection
document.

The Container Apps backend runtime identity accesses the private `staged-ingestion` container in
`statsthegameblobdev` through `DefaultAzureCredential`; the container receives only non-secret Blob
identifiers. See the [private object-storage operations guide](object-storage-operations.md) for the
external RBAC and verification requirements.

## AI Declaration

The preceding document was reviewed and aligned with the accepted Azure ADR with the assistance of
ChatGPT-Web[GPT-5.6 Sol] and updated for the automated deployment checks with the assistance of
Codex[GPT-5].
The managed-identity Blob Storage deployment mapping was updated with the assistance of
Codex[GPT-5].
The separately scoped Container Apps worker mapping was updated with the assistance of
Codex[GPT-5].
The Issue #563 backend Container Apps migration documentation was updated with the assistance of
Codex[GPT-5].
The Issue #564 frontend Cloudflare Pages migration documentation was updated with the assistance of
Claude (Anthropic).
