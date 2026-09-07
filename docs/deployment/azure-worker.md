# Azure asynchronous batch worker

Issue #365 provisions the deployment target selected by accepted ADR-010. The target is a Node.js 22
Azure Container App, separate from the Express App Service, consuming Azure Service Bus Standard in
peek-lock mode. Supabase PostgreSQL remains authoritative and staged bytes remain in a private Azure
Blob container. Issue #278 adds the transactional outbox relay and the `batch.validate` version 1
handler for package expansion, reference resolution, bounded validation chunks and durable resume.
The existing read-only `worker.probe` version 1 command remains available for deployment checks.

## Provisioned boundary

`infra/azure/worker/main.bicep` creates worker-owned resources idempotently:

- a Container Apps environment and private-ingress Container App;
- a Standard Service Bus namespace and `batch-ingestion` queue;
- one-minute peek locks, duplicate detection, five deliveries and a dead-letter queue;
- a Basic private Azure Container Registry;
- separate runtime and image-pull managed identities;
- least-privilege queue receiver and sender, Blob contributor, Key Vault secret-reader and ACR pull roles;
- startup, liveness and dependency-aware readiness probes;
- one to three replicas with a managed-identity Service Bus KEDA rule; and
- a 30-day Log Analytics workspace for JSON console logs.

The template references the existing storage account/container and an existing Key Vault. It never
receives a database password as a command-line parameter: `DATABASE_URL` is a Key Vault reference in
the Container App, while Azure data-plane clients use `DefaultAzureCredential` and the dedicated
managed identity. Ingress is internal because worker health is an operator surface, not a public API.

## Runtime configuration

| Variable                                | Secret | Purpose                                                                           |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | Yes    | Supabase PostgreSQL session-pooler URL, supplied through Key Vault.               |
| `DATABASE_SSL_MODE`                     | No     | Must be `verify-full` in production; local PostgreSQL may use `disable`.          |
| `DATABASE_CA_CERT_PATH`                 | No     | Optional CA override; the image includes the Supabase root CA.                    |
| `SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE` | No     | `<namespace>.servicebus.windows.net`.                                             |
| `SERVICE_BUS_QUEUE_NAME`                | No     | Dedicated queue name, normally `batch-ingestion`.                                 |
| `AZURE_STORAGE_ACCOUNT_NAME`            | No     | Existing Blob account containing staged payloads.                                 |
| `AZURE_STORAGE_CONTAINER_NAME`          | No     | Existing private container, normally `staged-ingestion`.                          |
| `AZURE_CLIENT_ID`                       | No     | User-assigned runtime identity client ID.                                         |
| `WORKER_PORT`                           | No     | Internal health port; default `3001`.                                             |
| `WORKER_CONCURRENCY`                    | No     | Per-replica Service Bus concurrency, bounded to 1–16; deployed value is 1.        |
| `SERVICE_BUS_LOCK_RENEWAL_MS`           | No     | Automatic peek-lock renewal window; deployed value is four minutes.               |
| `WORKER_SHUTDOWN_TIMEOUT_MS`            | No     | Drain deadline; deployed value is 25 seconds within the 30-second platform grace. |
| `WORKER_PROBE_DELAY_MS`                 | No     | Recovery-test-only delay; keep `0` normally.                                      |
| `OUTBOX_POLL_INTERVAL_MS`               | No     | Empty-poll delay for the transactional outbox relay; default `1000`.              |
| `OUTBOX_CLAIM_TTL_MS`                   | No     | PostgreSQL claim lease for an outbox publish attempt; default `30000`.            |
| `OUTBOX_BATCH_SIZE`                     | No     | Maximum outbox rows claimed in one set-based poll; default `20`.                  |
| `BATCH_CHUNK_SIZE`                      | No     | Maximum staged items persisted per validation transaction; default `500`.         |
| `BATCH_LEASE_MS`                        | No     | Durable validation lease before another worker may reclaim the batch; `120000`.   |
| `LOG_LEVEL`                             | No     | `debug`, `info`, `warn` or `error`.                                               |

Do not create Service Bus connection strings, storage keys or SAS tokens for the worker. Do not use
`VITE_` variables: every value above is server-side.

## Local execution and recovery walkthrough

### Prerequisites

Install Node.js 22, npm 10, Docker Desktop, and Azure CLI. The Azure account used locally must be
granted Service Bus Data Receiver on the test queue and Blob Data Reader (or Contributor) on the test
container. To enqueue probes it also needs Service Bus Data Sender. Use only a development resource
group and an isolated local database.

1. Install dependencies and start PostgreSQL from the repository root:

   ```powershell
   npm.cmd ci
   docker compose -f compose.test.yml up -d --wait
   ```

   Expected: Docker reports `postgres-test` healthy on `127.0.0.1:55432`.

