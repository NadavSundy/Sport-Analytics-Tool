# Azure Backend Deployment

## Hosting and rollback status

The normal backend deployment target is Azure Container Apps. The API is packaged by
`apps/backend/Dockerfile` as a Node.js 22 production container: it runs the compiled backend
directly as Node PID 1, listens on port `3000`, runs as the non-root `node` user, includes the
Supabase CA certificate, and handles `SIGINT`/`SIGTERM` through the existing Express and PostgreSQL
shutdown path.

The current deployed API is available at
`https://statsthegame-dev-api.calmground-aa50efe2.southafricanorth.azurecontainerapps.io`, with
business endpoints under `/api/v1`.

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

The API allocation is **0.5 vCPU**, **1Gi memory**, `minReplicas=0`, and `maxReplicas=1`. The development deployment scales to zero while idle to reduce Azure consumption cost. The first request after an idle period may incur Container Apps cold-start latency. `maxReplicas=1` preserves process-local rate-limit semantics until rate-limit state is externalised.
Because the minimum is zero, the API can scale to zero while idle and wake when HTTP traffic arrives.

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
| `LLM_MODEL`                              | Bicep parameter, currently `claude-haiku-4-5-20251001`     |
| `LLM_TIMEOUT_MS`                         | Bicep parameter, currently `15000`                         |
| `TRUSTED_PROXY_HOP_COUNT`                | Fixed `1`: one ingress hop in front of the container       |
| `NL_QUERY_RATE_LIMIT_PER_MINUTE`         | Bicep parameter, currently `10`                            |
| `NL_QUERY_DAILY_QUOTA_PER_CLIENT`        | Bicep parameter, currently `100`                           |
| `NL_QUERY_GLOBAL_DAILY_LIMIT`            | Bicep parameter, currently `300`                           |

`DATABASE_URL`, `SUPABASE_SECRET_KEY` and `LLM_API_KEY` are different: Key Vault holds their values,
Container Apps creates Key Vault-backed secrets from versionless secret-reference URIs, and the
runtime receives them through `secretRef`. The CI workflow receives only the reference URIs.
`SUPABASE_SECRET_KEY` must be present because it enables the required authenticated
account-deletion path; without it the backend starts, but account deletion returns
`501 ACCOUNT_DELETION_UNAVAILABLE`.

`LLM_API_KEY` behaves the same way and is optional to the application in every environment,
production included: without it the backend starts, logs one startup warning naming the variable,
and natural-language query translation reports itself unconfigured while every other capability is
unaffected. See ADR-017.

It is not optional to this deployment, however. **The `backend-llm-api-key` Key Vault secret must
exist before this template deploys**, because Container Apps resolves the secret reference when the
revision is created and a missing secret fails the deployment rather than degrading the running
app. The deployment workflow also fails when `AZURE_BACKEND_LLM_API_KEY_SECRET_URI` is not
configured, so the reference URI must be provisioned alongside it.

Two different names are involved and they are deliberately not the same. The **Key Vault** secret is
`backend-llm-api-key`, carrying the `backend-` prefix the vault uses to keep each service's secrets
distinct from the worker's, alongside `backend-database-url` and `backend-supabase-secret-key`. The
**Container Apps** secret is `llm-api-key`, a local alias inside the API's own Container App that
`secretRef` resolves, alongside `database-url` and `supabase-secret-key`. The only link between them
is the `llmApiKeySecretUri` Bicep parameter, which receives the versionless vault URI from
`AZURE_BACKEND_LLM_API_KEY_SECRET_URI`. Renaming either one does not require renaming the other.

### Storing the language-model key

An operator with `Key Vault Secrets Officer` on the existing vault stores the value once, before the
first deployment that includes the secret reference. The key must be the workspace-scoped key from
the project Anthropic Console workspace that carries the $10 monthly spend limit recorded in
ADR-017.

Read the secret value from a prompt rather than passing it on the command line, so it does not enter
the shell history or the process list:

```bash
read -rs -p 'Anthropic API key: ' LLM_API_KEY && \
  az keyvault secret set \
    --vault-name statsthegame-dev-kv \
    --name backend-llm-api-key \
    --value "$LLM_API_KEY" \
    --output none && \
  unset LLM_API_KEY
```

Then read back only the versionless reference URI, never the value, and store that URI as the Gitea
Actions secret `AZURE_BACKEND_LLM_API_KEY_SECRET_URI`:

```bash
az keyvault secret show \
  --vault-name statsthegame-dev-kv \
  --name backend-llm-api-key \
  --query id --output tsv | sed 's|/[^/]*$||'
```

