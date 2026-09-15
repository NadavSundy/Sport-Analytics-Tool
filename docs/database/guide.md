# Database architecture guide

This is the marker-facing entry point for the implemented Sport Analytics Tool database. It explains
what is authoritative, why the model is shaped this way, and where to find the detailed evidence.
It is a guide to the live schema: the ordered SQL
[migrations](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/database/migrations/)
remain the authority for exact columns, constraints and indexes.

## Read this first

| Question                                                            | Evidence                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What tables and relationships exist?                                | [Entity relationship diagram](erd.md) and [event model](schema.md)                                                                                                                                                                                                                                              |
| How does the application connect and keep multi-record work atomic? | [Database access and transactions](access.md)                                                                                                                                                                                                                                                                   |
| How are large uploads, review and publication persisted?            | [Batch persistence extensions](batch-persistence.md) and the [batch API](../api/batches.md)                                                                                                                                                                                                                     |
| How are database changes owned and applied?                         | [Migration guide](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/database/migrations/README.md) and [overview](overview.md)                                                                                                                                                       |
| Why PostgreSQL/Supabase and the session pooler?                     | [ADR-003](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-003-database-host-connection-and-migrations.md) and [ADR-005](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-005-database-host-migration.md) |
| How is the database deployed with the application and worker?       | [Deployment overview](../deployment/overview.md), [Azure backend](../deployment/azure-backend.md) and [Azure worker](../deployment/azure-worker.md)                                                                                                                                                             |

## What is implemented and authoritative

The application uses Supabase-hosted PostgreSQL as a managed relational database, not as an
application API. The React frontend accesses application data only through the handwritten Express
API. The backend and the asynchronous worker use the `pg` driver with the configured Supavisor
session-mode pooler; generated Supabase Data API endpoints are outside the application boundary.

The canonical sport model is `competition` -> `fixture` -> `innings` -> `delivery`. A fixture has a
stable Cricsheet `source_ref`; its `season` is a text column because source seasons can be values such
as `2016/17`, rather than a separate numeric season table. `person` uses a stable registry reference
and `person_alias` retains historical display names, so names are never join keys. Supporting fixture,
team, venue, squad, official, wicket, review and replacement relations preserve the structure needed
to reproduce event context.

`delivery` is the event-level source of truth. Statistics and public reads are derived from current,
accepted delivery revisions; they are not manually entered totals. The `delivery_current` view selects
the one live revision for each event lineage. `statistics_refresh_dependency` records scopes affected
by an accepted correction, while `fixture_statistics_cache` is a versioned performance cache, not a
second source of truth. Immutable dataset releases use `dataset_release`; its mutable generation work
is kept separately in `dataset_release_job` until publication succeeds.

Submissions and batches retain provenance from receipt to publication. `submission`, `batch`,
`batch_item`, validation results, checkpoints, state transitions, review and reference-mapping
decisions record staged ingestion without overwriting the accepted sport record. `stored_object`
retains provider-independent metadata, checksum and lifecycle state for private source bytes. The
exact batch persistence relations and their retention rules are documented in the linked detailed
page above.

## Why this model

The model follows observations from the reproducible Cricsheet corpus analysis, rather than assuming
idealised cricket scoring. Printed ball labels can repeat within an over after illegal deliveries, so a
delivery is identified by fixture, innings ordinal, over number and zero-based `position_in_over`;
the printed label is for display, not identity. Fixtures may have more than two innings, overs need
not contain six legal balls, wickets can contain several fielders, and innings-level penalty runs do
not belong to a delivery. The [event model](schema.md) records the corpus observations, examples and
their schema consequences.

PostgreSQL was retained because it provides the relational foreign keys, check constraints,
transactions, partial unique indexes and query plans required by this model without introducing an
ORM or generated application endpoint. The key constraints express business invariants close to the
data: `delivery_natural_key_live` permits one current delivery at a cricket coordinate while retaining
superseded revisions; `delivery_sequence_live` preserves stable event order; source-event and
submission/batch-item indexes make replay and provenance idempotent; and fixture/participant indexes
support the documented filters and representative-scale reads. The migration files name the complete
set and remain definitive when this summary and a migration differ.

## Corrections, provenance and logical identity

A correction never replaces an accepted delivery in place. It adds a later revision, links the
predecessor and successor, and appends `delivery_correction_history` with actor, reason, time,
before/after snapshots and source provenance. The partial live-row constraint means public and
derived reads get exactly one current revision, while the base relations retain the audit trail.
Stable source identities, delivery sequence and submission/batch references survive the revision, so
an event, a statistic contributor and an exported release can still be traced to their origin. The
[protected provenance API](../api/provenance.md) exposes that trace only to authorised submitters and
reviewers.

## Deployment, migration and transaction boundary

In development and deployed environments the backend and worker receive `DATABASE_URL` through
server-side configuration. Production TLS verification remains enabled; credentials and connection
strings are never committed or exposed to the frontend. Azure App Service hosts the API, Azure
Container Apps hosts the worker, and both use the same PostgreSQL authority. Database access remains
behind repository and service boundaries, with parameterised queries and `withTransaction()` for
all-or-nothing multi-record operations. The transactional outbox and worker checkpoints make
asynchronous batch work recoverable after commit rather than treating a queue message as the source
of truth.

Schema changes are committed, ordered SQL migrations managed by `node-pg-migrate`. Apply them with
the backend workspace commands in the [database overview](overview.md) or migration guide; do not
use a provider SQL editor for application schema changes. Integration tests rebuild an isolated test
database from the complete migration history. This keeps shared development and production data out
of test runs while checking migration order and rollback sections.

## Trade-offs and known limitations

- Supabase provides managed PostgreSQL and convenient provisioning, but the database is remote from
  Johannesburg and the project remains responsible for tested backup and restore procedures. The
  provider, latency and backup limitations are recorded honestly in [ADR-003](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-003-database-host-connection-and-migrations.md)
  and [ADR-005](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-005-database-host-migration.md).
- PostgreSQL and private Blob Storage cannot share one transaction. PostgreSQL therefore records
  ownership and lifecycle, while retryable worker reconciliation handles interrupted object work;
  the byte store is never an independent source of truth. See [ADR-011](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-011-file-and-object-storage.md).
- The documented standard aggregates exclude super-over innings by default. Bitemporal/as-of
  analytics, live late/out-of-order feed state, user-defined calculation definitions and general
  change feeds remain later-tier work, not undocumented capabilities.
- Cricsheet coverage and metadata can change on refresh. The downloader's supported scope and its
  reproducible manifest are documented in [Cricsheet data source](../data/cricsheet.md); coverage is
  not represented as complete worldwide cricket history.

## AI Declaration

The preceding Issue #579 database architecture guide was planned, generated and reviewed with the
assistance of Codex[GPT-5].
