-- Up Migration
-- Refs #592

CREATE TABLE participant_statistics_version (
    participant_id bigint PRIMARY KEY REFERENCES person ON DELETE CASCADE,
    data_version bigint NOT NULL DEFAULT 1
        CONSTRAINT participant_statistics_version_data_version_positive_ck
        CHECK (data_version > 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE participant_statistics_version IS
    'Authoritative monotonically increasing input version for one participant''s season, competition and career aggregates. Every write that can change those aggregates advances it in the same transaction. A participant with no row has never been affected by a tracked write.';

-- Down Migration
DROP TABLE IF EXISTS participant_statistics_version;
