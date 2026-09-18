# Azure Backend Deployment

## Hosting and rollback status

The normal backend deployment target is Azure Container Apps. The API is packaged by
`apps/backend/Dockerfile` as a Node.js 22 production container: it runs the compiled backend
directly as Node PID 1, listens on port `3000`, runs as the non-root `node` user, includes the
Supabase CA certificate, and handles `SIGINT`/`SIGTERM` through the existing Express and PostgreSQL
shutdown path.

The existing Azure App Service `statsthegame-api-dev` remains intact and deployable during the
Container Apps acceptance period. It is an independent rollback target, not part of the normal
main-branch deployment. Do not retire, stop, or reconfigure it until the acceptance checklist below
has been completed and an explicit retirement decision is recorded.

## Container Apps architecture

The Bicep target is `infra/azure/backend/main.bicep`. It reuses these existing development resources:

| Concern             | Resource / design                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Registry            | Existing Azure Container Registry `statsthegamedevyhmqlinqfhkyg.azurecr.io`              |
| Compute environment | Existing Container Apps environment `statsthegame-dev-worker-env` shared with the worker |
| Runtime container   | `statsthegame-dev-api`, external HTTPS ingress on target port `3000`                     |
| Object storage      | Existing private Blob account and staged-ingestion/dataset-release containers            |
| Database and Auth   | Existing Supabase PostgreSQL and Supabase Auth services                                  |
| Secret store        | Existing Key Vault, referenced by URI rather than copied into the image or workflow      |

The API has separate user-assigned identities: a pull identity with `AcrPull` on the existing ACR,
and a runtime identity with `Key Vault Secrets User` and `Storage Blob Data Contributor` on the
existing Key Vault and Blob account. The Container App uses the pull identity for registry access
and the runtime identity for Key Vault and Blob access. Neither identity uses ACR admin credentials,
Blob account keys, SAS tokens, or storage connection strings.

Ingress is external, HTTPS-only (`allowInsecure=false`), and uses HTTP transport internally on port
`3000`. Startup, liveness, and readiness probes all call `/api/v1/health`. Application request logs
remain structured Pino output; use the Container App's log stream and Azure monitoring surface for
runtime investigation. A healthy deployment is not established merely by a successful ARM/Bicep
operation: it also requires a matching healthy revision and the deployed smoke checks described
below.

## Capacity and scaling

The initial API allocation is **0.5 vCPU**, **1Gi memory**, `minReplicas=1`, and `maxReplicas=1`.
Because the minimum is one, scale-to-zero is disabled.

The single-replica maximum is deliberate and temporary. Current API submitter and API-consumer
per-minute rate limits use process-local `Map` state. Multiple replicas would weaken those limits by
giving each process an independent counter. Issue #595 must provide shared rate-limit state before
horizontal API scaling is safe. This is a correctness constraint, not a claim that the architecture
is free or costless.

The revision mode is `Single`. It reduces active-revision ambiguity during normal rollout but does
not itself guarantee rollback; operators must inspect actual revision state and use the recovery
procedure below.

## Runtime configuration and secrets

Ordinary Container App configuration is supplied as non-secret values:

| Variable                                 | Production value/source                                    |
| ---------------------------------------- | ---------------------------------------------------------- |
| `NODE_ENV`                               | `production`                                               |
| `PORT`                                   | `3000`                                                     |
| `DEPLOYMENT_ENVIRONMENT`                 | Bicep environment label, currently `dev`                   |
| `CORS_ORIGINS`                           | Explicit allowed browser origins supplied to deployment CI |
| `SUPABASE_URL`                           | Supabase project URL supplied to deployment CI             |
| `SUPABASE_PUBLISHABLE_KEY`               | Publishable Supabase key supplied to deployment CI         |
| `OBJECT_STORAGE_PROVIDER`                | `azure`                                                    |
| `AZURE_STORAGE_ACCOUNT_NAME`             | Existing Blob account name                                 |
| `AZURE_STORAGE_CONTAINER_NAME`           | Existing staged-ingestion container                        |
| `AZURE_STORAGE_INGESTION_CONTAINER_NAME` | Existing staged-ingestion container                        |
| `AZURE_STORAGE_RELEASE_CONTAINER_NAME`   | Existing dataset-release container                         |
| `AZURE_CLIENT_ID`                        | Runtime managed identity client ID supplied by Bicep       |

`DATABASE_URL` and `SUPABASE_SECRET_KEY` are different: Key Vault holds their values, Container
Apps creates Key Vault-backed secrets from versionless secret-reference URIs, and the runtime receives
them through `secretRef`. The CI workflow receives only the reference URIs. `SUPABASE_SECRET_KEY`
must be present because it enables the required authenticated account-deletion path; without it the
backend starts, but account deletion returns `501 ACCOUNT_DELETION_UNAVAILABLE`.

Gitea CI secrets are a separate boundary. `AZURE_WORKER_CREDENTIALS` is the existing shared Azure
resource-group deployment-principal credential; its worker-oriented legacy name does not limit it to
the worker. The backend also uses its own resource-group, Key Vault secret-reference URI, CORS, and
Supabase configuration secrets. No secret value belongs in Bicep parameters, workflow YAML, output,
logs, Docker build context, or documentation. See [Environment variables](../environment.md) for the
cross-application configuration matrix.

