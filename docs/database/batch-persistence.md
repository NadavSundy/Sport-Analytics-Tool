# Batch persistence extensions

Issue #359 extends the durable batch-staging foundation delivered by #276. It supplies storage
primitives only: it does not implement the receipt API, workers, validation rules, review state
machine, or publication workflow owned by #277 through #283.

## Gap analysis

| Persistence requirement                              | Existing #276 foundation reused                                                                                                        | #359 addition                                                                                                                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Receipt idempotency and source-object provenance     | `batch.submitter_id`, `idempotency_key`, `source_checksum`, `source_uri`, `source_size_bytes`, and the unique submitter/key constraint | `package_version` records the package contract independently from the delivery schema.                                                                                                                         |
| Deterministic staged item identity and location      | `batch_item.batch_id`, zero-based `ordinal`, payload, and resolved delivery natural key                                                | Optional `source_identity`, `source_location`, resolution outcome, and resolved-reference evidence. `innings_id` is nullable while a source reference remains unresolved; it stays a foreign key when present. |
| Validation evidence                                  | Item rejection fields remain the concise item outcome                                                                                  | Append-only `batch_validation_result` holds rule code and version, severity, source location, message, and either the item or original ordinal.                                                                |
| Independent validation and publication resume points | Existing checkpoint relation and lease fields                                                                                          | Composite `(batch_id, phase)` key preserves a separate lease, expiry, attempt count, and ordinal per phase.                                                                                                    |
| Review provenance                                    | Batch ownership and non-deletable provenance foundation                                                                                | Append-only `batch_review_decision` records actor, timestamp, decision, and reason.                                                                                                                            |
| Published-event provenance                           | Existing optional `batch_item.published_event_id` link                                                                                 | `delivery.source_batch_item_id` explicitly links a published revision to its source item.                                                                                                                      |
| Retention through deletion and tombstoning           | Foreign keys use `ON DELETE RESTRICT`; batch and item delete triggers already prevent deletion                                         | Validation and review records use restricted foreign keys and the same immutable-provenance trigger. Account tombstoning retains `app_user_id`, so these links remain valid.                                   |

## Constraints and repository operations

The migration is `20260902120000000_extend-batch-persistence.sql`. It is additive and has a paired
down section for the isolated migration round-trip test. In a shared environment it must be applied
only through the normal migration workflow; do not run its down migration as a rollback plan for
data that has been retained.

The batch repository exposes storage operations to create/read a receipt, insert/list staged items,
upsert or read each phase checkpoint, record idempotent validation results, append review decisions,
and link a delivery revision to its source item. These operations do not choose a reference match,
transition state, acquire a worker lease, or publish a delivery.

Reference-resolution values are `unresolved`, `resolved`, `ambiguous`, and `invalid`. An ambiguous
or invalid reference remains evidence in the batch item and its validation result; later workflow
code must require a review decision rather than inventing a match.

## Verification

The PostgreSQL integration suite applies all migrations to an isolated database. The batch-repository
coverage round-trips the #276 and #359 migrations in an isolated schema and verifies idempotency,
independent checkpoints, source identity uniqueness, unresolved and resolved references, validation
deduplication, review provenance, publication links, foreign keys, constraints, and retention.

Run it from the repository root:

```bash
npm run test:database
```

On Windows PowerShell where script execution blocks `npm.ps1`, use `npm.cmd run test:database`.

## AI Declaration

The Issue #359 gap analysis, persistence documentation, and migration verification description were
produced with the assistance of Codex[GPT-5].
