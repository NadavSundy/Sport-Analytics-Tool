# Protected provenance and audit API

Issue #363 exposes the private trace from a submission to accepted event revisions and the statistics
that currently depend on them. These routes are deliberately separate from public read endpoints so
submitter identity, lifecycle history, reviewer decisions and correction audit metadata are never added
to anonymous responses.

All routes require a bearer-authenticated `submitter` or `admin` account. A submitter can inspect only
its own provenance. An administrator acts as a reviewer only for competitions present in that account's
server-owned `competitionIds`; the `admin` role alone does not bypass competition scope.

## Submission provenance

`GET /api/v1/provenance/submissions` returns a cursor-paginated union of direct JSON submissions,
JSON/CSV file submissions and durable batches. `kind=direct|file|batch` can narrow the page.

Each item exposes the persistent source metadata available for that submission: original filename and
media type where applicable, source byte size, SHA-256 checksum and schema/package version. Direct
submissions now receive a deterministic SHA-256 checksum over the validated request payload; file
submissions hash the original uploaded bytes. Batch metadata comes from the retained batch and
`stored_object` records, so the trace remains meaningful after private raw payload expiry.

`GET /api/v1/provenance/submissions/{reference}` adds lifecycle history and review/publication
decisions. A direct or file reference is the numeric submission ID; a batch reference is its UUID.
Batch lifecycle entries come from the append-only `batch_state_transition` trail and decisions come
from `batch_review_decision`.

## Event revision provenance

`GET /api/v1/provenance/events/{eventId}` accepts the internal delivery identifier returned as a
statistic contributor and returns the complete known revision lineage for that event. For each revision
it exposes:

- source submission and, where applicable, batch and batch-item references;
- submitter identity (which may have a null display name after account tombstoning);
- persistent checksum and current acceptance/review decision;
- revision number, recorded/superseded timestamps and which revision is current; and
- correction requester, reason and optional review decision from the immutable correction history.

The source link is based on retained identifiers and checksums rather than the raw payload itself.

## Statistic provenance

`GET /api/v1/provenance/fixtures/{fixtureId}/statistics/{statisticId}` reuses the normal fixture
statistic derivation with contributor tracing enabled, then resolves every current contributing delivery
to its retained source provenance. The response therefore completes:

`statistic -> current event revision -> submission/batch item -> submission/batch -> submitter -> decision`

A submitter may read the trace only when every current contributing event belongs to that submitter.
A competition-scoped administrator may review a mixed-source statistic for that competition.

## Aggregate statistic provenance

`GET /api/v1/provenance/participants/{participantId}/statistics/{statisticId}` provides the same
private trace for the published season, competition and career participant aggregates. It resolves
only current accepted delivery revisions, exposes their stable `sourceEventId` values and source
submissions, and is cursor-paginated (`limit`, `cursor`) so a career trace cannot make an aggregate
response unbounded. Follow each contributor through `GET /api/v1/provenance/events/{deliveryId}`
for its correction lineage.

## Public privacy boundary

The anonymous `/fixtures`, `/events` and `/statistics` APIs are unchanged. They do not return
submitter IDs, batch audit state, review decisions, lifecycle transitions or correction actors. Private
provenance is available only from the authenticated `/provenance/...` routes above.

AI Declaration: This document was updated with the assistance of Codex[GPT-5].
