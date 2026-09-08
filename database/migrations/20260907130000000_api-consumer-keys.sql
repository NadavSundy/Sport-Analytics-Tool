-- Up Migration
-- Consumer secrets are deliberately not stored. api_consumer_key.key_hash is a
-- SHA-256 digest of a 256-bit randomly generated key and key_prefix is safe
-- display metadata only.

CREATE TABLE api_consumer (
    api_consumer_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_app_user_id bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    rate_limit_per_minute integer NOT NULL DEFAULT 60
        CHECK (rate_limit_per_minute BETWEEN 1 AND 10000),
    daily_quota integer NOT NULL DEFAULT 10000
        CHECK (daily_quota BETWEEN 1 AND 10000),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_consumer_owner_idx ON api_consumer (owner_app_user_id, api_consumer_id);

CREATE TABLE api_consumer_key (
    api_consumer_key_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    api_consumer_id bigint NOT NULL REFERENCES api_consumer (api_consumer_id) ON DELETE CASCADE,
    key_prefix text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz
);

CREATE INDEX api_consumer_key_active_lookup_idx
    ON api_consumer_key (key_hash) WHERE revoked_at IS NULL;

CREATE TABLE api_consumer_daily_usage (
    api_consumer_id bigint NOT NULL REFERENCES api_consumer (api_consumer_id) ON DELETE CASCADE,
    usage_date date NOT NULL,
    request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    PRIMARY KEY (api_consumer_id, usage_date)
);

COMMENT ON TABLE api_consumer IS
    'Administrator-issued external API consumers. Limits apply to the consumer across all of its keys.';
COMMENT ON TABLE api_consumer_key IS
    'Hashed consumer API keys. Raw key material is returned once at issue or rotation and is never persisted.';
COMMENT ON TABLE api_consumer_daily_usage IS
    'UTC daily request counters used for the durable per-consumer quota.';

-- Down Migration

DROP TABLE IF EXISTS api_consumer_daily_usage;
DROP TABLE IF EXISTS api_consumer_key;
DROP TABLE IF EXISTS api_consumer;
