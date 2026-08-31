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

## AI Declaration

The issue #255 competition-scoped request migration, issue #256 history migration, and issue #265
file provenance migration were documented with the assistance of Codex[GPT-5].
The issue #276 batch-ingestion migration was documented with the assistance of Codex[GPT-5].
