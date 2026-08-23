# ADR-012: Adapter-based live ingestion with durable replay and server-sent events

- **Status:** Proposed
- **Date:** 2026-08-21
- **Participants:** Dean Feldman (document owner); project team (review requested)
- **Related issue:** #55

## Context

Live cricket feeds can arrive through provider webhooks, streams, or polling and may contain
duplicates, gaps, late deliveries, and corrections. The provider and licence are not selected, so
provider transport cannot become the domain model. Live events must converge on the same accepted
event revisions and statistics as an equivalent ordered file submission.

Browser consumers need low-latency updates, but a socket connection is not a durable record. Clients
that disconnect or miss messages require replay, and clients whose cursor is too old require an
authoritative snapshot. The present public experience is predominantly server-to-client, so a full
duplex browser protocol would add complexity without a current use case.

## Decision

### Provider ingress

Put every live provider behind a `LiveFeedAdapter`. The adapter may receive an authenticated webhook,
maintain a provider stream, or perform bounded polling, but it emits one versioned internal ingestion
envelope:

```text
provider
provider_fixture_id
provider_event_id
provider_revision
provider_sequence (optional)
observed_at
occurred_at (optional)
payload_schema_version
raw_object_id or payload_checksum
normalised_submission
```

The provider endpoint verifies signatures or credentials, applies request/rate/size limits, records
safe retrieval metadata, and acknowledges only according to the provider's retry contract. Secrets
remain server-side. Raw bytes may be retained through ADR-011 when licence and retention policy
permit it.

Ingress uses ADR-010's durable jobs once work can outlive the request. A uniqueness rule on provider,
provider fixture, event ID, and revision deduplicates deliveries without assuming that arrival order
is match order. Missing provider sequence numbers create a visible gap state and trigger bounded
reconciliation with the provider rather than invented events.

Every normalised event passes through the existing contract, cricket validation, scope, review, and
immutable-revision acceptance path. A correction inserts a new accepted revision and supersedes the
old current revision; it never mutates history in place. Per-fixture locking or Service Bus sessions
serialise the small commit boundary where concurrent corrections could conflict, not the entire
cross-fixture pipeline.

### Durable change log and replay

In the same PostgreSQL transaction that accepts or supersedes an event, append an `event_change`
record and an ADR-010 outbox notification. `event_change` has a monotonically increasing opaque
cursor, fixture ID, change type, accepted event/revision IDs, data version, safe public projection,
and commit time.

The cursor represents commit order, not cricket delivery order. Consumers use the domain sequence
inside the projection to render the match correctly and treat correction events as invalidations of
the affected snapshot. A reconnect query reads changes where `cursor > supplied_cursor` for the
authorised fixture in ascending cursor order.

Keep change rows for an explicitly approved replay window. The API returns a fixture snapshot with
its current cursor for first load and recovery. If a cursor is invalid, outside the fixture, or older
than retained history, the server instructs the client to refetch the current snapshot rather than
silently skipping the gap.

### Browser delivery

Use **Server-Sent Events (SSE)** for public live fixture updates through the handwritten API, for
example:

```text
GET /api/v1/fixtures/{fixtureId}/live?after=<optional snapshot cursor>
Accept: text/event-stream
Last-Event-ID: <opaque event_change cursor on automatic reconnect>
```

Each SSE message includes `id` set to the durable cursor, a versioned event name, and a validated
public projection. The endpoint:

1. authorises access and validates the optional initial `after` cursor or reconnect
   `Last-Event-ID` cursor;
2. replays committed rows after that cursor in bounded pages;
3. transitions to new committed notifications without creating a replay gap;
4. sends periodic comment heartbeats to keep supported proxies from considering the connection
   idle; and
5. closes or emits a reset instruction when bounded connection, backlog, or deployment limits are
   reached.

Native `EventSource` cannot set `Last-Event-ID` arbitrarily on its first request, so the snapshot's
cursor is supplied through the validated `after` query parameter. The browser's automatic
`Last-Event-ID` reconnect behaviour is a convenience, not proof of exactly-once delivery. Clients
deduplicate by cursor, apply events idempotently, and refetch the snapshot after a reset, parse error,
data-version gap, or correction they cannot reconcile. Normal REST snapshot and event endpoints
remain usable when streaming is unavailable.

The current single API instance may wake connected clients through an in-process notifier after the
outbox commit, but notifications contain only cursors and are disposable. Before API scale-out,
replace that notifier with a cross-instance fan-out adapter. Azure Web PubSub is the preferred
managed candidate if measured connection volume makes direct App Service SSE impractical. Regardless
of fan-out provider, PostgreSQL `event_change` and the snapshot endpoint remain the replay and
recovery authority.

### Operations and safety