| Gitea Actions secret                           | Purpose                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `AZURE_WORKER_CREDENTIALS`                     | Existing shared Azure resource-group deployment principal credential; legacy name retained. |
| `AZURE_BACKEND_CONTAINER_RESOURCE_GROUP`       | Backend deployment resource group.                                                          |
| `AZURE_BACKEND_DATABASE_SECRET_URI`            | Versionless Key Vault reference URI for `DATABASE_URL`.                                     |
| `AZURE_BACKEND_SUPABASE_SECRET_KEY_SECRET_URI` | Versionless Key Vault reference URI for `SUPABASE_SECRET_KEY`.                              |
| `AZURE_BACKEND_CORS_ORIGINS`                   | Allowed API browser origins.                                                                |
| `AZURE_BACKEND_SUPABASE_URL`                   | Backend Supabase project URL.                                                               |
| `AZURE_BACKEND_SUPABASE_PUBLISHABLE_KEY`       | Backend Supabase publishable key.                                                           |

## Networking and service boundaries

The API needs outbound connectivity to Supabase PostgreSQL, Supabase/Auth endpoints, Azure Blob
Storage, and the external sport APIs used by backend features. This repository does not establish or
verify network restrictions, private endpoints, firewall rules, DNS, or egress policy; an operator
must verify those dependencies in the target environment.

Service Bus remains the asynchronous worker boundary. The API Container App deliberately has no
Service Bus configuration or permission in this deployment target. Dataset-release generation and
other CPU-intensive asynchronous processing remain in the worker; they are not moved into the API
container.

## CI/CD flow

For a validated backend-affecting commit on `main`, `Sport Analytics CI` performs:

```text
validated main commit
  -> Docker build from apps/backend/Dockerfile
  -> inert local container /api/v1/health smoke
  -> Azure login
  -> immutable commit-SHA image push to ACR
  -> Bicep deployment/update
  -> bounded wait for the active healthy revision using that exact image
  -> external HTTPS /api/v1/health smoke
  -> /api/v1/competitions?limit=1 database smoke
  -> success, otherwise failure
```

The image reference uses the commit SHA and never `latest` as its authoritative deployment target.
The database smoke is separate because `/api/v1/health` proves that the HTTP process is available but
does not prove PostgreSQL-backed reads work. Any failed local smoke, deployment, readiness wait,
health smoke, or database smoke fails the deployment job.

The workflow reuses `azure/login@v2` with the repository's Azure service-principal secret. It does
not introduce a second authentication mechanism, ACR admin credentials, registry passwords, or
production secret values in YAML. Changes to backend sources, `apps/backend/Dockerfile`,
`infra/azure/backend/**`, and backend deployment helpers select the backend deployment lane.

## Rollback during acceptance

### Container Apps revision recovery

1. Inspect revisions and their active/health state:

   ```bash
   az containerapp revision list --resource-group <resource-group> --name statsthegame-dev-api --output table
   ```

2. Identify the known-good revision and image by inspecting the revision template. Confirm its image
   is the expected immutable SHA reference and investigate logs before changing traffic or revision
   state.
3. Use the Azure Container Apps revision recovery operation appropriate to the actual revision mode
   and Azure CLI version, then confirm the selected revision becomes active and healthy.
4. Run the HTTPS health and database smoke checks again. Do not claim that `Single` revision mode
   automatically preserved a usable prior revision.

Record the exact Azure command, revision name, image SHA, outcome, and smoke evidence in the release
record. This guide intentionally does not prescribe an unverified revision-switch command.

### App Service fallback

`statsthegame-api-dev` remains available as the acceptance-period fallback. The manual
`Sport Analytics - Redeploy App Service Backend (Rollback)` workflow retains the existing
publish-profile ZIP/Kudu deployment path. If browser traffic has already been cut over to the
Container App URL, an App Service fallback also requires a deliberate frontend API-base-URL and CORS
configuration reversal; those settings are not changed by this migration workflow. Verify Supabase
Auth redirect settings and the restored API endpoint before announcing rollback completion.

## Acceptance checklist

### Automated CI evidence

- [ ] A main commit built and pushed the immutable backend image.
- [ ] The local inert-container health smoke passed before publication.
- [ ] Bicep deployment completed and the expected SHA image revision became healthy within its bound.
- [ ] External HTTPS `/api/v1/health` smoke passed.
- [ ] `/api/v1/competitions?limit=1` database smoke passed.
- [ ] A failed deployment path demonstrably fails CI and leaves rollback decisions to operators.

### Manual acceptance evidence

- [ ] Container App is provisioned with external HTTPS ingress.
- [ ] Public API reads work.
- [ ] Registration, login, and password reset work with the deployed Auth configuration.
- [ ] Authenticated account deletion works (proving `SUPABASE_SECRET_KEY` is configured).
- [ ] Authenticated API operations, submission flow, and review flow work.
- [ ] Staged-ingestion and dataset-release Blob paths work through managed identity.
- [ ] Worker/asynchronous integration works where applicable; CPU-intensive release processing remains in the worker.
- [ ] Container App logs are available to operators.
- [ ] The App Service fallback workflow and `statsthegame-api-dev` remain usable.
- [ ] Frontend API-base-URL/CORS cutover is tested deliberately, if and when approved.
- [ ] App Service retirement is explicitly deferred until all acceptance evidence is complete.

## Prerequisites before the first deployment

An operator must provision the documented backend-specific Gitea secrets, including the Key Vault
secret-reference URIs. The existing `AZURE_WORKER_CREDENTIALS` secret authenticates the shared Azure
resource-group deployment principal, which has verified `Contributor` and `Role Based Access Control
Administrator` roles scoped to `rg-statsthegame-dev`. This covers resource deployment,
user-assigned-identity creation, and scoped role-assignment creation for the current Bicep. No
subscription-level Owner role, separate manual RBAC bootstrap, or new backend deployment credential
is required.

## AI Declaration

The Container Apps migration documentation for Issue #563 was generated and adapted with the
assistance of Codex[GPT-5]. It must be reviewed against the first real Azure deployment evidence.
