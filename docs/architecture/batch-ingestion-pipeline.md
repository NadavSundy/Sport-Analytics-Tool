# Batch Staging, File Storage and Processing Pipeline

**Issue:** #275 — Design the batch staging, file storage and processing pipeline
**Roadmap mapping:** S2-18 — Intermediate batch-pipeline foundation
**Status:** Approved for implementation; remaining decisions resolved by #356 on 2 September 2026
**Author:** B. Swartz

---

## 1. Purpose and Scope

### 1.1 Purpose

This document defines the implementation design for batch ingestion: the staging of whole-season and back-catalogue uploads, their validation prior to publication, their asynchronous processing, the reporting of their outcomes, the preservation of their provenance, and the idempotent and resumable execution of the work.

### 1.2 Scope

This document defines the approved design intent. Issue #276 has implemented the database staging
foundation; the remaining issues listed in section 13 carry the application and infrastructure work.

### 1.3 Out of scope

1. The submission review user interface, defined by issue #283.
2. Dataset release and snapshot construction, defined by issue #294.
3. Selective recomputation of derived statistics after publication, defined by issue #286.
4. The corpus importer, described in section 2.1 as context only and not modified by this design.

---

## 2. Context

### 2.1 Three ingestion paths exist

**The corpus importer** (#175) is a trusted operator-initiated utility. It reads Cricsheet ball-by-ball JSON, creates fixtures, innings, participants and deliveries, and performs no submitter authorisation. It has ingested 14,011 fixtures and 3,207,109 deliveries.

**Direct event submission** (#27, #49, #50) accepts a JSON request from an authenticated submitter and validates it against `submissionRequestSchema`. It does not create fixtures or innings.

**File upload submission** (#265) accepts a single `.json` or `.csv` file at `POST /submissions/uploads`, parses it into the same submission shape, and processes it synchronously within the request. It uses `multer.memoryStorage()` with a 1 MB file limit.

### 2.2 The constraint that requires batch ingestion

`submissionRequestSchema` limits a submission to 1,000 events:

```ts
events: z.array(submissionEventSchema).min(1).max(1_000);
```

At a mean of approximately 229 deliveries per fixture, one submission carries about four fixtures. A seventy-match competition season is of the order of 16,000 deliveries and therefore requires at least seventeen submissions, each independently authorised, validated and recorded.

This is the reason batch ingestion exists. The 1 MB file limit is not the binding constraint and is never reached: 1,000 events is reached first.

### 2.3 The problem this design must solve

Batch ingestion requires the submission API's trust model at the corpus importer's volume. Neither existing path provides both. A batch is not a larger submission and it is not an authorised import. It is untrusted input, arriving in quantity, held outside the event tables until a reviewer accepts it.

### 2.4 Architectural position

The architecture overview records a background worker as a future deployment boundary for batch imports, to be introduced when asynchronous work is implemented. This design activates that boundary.

Issue #265 introduced no object-storage component: `multer.memoryStorage()` holds the payload in
application heap. Section 5 activates the private Azure Blob Storage boundary accepted in ADR-011.
ADR-010 similarly fixes the worker boundary as an Azure Container App consuming identifiers from
Azure Service Bus Standard through a PostgreSQL transactional outbox.

### 2.5 Measured constraints

| Constraint                                               | Value                   | Source                                                |
| -------------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| Database round-trip latency, Johannesburg to `eu-west-2` | approximately 173 ms    | #105                                                  |
| Deliveries ingested                                      | 3,207,109               | #175                                                  |
| Fixtures ingested                                        | 14,011                  | #175                                                  |
| Mean deliveries per fixture                              | approximately 229       | derived                                               |
| Maximum events per submission                            | 1,000                   | `submissionRequestSchema`                             |
| Fixtures per submission                                  | approximately 4         | derived                                               |
| Submissions required for a 70-match season               | approximately 17        | derived                                               |
| Maximum upload size                                      | 1,000,000 bytes         | `submission-upload.ts`, `submissionSchema.sourceFile` |
| Upload storage                                           | application heap        | `multer.memoryStorage()`                              |
| Storage per delivery row                                 | approximately 249 bytes | #121                                                  |
| Ingestion throughput, before batching                    | 0.05 matches/second     | #175                                                  |
| Ingestion throughput, after batching                     | 0.28 matches/second     | #175                                                  |

The maximum upload size is expressed independently in the multer configuration and in `submissionSchema.sourceFile.sizeBytes`. These two values must be kept consistent, and section 13.3 raises this.

---

## 3. Governing Decision: What Is Shared and What Is Not

### 3.1 Decision

A batch item must be validated against **`submissionEventSchema`** — the same per-event contract, executed by the same code, as a directly submitted event.

A batch must **not** reuse `submissionRequestSchema`, and must **not** reuse the file parser in `submission-upload.ts`.

### 3.2 What is shared, and why

The per-event contract defines what a valid delivery is. Two definitions cannot coexist: a delivery's validity would depend on the route by which it arrived, and the platform could not then claim that a published figure is traceable to the events that produced it.

Sharing `submissionEventSchema` also means that #282, which implements impossible and conflicting event validation rules, applies to batch ingestion without further work.

### 3.3 What is not shared, and why

**The request envelope.** `submissionRequestSchema` caps events at 1,000, which is the constraint batch exists to escape. Its `superRefine` also performs cross-event checks — unique `eventId`, unique `inningsId:sequenceNumber`, ascending sequence within an innings, unique `inningsId:overNumber:positionInOver` — by accumulating sets in memory for the duration of one request. At batch scale these checks cannot be performed in memory across chunk boundaries. They must become database constraints. Section 6.2 specifies them.

**The response contract.** `submissionSchema.status` is `z.literal('accepted')`. It cannot express a staged, validating or awaiting-review state. Batch requires its own response schema returning a batch identifier for later collection, consistent with the brief's requirement that the API _"hand large requests off as jobs a consumer collects once they are ready."_

**The file parser.** `csvRows` in `submission-upload.ts` throws on the first row with an incorrect column count, terminating parsing. That behaviour is defensible for a file of at most 1,000 events. For a season upload it would report one error per round trip. Section 11.2 requires batch expansion to accumulate rejections rather than stop. This is a functional difference, not a preference, and is recorded as a defect against #265 in section 13.3.

### 3.4 Consequence

The direct-submission contract provides no path for creating fixtures or innings and is not extended
to do so. Batch receipt stores the original package before reference resolution, so #277 does not
require canonical fixture or innings identifiers at upload time. During expansion, the batch worker
resolves the human-facing references described in section 3.6. Unresolved or proposed match
structure remains staged until the later review and publication workflow makes an authorised
decision.

### 3.5 Rejected alternative

A parallel batch-only validation of individual events was considered and rejected. It would unblock #277 without resolving the fixture and innings gap, at the cost of a second definition of a valid delivery. The schedule benefit does not justify a permanent divergence in the platform's correctness guarantees.

### 3.6 Human-facing packages and reference resolution

Issue #356 approves JSON, CSV and NDJSON as the first batch package formats. Archive formats remain
excluded. Every format carries a batch envelope version separately from the shared event schema
version. Format-specific parsing produces one canonical staged representation before reference and
event validation.

Submitters do not provide PostgreSQL identifiers. A reference may contain a stable source identity
as `{ namespace, entityType, value }`, where the namespace identifies its owner, for example
`cricsheet`. Identifiers are compared only within the same namespace and entity type. Where a source
has no stable identifier, the package uses human-readable competition, season, fixture date, teams,
innings ordinal and participant names. Resolution is scoped from competition to fixture to innings
and participant; names are never treated as globally unique.

Exact source matches may resolve automatically. A unique exact alias in the resolved fixture context
may resolve automatically and is recorded. Missing or ambiguous references become actionable staged
validation results; the platform must not fuzzy-match or create canonical records silently. Later
review can select an existing record or approve a proposed canonical record, retaining the original
reference and the resolution decision for provenance. See
[`docs/data/batch-submission-packages.md`](../data/batch-submission-packages.md).

---

## 4. Batch Lifecycle States

_Satisfies acceptance criterion 1._

### 4.1 Batch states

| State                 | Meaning                                                                                            | Terminal |
| --------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| `received`            | Request accepted, batch record created. No payload stored.                                         | No       |
| `stored`              | Payload written to object storage, checksum recorded.                                              | No       |
| `validating`          | A worker holds a lease and is expanding and validating items.                                      | No       |
| `rejected`            | Validation completed; no item is publishable.                                                      | Yes      |
| `awaiting_review`     | Validation completed; at least one item accepted. Reviewer decision required.                      | No       |
| `publishing`          | Reviewer approved; accepted items are being written to the event tables.                           | No       |
| `published`           | All accepted items written.                                                                        | Yes      |
| `partially_published` | Publication completed with at least one accepted item failing to write. Operator action required.  | Yes      |
| `failed`              | Processing stopped through infrastructure failure after the retry budget was exhausted. Resumable. | No       |
| `superseded`          | Replaced by a later batch carrying the same idempotency key.                                       | Yes      |

### 4.2 Item states

| State               | Meaning                                                 |
| ------------------- | ------------------------------------------------------- |
| `pending`           | Expanded from the payload; not yet validated.           |
| `accepted`          | Passed validation; eligible for publication.            |
| `rejected`          | Failed validation. Carries a rejection code and detail. |
| `published`         | Written to the event tables.                            |
| `duplicate_skipped` | Matched an existing event by natural key; not written.  |

### 4.3 Permitted transitions

```text
received ──▶ stored ──▶ validating ──┬──▶ rejected
                                     └──▶ awaiting_review ──▶ publishing ──┬──▶ published
                                                                           └──▶ partially_published

validating  ──▶ failed ──▶ validating      (resume)
publishing  ──▶ failed ──▶ publishing      (resume)
any non-terminal ──▶ superseded
```

A transition not listed above must be rejected by the state machine and recorded as an integrity error.

### 4.4 Requirements

1. A batch state transition must be written in the same transaction as the work that caused it.
2. A batch in a terminal state may not transition, except that `rejected` and `published` may be superseded under section 8.4.
3. Every transition must be recorded in an append-only audit record carrying the actor, the timestamp and the reason.

---

## 5. File and Object Storage

_Satisfies acceptance criterion 2._

### 5.1 Why heap storage cannot be extended to batch

`multer.memoryStorage()` holds the entire payload in application heap. At the current 1 MB limit this is acceptable. At any limit permitting a season upload it is not: three concurrent submitters at 50 MB would place 150 MB of submitter-controlled data in the backend's heap, on an instance that also serves every read endpoint.

The payload must therefore be streamed to object storage and never held in application memory in its entirety.

### 5.2 Responsibilities

| Concern                                         | Owner                   |
| ----------------------------------------------- | ----------------------- |
| Original payload bytes                          | Object storage          |
| Payload checksum, size, media type, storage URI | Database (`batch`)      |
| Expanded per-item payloads                      | Database (`batch_item`) |
| Published events                                | Database (event tables) |

Object storage holds the evidential record of what a submitter actually sent. It is distinct from the expanded items.

### 5.3 Requirements

1. The payload must be streamed to object storage. It may not be buffered in application memory in its entirety.
2. The size limit must be enforced during streaming and the request aborted when exceeded, returning `413`, consistent with the existing upload route's behaviour.
3. The storage container must be private. No public or pre-signed read URL may be issued to any client.
4. The backend must be the only component holding storage credentials.
5. A SHA-256 checksum must be computed over the payload as it is streamed and recorded against the batch.
6. The stored object key must not be derived from a submitter-supplied filename.
7. The rate limit must be applied before the multipart parser, as it already is on `POST /submissions/uploads`.

### 5.4 Approved limits

The following limits were approved by Nadav Sundy under issue #356 on 2 September 2026. Their owner
is the batch-ingestion architecture; changing them requires a measured follow-up decision.

| Limit                                         | Approved value                                         | Basis                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maximum payload size                          | 50 MB                                                  | A 70-match season is of the order of 16,000 events; at CSV row sizes observed in the existing 21-column format this is single-digit megabytes, with headroom. |
| Maximum items per batch                       | 50,000                                                 | Approximately three seasons.                                                                                                                                  |
| Accepted media types                          | `application/json`, `text/csv`, `application/x-ndjson` | The first two match the existing upload route.                                                                                                                |
| Concurrent non-terminal batches per submitter | 3                                                      | Bounds worker and storage consumption per submitter.                                                                                                          |

Archive formats are excluded from the first implementation. An archive requires decompression-bomb defences that are not justified before a submitter has requested the capability.

### 5.5 Approved storage provider

Private Azure Blob Storage is approved under ADR-011. The API and worker access it only through a
backend-owned `ObjectStore` adapter. PostgreSQL owns authorisation, lifecycle and provenance; Blob
Storage owns the original bytes.

Approval selects the provider but does not claim that the account, private containers, managed
identity, lifecycle rules or reconciliation process are provisioned. Provisioning must account for
the application and storage regions, recovery, security and cost controls specified by ADR-011.

The provider decision no longer blocks #277.

---

## 6. Database Ownership

_Satisfies acceptance criterion 3._

### 6.1 Relations

Issue #276 introduced the following three relations.

**`batch`** — one row per submitted payload.

| Column                     | Purpose                              |
| -------------------------- | ------------------------------------ |
| `id`                       | Primary key.                         |
| `submitter_id`             | The authenticated submitter.         |
| `competition_id`           | The declared target competition.     |
| `idempotency_key`          | Submitter-supplied. See section 8.2. |
| `source_checksum`          | SHA-256 of the payload.              |
| `source_uri`               | Opaque application object reference. |
| `source_size_bytes`        | Payload size.                        |
| `state`                    | Section 4.1.                         |
| `item_count`               | Populated at expansion.              |
| `superseded_by`            | Nullable reference to a later batch. |
| `created_at`, `updated_at` | Timestamps.                          |

**`batch_item`** — one row per expanded event.

| Column                                          | Purpose                                                |
| ----------------------------------------------- | ------------------------------------------------------ |
| `id`                                            | Primary key.                                           |
| `batch_id`                                      | Owning batch.                                          |
| `ordinal`                                       | Position within the payload. Defines processing order. |
| `innings_id`, `over_number`, `position_in_over` | The natural key. See section 8.3.                      |
| `payload`                                       | Canonical event normalized from the submitted item.    |
| `state`                                         | Section 4.2.                                           |
| `rejection_code`, `rejection_detail`            | Rejection reason, machine- and human-readable.         |
| `published_event_id`                            | Nullable reference to the created event.               |

**`batch_checkpoint`** — one row per batch.

| Column             | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `batch_id`         | Primary key.                                     |
| `phase`            | `validating` or `publishing`.                    |
| `last_ordinal`     | Highest ordinal durably completed in this phase. |
| `lease_owner`      | Worker identity holding the batch.               |
| `lease_expires_at` | Lease expiry. See section 9.4.                   |
| `attempt_count`    | Retry budget consumption. See section 11.        |

### 6.2 Constraints

The cross-event rules currently enforced in `submissionRequestSchema.superRefine` hold only within one request. Batch requires them as database constraints, because a batch spans many chunks and many transactions, and because two separate batches may carry the same delivery.

1. `batch` must carry a unique constraint on (`submitter_id`, `idempotency_key`).
2. `batch_item` must carry a unique constraint on (`batch_id`, `ordinal`).
3. `batch_item` must carry a unique constraint on (`batch_id`, `innings_id`, `over_number`, `position_in_over`), detecting duplication within a payload.
4. **The event tables must carry a unique constraint on the live revision of (`innings_id`, `over_number`, `position_in_over`).** The existing `delivery_natural_key_live` partial unique index already supplies this constraint and must remain the publication backstop.
5. Ascending `sequence_number` within an innings must be verified at publication rather than at expansion, because a batch may be chunked and a season may span batches.
6. `batch_item.state` may only be `published` where `published_event_id` is not null.
7. Deletion of a `batch` row must be prohibited. Section 12.3 depends on the record surviving the payload.

### 6.3 Indexing

Index selection must account for the size of the `delivery` relation, which at 705 MB already carries 319 MB of indexes. Indexes on `batch_item` are to be added only where a defined query requires them, and the set reviewed under #290 rather than expanded speculatively here.

### 6.4 Implementation record (#276)

Migration `20260831100000000_batch-ingestion-models` implements these three relations with
PostgreSQL enum types, named checks and foreign keys. The two batch-item uniqueness constraints
also support the repository's ordered per-batch reads; no speculative secondary item indexes were
added. The required live-delivery constraint was already present as the partial unique index
`delivery_natural_key_live`, so #276 leaves it unchanged and preserves correction revision semantics.

Published items reference `delivery`, whose required `submission_id` continues the established
publication provenance chain. Batch and batch-item deletion are rejected by the database;
supersession retains and links records instead.

The implemented `batch.competition_id` is a canonical foreign key, but it is not a submitter-facing
input. The receipt API resolves the human-selected competition or namespaced competition reference,
then verifies the authenticated account's scope before creating the batch.

The implemented `batch_item.innings_id` is non-null, so `batch_item` owns only parsed events whose
fixture and innings references have resolved. A downstream validation migration must retain package
records that fail parsing or reference resolution in a separate batch-source issue relation keyed by
batch and source ordinal/path. It must not insert placeholder identifiers or weaken the event natural
key. After resolution, the canonical event is inserted into `batch_item` and passes the shared event
schema.

The implemented `batch.source_uri` must hold an opaque application object reference issued by the
`ObjectStore` boundary, never a public URL, SAS token, user path, container name or bare Blob key.
When the general object-provenance relation from ADR-011 is introduced, this value identifies that
application object and the provider adapter alone resolves it to Azure coordinates.

---

## 7. Validation and Processing Boundary

_Satisfies acceptance criterion 4._

### 7.1 Boundary

| Phase                                           | Executes in | Writes to    |
| ----------------------------------------------- | ----------- | ------------ |
| Receipt, authorisation, storage, batch creation | API request | `batch`      |
| Expansion, validation                           | Worker      | `batch_item` |
| Publication                                     | Worker      | Event tables |

The API request must return as soon as the payload is stored and the batch created. It may not validate, expand or publish. This is the substantive difference from `POST /submissions/uploads`, which performs all three inside the request.

### 7.2 Endpoint

Batch ingestion must use a distinct route rather than extending `POST /submissions/uploads` with size-dependent behaviour.

The response contracts differ in kind: the existing route returns a completed submission with `status: 'accepted'`, whereas batch returns an identifier to be collected later. A single route returning `201` or `202` depending on payload size would present a variable contract to consumers and would complicate #291.

### 7.3 Asynchronous execution model

1. The worker is a separately deployable process, corresponding to the boundary already anticipated in the architecture overview.
2. The worker must claim batches using `SELECT ... FOR UPDATE SKIP LOCKED`, so that multiple instances do not contend.
3. The worker must process items in `ordinal` order within a batch.
4. Items must be processed in chunks. A chunk is the unit of transaction and of checkpointing.

### 7.4 The latency rule

Round-trip latency to the database is approximately 173 ms. At one round trip per delivery, the 3,207,109 deliveries already ingested would require approximately 154 hours of latency alone, irrespective of the work performed at either end. This is consistent with the eight-day duration observed before the corpus importer was batched, and with its reduction to fifteen hours afterwards.

The following requirements follow and are the central performance constraint of this design.

1. Validation may not issue a database query per item. All reference data required to validate a batch must be loaded once per batch, before the first item is validated.
2. Writes must be set-based. A chunk must be written using a single multi-row statement, not one statement per item.
3. Chunk size must be a configured value, not a literal. A starting value of 500 items is proposed, to be tuned under #290 against measurement.
4. An implementation issuing per-item round trips must be rejected at review, whatever its correctness.

### 7.5 Measurement

Throughput must not be measured against a long-running backend process. A defect is present in which the backend serves every request approximately 2.03 seconds late after idling, including endpoints performing no database work. Measurements taken without a restart will be wrong by that margin. Raised in section 13.3.

---

## 8. Idempotency and Duplicate Handling

_Satisfies acceptance criterion 5._

### 8.1 Two levels

Duplication must be prevented at both the batch and the item level. Batch-level protection does not prevent a submitter sending overlapping payloads under different keys; item-level protection does not prevent the cost of re-processing an identical payload.

### 8.2 Batch level

1. A submitter must supply an idempotency key with each batch request.
2. Where the key is unknown, a new batch must be created.
3. Where the key is known and the payload checksum matches, the existing batch must be returned. A second batch may not be created.
4. Where the key is known and the checksum differs, the request must be rejected with `409 Conflict`.
5. A rejection under this section must state which condition was violated. It may not return an unexplained `500`.

Requirement 5 is stated explicitly because the audit under #49 and #50 found paths returning an unexplained `500` where a specific rejection is required. The comment on `databaseIdentifierSchema` records the same class of fault, where a value escaping `safeParse` surfaced as a server error rather than a validation failure. That class must not be reproduced here.

### 8.3 Item level

The identifying columns of a delivery are `inningsId`, `overNumber` and `positionInOver`. This is already the platform's position: `submissionRequestSchema.superRefine` builds `positionKey` from exactly these three fields, and the contract records that the printed ball number _"is never unique and never used to join."_

1. Each item's natural key must be derived by the platform from these three fields.
2. The printed `ballNumber` may not form part of any identity or join key. It is a display value, constrained to the printed form but not verified against the position it describes.
3. At publication, an item whose natural key already exists on a live revision must be recorded as `duplicate_skipped` and must not be written.
4. Publication must use a conflict-tolerant write against the constraint in section 6.2 requirement 4, so that a retried chunk cannot double-count.

### 8.4 Resubmission

Where a submitter resubmits a corrected payload under the key of a batch already `rejected` or `published`, the earlier batch must be marked `superseded` with `superseded_by` populated. The earlier batch and its items must be retained. Supersession is a link, not a deletion.

---

## 9. Checkpoint and Resume Semantics

_Satisfies acceptance criterion 6._

### 9.1 The governing rule

> The write of a chunk and the update of that batch's checkpoint **must occur in the same database transaction.**

This rule is what makes resumption safe. If the chunk commits and the checkpoint does not, resumption reprocesses committed work and double-counts. If the checkpoint commits and the chunk does not, resumption skips items never written. Neither failure is detectable afterwards without a full reconciliation of the batch.

### 9.2 Checkpoint content

A checkpoint records the phase and the highest ordinal durably completed in that phase. Validation and publication checkpoint independently, because a batch may fail during publication having completed validation.

### 9.3 Resume procedure

1. The worker claims the batch and acquires a lease.
2. The worker reads the checkpoint for the current phase.
3. The worker resumes at `last_ordinal + 1`.
4. Where no checkpoint exists, the worker begins at the first ordinal.

### 9.4 Leases

1. A worker must hold a time-bounded lease on a batch it is processing.
2. The lease must be renewed as chunks complete.
3. A batch whose lease has expired must be reclaimable. A worker terminating without releasing its lease may not strand a batch indefinitely.
4. A worker must verify it still holds the lease before committing a chunk.

### 9.5 Relationship to the corpus importer

The corpus importer already performs chunked ingestion at this scale, and its chunking is a useful reference for sizing. Its transactional guarantees must not be assumed to transfer: it is an operator-initiated process over trusted input which does not stage, review or publish. The requirements in this section apply to the batch worker on their own terms.

### 9.6 Repository transaction boundary (#276)

The batch repository accepts any database query executor, including an existing transaction client.
A future worker can therefore write chunk results and call the checkpoint upsert through the same
client before committing. The repository does not open an independent transaction or implement
leasing, resume policy, lifecycle transitions, or worker behaviour.

---

## 10. Review Before Publication

_Satisfies acceptance criterion 7._

### 10.1 Requirements

1. Staged items may not be written to the event tables before a reviewer approves the batch.
2. A batch in `awaiting_review` must be visible to a reviewer authorised for the batch's competition.
3. Approval must publish accepted items only. A rejected item may not be published by approving the batch containing it.
4. A reviewer must be able to reject an entire batch without publishing any item.
5. Every review decision must be recorded with actor, timestamp and reason.

### 10.2 Reviewer view

The reviewer requires, at minimum:

1. Item counts by state.
2. Rejections grouped by rejection code, with counts.
3. All rejected items, with detail.
4. A sample of accepted items sufficient to judge the batch.

The full accepted set may not be rendered. A batch may contain fifty thousand items.

### 10.3 Dependency

The review interface is #283, which is not implemented. This design defines the states and the data that interface requires; it does not wait on it. #276 and #277 may proceed against the states in section 4, and the dependency is recorded rather than treated as blocking.

---

## 11. Failure, Retry and Partial Success

_Satisfies acceptance criterion 8._

### 11.1 Error classes

| Class          | Example                                                                       | Retry                                   |
| -------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| Validation     | Impossible delivery, unknown participant, competition outside submitter scope | Never. The outcome is deterministic.    |
| Infrastructure | Storage unreachable, connection reset, lease lost, statement timeout          | Yes, with backoff, to a bounded budget. |

Conflating these is the common failure of batch systems: retrying a validation error consumes the budget and delays the report, and failing permanently on a transient error discards completed work.

### 11.2 Accumulation of rejections

1. Expansion and validation must accumulate rejections and continue. A malformed item must not terminate processing of the payload.
2. Every item must reach a terminal item state, with a rejection code where applicable.
3. A submitter must be able to correct every fault in one revision of their file.

Requirement 1 is a functional difference from `csvRows` in `submission-upload.ts`, which throws on the first row with an incorrect column count. That behaviour is tolerable at 1,000 events and is not tolerable at 50,000. The related defect in the existing route is raised in section 13.3.

### 11.3 Requirements

1. A validation failure must mark the item `rejected` and must not stop the batch.
2. An infrastructure failure must be retried with exponential backoff to a bounded attempt count.
3. A batch exhausting its attempt budget must transition to `failed`, retaining its checkpoint so that committed work is not repeated.
4. A batch may not be silently abandoned. Every batch must reach a terminal state or remain visibly resumable.

### 11.4 Partial success

1. A batch in which some items are rejected and others accepted is a normal outcome, not a failure. It proceeds to `awaiting_review`.
2. A batch in which publication succeeds for some accepted items and fails for others must transition to `partially_published`.
3. `partially_published` requires operator attention and may not be presented to a submitter as completion.
4. The outcome report is #279.

---

## 12. Security, Retention and Provenance

_Satisfies acceptance criterion 9._

### 12.1 Security

1. A submitted payload is untrusted input and must be treated as such at every stage.
2. Competition scope must be enforced **per item**, not only per batch. A batch declaring an authorised competition may contain items referencing fixtures outside it; such items must be rejected.
3. Size limits must be enforced during streaming, per section 5.3.
4. The stored object key may not incorporate a submitter-supplied path or filename.
5. Payload content may not be written to logs. A rejection detail must identify the fault without reproducing the payload.
6. Storage credentials must remain server-side, consistent with the security boundaries in the architecture overview.
7. Character-encoding handling must be specified at expansion. The existing route decodes with `buffer.toString('utf8')` and does not strip a byte-order mark, which causes a spreadsheet-exported CSV to fail header matching. Batch expansion must not inherit this. Raised in section 13.3.

### 12.2 Retention

Nadav Sundy approved the retention outcome under issue #356 on 2 September 2026.

1. The original payload is retained privately for 90 days from receipt and then deleted from object storage.
2. The `batch` record, its items and its checksum must be retained indefinitely. They are the provenance chain and must survive deletion of the payload.
3. Deletion of a payload must be recorded against the batch, so that the absence of a stored object is distinguishable from a storage fault.

### 12.3 Provenance

Every published event must be traceable along an unbroken chain:

```text
published event
  └─▶ batch_item (ordinal, natural key, payload as submitted)
        └─▶ batch (submitter, competition, idempotency key, source checksum)
              └─▶ submitter identity and authorised scope at time of submission
```

The chain must remain intact after the payload is deleted under section 12.2. The retained checksum is what allows a submitter's later copy of a file to be matched against what was received.

---

## 13. Follow-On Issues and Dependencies

_Satisfies acceptance criterion 10._

### 13.1 Confirmed dependencies

| Issue | Title                                                       | Relationship                                                           |
| ----- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| #276  | Batch, batch-item and processing-checkpoint database models | Completed; implements and constrains the section 6 staging foundation. |
| #277  | Whole-season and back-catalogue batch upload and staging    | Implements sections 5 and 7.1 using the decisions approved by #356.    |
| #278  | Asynchronous batch validation and processing                | Implements section 7.3. Blocked by #276.                               |
| #279  | Accepted and rejected batch processing reports              | Implements section 11.4. Blocked by #278.                              |
| #280  | Idempotent batch resubmission, preventing double counting   | Implements section 8. Blocked by #276.                                 |
| #281  | Resumable batch processing from durable checkpoints         | Implements section 9. Blocked by #276.                                 |
| #282  | Impossible and conflicting event validation rules           | Provides the per-event validation shared under section 3.1. Related.   |
| #283  | Submission review and publication workflow                  | Implements section 10. Related, not blocking.                          |
| #291  | Explicit API versioning and compatibility behaviour         | Section 7.2 introduces a new route and response contract. Related.     |

### 13.2 Sequencing

```text
#275 design ──▶ #356 decisions ──▶ #277 upload and staging
                   │
#276 database models ──────────────┘
                   ├─▶ #278 processing ──▶ #279 reporting
                   ├─▶ #280 idempotency
                   ├─▶ #281 resumability
                   └─▶ #283 review and publication
```

### 13.3 New issues required

| Ref | Proposed title                                                  | Type                   | Rationale                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N4  | Provision the worker deployment target                          | `type: infrastructure` | Blocks #278. Section 7.3 requires a separately deployable worker process.                                                                                                                                      |
| N5  | Collect all CSV row faults rather than throwing on the first    | `type: bug`            | Section 11.2. `csvRows` throws inside `map`, so a submitter learns of one malformed row per round trip, while `normaliseCsv` correctly accumulates. The two are inconsistent with each other.                  |
| N6  | Strip the byte-order mark and widen accepted CSV media types    | `type: bug`            | Section 12.1 requirement 7. A spreadsheet-exported UTF-8 CSV carries a BOM and fails header matching; a `.csv` file offered as `application/vnd.ms-excel` or `text/plain` is rejected by `normaliseMediaType`. |
| N7  | Reconcile the upload size limit between multer and the contract | `type: bug`            | Section 2.5. The 1 MB limit is defined independently in `submission-upload.ts` and in `submissionSchema.sourceFile.sizeBytes` and will drift.                                                                  |
| N8  | Investigate delayed responses after backend idle                | `type: bug`            | Section 7.5. Approximately 2.03 seconds is added to every request after idling, including endpoints performing no database work. Invalidates throughput measurement taken without a restart.                   |

### 13.4 Deferred

The printed `ballNumber` is not verified against the `overNumber` and `positionInOver` it describes. The contract records this. Because the field is display-only and never used to join, the consequence is a cosmetic inconsistency between the ingestion and submission paths rather than a correctness fault. A cross-field rule belongs in #282 and is not raised separately here.

---

## 14. Decision Outcomes

| Ref | Owner                             | Recorded outcome                                                                                                                                                 |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Dean Feldman, ADR-011 owner       | Private Azure Blob Storage behind a backend-owned adapter, as approved by Nadav Sundy under #356.                                                                |
| D2  | B. Swartz, batch-design owner     | Direct and batch envelopes and parsers remain separate; both use `submissionEventSchema` after batch reference resolution.                                       |
| D3  | B. Swartz, batch-design owner     | 50 MB, 50,000 items, JSON/CSV/NDJSON, and three concurrent non-terminal batches per submitter, as approved by Nadav Sundy under #356.                            |
| D4  | Nadav Sundy, stakeholder approver | Private raw payload bytes are retained for 90 days; provenance metadata survives deletion.                                                                       |
| D5  | Dean Feldman, ADR-010 owner       | A PostgreSQL transactional outbox relays identifiers through Azure Service Bus Standard to a Node.js worker hosted as a separate Azure Container App.            |
| D6  | B. Swartz, batch-design owner     | Packages use namespaced source identifiers where available and scoped human-readable references otherwise; ambiguous or missing references remain staged.        |
| D7  | B. Swartz, batch-design owner     | Source adapters may add provider identity, revision and timing metadata, but all canonical events converge on the shared validation and immutable-revision path. |

There are no unresolved decisions in this document that block #277. Provisioning and implementation
remain owned by their follow-on issues.

---

## 15. Acceptance Criteria Mapping

| Acceptance criterion                                                            | Section |
| ------------------------------------------------------------------------------- | ------- |
| Batch lifecycle states are defined                                              | 4       |
| File/object storage responsibilities and limits are defined                     | 5       |
| Database ownership of batch, item and checkpoint metadata is defined            | 6       |
| The validation/processing boundary and asynchronous execution model are defined | 7       |
| Idempotency keys/checksums and duplicate handling are defined                   | 8       |
| Durable checkpoint and resume semantics are defined                             | 9       |
| Review-before-publication interaction with staged data is defined               | 10      |
| Failure, retry and partial-success behaviour is defined                         | 11      |
| Security, retention and provenance implications are recorded                    | 12      |
| Follow-on issue dependencies are confirmed                                      | 13      |

---

## AI Declaration

The preceding document was planned, generated, reviewed and edited with the assistance of Claude-Web[Claude Opus 5].
The issue #356 decision outcomes and #276 reconciliation were updated with the assistance of
Codex[GPT-5].
The issue #276 implementation record was added with the assistance of Codex[GPT-5].