- Metrics include provider lag, gap count, duplicates, corrections, rejected events, outbox lag,
  oldest retained cursor, active SSE connections, reconnect/reset rate, and snapshot recovery rate.
- Provider outage marks the live feed stale with the last successful observation time; historical
  pages, accepted data, and unrelated routes remain available.
- Bound replay page size, connection count, connection duration, heartbeat rate, and per-client
  bandwidth. Apply public rate limiting before enabling the endpoint broadly.
- Disable proxy buffering and compression behaviours that prevent timely streaming, and validate
  App Service idle-timeout and deployment-reconnect behaviour in the target environment.
- Do not expose provider-only identifiers, raw/licensed payloads, submission ownership, audit data,
  or credentials in the public stream.

## Alternatives considered

### WebSockets from the first live implementation

Rejected because public score updates are server-to-client and SSE supplies HTTP semantics,
automatic reconnect, and `Last-Event-ID` without a second bidirectional protocol. WebSockets remain
appropriate only if an approved feature later requires sustained two-way low-latency messaging.

### Periodic browser polling only

Retained as a fallback but rejected as the primary live experience because it repeats unchanged
responses and trades latency against request load. Snapshot polling is still the recovery path when
streaming is unavailable.

### Azure Web PubSub as the system of record

Rejected because fan-out delivery cannot replace accepted event revisions, correction provenance,
or replay after the service retention window. It may later carry cursor notifications while
PostgreSQL remains authoritative.

### Redis Pub/Sub for replay

Rejected because Pub/Sub notifications are ephemeral. Azure Managed Redis may assist fan-out after
ADR-009's adoption gate, but disconnected-client replay still comes from PostgreSQL.

### Write live events directly to a separate live table or client state

Rejected because live and file paths would apply different validation and correction rules and could
produce divergent statistics. One normalised acceptance path is required.

### Assume provider delivery order is final

Rejected because network retries, polling windows, corrections, and provider behaviour can reorder
messages. Provider sequence is evidence to validate, not a substitute for deterministic domain
ordering and reconciliation.

## Advantages

- Provider-specific transports do not leak into contracts or event storage.
- Live and historical ingestion share validation, authorisation, immutable revisions, and
  statistics.
- Durable cursors support reconnect, bounded replay, audit, and deterministic tests.
- SSE matches the current one-way browser use case and works through the existing HTTP API.
- Managed fan-out can be introduced later without changing replay semantics.

## Disadvantages and risks

- PostgreSQL change-log retention adds storage and indexing load.
- SSE holds long-lived App Service connections and needs proxy, timeout, deploy, and scale testing.
- A race between replay and live subscription can lose notifications unless the transition is
  implemented and tested carefully.
- Provider gaps or incompatible corrections can leave a fixture stale pending reconciliation.
- Retaining raw feed data or redistributing live projections may breach provider licence terms.
- The native browser `EventSource` API cannot attach arbitrary bearer headers; public streams are
  straightforward, while a future private stream would need same-site cookie authentication, a
  constrained token mechanism, or fetch-based streaming with a separate security review.

## Consequences

- Live implementation remains blocked on a licensed provider, its retry/correction semantics, and a
  retained test fixture, but transport and replay contracts can be designed now.
- Database work introduces provider delivery identities and `event_change` only with the first live
  slice; cursor values remain opaque in public contracts.
- ADR-010 supplies durable ingestion and outbox delivery; ADR-009 invalidates affected cached
  projections; ADR-011 optionally retains permitted raw envelopes.
- A change-feed retention and snapshot-recovery objective must be approved before production live
  traffic.
- End-to-end replay tests compare shuffled, duplicated, interrupted, and corrected live input with
  the equivalent ordered source fixture.

## Verification and review date

The project team must review this proposal in the Pull Request for #55. Review again after a live
provider and licence are selected and before public live traffic is enabled. Verification must cover
signature/credential failure, duplicates, gaps, late and out-of-order events, corrections,
concurrent fixture updates, provider outage, crash/retry, replay-to-live handoff, reconnect from
`Last-Event-ID`, invalid/cross-fixture/expired cursors, snapshot reset, client deduplication,
rate/connection limits, App Service restart, and equivalence with ordered file ingestion.

Before merge, record the reviewer and review evidence in the Pull Request and change this record to
`Accepted` only if the proposal is approved without an unresolved architectural objection.

## References considered

- [WHATWG HTML server-sent events standard](https://html.spec.whatwg.org/dev/server-sent-events.html)
- [Azure Web PubSub resiliency and multiple-endpoint guidance](https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-disaster-recovery)
- [Azure Service Bus ordered message sessions](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions)
- [Prevent message loss and duplicate processing in Azure Service Bus](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates)

## AI Declaration

This decision record was drafted and reconciled with the repository with the assistance of
Codex[GPT-5].
