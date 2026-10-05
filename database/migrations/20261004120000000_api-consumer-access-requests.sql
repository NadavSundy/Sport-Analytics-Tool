-- Up Migration
CREATE TABLE api_consumer_access_request (
    api_consumer_access_request_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requester_app_user_id bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    api_consumer_id bigint UNIQUE REFERENCES api_consumer (api_consumer_id) ON DELETE RESTRICT,
    consumer_name text NOT NULL CHECK (length(btrim(consumer_name)) BETWEEN 1 AND 120),
    intended_use text NOT NULL CHECK (length(btrim(intended_use)) BETWEEN 10 AND 500),
    request_state text NOT NULL DEFAULT 'pending'
        CHECK (request_state IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    reviewed_by_app_user_id bigint REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    reviewed_at timestamptz,
    review_reason text CHECK (review_reason IS NULL OR length(btrim(review_reason)) BETWEEN 1 AND 500),
    CHECK (
      (request_state = 'pending' AND reviewed_by_app_user_id IS NULL AND reviewed_at IS NULL AND api_consumer_id IS NULL)
      OR (request_state = 'approved' AND reviewed_by_app_user_id IS NOT NULL AND reviewed_at IS NOT NULL AND api_consumer_id IS NOT NULL)
      OR (request_state = 'rejected' AND reviewed_by_app_user_id IS NOT NULL AND reviewed_at IS NOT NULL AND api_consumer_id IS NULL)
    )
);

-- Existing administrator-issued consumers keep working, but are represented in
-- the new audit model. Their recorded owner remains the only safe owner that can
-- be inferred from legacy data; administrators can subsequently administer them
-- without relying on who performed this migration.
INSERT INTO api_consumer_access_request (
    requester_app_user_id, api_consumer_id, consumer_name, intended_use,
    request_state, created_at, reviewed_by_app_user_id, reviewed_at, review_reason
)
SELECT owner_app_user_id, api_consumer_id, name,
    'Migrated administrator-issued API consumer.', 'approved', created_at,
    owner_app_user_id, created_at, 'Migrated from the legacy administrator-issued lifecycle.'
FROM api_consumer;

CREATE UNIQUE INDEX api_consumer_access_request_pending_owner_idx
    ON api_consumer_access_request (requester_app_user_id)
    WHERE request_state = 'pending';
CREATE INDEX api_consumer_access_request_pending_idx
    ON api_consumer_access_request (created_at, api_consumer_access_request_id)
    WHERE request_state = 'pending';

COMMENT ON TABLE api_consumer_access_request IS
    'Audited user request and administrator decision; ownership remains on api_consumer.owner_app_user_id.';
COMMENT ON TABLE api_consumer IS
    'Approved external API consumers owned by the application user operating the integration.';
COMMENT ON TABLE api_consumer_key IS
    'Hashed consumer API keys. Raw material is returned once on explicit owner generation or rotation and is never persisted.';

-- Down Migration
DROP TABLE IF EXISTS api_consumer_access_request;
