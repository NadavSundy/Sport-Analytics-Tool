-- Up Migration
--
-- Issue #278: durable job state and transactional outbox for asynchronous batch
-- validation. The original batch payload remains in private object storage; only
-- identifiers and safe metadata are placed in the outbox/Service Bus envelope.


-- A lease must exist before the first item is committed. `-1` represents a
-- claimed validation phase with no completed source ordinal yet.
ALTER TABLE batch_checkpoint
    DROP CONSTRAINT batch_checkpoint_last_ordinal_ck,
    ADD CONSTRAINT batch_checkpoint_last_ordinal_ck CHECK (last_ordinal >= -1);

CREATE TYPE background_job_state AS ENUM (
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelled',
    'dead_lettered'
);

CREATE TABLE background_job (
    job_id             uuid PRIMARY KEY,
    job_type           text NOT NULL,
    contract_version   integer NOT NULL,
    idempotency_key    text NOT NULL UNIQUE,
    owner_id           bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    batch_id           bigint REFERENCES batch (batch_id) ON DELETE RESTRICT,
    state              background_job_state NOT NULL DEFAULT 'queued',
    progress_current   integer NOT NULL DEFAULT 0,
    progress_total     integer,
    attempt_count      integer NOT NULL DEFAULT 0,
    max_attempts       integer NOT NULL DEFAULT 5,
    last_error_code    text,
    last_error_message text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    started_at         timestamptz,
    completed_at       timestamptz,
    updated_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT background_job_type_ck CHECK (length(btrim(job_type)) > 0),
    CONSTRAINT background_job_contract_version_ck CHECK (contract_version > 0),
    CONSTRAINT background_job_idempotency_key_ck CHECK (length(btrim(idempotency_key)) > 0),
    CONSTRAINT background_job_progress_current_ck CHECK (progress_current >= 0),
    CONSTRAINT background_job_progress_total_ck CHECK (
        progress_total IS NULL OR progress_total >= 0
    ),
    CONSTRAINT background_job_progress_bounds_ck CHECK (
        progress_total IS NULL OR progress_current <= progress_total
    ),
    CONSTRAINT background_job_attempt_count_ck CHECK (attempt_count >= 0),
    CONSTRAINT background_job_max_attempts_ck CHECK (max_attempts BETWEEN 1 AND 20),
    CONSTRAINT background_job_error_code_ck CHECK (
        last_error_code IS NULL OR length(btrim(last_error_code)) > 0
    ),
    CONSTRAINT background_job_error_message_ck CHECK (
        last_error_message IS NULL OR length(btrim(last_error_message)) > 0
    )
);

CREATE UNIQUE INDEX background_job_batch_validate_key
    ON background_job (batch_id)
    WHERE job_type = 'batch.validate' AND batch_id IS NOT NULL;

COMMENT ON TABLE background_job IS
    'Durable user-visible state for asynchronous work. Queue delivery is at-least-once; this row is authoritative.';

COMMENT ON COLUMN background_job.idempotency_key IS
    'Stable business-operation key, not a queue-delivery identifier.';

CREATE FUNCTION set_background_job_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER background_job_set_updated_at
    BEFORE UPDATE ON background_job
    FOR EACH ROW
    EXECUTE FUNCTION set_background_job_updated_at();

CREATE TABLE outbox_message (
    outbox_message_id uuid PRIMARY KEY,
    job_id            uuid NOT NULL REFERENCES background_job (job_id) ON DELETE RESTRICT,
    message_type      text NOT NULL,
    contract_version  integer NOT NULL,
    body              jsonb NOT NULL,
    claim_owner       text,
    claim_expires_at  timestamptz,
    publish_attempts  integer NOT NULL DEFAULT 0,
    published_at      timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT outbox_message_type_ck CHECK (length(btrim(message_type)) > 0),
    CONSTRAINT outbox_message_contract_version_ck CHECK (contract_version > 0),
    CONSTRAINT outbox_message_body_ck CHECK (jsonb_typeof(body) = 'object'),
    CONSTRAINT outbox_message_claim_ck CHECK (
        (claim_owner IS NULL) = (claim_expires_at IS NULL)
        AND (claim_owner IS NULL OR length(btrim(claim_owner)) > 0)
    ),
    CONSTRAINT outbox_message_publish_attempts_ck CHECK (publish_attempts >= 0),
    CONSTRAINT outbox_message_published_claim_ck CHECK (
        published_at IS NULL OR (claim_owner IS NULL AND claim_expires_at IS NULL)
    )
);

CREATE INDEX outbox_message_unpublished_idx
    ON outbox_message (created_at, outbox_message_id)
    WHERE published_at IS NULL;

COMMENT ON TABLE outbox_message IS
    'Transactional outbox. The relay sends only this small command envelope and marks published_at after broker acknowledgement.';

CREATE TABLE batch_state_transition (
    batch_state_transition_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id                  bigint NOT NULL REFERENCES batch (batch_id) ON DELETE RESTRICT,
    from_state                batch_state,
    to_state                  batch_state NOT NULL,
    actor_kind                text NOT NULL,
    actor_identifier          text NOT NULL,
    reason                    text NOT NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT batch_state_transition_actor_kind_ck CHECK (
        actor_kind IN ('api', 'worker', 'reviewer', 'operator')
    ),
    CONSTRAINT batch_state_transition_actor_identifier_ck CHECK (
        length(btrim(actor_identifier)) > 0
    ),
    CONSTRAINT batch_state_transition_reason_ck CHECK (length(btrim(reason)) > 0),
    CONSTRAINT batch_state_transition_change_ck CHECK (
        from_state IS NULL OR from_state <> to_state
    )
);

CREATE INDEX batch_state_transition_batch_idx
    ON batch_state_transition (batch_id, created_at, batch_state_transition_id);

COMMENT ON TABLE batch_state_transition IS
    'Append-only lifecycle audit for batch state changes.';

CREATE TRIGGER background_job_prevent_delete
    BEFORE DELETE ON background_job
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

CREATE TRIGGER outbox_message_prevent_delete
    BEFORE DELETE ON outbox_message
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

CREATE TRIGGER batch_state_transition_prevent_delete
    BEFORE DELETE ON batch_state_transition
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

-- Down Migration

ALTER TABLE batch_checkpoint
    DROP CONSTRAINT IF EXISTS batch_checkpoint_last_ordinal_ck,
    ADD CONSTRAINT batch_checkpoint_last_ordinal_ck CHECK (last_ordinal >= 0);

DROP TRIGGER IF EXISTS batch_state_transition_prevent_delete ON batch_state_transition;
DROP TABLE IF EXISTS batch_state_transition;

DROP TRIGGER IF EXISTS outbox_message_prevent_delete ON outbox_message;
DROP INDEX IF EXISTS outbox_message_unpublished_idx;
DROP TABLE IF EXISTS outbox_message;

DROP TRIGGER IF EXISTS background_job_prevent_delete ON background_job;
DROP TRIGGER IF EXISTS background_job_set_updated_at ON background_job;
DROP FUNCTION IF EXISTS set_background_job_updated_at();
DROP INDEX IF EXISTS background_job_batch_validate_key;
DROP TABLE IF EXISTS background_job;

DROP TYPE IF EXISTS background_job_state;
