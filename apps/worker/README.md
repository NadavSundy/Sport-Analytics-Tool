# Asynchronous ingestion worker

`@sport-analytics/worker` is the independently runnable Node.js host for asynchronous ingestion.
It receives small commands from Azure Service Bus in peek-lock mode, relays durable PostgreSQL outbox
messages to the queue, reads staged package bytes from the private Blob container, emits structured
payload-free logs, and exposes separate liveness and readiness endpoints.

The worker supports two versioned commands:

- `worker.probe` version 1 for read-only deployment and recovery verification; and
- `batch.validate` version 1 for issue #278 batch expansion, reference resolution and asynchronous
  validation.

## Batch processing lifecycle

A successful receipt stores the source bytes first, then creates the `batch`, `background_job` and
`outbox_message` records in one database transaction. The worker's outbox relay claims unpublished
messages with `FOR UPDATE SKIP LOCKED`, publishes the small command to Service Bus and marks the
outbox row published only after the broker acknowledges it.

For `batch.validate`, the worker claims a validation lease in `batch_checkpoint`, transitions the batch
to `validating`, scans the package, resolves references in set-based database reads, and validates each
canonical delivery with the shared `submissionEventSchema`. Items are persisted in bounded chunks and
the checkpoint is advanced in the same transaction as the chunk. Validation faults reject the affected
item and continue where safe; infrastructure faults are retried with a bounded attempt count and a
visible batch failure state. A completed batch with at least one accepted item enters
`awaiting_review`; a batch with no accepted items enters `rejected`. The worker never inserts staged
events into public delivery/event tables.

The default chunk size is 500 items. Package expansion accepts the approved JSON, CSV and NDJSON
media types, assigns deterministic zero-based ordinals, strips a UTF-8 BOM, honours CSV quoting and
records recoverable malformed-row faults without turning them into infrastructure retries.

## Run locally

Copy `.env.example` to `.env`, replace every placeholder, authenticate with Azure CLI, then run from
the repository root:

```text
npm run dev:worker
```

Important issue #278 controls are:

- `OUTBOX_POLL_INTERVAL_MS` — delay between empty outbox polls, default `1000`;
- `OUTBOX_CLAIM_TTL_MS` — relay claim lease, default `30000`;
- `OUTBOX_BATCH_SIZE` — outbox rows claimed per poll, default `20`;
- `BATCH_CHUNK_SIZE` — validation persistence chunk, default `500`; and
- `BATCH_LEASE_MS` — durable validation lease, default `120000`.

The health endpoints are:

- `GET http://localhost:3001/health/live` — process liveness;
- `GET http://localhost:3001/health/ready` — database, Service Bus and private Blob readiness; and
- `GET http://localhost:3001/health/status` — the same safe dependency state plus delivery, outbox and
  batch-processing counters.

Enqueue a read-only deployment probe from another terminal:

```text
npm run probe:enqueue --workspace=@sport-analytics/worker
```

A real `batch.validate` message is not normally enqueued by hand: submitting a staged batch creates a
transactional outbox row, and the running worker relay publishes it. The local Azure identity therefore
needs Service Bus Data Receiver **and Data Sender**, plus Blob Data Reader or Contributor for the
configured private container.

Restart recovery is durable. If a process dies after claiming a batch, another delivery can reclaim the
batch after `BATCH_LEASE_MS`; already committed ordinals remain behind the checkpoint and are not
reprocessed. Service Bus redelivery is therefore an execution trigger, not the source of lifecycle
truth.

## Verify

```text
npm run lint --workspace=@sport-analytics/worker
npm run typecheck --workspace=@sport-analytics/worker
npm run test --workspace=@sport-analytics/worker
npm run build --workspace=@sport-analytics/worker
npm run test:database:local
npm run test:deployment
```

See [Azure worker deployment](../../docs/deployment/azure-worker.md) for the complete environment,
provisioning, restart/recovery, logging, troubleshooting and cleanup walkthrough, and
[Batch submission packages](../../docs/data/batch-submission-packages.md) for the wire formats.

## AI Declaration

The worker host, tests and this guide were generated or edited with the assistance of Codex[GPT-5]
and ChatGPT-Web[GPT-5.6 Sol]. Human verification of database migrations, the Azure deployment, RBAC
assignments, live health, queue processing and forced restart recovery remains required.
