-- Up Migration
-- Refs #592

-- One row per participant. It vouches that the participant's complete set of
-- scope rows was built from data_version under definition_version, and it
-- records refresh attempts. A row whose versions are null has never been built.
CREATE TABLE participant_aggregate_snapshot_state (
    participant_id bigint PRIMARY KEY REFERENCES person ON DELETE CASCADE,
    data_version bigint
        CONSTRAINT participant_aggregate_snapshot_state_data_version_positive_ck
        CHECK (data_version > 0),
    definition_version text
        CONSTRAINT participant_aggregate_snapshot_state_definition_version_ck
        CHECK (definition_version ~ '^[0-9a-f]{64}$'),
    refresh_count bigint NOT NULL DEFAULT 0
        CONSTRAINT participant_aggregate_snapshot_state_refresh_count_ck
        CHECK (refresh_count >= 0),
    refreshed_at timestamptz,
    attempt_count integer NOT NULL DEFAULT 0
        CONSTRAINT participant_aggregate_snapshot_state_attempt_count_ck
        CHECK (attempt_count >= 0),
    last_error text,
    CONSTRAINT participant_aggregate_snapshot_state_built_ck CHECK (
        (data_version IS NULL) = (definition_version IS NULL)
        AND (data_version IS NULL) = (refreshed_at IS NULL)
        AND (data_version IS NULL) = (refresh_count = 0)
    )
);

COMMENT ON TABLE participant_aggregate_snapshot_state IS
    'Per-participant snapshot state. Stored scope rows may be served only while data_version equals the participant''s participant_statistics_version and definition_version equals the running definition. Delivery rows remain the source of truth.';

-- One row per participant, level, competition and season: the grouped row the
-- participant aggregates query returns, stored as jsonb. Its versions and
-- refresh_count record when its content was last written; a refresh leaves a
-- row whose content did not change untouched.
CREATE TABLE participant_aggregate_snapshot (
    participant_id bigint NOT NULL
        REFERENCES participant_aggregate_snapshot_state ON DELETE CASCADE,
    scope_key text NOT NULL
        CONSTRAINT participant_aggregate_snapshot_scope_key_ck
        CHECK (scope_key ~ '^(career|competition:[^:]+|season:[^:]+:.*)$'),
    payload jsonb NOT NULL
        CONSTRAINT participant_aggregate_snapshot_payload_ck
        CHECK (jsonb_typeof(payload) = 'object'),
    data_version bigint NOT NULL
        CONSTRAINT participant_aggregate_snapshot_data_version_positive_ck
        CHECK (data_version > 0),
    definition_version text NOT NULL
        CONSTRAINT participant_aggregate_snapshot_definition_version_ck
        CHECK (definition_version ~ '^[0-9a-f]{64}$'),
    refresh_count bigint NOT NULL DEFAULT 1
        CONSTRAINT participant_aggregate_snapshot_refresh_count_positive_ck
        CHECK (refresh_count > 0),
    refreshed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (participant_id, scope_key)
);

COMMENT ON TABLE participant_aggregate_snapshot IS
    'Stored participant aggregate scope rows (issue #592). Disposable: valid only while the participant''s snapshot state is current.';

-- Writes the platform does not track (data-rewriting migrations, seeds that
-- bypass ingest, manual repairs) must call this in the same transaction, so no
-- stored row built from the previous data can be served.
CREATE FUNCTION invalidate_participant_aggregate_snapshots() RETURNS bigint
    LANGUAGE sql
    AS $$
        WITH invalidated AS (
            DELETE FROM participant_aggregate_snapshot_state
            RETURNING 1
        )
        SELECT count(*) FROM invalidated;
    $$;

COMMENT ON FUNCTION invalidate_participant_aggregate_snapshots() IS
    'Deletes every stored participant aggregate snapshot. Required after any write to aggregate inputs that does not advance participant_statistics_version.';

-- Down Migration
DROP FUNCTION IF EXISTS invalidate_participant_aggregate_snapshots();
DROP TABLE IF EXISTS participant_aggregate_snapshot;
DROP TABLE IF EXISTS participant_aggregate_snapshot_state;
