# Azure application hosting

Azure App Service (Linux) remains the frontend platform. The backend API is migrating to Azure
Container Apps while the existing App Service remains an acceptance-period rollback target.

ADR 0003 records the original App Service decision. Issue #563 adds the backend Container Apps
deployment target without changing the frontend hosting decision.

## Selected mapping

| Component            | Service                   | Runtime/build context                                |
| -------------------- | ------------------------- | ---------------------------------------------------- |
| React frontend       | Azure App Service (Linux) | Node.js 22 LTS build environment; Vite static bundle |
| Express backend API  | Azure Container Apps       | Node.js 22 non-root production container             |
| Async batch worker   | Azure Container Apps      | Node.js 22 LTS non-root container                    |
| Private object bytes | Azure Blob Storage        | Backend managed identity and private container       |

The PostgreSQL database and managed authentication remain on Supabase. The public MkDocs documentation site is hosted separately on Cloudflare Pages.

## App Service history and Container Apps migration

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

## Other alternatives recorded

### Azure Static Web Apps

Advantages:

- optimised for static frontend hosting.

Reason not selected for the current foundation:

- would introduce a separate hosting/deployment path while the team selected App Service for both application components.

## Deployment verification

The frontend workflow retains its App Service deployment. The backend workflow builds a Node 22
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
