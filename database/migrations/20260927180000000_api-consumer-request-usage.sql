-- Up Migration
-- Request telemetry stores no raw URL, query string, headers, request body or key value.
CREATE TABLE api_consumer_request_usage (
    api_consumer_request_usage_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    api_consumer_id bigint NOT NULL REFERENCES api_consumer (api_consumer_id) ON DELETE CASCADE,
    api_consumer_key_id bigint NOT NULL REFERENCES api_consumer_key (api_consumer_key_id) ON DELETE RESTRICT,
    occurred_at timestamptz NOT NULL,
    endpoint text NOT NULL CHECK (endpoint ~ '^[A-Z]+ /consumer/'),
    status_class text NOT NULL CHECK (status_class IN ('2xx', '3xx', '4xx', '5xx'))
);

CREATE INDEX api_consumer_request_usage_aggregate_idx
    ON api_consumer_request_usage (api_consumer_id, occurred_at DESC, endpoint, status_class);

COMMENT ON TABLE api_consumer_request_usage IS
    'Per-consumer request telemetry: normalized route template, status class, key id and timestamp only. Retain for 31 days via scheduled operational cleanup.';

-- Down Migration
DROP TABLE IF EXISTS api_consumer_request_usage;
