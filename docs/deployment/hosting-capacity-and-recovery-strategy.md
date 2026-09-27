# Hosting capacity, Azure quota recovery and deployment strategy

> **Status of this document.** Issue #566 was blocked by issue #565 (production-scale deployment
> acceptance). #565's live evidence — recorded in
> `evidence/sprints/sprint-3/issue-565-production-scale-deployment-acceptance.md` and
> `evidence/sprints/sprint-3/issue-565-live-result.json` — is now complete for the **Development**
> environment (`rg-statsthegame-dev`), and the sections below have been updated from that observed
> result rather than from assumption. A small number of items were explicitly **not separately
> captured** by that run (browser-rendering screenshots, the worker's exact revision name, API
> failed-request/platform-error views, Azure Service Health views, and the exact Azure Metrics
> portal time range) — these are called out individually below as documented gaps, not silently
> assumed to be fine. Nothing here has been validated against a production (as opposed to
> development) environment; see section 8.

## 1. Purpose

This document ties together three things that were previously scattered across separate guides:

1. what actually happened during the Sprint 2 Azure App Service capacity incident;
2. why the original hosting model could not support the workload, and what architectural change (not
   just more compute) fixed it; and
3. the completed Sprint 3 hosting architecture, its capacity assumptions, its cost model, and a single
   troubleshooting runbook that covers the whole deployed system.

It intentionally does not repeat content that already has an authoritative source. Each section links
to that source instead of duplicating it, so the two documents cannot drift apart.

## 2. Sprint 2 incident summary

**Full record:** [`azure-app-service-recovery.md`](azure-app-service-recovery.md)

During Sprint 2 deployment testing, the backend App Service (`statsthegame-api-dev`, Azure App Service
Free **F1** tier) reported `state: QuotaExceeded`, `usageState: Exceeded`. Azure served
platform-generated `403`/`503` responses in front of the application, CI/CD deployed-backend smoke
checks failed, and `/api/v1/health` was unreachable.

