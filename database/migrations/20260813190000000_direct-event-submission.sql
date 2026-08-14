-- Up Migration

-- Provenance needed by authenticated direct event submissions. Existing
-- Cricsheet seed submissions remain valid: the new fields are nullable for
-- historical/file ingestion, while the API always supplies them.

ALTER TABLE submission
    ADD COLUMN fixture_id bigint REFERENCES fixture,
    ADD COLUMN schema_version text,
    ADD COLUMN event_count integer,
    ADD CONSTRAINT submission_event_count_ck
        CHECK (event_count IS NULL OR event_count > 0),
    ADD CONSTRAINT submission_direct_provenance_ck
        CHECK (
          (fixture_id IS NULL AND schema_version IS NULL AND event_count IS NULL)
          OR
          (fixture_id IS NOT NULL AND schema_version IS NOT NULL AND event_count IS NOT NULL)
        );

COMMENT ON COLUMN submission.fixture_id IS
    'Fixture declared by a direct JSON submission. Null only for legacy/file ingestion.';

COMMENT ON COLUMN submission.schema_version IS
    'Validated event contract version used by a direct JSON submission.';

ALTER TABLE delivery
    ADD COLUMN source_event_id uuid,
    ADD COLUMN submission_event_ordinal integer,
    ADD CONSTRAINT delivery_submission_event_ordinal_ck
        CHECK (submission_event_ordinal IS NULL OR submission_event_ordinal >= 0),
    ADD CONSTRAINT delivery_direct_provenance_ck
        CHECK ((source_event_id IS NULL) = (submission_event_ordinal IS NULL));

COMMENT ON COLUMN delivery.source_event_id IS
    'Globally unique submitter-supplied event identifier used to reject accidental replays.';

COMMENT ON COLUMN delivery.submission_event_ordinal IS
    'Zero-based position in the accepted JSON events array; preserves submitted order exactly.';

CREATE UNIQUE INDEX delivery_source_event_id_unique
    ON delivery (source_event_id)
    WHERE source_event_id IS NOT NULL;

CREATE UNIQUE INDEX delivery_submission_event_order_unique
    ON delivery (submission_id, submission_event_ordinal)
    WHERE submission_event_ordinal IS NOT NULL;

CREATE INDEX submission_fixture_received_idx
    ON submission (fixture_id, received_at DESC)
    WHERE fixture_id IS NOT NULL;

-- Down Migration

DROP INDEX IF EXISTS submission_fixture_received_idx;
DROP INDEX IF EXISTS delivery_submission_event_order_unique;
DROP INDEX IF EXISTS delivery_source_event_id_unique;

ALTER TABLE delivery
    DROP CONSTRAINT IF EXISTS delivery_direct_provenance_ck,
    DROP CONSTRAINT IF EXISTS delivery_submission_event_ordinal_ck,
    DROP COLUMN IF EXISTS submission_event_ordinal,
    DROP COLUMN IF EXISTS source_event_id;

ALTER TABLE submission
    DROP CONSTRAINT IF EXISTS submission_direct_provenance_ck,
    DROP CONSTRAINT IF EXISTS submission_event_count_ck,
    DROP COLUMN IF EXISTS event_count,
    DROP COLUMN IF EXISTS schema_version,
    DROP COLUMN IF EXISTS fixture_id;