2. Reset, migrate and seed only the disposable database:

   ```powershell
   $env:NODE_ENV = 'test'
   $env:DATABASE_URL_TEST = 'postgresql://test_user:test_password@127.0.0.1:55432/sport_analytics_test'
   $env:SUPABASE_URL = 'https://example.invalid'
   $env:SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key'
   npm.cmd run db:test:reset --workspace=@sport-analytics/backend
   npm.cmd run db:test:migrate --workspace=@sport-analytics/backend
   npm.cmd run db:test:seed --workspace=@sport-analytics/backend
   ```

   Expected: all three commands exit zero. The safety guard rejects a non-test database name or a
   URL equal to `DATABASE_URL`.

3. Sign in and select the approved development subscription:

   ```powershell
   az login
   az account set --subscription '<development-subscription-id>'
   ```

   Expected: `az account show` identifies the intended development subscription. Never use a
   production subscription for the interruption exercise.

4. Create `apps/worker/.env` from the template and use safe environment-specific values:

   ```dotenv
   NODE_ENV=development
   WORKER_PORT=3001
   DATABASE_URL=postgresql://test_user:test_password@127.0.0.1:55432/sport_analytics_test
   DATABASE_SSL_MODE=disable
   SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE=<dev-namespace>.servicebus.windows.net
   SERVICE_BUS_QUEUE_NAME=batch-ingestion
   AZURE_STORAGE_ACCOUNT_NAME=<dev-storage-account>
   AZURE_STORAGE_CONTAINER_NAME=staged-ingestion
   WORKER_CONCURRENCY=1
   WORKER_PROBE_DELAY_MS=0
   OUTBOX_POLL_INTERVAL_MS=1000
   OUTBOX_CLAIM_TTL_MS=30000
   OUTBOX_BATCH_SIZE=20
   BATCH_CHUNK_SIZE=500
   BATCH_LEASE_MS=120000
   ```

   Expected: no real secret is committed. `git status --short` must not list the ignored `.env`.

5. Start the worker:

   ```powershell
   npm.cmd run dev:worker
   ```

   Expected: a JSON `Asynchronous worker is running.` log appears. Dependency warnings may appear
   until RBAC propagation completes.

6. Check health from another terminal:

   ```powershell
   Invoke-RestMethod http://localhost:3001/health/live
   Invoke-RestMethod http://localhost:3001/health/ready
   Invoke-RestMethod http://localhost:3001/health/status
   ```

   Expected: liveness is `live`; readiness is `ready` with database, object storage and Service Bus
   all `up`; status includes zero or current delivery counters. A `503` readiness response names only
   the failed dependency and never returns credentials.

7. Enqueue a deployment probe:

   ```powershell
   npm.cmd run probe:enqueue --workspace=@sport-analytics/worker
   ```

   Expected: the sender prints an opaque `commandId` and `messageId`. Worker logs show received,
   dependency verified and completed events for that message. The probe performs `SELECT 1` and a
   private-container properties read; it creates no rows or blobs.

8. Verify graceful restart recovery. Set `WORKER_PROBE_DELAY_MS=120000`, restart the worker, enqueue
   one probe, wait for `Job delivery received.`, then press Ctrl+C. After the 25-second drain deadline,
   the worker aborts and abandons the message. Start it again with the delay reset to `0`.

   Expected: readiness changes to `not_ready` before exit; shutdown logs report `drained:false`; the
   same `messageId` is received again with a higher `deliveryCount` and completes once.

9. Verify abrupt lease expiry. Repeat step 8, but after the received log force-stop only the logged
   worker PID from a second PowerShell window:

   ```powershell
   Stop-Process -Id <worker-pid-from-workerId> -Force
   npm.cmd run dev:worker
   ```

   Expected: no graceful log is emitted for the killed process. After the one-minute queue lock
   expires, the restarted worker receives the same `messageId` with `deliveryCount` at least 2 and
   completes it. Only the successful attempt emits `Deployment probe job verified worker
dependencies.`; the probe has no write side effect, so redelivery cannot duplicate domain data.

   For a real `batch.validate` command, the durable `batch_checkpoint` is the resume boundary. A chunk
   and its new `last_ordinal` commit atomically, so a restarted worker skips committed ordinals and
   resumes from the next item after reclaiming an expired validation lease.

10. Clean up local test data:

    ```powershell
    docker compose -f compose.test.yml down -v
    Remove-Item -LiteralPath apps/worker/.env
    ```

    Expected: the disposable PostgreSQL container and named test volume are removed, and the ignored
    local worker configuration is deleted. Successfully handled probe messages are already settled;
    the probe creates no database or Blob data to delete.

## Batch recovery procedure

Do not reset a `batch_checkpoint`, delete staged rows, or replay source bytes manually. The
checkpoint is the authoritative recovery boundary for its phase. Validation and publication have
separate rows, so completing validation never advances publication and a publication retry never
revalidates accepted or rejected items.

