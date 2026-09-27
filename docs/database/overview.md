# Database overview

For a marker-facing explanation of the implemented schema, its design motivation, deployment and
migration ownership, start with the [Database architecture guide](guide.md). This page remains the
detailed overview of the current PostgreSQL/Supabase implementation.

The implemented application database is PostgreSQL hosted by Supabase. The Express backend and the
asynchronous worker connect to PostgreSQL directly through the `pg` driver and the configured
Supavisor session-pooler connection. The React frontend never uses generated Supabase database
endpoints for application data; all application-domain reads and writes pass through the handwritten
backend API.

## Design priorities

- Event records remain the source of truth for published statistics.
- Submissions, submitters, validation results, review decisions and corrections remain traceable.
- Corrections create immutable revisions rather than destroying historical state.
- Stable identifiers survive across corrections, aggregate reads and dataset releases.
- Database constraints prevent impossible relationships, duplicate ingestion and multiple live
  revisions for the same delivery.
- Indexes support documented filtering, cursor pagination, aggregate derivation and publication
  workloads.
- Dataset releases are immutable, versioned and checksum-backed.
- Private retained source objects are referenced through provider-independent metadata rather than
  public provider URLs.

## Intermediate persistence

Sprint 2 extends the original event model with durable Intermediate-tier structures.

Batch ingestion persists the batch lifecycle, staged source items, validation results, checkpoints,
state transitions, reviewer decisions, reference mappings and publication provenance. Private upload
bytes are tracked through `stored_object` metadata while the provider-specific object remains behind
the application's object-store boundary.

Accepted corrections append immutable `delivery_correction_history` records and preserve predecessor,
replacement, requester, reviewer and source provenance. Public reads continue to use
`delivery_current`, which exposes only the current accepted revision.

Season, competition and career participant aggregates are derived from current accepted delivery
events rather than stored as editable totals. `statistics_refresh_dependency` records the affected
aggregate scopes after a correction. Their derived rows are stored per participant and served only
while they match the participant's current statistics data version (ADR-015). Repeated fixture-statistics reads use the separate versioned
cache added for the Intermediate performance work; the cache is not a second source of truth.

Versioned dataset publication persists immutable release metadata separately from mutable
`dataset_release_job` generation state. Release artifacts are written to private object storage and
published only after the complete artifact and SHA-256 checksum are available.

See [Event Model](schema.md), [Batch persistence extensions](batch-persistence.md),
[Dataset exports](../data/dataset-exports.md) and
[Private object storage operations](../deployment/object-storage-operations.md) for the detailed
contracts.

## Migrations and deployment

Executable schema history lives under `database/migrations/` and is applied in timestamp order with
`node-pg-migrate`. The migration files are the source of truth for deployed schema changes; this
documentation describes their intent but does not replace them.

From the repository root, a configured development database can be checked and migrated through the
backend workspace:

```bash
npm run db:check --workspace=@sport-analytics/backend
npm run db:migrate:dry --workspace=@sport-analytics/backend
npm run db:migrate --workspace=@sport-analytics/backend
```

Production and shared-development credentials remain server-side and are never committed. Database
integration tests use `DATABASE_URL_TEST` or the repository's disposable PostgreSQL workflow and must
never target development or production data.

See [Database access and transactions](access.md) and
[Testing Strategy](../development/testing.md) for migration and test-database safety procedures.
The repository migration guide is maintained at `database/migrations/README.md`.

## AI Declaration

The preceding database overview was reviewed and rewritten to reflect the implemented Sprint 2
PostgreSQL/Supabase architecture with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The issue #592 stored participant aggregate references were added with the assistance of Claude-Code[Claude Opus 5].
