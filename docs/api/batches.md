# Batch ingestion receipt API

`POST /api/v1/batches` is a distinct asynchronous receipt route for whole-season and back-catalogue packages. It does not extend the synchronous Basic submission or file-upload routes, and it never publishes events merely because a package was accepted.

The request body is streamed directly to the private object-store adapter. Supply `Authorization: Bearer <token>`, `Idempotency-Key`, `X-Competition-Id`, `X-Batch-Package-Version: 1.0`, and `X-File-Name` headers. Its `Content-Type` must be `application/json`, `text/csv`, or `application/x-ndjson`.

The endpoint returns `202 Accepted` with an opaque UUID `batchReference`, a relative `statusUrl`, and `stored` status. The reference is not a database ID. `GET /api/v1/batches/{batchReference}` lets the owning submitter or an administrator retrieve the receipt status.

The server authenticates and checks the persisted submitter role and competition scope before receiving source bytes. Raw source is streamed with a 50 MB limit, retained privately for 90 days, and receives a SHA-256 checksum. The idempotency key is unique within the submitter scope: replaying it with the same checksum returns the original receipt, while changed bytes return `409 BATCH_CONFLICT`. Receipt creation serializes each submitter's key lookup, active-batch limit, and queue insertion, so concurrent equivalent requests cannot enqueue duplicate work. Up to three non-terminal batches are permitted per submitter. Unsupported metadata is `422`, size is `413`, storage failures are `503`, and the active-batch limit is `409`.

Package expansion, event validation, review, and publication remain asynchronous follow-on work. A stored batch is non-public and no staged item is included in public event or statistics reads.

The unified submitter interface at `/submissions/new` provides single-fixture, season and
back-catalogue choices. Season and back-catalogue modes obtain the competition identifier from a
readable, server-scoped choice. The interface explains JSON, CSV and NDJSON support, the 50 MB,
50,000-item and three-active-batch limits, and required human-readable package context before upload.
It links the maintained JSON and spreadsheet templates, shows transfer progress, and presents the
durable receipt with a link to the later report. Retrying the unchanged selection retains its
idempotency key; selecting a corrected replacement generates a new key. The retired
`/submissions/batches/new` route redirects to `/submissions/new` for existing bookmarks.

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

## Reviewer workspace

Administrators use `/reviews/batches` to find only `awaiting_review` batches in their persisted
competition scope. The authenticated batch list supports a `status` filter, while all list, report,
mapping, and decision authorization remains enforced by the backend.

Status and report responses include source filename, submitter label, received time, SHA-256
checksum, and package version. Reports also include validation and reference-resolution counts,
stable rule-code groups, fixture-level counts, and at most 15 accepted samples. The browser workspace
therefore never renders a season-scale accepted dataset. Candidate reference tokens remain opaque;
reviewers act on their human-readable labels through the existing reference-mapping endpoint.

Ordinary item-level validation rejections do not prevent approval: the accepted subset publishes and
the rejected source records remain unpublished in the report. Approval is still rejected by both the
interface and repository transaction while batch-level or accepted-item validation errors,
publication conflicts, ambiguous, unresolved, or invalid references remain. Every decision requires
a reason; rejection and return-for-correction reasons require at least 10 characters. The interface
Each report item also identifies whether it is an ordinary upsert or a correction. Correction items
show the submitted `correctsEventId` and, when resolution succeeded, the published delivery revision
selected during validation. Submitter reports and the bounded reviewer sample both present this
target before a publication decision.

Approval is rejected by both the interface and repository transaction while active validation
errors, conflicts, ambiguous, unresolved, or invalid references remain. Every decision requires a
reason; rejection and return-for-correction reasons require at least 10 characters. The interface
adds an explicit modal confirmation before approve, reject, or return-for-correction and clearly
presents publishing, failure, partial-publication, correction-requested, rejection, and publication
states. Repeated identical decisions remain idempotent; competing or stale decisions return `409`.

Approved correction items publish through immutable delivery revision and supersession history,
including the submitting account, approving reviewer, review reason and affected-statistics
dependencies. Publication rechecks that the target is still the current revision in the declared
fixture and competition. Ordinary upserts retain their existing exact-duplicate skip and
different-content conflict behaviour.

See [Batch submission packages](../data/batch-submission-packages.md) and the [Batch ingestion pipeline](../architecture/batch-ingestion-pipeline.md) for the package and lifecycle contracts.

## AI Declaration

The Issue #277 receipt API documentation was produced with the assistance of Codex[GPT-5].
The Issue #280 idempotency behaviour was documented with the assistance of Codex[GPT-5].
The Issue #425 reference-mapping API was documented with the assistance of Codex[GPT-5].
The Issue #362 reviewer workspace documentation was produced with the assistance of Codex[GPT-5].
The Issue #361 guided batch-upload interface was documented with the assistance of Codex[GPT-5].
The Issue #437 unified submission route was documented with the assistance of Codex[GPT-5].
