# Migrations

Store ordered SQL migrations here. Use a sortable timestamp prefix, for example:

```text
202608041900_create_competitions.sql
202608051030_create_fixtures.sql
```

Migrations are managed with `node-pg-migrate`. Create a new migration with:

```bash
npm run db:migrate:create --workspace=@sport-analytics/backend -- <name>
```

This produces a UTC-timestamped `.sql` file with `-- Up Migration` and
`-- Down Migration` sections. Both must be completed; the down section is tested
before the migration is merged. Do not commit generated API endpoints or database credentials.

The submitter-access audit migration adds nullable `submitter_access_updated_at` and
`submitter_access_updated_by` fields to `app_user`. Administrator access updates set both fields in
the same transaction that changes the authoritative role and `submitter_competition_scope` rows.

The competition-scoped request migration adds nullable
`submitter_requested_competition_id` to `app_user`. It deliberately does not infer a competition for
historical pending rows; those rows fail closed during approval and can be rejected before the user
submits a corrected request.

The submission-file provenance migration adds nullable source-file metadata to `submission`. It is
populated only after a bounded JSON or CSV upload has passed the same validation and transaction path
as direct submissions; historical and direct JSON submissions retain null file metadata.

The submitter-access history migration creates an immutable record of requests, approvals,
rejections, and revocations. It backfills the identifiable currently revoked accounts so a later
re-request can remain visibly flagged for administrators.

The batch-ingestion models migration creates the durable `batch`, `batch_item`, and
`batch_checkpoint` staging relations. It preserves the existing `submission` and `delivery`
publication model and reuses the existing live-delivery natural-key index rather than changing
correction revision semantics.

The Issue #277 batch receipt migration adds an opaque UUID reference to `batch`. It is the only
batch identifier exposed in receipt and status responses; internal bigint primary keys remain
server-only.

The Issue #283 review workflow migration adds the explicit `correction_requested` batch state,
the `returned_for_correction` decision, and a unique per-batch decision guard. The guard serialises
approve/reject races while same-decision approval retries resume the existing publication safely.

## Sprint 2 Intermediate migrations

The Intermediate implementation is spread across additive migrations rather than one monolithic
schema change. The main Sprint 2 migration groups are:

| Migration                                                                                                                                                                    | Purpose                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `20260831100000000_batch-ingestion-models.sql` and `20260902120000000_extend-batch-persistence.sql`                                                                          | Durable batch, item, validation and checkpoint persistence                               |
| `20260902193000000_stored-objects.sql`                                                                                                                                       | Provider-independent private-object metadata and retention                               |
| `20260904100000000_background-jobs-and-batch-validation-queue.sql`                                                                                                           | Durable asynchronous validation/job state                                                |
| `20260904120000000_immutable-correction-history.sql`                                                                                                                         | Immutable delivery revision and correction audit history                                 |
| `20260907100000000_batch-review-workflow.sql` and `20260907130000000_batch-reference-mapping.sql`                                                                            | Review decisions, correction return and explicit reference resolution                    |
| `20260907130000000_api-consumer-keys.sql`                                                                                                                                    | External consumer keys, limits and quota persistence                                     |
| `20260907150000000_statistics-refresh-dependencies.sql` and `20260907160000000_fixture-statistics-cache.sql`                                                                 | Selective aggregate refresh dependencies and versioned fixture-statistics caching        |
| `20260909100000000_dataset-releases.sql`                                                                                                                                     | Immutable dataset-release metadata                                                       |
| `20260911120000000_batch-correction-ingestion.sql`, `20260913100000000_batch-published-conflict-resolution.sql` and `20260913170000000_refresh-delivery-current-lineage.sql` | Batch corrections, explicit publication-conflict resolution and current-revision lineage |
| `20260914100000000_stream-dataset-release-artifacts.sql` and `20260914150000000_async-dataset-release-jobs.sql`                                                              | Streamed release artifacts and durable asynchronous release generation                   |
| `20260917180000000_powerplay-provenance.sql`                                                                                                                                 | Reviewed source-batch provenance for authoritative innings powerplay markers             |

Apply migrations only through the documented `node-pg-migrate` commands. Integration tests rebuild
an isolated test database from the complete ordered migration set, which makes missing dependencies
or invalid migration ordering visible before deployment.

## AI Declaration

The issue #255 competition-scoped request migration, issue #256 history migration, and issue #265
file provenance migration were documented with the assistance of Codex[GPT-5].
The issue #276 batch-ingestion migration was documented with the assistance of Codex[GPT-5].
The Issue #277 batch receipt migration was documented with the assistance of Codex[GPT-5].
The Issue #283 review workflow migration was documented with the assistance of Codex[GPT-5].
The Issue #297 Sprint 2 migration index was reviewed and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #633 powerplay provenance migration was documented with the assistance of Codex[GPT-5].
