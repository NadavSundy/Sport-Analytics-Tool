-- Up Migration
--
-- Issue #486: a single logical validation outcome (e.g. EXACT_PUBLISHED_DUPLICATE)
-- could be persisted as two active rows. The publish-time re-check in
-- batch.repository.ts inserts EXACT_PUBLISHED_DUPLICATE / PUBLISHED_DELIVERY_CONFLICT
-- rows without file_path/row_number, while the worker's validation-time insert
-- populates those columns from the item's source location. The deterministic
-- uniqueness index included file_path/row_number, so the two inserts produced
-- different keys and both landed as active rows for the same logical result.
--
-- file_path/row_number are incidental provenance of a batch item's source
-- location, not part of a rule outcome's identity: a given batch_item_id (or,
-- absent that, source_ordinal) always originates from exactly one file/row, so
-- they add no disambiguating value to the key and only introduced the gap
-- above. The fix drops them from the deterministic key so any insert path
-- attempting to record the same logical (batch item, rule, version, severity,
-- field path) outcome collides with ON CONFLICT DO NOTHING as intended.

-- Deactivate pre-existing duplicate active rows before tightening the index,
-- keeping the earliest row for each logical outcome active.
WITH ranked AS (
    SELECT
        batch_validation_result_id,
        row_number() OVER (
            PARTITION BY
                batch_id,
                COALESCE(batch_item_id, 0),
                COALESCE(source_ordinal, -1),
                rule_code,
                rule_version,
                severity,
                COALESCE(field_path, '')
            ORDER BY batch_validation_result_id
        ) AS rank
    FROM batch_validation_result
    WHERE active
)
UPDATE batch_validation_result
SET active = false,
    superseded_at = now()
WHERE batch_validation_result_id IN (
    SELECT batch_validation_result_id FROM ranked WHERE rank > 1
);

DROP INDEX batch_validation_result_deterministic_key;

CREATE UNIQUE INDEX batch_validation_result_deterministic_key
    ON batch_validation_result (
        batch_id,
        COALESCE(batch_item_id, 0),
        COALESCE(source_ordinal, -1),
        rule_code,
        rule_version,
        severity,
        COALESCE(field_path, '')
    )
    WHERE active;

COMMENT ON INDEX batch_validation_result_deterministic_key IS
    'Deterministic identity of one logical validation outcome. Deliberately excludes '
    'file_path/row_number, which are incidental source-location provenance rather than '
    'part of a rule outcome''s identity (see issue #486).';

-- Down Migration

DROP INDEX IF EXISTS batch_validation_result_deterministic_key;
CREATE UNIQUE INDEX batch_validation_result_deterministic_key
    ON batch_validation_result (
        batch_id,
        COALESCE(batch_item_id, 0),
        COALESCE(source_ordinal, -1),
        rule_code,
        rule_version,
        severity,
        COALESCE(file_path, ''),
        COALESCE(row_number, -1),
        COALESCE(field_path, '')
    )
    WHERE active;