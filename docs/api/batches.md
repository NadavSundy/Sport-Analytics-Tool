# Batch ingestion receipt API

`POST /api/v1/batches` is a distinct asynchronous receipt route for whole-season and back-catalogue packages. It does not extend the synchronous Basic submission or file-upload routes, and it never publishes events merely because a package was accepted.

The request body is streamed directly to the private object-store adapter. Supply `Authorization: Bearer <token>`, `Idempotency-Key`, `X-Competition-Id`, `X-Batch-Package-Version: 1.0`, and `X-File-Name` headers. Its `Content-Type` must be `application/json`, `text/csv`, or `application/x-ndjson`.

The endpoint returns `202 Accepted` with an opaque UUID `batchReference`, a relative `statusUrl`, and `stored` status. The reference is not a database ID. `GET /api/v1/batches/{batchReference}` lets the owning submitter or an administrator retrieve the receipt status.

The server authenticates and checks the persisted submitter role and competition scope before receiving source bytes. Raw source is streamed with a 50 MB limit, retained privately for 90 days, and receives a SHA-256 checksum. The idempotency key is unique within the submitter scope: replaying it with the same checksum returns the original receipt, while changed bytes return `409 BATCH_CONFLICT`. Receipt creation serializes each submitter's key lookup, active-batch limit, and queue insertion, so concurrent equivalent requests cannot enqueue duplicate work. Up to three non-terminal batches are permitted per submitter. Unsupported metadata is `422`, size is `413`, storage failures are `503`, and the active-batch limit is `409`.

Package expansion, event validation, review, and publication remain asynchronous follow-on work. A stored batch is non-public and no staged item is included in public event or statistics reads.

See [Batch submission packages](../data/batch-submission-packages.md) and the [Batch ingestion pipeline](../architecture/batch-ingestion-pipeline.md) for the package and lifecycle contracts.

## AI Declaration

The Issue #277 receipt API documentation was produced with the assistance of Codex[GPT-5].
The Issue #280 idempotency behaviour was documented with the assistance of Codex[GPT-5].