The key value must never appear in Bicep parameters, workflow YAML, job output, logs, the Docker
build context, a committed `.env` file, or documentation.

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
| `AZURE_BACKEND_LLM_API_KEY_SECRET_URI`         | Versionless Key Vault reference URI for `LLM_API_KEY`.                                      |
| `AZURE_BACKEND_CORS_ORIGINS`                   | Allowed API browser origins.                                                                |
| `AZURE_BACKEND_SUPABASE_URL`                   | Backend Supabase project URL.                                                               |
| `AZURE_BACKEND_SUPABASE_PUBLISHABLE_KEY`       | Backend Supabase publishable key.                                                           |

## Anonymous natural-language query limits

`POST /api/v1/natural-language-queries` is answered for anonymous visitors and every admitted request
calls a paid provider, so its limits are the deployment's spending control alongside the ADR-017
monthly ceiling. The counters live in PostgreSQL, so they hold across restarts and replicas, and they
fail closed: if a counter cannot be read the endpoint answers `503` rather than admitting an unmetered
request.

The four values above are set by the template rather than supplied to it. The three limits are Bicep
parameters with defaults, so one environment can be raised without editing the template body, and
`TRUSTED_PROXY_HOP_COUNT` is a fixed `1` because the same template defines the ingress it describes.
None of them is a required parameter, deliberately: issue #831 records that a required parameter added
without a matching argument in the `deploy_backend` job of `.gitea/workflows/ci.yml` fails every
backend deploy.

`TRUSTED_PROXY_HOP_COUNT` decides whether the per-client limits work at all. The count is read from
the right of `X-Forwarded-For`, and Container Apps ingress appends the caller's address to anything
the caller sent, so `1` selects the entry the platform added and ignores any the caller supplied. A
higher count would reach into the caller-supplied entries and the limits could be bypassed by sending
a header; a lower one puts every visitor in a single bucket.

Neither mistake fails a deployment or appears in a log, so **after any deployment that changes this
value or the ingress in front of the API, run the two-network check** in
[Analytics query](../api/analytics-query.md#post-deployment-verification): two requests from one
network must decrease `RateLimit-Remaining`, and a request from a different network must start from
the full allowance rather than continue the first network's count.

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
  -> retrieve DATABASE_URL from the existing Key Vault secret reference into the migration step only
  -> apply reviewed pending node-pg-migrate migrations; stop on failure
  -> Docker build from apps/backend/Dockerfile
  -> inert local container /api/v1/health smoke
  -> Azure login
  -> immutable commit-SHA image push to ACR
  -> Bicep deployment/update
  -> bounded wait for the active healthy revision using that exact image
  -> external HTTPS /api/v1/health smoke
  -> /api/v1/competitions?limit=1 database smoke
  -> /api/v1/dataset-releases schema-dependent smoke
  -> success, otherwise failure
```

The image reference uses the commit SHA and never `latest` as its authoritative deployment target.
The database smoke is separate because `/api/v1/health` proves that the HTTP process is available but
does not prove PostgreSQL-backed reads work. Any failed local smoke, deployment, readiness wait,
health smoke, database smoke, or dataset-release schema smoke fails the deployment job.

### Migration gate and recovery

Before building or activating backend code, both the automatic Container Apps workflow and the manual
App Service rollback workflow retrieve `DATABASE_URL` from the existing
`AZURE_BACKEND_DATABASE_SECRET_URI` Key Vault reference. The value is captured only in the migration
step's environment and is never printed or passed as a command-line argument. The workflow then runs
`npm run db:migrate --workspace=@sport-analytics/backend`. This retains the committed
`node-pg-migrate` ordering and fails the job if any pending migration cannot be applied. It does not
run dataset-release generation or start a worker.

A failed migration prevents the Container Apps revision deployment or rollback artifact deployment
from starting. Investigate the named migration and database error in the CI log, correct the reviewed
migration or the target database condition, and rerun the workflow. Do not automatically run a down
migration or bypass the gate: recovery must be reviewed because the database may have been changed
before the failure. A successful rerun logs the migration status and only then permits code activation.

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
- [ ] Migration status was logged and completed before backend activation.
- [ ] `/api/v1/dataset-releases` schema-dependent smoke passed without a 5xx response.
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
The issue #815 anonymous natural-language query limits, trusted-proxy configuration and
post-deployment verification were documented with the assistance of
Claude-Code[Claude Opus 5 (1M context)].
