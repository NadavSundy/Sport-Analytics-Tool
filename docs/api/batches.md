# Batch ingestion receipt API

`POST /api/v1/batches` is a distinct asynchronous receipt route for whole-season and back-catalogue packages. It does not extend the synchronous Basic submission or file-upload routes, and it never publishes events merely because a package was accepted.

The request body is streamed directly to the private object-store adapter. Supply `Authorization: Bearer <token>`, `Idempotency-Key`, `X-Competition-Id`, `X-Batch-Package-Version: 1.0`, and `X-File-Name` headers. Its `Content-Type` must be `application/json`, `text/csv`, or `application/x-ndjson`.

The endpoint returns `202 Accepted` with an opaque UUID `batchReference`, a relative `statusUrl`, and `stored` status. The reference is not a database ID. `GET /api/v1/batches/{batchReference}` lets the owning submitter or an administrator retrieve the receipt status.

The server authenticates and checks the persisted submitter role and competition scope before receiving source bytes. Raw source is streamed with a 50 MB limit, retained privately for 90 days, and receives a SHA-256 checksum. The idempotency key is unique within the submitter scope: replaying it with the same checksum returns the original receipt, while changed bytes return `409 BATCH_CONFLICT`. Receipt creation serializes each submitter's key lookup, active-batch limit, and queue insertion, so concurrent equivalent requests cannot enqueue duplicate work. Up to three non-terminal batches are permitted per submitter. Unsupported metadata is `422`, size is `413`, storage failures are `503`, and the active-batch limit is `409`.

Package expansion, event validation, review, and publication remain asynchronous follow-on work. A stored batch is non-public and no staged item is included in public event or statistics reads.

The submitter interface at `/submissions/batches/new` obtains the competition identifier from a
readable, server-scoped competition choice. It explains JSON, CSV and NDJSON support, the 50 MB,
50,000-item and three-active-batch limits, and required human-readable package context before upload.
It links the maintained JSON and spreadsheet templates, shows transfer progress, and presents the
durable receipt with a link to the later report. Retrying the unchanged selection retains its
idempotency key; selecting a corrected replacement generates a new key.

## Reference mapping

An item report exposes every ambiguous or unresolved reference in `referenceResolutions`. Candidate
choices contain readable labels and opaque UUID references; internal canonical identifiers are not
returned. A reference with no safe existing candidate reports `contact_reviewer` and cannot be
silently created or fuzzy-matched.

The owning submitter or an administrator with the batch competition in their persisted scope may
send the report item `itemOrdinal`, `referencePath`, `candidateReference`, and a caller-stable `decisionKey` to
`POST /api/v1/batches/{batchReference}/reference-mappings`. The API verifies the candidate against
the current stored resolution evidence, retains the actor and selection, and returns `202` after it
durably queues revalidation from the original private source. The status URL remains available after
the caller leaves. Identical decisions are idempotent; stale candidates, reused keys with different
content, competing choices, and decisions made while validation is active return
`409 BATCH_REFERENCE_MAPPING_CONFLICT`.

Revalidation uses the normal package resolver, event schema, cricket rules, and durable worker
checkpoint. Previous validation results remain retained as superseded evidence while status, counts,
reports, and approval checks use only the current validation attempt.

See [Batch submission packages](../data/batch-submission-packages.md) and the [Batch ingestion pipeline](../architecture/batch-ingestion-pipeline.md) for the package and lifecycle contracts.

## AI Declaration

The Issue #277 receipt API documentation was produced with the assistance of Codex[GPT-5].
The Issue #280 idempotency behaviour was documented with the assistance of Codex[GPT-5].
The Issue #425 reference-mapping API was documented with the assistance of Codex[GPT-5].
The Issue #361 guided batch-upload interface was documented with the assistance of Codex[GPT-5].