The team distinguished the platform failure from an application failure by deploying a minimal Node
diagnostic app to the same App Service: it returned `200 OK`, proving Node execution, Azure public
routing and port binding all worked. That isolated the problem to the F1 plan's quota rather than the
backend code, and is the pattern this document generalises in the [runbook](#6-troubleshooting-runbook)
below.

The App Service Plan was then temporarily upgraded from **F1 (Free)** to **Basic B2**. Backend status
returned to `Running`, `/api/v1/health` returned a healthy response, the database-backed
`/api/v1/competitions` smoke check passed, and backend CI deployment subsequently passed.

**The B2 upgrade was, and remains, a mitigation — not the final architecture.** It added more compute
to the same request-serving process; it did not change what that process was being asked to do. Section
3 explains why that distinction matters, and section 4 describes the architecture that actually resolved
it.

### How to distinguish an Azure platform failure from an application failure (generalised)

This is the pattern used during the F1 incident, reusable for any future capacity event:

1. Check the hosting resource's own state before touching application code or configuration
   (`az webapp show ... --query "{state:state,usageState:usageState}"` for App Service; Container Apps
   revision/replica state for the current architecture — see section 6).
2. If the platform reports a quota, capacity or outage condition, resolve or wait out that condition
   first. Redeploying or restarting the application in a loop does not fix a platform-level quota block
   and can make diagnosis harder.
3. Once the platform reports healthy, retest with a minimal surface (a diagnostic route, or the
   deployed health endpoint) before retesting the full application.
4. Only after the minimal surface responds correctly should a remaining failure be treated as an
   application-level problem.

## 3. Capacity model: why F1 was unsuitable, and what actually fixes it

### 3.1 Why the original model was unsuitable

The F1 tier is a shared, quota-metered compute tier intended for low-traffic, intermittent workloads.
It is not sized for:

- **CPU-intensive dataset publication** — generating a full dataset release (validating, aggregating
  and writing tens of thousands of deliveries) is a sustained CPU-bound task, not a short request/response
  cycle;
- **large-scale analytics workloads** — computing derived statistics over a representative corpus holds
  CPU for longer than a shared, quota-capped instance is designed to sustain; and
- **sustained production-scale acceptance testing** — running the full acceptance corpus (see
  [`production-scale-acceptance.md`](production-scale-acceptance.md)) deliberately drives sustained load
  at the deployed environment, which is exactly the profile that exhausts a shared-tier quota fastest.

All three of these run **inside the same request-serving process** in the F1-era architecture. That is
the actual defect: an HTTP-facing API process was also the process doing the CPU-intensive work, so a
single expensive workload could starve the health/API traffic sharing that process and exhaust the
plan's quota.

### 3.2 Temporary additional compute vs. the architectural fix

|                                                          | What it changes                                                                                                                                            | What it does not change                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Temporary compute increase** (the Sprint 2 B2 upgrade) | Gives the _same_ request-serving process more CPU/quota headroom                                                                                           | The API process is still the one doing CPU-intensive dataset/analytics work; a large enough job can still starve it |
| **Architectural fix** (the Sprint 3 design)              | Moves CPU-intensive dataset release/publication work **out of** the request-serving API entirely, into a separate worker process consuming a durable queue | The API's job shrinks back down to what a request/response process is actually sized for                            |

Adding compute buys time. Removing the expensive work from the request path is what makes the fix
durable — it is why the B2 upgrade is documented here as a recovery step, not as the Sprint 3 design.

## 4. Final Sprint 3 architecture

**Authoritative sources:** [`overview.md`](overview.md) · [`azure-backend.md`](azure-backend.md) ·
[`azure-worker.md`](azure-worker.md) · [`frontend-cloudflare-pages.md`](frontend-cloudflare-pages.md) ·
`evidence/decisions/ADR-010-background-jobs-and-workers.md` ·
`evidence/decisions/ADR-011-file-and-object-storage.md`

```text
Browser
   |
   v
Frontend (static hosting — Cloudflare Pages)
   |
   | HTTPS, /api/v1
   v
Backend API (Azure Container Apps)
   |                                  \
   | reads/writes                      \ publishes job
   v                                    v
PostgreSQL / Supabase             Service Bus (batch-ingestion queue)
   ^                                    |
   | writes results                     | delivers job (peek-lock)
   |                                    v
   +----------------------- Background worker (Azure Container Apps)
                                         |
                                         v
                             Dataset release processing
                             (staged Blob -> validated ->
                              immutable release artifact)
```

### Component responsibilities

**Frontend — static hosting (Cloudflare Pages).**
Serves the built Vite bundle. There is no server-side runtime: the built output is static files, so it
does not need continuously running compute. Deployed by Wrangler through Gitea Actions after the shared
post-merge quality gate. Superseded App Service hosting is documented as historical in
[ADR 0003](../adr/0003-azure-hosting.md).

**Backend API — Azure Container Apps (`statsthegame-dev-api`).**
Runs the compiled Express backend as a Node 22 container (`apps/backend/Dockerfile`), non-root, listening
on port 3000. Owns request/response work only: authenticated CRUD, public reads, submission intake, and
_enqueuing_ dataset-release jobs — it does not perform the CPU-intensive release generation itself. Uses
separate pull/runtime managed identities (no ACR admin credentials, no Blob keys, no connection strings
in configuration). Startup/liveness/readiness probes call `/api/v1/health`. `statsthegame-api-dev` (App
Service) is retained as a manual rollback target only, per
[`azure-backend.md` §Rollback during acceptance](azure-backend.md#rollback-during-acceptance) — it is not
part of the normal deployment path and must not be retired before App Service retirement is explicitly
decided.

**PostgreSQL / Supabase.**
Authoritative relational store for the application and for the durable transactional outbox that
guarantees job delivery to Service Bus (ADR-010). Supabase Auth provides authentication. Accessed by the
API and worker over the session pooler with `verify-full` TLS in production.

**Service Bus (Standard namespace, `batch-ingestion` queue).**
The durable handoff between the API and the worker. Configured with one-minute peek locks, duplicate
detection, a five-delivery limit and a dead-letter queue (`infra/azure/worker/main.bicep`). This queue —
not a bigger API instance — is what removes CPU-intensive work from the request-serving process.

**Background worker — Azure Container Apps (`statsthegame-dev-batch-worker`).**
Separate Node 22 Container App, private ingress only (its health surface is an operator concern, not a
public API). Consumes `batch-ingestion` via `DefaultAzureCredential` and a dedicated runtime identity —
no connection strings. Performs the actual CPU-intensive work: package expansion, reference resolution,
bounded/chunked validation with durable checkpointing, and dataset-release publication to the private
Blob release container. Scales on a KEDA Azure Service Bus rule (queue message count), independently of
the API. See [`azure-worker.md`](azure-worker.md) for the full runtime-configuration table and the batch
recovery procedure summarised in section 6 below.

## 5. Capacity assumptions

These are the values actually configured in the merged Bicep templates
(`infra/azure/backend/main.bicep`, `infra/azure/worker/main.bicep`), not estimates:

| Component                 | vCPU / memory  | `minReplicas`                      | `maxReplicas` | Scaling trigger                                                                       |
| ------------------------- | -------------- | ---------------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| Backend API Container App | 0.5 vCPU / 1Gi | 0 (scale to zero while idle)       | **1**         | HTTP ingress (implicit)                                                               |
| Worker Container App      | 0.5 vCPU / 1Gi | 0 (scale to zero while queue idle) | 3             | KEDA `azure-servicebus` rule, `messageCount: 1`, 15 s polling interval, 60 s cooldown |

Two capacity assumptions are load-bearing and must not be silently changed:

- **The API's `maxReplicas` is deliberately capped at 1.** Submitter and API-consumer rate limiting
  currently uses process-local in-memory state. Running more than one API replica would give each
  replica an independent counter and silently weaken those limits. This must stay in place until shared
  rate-limit state (tracked separately) exists — it is a correctness constraint, not a cost-saving
  measure, and must not be "fixed" by simply raising `maxReplicas` without that shared-state work.
- **Both API and worker scale to zero when idle** (`minReplicas: 0`). This is the primary cost control
  for the development environment (see section 7) but means the first request or job after an idle
  period incurs Container Apps cold-start latency — expected behaviour, not a fault, when diagnosing an
  apparently slow first response.

The worker's `maxReplicas` upper bound (3, hard-capped at 5 by the Bicep parameter constraint) is
deliberately bounded "to protect PostgreSQL and storage" from an unbounded burst of concurrent workers
against the same database and Blob account, per `infra/azure/worker/main.bicep`.

**Observed (Development, 2026-09-25, `rg-statsthegame-dev`):** during the full acceptance run that
published release `2026.09.25-issue-565-acceptance-1` (3,207,110 events), Azure Metrics reported, for a
morning SAST window whose exact portal range was not retained:

| Component                       | Average CPU     | Average memory | Max replicas observed | Restart count |
| ------------------------------- | --------------- | -------------- | --------------------- | ------------- |
| `statsthegame-dev-api`          | 0.02 cores      | 4.4071%        | 1                     | 0             |
| `statsthegame-dev-batch-worker` | 7.01 millicores | 4.5717%        | 1                     | 0             |

Both components stayed at a single replica throughout, well inside their configured `maxReplicas`
(1 and 3 respectively), and average utilisation is far below the 0.5 vCPU / 1Gi allocated to each —
consistent with the corpus (300 fixtures, 72,000 deliveries, 3.2M published events) not driving the
worker to scale out. Two caveats: these are **averages only** — peak CPU/memory during the heaviest
part of generation was not separately captured — and the exact time window selected in the Azure
Portal was not retained, so this cannot yet be tied to a specific minute-by-minute load curve. A
larger or more CPU-intensive corpus, or a genuinely production-scale concurrent load, could still
exercise the worker's `maxReplicas=3` ceiling in a way this run did not.

## 6. Troubleshooting runbook

Work outward from the process, in this order, so an unrelated layer's failure is not mistaken for the
layer actually under investigation (this generalises the Sprint 2 diagnostic sequence in section 2):

```text
1. Azure infrastructure / quota / capacity
2. Application startup / crash
3. Database connectivity
4. Service Bus (queue) health
5. Authentication / configuration
6. CI / deployment pipeline
```

### 1. Azure infrastructure / quota / capacity failure

- **Symptom:** platform-generated `403`/`503` in front of the app (not the app's own error body); the
  app never appears in logs for the failing request.
- **Check:**
  ```bash
  az containerapp revision list --resource-group <rg> --name statsthegame-dev-api --output table
  az containerapp revision list --resource-group <rg> --name statsthegame-dev-batch-worker --output table
  ```
  Confirm an active revision exists, is healthy, and is running the expected commit-SHA image. For the
  App Service rollback target specifically:
  ```bash
  az webapp show --resource-group <rg> --name statsthegame-api-dev \
    --query "{state:state,usageState:usageState,host:defaultHostName}" -o table
  ```
  A `QuotaExceeded`/`Exceeded` result here is the same class of failure as the Sprint 2 incident.
- **Distinguish from application failure:** a request that never reaches the application (no matching
  entry in `az containerapp logs show`) points at this layer, not the code.

### 2. Application startup / crash failure

- **Check:** `az containerapp logs show --name <app> --resource-group <rg> --follow`.
- Health/readiness/liveness all call `/api/v1/health` (API) or the internal `http://127.0.0.1:3001/health/status`
  (worker, reached via `az containerapp exec` — it has no public ingress by design).
- A revision stuck unhealthy after deploy: inspect startup logs for invalid environment fields or Key
  Vault/RBAC resolution failures before redeploying (`azure-worker.md` §Troubleshooting).

### 3. Database connectivity failure

- Worker readiness reporting `database: down`: confirm the Key Vault `DATABASE_URL` reference resolved,
  the URL uses the session pooler, outbound networking permits PostgreSQL, and `DATABASE_SSL_MODE` is
  `verify-full` in production.
- Confirm from the API side with the deployed database-backed smoke check:
  ```bash
  curl -i "https://<api-host>/api/v1/competitions?limit=1"
  ```
  A `200` with real rows proves the API-to-database path; the health endpoint alone only proves the
  process is running.

### 4. Service Bus failure

- Worker readiness reporting `serviceBus: down` or AMQP authorization errors: allow time for RBAC
  propagation, then confirm the runtime identity holds `Data Receiver` (and `Data Sender`, for the
  transactional-outbox relay) scoped to the exact queue, and that local/shared-key authentication remains
  disabled.
- Inspect the queue directly:
  ```bash
  az servicebus queue show --namespace-name <namespace> --name batch-ingestion --resource-group <rg>
  ```
- Messages dead-lettering immediately: the worker only accepts `worker.probe` v1 and `batch.validate`
  v1 — an unrecognised command version or a permanent validation fault dead-letters by design, without
  logging source payloads or secrets.
- A message stuck locked after a crash: wait out the one-minute peek lock; the SDK only renews locks
  while the original process that claimed it is alive.
- See [`azure-worker.md` §Batch recovery procedure](azure-worker.md#batch-recovery-procedure) for the
  checkpoint-safe recovery steps — do not manually reset a `batch_checkpoint` or replay source bytes.

### 5. Authentication / configuration failure

- Confirm CORS is set to the exact deployed frontend origin (not a wildcard, given credentialed
  requests) — see `azure-app-service-recovery.md` §16–18 for the verification pattern (`curl -H "Origin:
<origin>"`, checking for `Access-Control-Allow-Origin` in the response).
- Confirm Supabase Auth redirect settings match the currently live frontend URL, especially after any
  rollback to the App Service fallback (`azure-backend.md` §App Service fallback) — a rollback does not
  automatically reverse the frontend API base URL or CORS configuration.
- `SUPABASE_SECRET_KEY` is required for self-service account deletion but optional for process startup;
  its absence will not crash the API but will surface as a specific authenticated-action failure, not a
  general outage.

### 6. CI / deployment pipeline failure

- Confirm which CI lane failed: the required pre-merge `Sport Analytics CI / quality` check, or the
  post-merge deployment/smoke stage — they run different things (`docs/development/ci-cd.md`).
- A failed deployed smoke check (health or database-backed) fails the workflow deliberately; it does not
  roll back automatically. Follow `azure-backend.md` §Rollback during acceptance to recover the API, or
  the manual `Sport Analytics - Provision and Deploy Batch Worker` workflow for the worker.
- A Docker registry/npm preflight failure during worker image build retries with backoff (5s/10s/20s)
  before failing; a persistent failure here is a connectivity issue, not an application defect
  (`azure-worker.md` §Docker registry preflight resilience).

**Observed (Development, live recovery during release `2026.09.24-issue-565-live`):** this runbook's
Service Bus/worker recovery path has been exercised end-to-end, though not exactly as originally
scripted. The live run hit a real, repeatable fault — an indexed source-cursor issue causing
~120-second snapshot failures — rather than a clean, deliberately-triggered kill. The team applied a
remediation and redeployed the worker while the job remained in `generating`; materialisation resumed
for the same job ID afterward and the release completed, with the public catalogue showing one
immutable entry for that version alongside the prior `2026.09.14v1Public` snapshot (no duplicate
canonical artifact). That is genuine evidence that the durable checkpoint/resume path in
`azure-worker.md` §Batch recovery procedure works against a real fault, but it is evidence of
_fault-driven_ recovery, not of the literal controlled-interruption exercise in
[`production-scale-acceptance.md` §Recovery and duplicate-publication exercise](production-scale-acceptance.md#recovery-and-duplicate-publication-exercise).
A deliberate, clean mid-job worker restart with no underlying bug involved — to confirm the recovery
path in isolation, without a remediation step in between — has not been separately run and remains a
gap. The worker's revision name for this event was also not separately captured.

## 7. Cost and capacity documentation

Do not describe any of this as simply "free." The actual hosting model, per component:

| Component                                                       | Hosting model                                                                         | Compute cost behaviour                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (static)                                               | Cloudflare Pages                                                                      | Static asset hosting; no server-side compute, so no compute cost regardless of traffic.                                                                                                                                                                                                                                                                                               |
| Backend API                                                     | Azure Container Apps, consumption plan, 0.5 vCPU/1Gi, `minReplicas=0`/`maxReplicas=1` | Billed for active vCPU-seconds/GiB-seconds while a replica is running; scales to zero and incurs no compute charge while idle. Azure Container Apps includes a monthly consumption-plan free grant before metered billing applies — the exact remaining grant/usage is an account-level figure, not a static one, and should be read from the Azure subscription rather than assumed. |
| Background worker                                               | Azure Container Apps, consumption plan, 0.5 vCPU/1Gi, `minReplicas=0`/`maxReplicas=3` | Same billing model as the API; scales to zero between queued jobs, so cost tracks actual dataset-release/validation activity rather than being continuous.                                                                                                                                                                                                                            |
| Service Bus                                                     | Standard namespace (required for sessions/duplicate detection used by the queue)      | Namespace-level charge independent of the API/worker's own scale-to-zero behaviour — this is the one component in the async path that is not scale-to-zero.                                                                                                                                                                                                                           |
| Azure Container Registry                                        | Basic tier                                                                            | Fixed low-cost tier for private image storage; not scale-to-zero, but flat and low.                                                                                                                                                                                                                                                                                                   |
| PostgreSQL / Auth                                               | Supabase-managed                                                                      | Managed-service plan; not part of the Azure resource group and not affected by Container Apps scaling.                                                                                                                                                                                                                                                                                |
| App Service (`statsthegame-api-dev`) — **rollback target only** | Currently provisioned at the Sprint 2 mitigation tier                                 | **This is the component most likely to be left running unnecessarily.** Unlike the Container Apps path, App Service does not scale to zero — it is billed continuously at whatever plan tier it is set to for as long as the plan exists, whether or not it is receiving traffic.                                                                                                     |

### Avoiding accidental ongoing cost from the temporary mitigation

The Sprint 2 B2 upgrade was deliberately temporary, and the App Service plan is still live today as the
acceptance-period rollback target described in `azure-backend.md`. Concretely, to avoid paying for
compute that isn't part of the normal deployment path:

1. **Do not scale the App Service plan up "just in case."** Its role is a manual rollback path, not
   warm standby capacity; it does not need to track the Container Apps capacity plan.
2. **Track its retirement as an explicit, recorded decision**, not an implicit one. `azure-backend.md`
   is explicit that `statsthegame-api-dev` must not be retired, stopped, or reconfigured until the full
   acceptance checklist in that document is complete and retirement is deliberately decided — but that
   also means it must actually be revisited once acceptance is complete, rather than left running
   indefinitely by default.
3. **Prefer scale-to-zero configuration for any new Container Apps component** unless there is a
   documented reason (such as Service Bus's namespace-level pricing) that it cannot scale to zero.
4. **Check plan/tier state as part of any recovery**, not just health.** A component that "recovered" by
   being manually upgraded (as in Sprint 2) is a cost signal as much as a health signal — record the
   upgrade and revisit it, rather than treating "healthy" as the end of the incident.

**Observed:** the 2026-09-25 Development acceptance run (see section 5) shows both the API and worker
staying at a single replica with average CPU under 3% of their allocated 0.5 vCPU throughout a full
release cycle, and zero restarts. That is a favourable cost signal for the Development environment at
this corpus size — it did not need to scale out, so its consumption-plan billing for that run stayed
close to the scale-to-zero floor between requests. It is not yet a production-cost figure: dollar cost
was not captured (only CPU/memory/replica metrics), and this run used a synthetic 300-fixture,
72,000-delivery corpus on the Development resource group, not production traffic or production data
volume.

## 8. Production-scale acceptance evidence

This document's final-architecture and capacity claims are validated by the procedure in
[`production-scale-acceptance.md`](production-scale-acceptance.md), with results recorded in
`evidence/sprints/sprint-3/issue-565-production-scale-deployment-acceptance.md` and the raw runner
output in `evidence/sprints/sprint-3/issue-565-live-result.json`.

**Environment:** Development (`rg-statsthegame-dev`), commit `793a2212eaadf91a6684fa88c01d38111f00dc7c`,
frontend `https://sport-analytics-tool-web.pages.dev`. This is a development-environment acceptance
run, not a production run — there is no separate production deployment target for this evidence to
have been captured against.

**What passed, with real observed values (verified against the raw JSON, not just the summary table):**

- Backend health, CORS, database-backed public read, and authenticated `/auth/me` all passed.
- Frontend root and `/fixtures` route both returned the application marker.
- The full asynchronous release lifecycle completed: release `2026.09.25-issue-565-acceptance-1`
  published **3,207,110 events**, with artifact SHA-256 `e28271dca680cd69e5aca34cc47efed4bf18be9db7967a6014b1a1a916aad8b2`
  matching published metadata.
- 48 public `/fixtures?limit=1` reads succeeded while generation was in progress: 318.4–856.7 ms,
  421.3 ms average.
- 48 public `/fixtures/8937/statistics` reads succeeded while generation was in progress:
  1217.2–1359.5 ms, 1259.2 ms average.
- A separate live release the day before (`2026.09.24-issue-565-live`) recovered from a real worker
  fault mid-generation and published one immutable artifact with no duplicate — see section 6.
- Capacity metrics for both the API and worker Container Apps were captured — see section 5.

**What was explicitly _not_ separately captured, per the evidence file itself (these are documented
gaps, not silent assumptions):**

- A browser-rendered screenshot of the fixture/statistics screen while generation was in progress (the
  public-read samples above prove the API responded correctly; they don't prove React rendered it).
- The worker's specific revision name during the recovery event.
- Separate API failed-request/platform-error and Azure Service Health views (only the worker's
  pre-remediation failure/retry logs were retained).
- The exact Azure Portal time-range selection behind the capacity metrics in section 5.
- A clean, deliberately-triggered worker restart independent of the real fault that occurred (see
  section 6's nuance on this).
- Any production-environment run — everything above is Development only.

Given this, issue #566's acceptance criterion "production-scale acceptance evidence is linked" is
satisfied for the Development environment. The gaps above should be tracked as follow-up rather than
reopening #565 for them, unless the team decides production-environment validation is required before
this architecture is considered fully accepted.

## 9. Related issues

- #565 — Production-scale deployment acceptance (complete for Development; source of the evidence in section 8)
- #563 — Backend migration from Azure App Service to Azure Container Apps
- #564 — Frontend migration from Azure App Service to Cloudflare Pages
- #365 — Worker/Service Bus deployment target (ADR-010)
- #278 — Worker batch-ingestion processing implementation

## AI Declaration

This document was drafted with the assistance of Claude (Anthropic), consolidating and cross-linking
existing repository documentation (`azure-app-service-recovery.md`, `overview.md`, `azure-backend.md`,
`azure-worker.md`, `production-scale-acceptance.md`, ADR 0003, ADR-010, ADR-011), the merged Bicep
templates (`infra/azure/backend/main.bicep`, `infra/azure/worker/main.bicep`), and the completed #565
evidence (`evidence/sprints/sprint-3/issue-565-production-scale-deployment-acceptance.md` and
`evidence/sprints/sprint-3/issue-565-live-result.json`). Observed figures in sections 5, 6, 7 and 8 were
checked against the raw JSON runner output rather than transcribed from the summary alone. Remaining
gaps in that evidence (browser screenshots, worker revision name, API/Service-Health failure views,
exact metrics time range, a clean non-fault-driven worker restart, and any production-environment run)
are called out explicitly rather than assumed complete. The project team must review this document and
confirm the linked source documents before merging.
