-- Up Migration

-- Durable staging and resume metadata for the batch-ingestion design in
-- docs/architecture/batch-ingestion-pipeline.md. Processing, review and object
-- storage remain separate follow-on work.
--
-- Refs #276

CREATE TYPE batch_state AS ENUM (
    'received',
    'stored',
    'validating',
    'rejected',
    'awaiting_review',
    'publishing',
    'published',
    'partially_published',
    'failed',
    'superseded'
);

CREATE TYPE batch_item_state AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'published',
    'duplicate_skipped'
);

CREATE TYPE batch_checkpoint_phase AS ENUM ('validating', 'publishing');

CREATE TABLE batch (
    batch_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submitter_id      bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    competition_id    bigint NOT NULL REFERENCES competition (competition_id) ON DELETE RESTRICT,
    idempotency_key   text NOT NULL,
    source_checksum   char(64),
    source_uri        text,
    source_size_bytes bigint,
    state             batch_state NOT NULL DEFAULT 'received',
    item_count        integer NOT NULL DEFAULT 0,
    superseded_by     bigint REFERENCES batch (batch_id) ON DELETE RESTRICT,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT batch_submitter_idempotency_key UNIQUE (submitter_id, idempotency_key),
    CONSTRAINT batch_idempotency_key_ck CHECK (length(btrim(idempotency_key)) > 0),
    CONSTRAINT batch_source_provenance_ck CHECK (
        (
            source_checksum IS NULL
            AND source_uri IS NULL
            AND source_size_bytes IS NULL
        )
        OR
        (
            source_checksum IS NOT NULL
            AND source_uri IS NOT NULL
            AND source_size_bytes IS NOT NULL
            AND source_checksum ~ '^[0-9A-Fa-f]{64}$'
            AND length(btrim(source_uri)) > 0
            AND source_size_bytes > 0
        )
    ),
    CONSTRAINT batch_item_count_ck CHECK (item_count >= 0),
    CONSTRAINT batch_superseded_by_ck CHECK (
        superseded_by IS NULL OR superseded_by <> batch_id
    )
);

COMMENT ON TABLE batch IS
    'One durable batch-ingestion payload and its lifecycle, source identity and submitter provenance.';

COMMENT ON COLUMN batch.idempotency_key IS
    'Submitter-provided key, unique within one submitter account.';

COMMENT ON COLUMN batch.source_checksum IS
    'SHA-256 checksum of the original object bytes; null while the batch is only received.';

COMMENT ON COLUMN batch.source_uri IS
    'Private object-storage key or URI; never a submitter-facing public URL.';

CREATE FUNCTION set_batch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER batch_set_updated_at
    BEFORE UPDATE ON batch
    FOR EACH ROW
    EXECUTE FUNCTION set_batch_updated_at();

CREATE FUNCTION prevent_batch_provenance_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Batch and batch-item provenance records cannot be deleted.'
        USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER batch_prevent_delete
    BEFORE DELETE ON batch
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

CREATE TABLE batch_item (
    batch_item_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id           bigint NOT NULL REFERENCES batch (batch_id) ON DELETE RESTRICT,
    ordinal            integer NOT NULL,
    innings_id         bigint NOT NULL REFERENCES innings (innings_id) ON DELETE RESTRICT,
    over_number        smallint NOT NULL,
    position_in_over   smallint NOT NULL,
    payload            jsonb NOT NULL,
    state              batch_item_state NOT NULL DEFAULT 'pending',
    rejection_code     text,
    rejection_detail   jsonb,
    published_event_id bigint REFERENCES delivery (delivery_id) ON DELETE RESTRICT,

    CONSTRAINT batch_item_batch_ordinal_key UNIQUE (batch_id, ordinal),
    CONSTRAINT batch_item_batch_natural_key UNIQUE (
        batch_id,
        innings_id,
        over_number,
        position_in_over
    ),
    CONSTRAINT batch_item_ordinal_ck CHECK (ordinal >= 0),
    CONSTRAINT batch_item_over_number_ck CHECK (over_number >= 0),
    CONSTRAINT batch_item_position_in_over_ck CHECK (position_in_over >= 0),
    CONSTRAINT batch_item_published_event_ck CHECK (
        state <> 'published' OR published_event_id IS NOT NULL
    )
);

COMMENT ON TABLE batch_item IS
    'One expanded payload event, ordered by its zero-based payload ordinal and retained before publication.';

COMMENT ON COLUMN batch_item.position_in_over IS
    'The delivery natural-key position. Printed ballNumber remains payload display data and is not an identity column.';

COMMENT ON COLUMN batch_item.published_event_id IS
    'Delivery revision created when this staged item is published.';

CREATE TRIGGER batch_item_prevent_delete
    BEFORE DELETE ON batch_item
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

CREATE TABLE batch_checkpoint (
    batch_id          bigint PRIMARY KEY REFERENCES batch (batch_id) ON DELETE RESTRICT,
    phase             batch_checkpoint_phase NOT NULL,
    last_ordinal      integer NOT NULL,
    lease_owner       text,
    lease_expires_at  timestamptz,
    attempt_count     integer NOT NULL DEFAULT 0,

    CONSTRAINT batch_checkpoint_last_ordinal_ck CHECK (last_ordinal >= 0),
    CONSTRAINT batch_checkpoint_lease_ck CHECK (
        (lease_owner IS NULL) = (lease_expires_at IS NULL)
        AND (lease_owner IS NULL OR length(btrim(lease_owner)) > 0)
    ),
    CONSTRAINT batch_checkpoint_attempt_count_ck CHECK (attempt_count >= 0)
);

COMMENT ON TABLE batch_checkpoint IS
    'The single durable resume point for a batch phase; chunk work and this row must be written in one transaction.';

COMMENT ON COLUMN batch_checkpoint.last_ordinal IS
    'Highest payload ordinal durably completed in the recorded phase.';

-- The existing delivery_natural_key_live partial unique index already enforces
-- one live delivery revision per natural key. It is intentionally left unchanged.

-- Down Migration

DROP TABLE IF EXISTS batch_checkpoint;

DROP TRIGGER IF EXISTS batch_item_prevent_delete ON batch_item;
DROP TABLE IF EXISTS batch_item;

DROP TRIGGER IF EXISTS batch_prevent_delete ON batch;
DROP FUNCTION IF EXISTS prevent_batch_provenance_delete();
DROP TRIGGER IF EXISTS batch_set_updated_at ON batch;
DROP FUNCTION IF EXISTS set_batch_updated_at();

DROP TABLE IF EXISTS batch;

DROP TYPE IF EXISTS batch_checkpoint_phase;
DROP TYPE IF EXISTS batch_item_state;
DROP TYPE IF EXISTS batch_state;