1. Inspect the batch, its `background_job`, and both `batch_checkpoint` rows. Record the phase,
   `last_ordinal`, `attempt_count`, lease owner, expiry, and safe job error code before taking
   action.
2. If the recorded lease has not expired, let its worker finish or wait for the expiry. A second
   worker must not process that phase while a different live owner is recorded.
3. After a crash, allow the queue lock to expire and redeliver the command. The reclaiming worker
   verifies that the recorded lease has expired, retains the checkpoint ordinal, and starts at the
   following ordinal. It does not restart the package.
4. A chunk writes its item outcomes or deliveries and advances `last_ordinal` in the same database
   transaction. A fault before commit leaves both absent; a fault after commit leaves both durable.
   Replaying either case cannot publish or count an earlier item twice.
5. If the retry budget is exhausted, keep the terminal job error and batch state as evidence. An
   authorised operator may arrange a retry only after resolving the infrastructure cause; the retry
   keeps the source, submitter, batch, phase checkpoint, and item outcomes intact.

The worker logs batch reference, job identifier, attempt, final state, and duration, but not source
payloads or credentials. Record the recovery action and its observed checkpoint values in the
relevant operational evidence.

## Deployment

The manual `Sport Analytics - Provision and Deploy Batch Worker` Gitea workflow validates the worker,
deploys support resources, builds an immutable commit-tagged image with ACR Tasks, deploys the
Container App, and requires its active revision to report `Healthy`. Configure these Gitea secrets:

- `AZURE_WORKER_CREDENTIALS`: Azure login JSON for a narrowly scoped deployment principal;
- `AZURE_WORKER_RESOURCE_GROUP`: the development resource group;
- `AZURE_WORKER_KEY_VAULT_NAME`: existing RBAC-enabled vault name; and
- `AZURE_WORKER_DATABASE_SECRET_URI`: versionless URI such as
  `https://<vault>.vault.azure.net/secrets/worker-database-url`.

Before running the workflow, place the PostgreSQL URL in that Key Vault secret and confirm the
existing `statsthegameblobdev/staged-ingestion` container is private. The deployment principal needs
resource deployment, ACR build and role-assignment permission in scope. Compile the template before
review with:

```text
az bicep build --file infra/azure/worker/main.bicep
```

After deployment, inspect safe logs and replica health:

```text
az containerapp logs show --name statsthegame-dev-batch-worker --resource-group <resource-group> --follow
az containerapp revision list --name statsthegame-dev-batch-worker --resource-group <resource-group> -o table
az servicebus queue show --namespace-name <namespace> --name batch-ingestion --resource-group <resource-group>
```

Use `az containerapp exec` and request `http://127.0.0.1:3001/health/status` when direct health JSON
is required; there is deliberately no public ingress.

## Troubleshooting

- **Readiness says `database: down`:** confirm the Key Vault reference resolved, the URL uses the
  session pooler, outbound networking permits PostgreSQL, and production TLS remains `verify-full`.
- **`serviceBus: down` or AMQP authorization errors:** allow several minutes for RBAC propagation;
  verify the runtime identity has Data Receiver on the exact queue and local authentication remains
  disabled.
- **`objectStorage: down`:** verify the account/container names, private container, runtime identity
  Blob role and storage firewall rules. Public Blob access intentionally fails readiness.
- **Messages dead-letter immediately:** inspect the safe reason. The worker supports only
  `worker.probe` version 1 and `batch.validate` version 1; unknown command versions and permanent
  validation-job faults are dead-lettered without logging source payloads or secrets.
- **A batch is `failed` after a transient outage:** inspect the safe background-job error and broker
  delivery count. Retriable infrastructure failures are bounded; a later delivery can reclaim an expired
  lease, while item/schema validation faults do not consume the infrastructure retry budget.
- **Outbox rows remain unpublished:** verify the worker identity has Service Bus Data Sender as well as
  Receiver, then inspect outbox counters on `/health/status`. Expired PostgreSQL outbox claims are
  reclaimable and published rows are never selected again.
- **Message stays locked after a crash:** wait at least the one-minute lock duration. The SDK renews
  locks only while the original process is alive.
- **Revision is unhealthy:** inspect startup logs for invalid environment fields or Key Vault/RBAC
  failures, then redeploy a corrected immutable image instead of editing credentials into source.
- **KEDA does not scale:** verify the rule uses the runtime identity, namespace name without the
  `.servicebus.windows.net` suffix, and that `maxReplicas` remains within the database-safe bound.

## AI Declaration

This deployment guide and its infrastructure mapping were generated or edited with the assistance
of Codex[GPT-5] and ChatGPT-Web[GPT-5.6 Sol]. Automated repository checks do not replace operator
verification; a human Azure operator must still compile/review the Bicep, execute the deployment,
verify live RBAC/networking/KEDA/log behavior, and perform the graceful and forced restart exercises
in the development environment.
