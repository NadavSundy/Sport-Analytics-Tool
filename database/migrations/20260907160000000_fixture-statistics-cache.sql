-- Up Migration
-- Refs #293

CREATE TABLE fixture_statistics_cache_version (
    fixture_id bigint PRIMARY KEY REFERENCES fixture ON DELETE CASCADE,
    data_version bigint NOT NULL DEFAULT 1 CHECK (data_version > 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fixture_statistics_cache (
    cache_key text PRIMARY KEY,
    fixture_id bigint NOT NULL REFERENCES fixture ON DELETE CASCADE,
    data_version bigint NOT NULL CHECK (data_version >= 0),
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    CHECK (expires_at > created_at),
    UNIQUE (fixture_id, data_version)
);

COMMENT ON TABLE fixture_statistics_cache_version IS
    'Authoritative monotonically increasing fixture input version. Accepted event writes advance it atomically, making stale fixture-statistics cache keys unreachable.';

COMMENT ON TABLE fixture_statistics_cache IS
    'Disposable public fixture-statistics cache. It is valid only for its authoritative fixture data version and bounded expiry; PostgreSQL event rows remain the source of truth.';

CREATE INDEX fixture_statistics_cache_expiry_idx
    ON fixture_statistics_cache (expires_at);

-- Down Migration
DROP TABLE IF EXISTS fixture_statistics_cache;
DROP TABLE IF EXISTS fixture_statistics_cache_version;
