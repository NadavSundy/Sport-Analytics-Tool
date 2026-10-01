# Final database audit

**Issue:** #807  
**Audit date:** 2026-10-01  
**Schema authority:** ordered SQL in [`database/migrations/`](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/database/migrations/)

This is the final evidence-led audit of the Sport Analytics Tool PostgreSQL design. It indexes the
executable schema and retained checks rather than becoming a second schema definition. When this
page conflicts with a migration, the ordered migration wins.

## Deployment and migration evidence

The deployed application target documented by this repository is the **development** Supabase
PostgreSQL environment; no separate production environment or unverified production schema
fingerprint is claimed here. Before activating an immutable Container Apps image, the deployment
workflow retrieves `DATABASE_URL` only from a Key Vault reference, applies reviewed
`node-pg-migrate` migrations, and then checks health, a PostgreSQL-backed competition read, and a
dataset-release schema read. See [Azure backend deployment](../deployment/azure-backend.md).

At **2026-10-01 21:29 SAST**, read-only checks against that documented deployed API returned HTTP
200 for:

- `/api/v1/health` (`status: ok`);
- `/api/v1/competitions?limit=1` (a paginated PostgreSQL-backed read); and
- `/api/v1/dataset-releases` (a schema-dependent immutable-release read).

The last response included release `2026.09.25-issue-565-acceptance-1`, with 3,207,110 published
accepted deliveries and a SHA-256 checksum. These are deployment compatibility checks, not a
claim that an unauthenticated endpoint can inspect every system-catalog object.

The local rebuild check is `npm run test:database`. On the audit date it started a disposable
PostgreSQL 16 instance, reset the isolated schema, applied the full migration history, seeded it,
and completed with **37 passed test files, 268 passed tests, 1 skipped file and 2 skipped tests**.
The two skipped tests are retained suite state, not passed tests. Reproduction and safety safeguards
are in [Testing](../development/testing.md) and [Database migrations](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/database/migrations/README.md).

## Schema and relationship audit

The [ERD](erd.md) and [event model](schema.md) describe the implemented relationships. The
repeatable foreign-key inventory query is `apps/backend/scripts/queries/erd.sql`; the migration
chain remains authoritative for every column, index and constraint.

| Audit area                      | Enforced design and evidence                                                                                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixture, competition and season | `competition -> fixture -> innings -> delivery` keeps source season text intact, accepts any innings count, and indexes competition/season and start-date browsing.                                                         |
| Event order and identity        | A live delivery is uniquely identified by innings, over and `position_in_over`; `delivery_sequence_live` preserves occurrence order while printed ball labels remain display data.                                          |
| Referential integrity           | Primary/foreign keys cover fixture teams, squads, innings, deliveries, wickets, submissions, batches and release snapshots. Database tests exercise rejected missing references and transaction rollback.                   |
| Duplicate prevention            | Partial live-delivery, source-event, submission-order, batch receipt/item and review-decision unique indexes make replay and duplicate publication fail safely while retaining correction history.                          |
| Submission and provenance       | `submission`, `batch`, `batch_item`, validation/review records, immutable correction history and `stored_object` preserve the receipt-to-publication chain. Guard triggers prevent deletion of retained provenance.         |
| Derived data                    | `delivery_current` remains the source for statistics; refresh dependencies, versioned fixture cache and participant snapshot tables are derived storage with invalidation/version guards, not editable totals.              |
| Representative data             | Four licensed, deterministic Cricsheet fixtures cover normal, super-over and miscounted-over cases. The reference-fixture integration test verifies ordered events, extras, wickets, repeated ingest and published figures. |

## Index-to-query audit

Indexes are justified by handwritten API and worker query patterns, not table shape alone. Definitions
are in the migrations; representative measurements and query plans are retained under
`evidence/validation/issue-289-representative-scale-baseline.md`, `evidence/validation/issue-410-*.md`,
and `apps/backend/tests/database/performance-query-plans.database.test.ts`.

| Query path                                                   | Supporting index or key                                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Competition/season fixture browsing                          | `fixture_competition_season_idx`, `fixture_start_date_idx`                                                  |
| Current event pagination and correction-safe order           | `delivery_natural_key_live`, `delivery_sequence_live`                                                       |
| Participant batting, bowling, fielding and aggregate refresh | live striker/bowler/non-striker indexes and `delivery_wicket_fielder_person_idx`                            |
| Batch replay, validation and publication recovery            | batch idempotency, batch-item natural/source identity, checkpoint and background-job keys                   |
| Audit/provenance history                                     | delivery correction-history event index, submission fixture/received index and append-only retention guards |
| Immutable dataset-release reads                              | release, snapshot and artifact keys with release-job state separated from published metadata                |

## Acceptance-criteria result

| Criterion                                           | Result                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment documented and compatibility verified    | Documented migration gate and read-only deployed health/database/schema checks recorded above.                                                                            |
| Migrations recreate the expected schema             | Passed isolated PostgreSQL 16 reset, migrate, seed and integration run.                                                                                                   |
| Schema documentation and ERD are current            | This audit links migration authority, event model, repeatable FK inventory and ERD.                                                                                       |
| Relationships, constraints and duplicate prevention | Enforced through keys, checks, partial unique indexes, triggers and database integration coverage.                                                                        |
| Query-path indexes                                  | Mapped above to public reads, event ordering, aggregate and ingestion/release workloads.                                                                                  |
| Representative data and traceable provenance        | Deterministic Cricsheet coverage and submission-to-release/correction chain verified by database tests.                                                                   |
| Derived storage and design rationale                | Cache/snapshot boundaries and PostgreSQL design rationale are documented in the architecture guide and event model.                                                       |
| Migration coverage for issue changes                | No schema or index change was introduced by #807; the full chain is covered by the rebuild.                                                                               |
| Critical integrity issues                           | No unresolved critical integrity defect was identified by this audit. Known product-scope limitations remain explicitly documented in the [architecture guide](guide.md). |

## Related material

- [Database architecture guide](guide.md) - design motivation and known limitations.
- [Database overview](overview.md) - access, migration and test entry points.
- [Entity relationship diagram](erd.md) - core foreign-key relationships.
- [Event model](schema.md) - cricket-specific identities, constraints and correction semantics.
- [Database access and transactions](access.md) - connection, safety and atomic-write boundary.

## AI Declaration

The Issue #807 audit cross-references and evidence summary were prepared with the assistance of
Codex[GPT-5]. The retained claims are limited to the source inspection and checks recorded above.
