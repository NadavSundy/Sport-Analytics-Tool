# ADR-010: Transactional outbox, Azure Service Bus, and idempotent workers

- **Status:** Accepted for Intermediate implementation
- **Date:** 2026-08-21
- **Participants:** Dean Feldman (document owner); Nadav Sundy (issue #356 approval)
- **Related issues:** #55, #356
- **Approval:** Nadav Sundy approved the worker-hosting and job-delivery decision for issue #356
  on 2026-09-02.

## Context

Bounded validation and fixture-statistic calculations can remain inside the current request while
they meet an agreed timeout. Batch ingestion, large recalculation, dataset generation, and scheduled
external synchronisation must eventually survive HTTP disconnects, application restarts, and
retries.

The critical consistency boundary is between PostgreSQL and a queue. Accepting an event in the
database and then failing to enqueue its recalculation would publish stale statistics. Sending a
queue message first can instead expose work for data that never commits. Azure Service Bus delivery
is at least once, so duplicate processing also has to be safe.

## Decision

### Adoption gate and components

Keep bounded operations synchronous until representative tests show that they exceed the API's
latency, memory, or reliability limits. When asynchronous work is required, use:

1. a PostgreSQL `background_job` record for user-visible state and parameters;
2. a PostgreSQL transactional outbox written with the domain change and job record;
3. an outbox relay that sends the committed job identifier to **Azure Service Bus Standard**;
4. a separately deployable Node.js worker using the same domain services and validation rules as
   the API; and
5. an idempotent completion transaction that stores output/provenance and advances job state.

The worker is a separate process and failure boundary, not an untracked promise or timer inside the
API process. Host it as a **separate Azure Container App** with a bounded Service Bus KEDA scaling
rule and managed identity. Keep one minimum replica while it owns continuous outbox relay duties;
scale queue-consuming replicas only to the concurrency proven safe for PostgreSQL and external
providers. This adds an Advanced/Intermediate worker deployment without changing ADR 0003's accepted
App Service hosting for the frontend and API.

### Transaction and delivery flow

```text
API transaction
  -> validate request and authorisation
  -> change authoritative domain state
  -> insert background_job and outbox_message
  -> commit

Outbox relay
  -> claim unpublished rows with a short database lock
  -> send MessageId = outbox_message.id to Service Bus
  -> record published_at only after an acknowledged send

Worker
  -> receive with peek-lock
  -> claim job/idempotency key transactionally
  -> execute or resume bounded work
  -> store result, provenance, and terminal status
  -> complete the queue message only after the database commit
```

The queue message is a small command envelope containing identifiers, type, version, trace ID, and
attempt metadata. Large uploads, exports, event batches, secrets, and personal data are not copied
into Service Bus; the worker retrieves authorised input through PostgreSQL and the object-storage
adapter from ADR-011.

### Job contract

Every job type defines:

- a stable job type and payload schema version;
- an idempotency key based on the business operation, not a random delivery attempt;
- queued, running, succeeded, failed, cancelled, and dead-lettered states;
- progress that is meaningful but not updated so frequently that it overloads PostgreSQL;
- an attempt limit, timeout, retryable-error allow-list, and exponential backoff with jitter;
- ownership and authorisation rules for status and result access;
- input, output, data-version, and statistic-definition provenance; and
- safe cancellation points where cancellation cannot leave a partial authoritative result.

Workers may write intermediate artefacts under attempt-specific identifiers, but publish a result
only in a final transaction. A retry observes the existing idempotency record and resumes or returns
the recorded outcome instead of applying the operation twice.

Use Service Bus duplicate detection as additional protection for relay retries, with the stable
outbox ID as `MessageId`. It does not replace consumer idempotency because its detection window is
bounded and peek-lock delivery can repeat. Use sessions only for job types requiring per-key FIFO
processing, with a stable fixture or release identifier as `SessionId`; independent fixture jobs
remain parallel.

### Failure and operations

- Retry only failures classified as transient. Invalid input, unsupported versions, and permanent
  domain conflicts fail without repeated execution.
- After the configured delivery count, messages move to the dead-letter queue. Operators inspect,
  repair, replay, or explicitly discard them; the DLQ is never an unattended archive.
- Health checks distinguish API readiness, outbox backlog, queue connectivity, worker heartbeat,
  oldest queued age, active duration, retry count, and DLQ depth.
- A reconciliation task finds committed unpublished outbox rows and jobs whose message or worker
  progress stalled.
- Deployments remain backward compatible while old queued message versions can exist. Workers reject
  unknown versions safely and job-schema support is removed only after queues and the DLQ are clear.
- Queue and worker credentials are server-side and least privilege. Logs use identifiers and safe
  summaries rather than full payloads.

## Alternatives considered

### In-process promises, timers, or an in-memory queue

Rejected because App Service restarts, deployments, and scale-out can lose work or execute it more
than once without an authoritative record.

### PostgreSQL table as the only queue

This is the smallest infrastructure footprint and preserves atomic enqueueing. It was rejected as
the target because continuous polling and job contention share capacity with the authoritative
database, while retries, dead-letter operations, and scaling would be custom application concerns.
PostgreSQL remains the outbox and job-status source, not the long-term delivery broker.

### Azure Storage Queue

Rejected because Service Bus provides the stronger broker features required here, including
duplicate detection, sessions for ordered work, and an integrated dead-letter queue. Storage Queue
may be cheaper for simple independent tasks but would move more correctness logic into the
application.

### Direct database transaction plus Service Bus send

Rejected because PostgreSQL and Service Bus do not share one atomic transaction. The outbox closes
the crash window without distributed transactions.

### Azure App Service WebJobs

Considered because the API already uses App Service and continuous WebJobs can poll a queue. Rejected
as the target because the worker needs an independent deployment and scaling boundary. Sharing the
API plan would allow batch CPU or memory use to affect request handling; a separate WebJob host
provides little advantage over a purpose-built worker service.

### Azure Functions as the initial worker

Rejected as the default because the current domain code and deployment model are Node App Service
applications, and long imports or recalculations can exceed event-function execution assumptions.
A thin Functions relay or a future bounded handler may be adopted behind the same contracts if it
has a measured advantage.

## Advantages

- Domain changes and the intent to process them commit atomically.
- API requests return a durable job ID and survive disconnects or restarts.
- Peek-lock, bounded retry, duplicate detection, and idempotent consumers minimise loss and duplicate
  effects.
- Per-fixture sessions are available where correction ordering matters without serialising all work.
- API and worker reuse one domain model while remaining independently deployable.

## Disadvantages and risks

- Adds Service Bus, a relay, a worker deployment, schemas, credentials, monitoring, and cost.
- Delivery remains at least once; every side effect still requires an idempotency design.
- An outbox relay lag or DLQ backlog can delay published statistics while the API remains healthy.
- Long-running jobs need lock renewal, checkpoints, and carefully bounded concurrency.
- Strict sessions can reduce throughput or block later fixture work behind a poison message.
- Message-schema changes require compatibility across independently deployed API and workers.

## Consequences

- Async API endpoints return `202 Accepted`, a stable job identifier, and an authorised status URL.
- The shared codebase gains queue and clock interfaces; domain services do not import Azure SDKs
  directly.
- Database migrations introduce jobs, outbox rows, state constraints, idempotency keys, and indexes
  only when the first async use case is implemented.
- Cache invalidation from ADR-009 and object export work from ADR-011 use the same outbox/worker
  foundation.
- Live-event notifications may use outbox records, but the durable replay source remains PostgreSQL
  as decided in ADR-012.

## Verification and review date

The decision was accepted for Intermediate implementation under issue #356 on 2026-09-02. Review
again before the first asynchronous endpoint is merged and after a representative failure
rehearsal. Tests must
cover the commit/enqueue crash windows, duplicate sends and deliveries, worker restart, retry
classification, max delivery and DLQ handling, idempotent output, per-fixture ordering where used,
cancellation, incompatible message versions, reconciliation, and unauthorised job access.

Provisioning remains separate implementation work. Acceptance of this ADR selects the target
architecture; it does not claim that Service Bus, the relay, or the worker is deployed.

## References considered

- [Prevent message loss and duplicate processing in Azure Service Bus](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates)
- [Azure Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection)
- [Azure Service Bus message sessions](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions)
- [Azure Service Bus dead-letter queues](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues)
- [Azure Service Bus client library for JavaScript](https://learn.microsoft.com/en-us/javascript/api/overview/azure/service-bus-readme)
- [Azure Container Apps scaling and Service Bus rules](https://learn.microsoft.com/en-us/azure/container-apps/scale-app)
- [Azure guidance for background jobs](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs)

## AI Declaration

This decision record was drafted and reconciled with the repository with the assistance of
Codex[GPT-5].
Its issue #356 approval status was recorded with the assistance of Codex[GPT-5].
