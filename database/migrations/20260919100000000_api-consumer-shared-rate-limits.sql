-- Up Migration
-- Fixed UTC-minute consumer rate-limit counters. The primary key serialises
-- concurrent admissions for one consumer and one window across all replicas.
CREATE TABLE api_consumer_minute_usage (
    api_consumer_id bigint NOT NULL REFERENCES api_consumer (api_consumer_id) ON DELETE CASCADE,
    window_start timestamptz NOT NULL,
    request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    PRIMARY KEY (api_consumer_id, window_start)
);

COMMENT ON TABLE api_consumer_minute_usage IS
    'Shared fixed UTC-minute counters for consumer API rate limits; failed reads or writes fail requests closed.';

-- Down Migration

DROP TABLE IF EXISTS api_consumer_minute_usage;
