-- Up Migration
-- Anonymous callers are represented only by an HMAC derived from their trusted
-- source address. Raw addresses and the server-held HMAC secret are not stored.
CREATE TABLE api_anonymous_source_minute_usage (
    source_key text NOT NULL CHECK (length(source_key) = 64),
    window_start timestamptz NOT NULL,
    request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    PRIMARY KEY (source_key, window_start)
);

CREATE INDEX api_anonymous_source_minute_usage_window_idx
    ON api_anonymous_source_minute_usage (window_start);

CREATE TABLE api_anonymous_global_minute_usage (
    window_start timestamptz PRIMARY KEY,
    request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);

COMMENT ON TABLE api_anonymous_source_minute_usage IS
    'Shared fixed UTC-minute counters keyed by a privacy-preserving HMAC of the trusted client source address.';
COMMENT ON TABLE api_anonymous_global_minute_usage IS
    'Shared fixed UTC-minute platform budget for anonymous canonical cricket reads.';

-- Down Migration

DROP TABLE IF EXISTS api_anonymous_global_minute_usage;
DROP TABLE IF EXISTS api_anonymous_source_minute_usage;
