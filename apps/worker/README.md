# Asynchronous ingestion worker

`@sport-analytics/worker` is the independently runnable Node.js host for asynchronous ingestion.
It receives small commands from Azure Service Bus in peek-lock mode, checks PostgreSQL and the
private staged-ingestion Blob container, emits structured payload-free logs, and exposes separate
liveness and readiness endpoints. Issue #278 adds the batch expansion and validation handler; this
target currently accepts only the read-only `worker.probe` version 1 deployment command.

## Run locally

Copy `.env.example` to `.env`, replace every placeholder, authenticate with Azure CLI, then run from
the repository root:

```text
npm run dev:worker
```

The health endpoints are:

- `GET http://localhost:3001/health/live` — process liveness;
- `GET http://localhost:3001/health/ready` — database, Service Bus and private Blob readiness; and
- `GET http://localhost:3001/health/status` — the same safe dependency state plus delivery counters.

Enqueue a read-only deployment probe from another terminal:

```text
npm run probe:enqueue --workspace=@sport-analytics/worker
```

The local Azure identity needs Service Bus Data Receiver for the worker, Service Bus Data Sender for
the probe command, and Blob Data Reader or Contributor for the configured private container.

## Verify

```text
npm run lint --workspace=@sport-analytics/worker
npm run typecheck --workspace=@sport-analytics/worker
npm run test --workspace=@sport-analytics/worker
npm run build --workspace=@sport-analytics/worker
npm run test:deployment
```

See [Azure worker deployment](../../docs/deployment/azure-worker.md) for the complete environment,
provisioning, restart/recovery, logging, troubleshooting and cleanup walkthrough.

## AI Declaration

The worker host, tests and this guide were generated with the assistance of Codex[GPT-5]. Human
verification of the first Azure deployment, RBAC assignments, KEDA scaling, live health and forced
restart recovery remains required.
