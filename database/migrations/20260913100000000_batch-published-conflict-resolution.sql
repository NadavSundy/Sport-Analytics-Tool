-- Up Migration
--
-- Record explicit administrator decisions that reconcile a staged delivery with
-- an already-published delivery. The decision is append-only audit evidence;
-- the batch item itself is transformed into either a deterministic duplicate
-- no-op or an immutable correction target.
--
-- Refs #522

CREATE TYPE batch_published_conflict_decision AS ENUM ('use_existing', 'replace_published');

CREATE TABLE batch_published_conflict_resolution (
    batch_published_conflict_resolution_id bigserial PRIMARY KEY,
    batch_id bigint NOT NULL REFERENCES batch (batch_id) ON DELETE RESTRICT,
    batch_item_id bigint NOT NULL REFERENCES batch_item (batch_item_id) ON DELETE RESTRICT,
    existing_delivery_id bigint NOT NULL REFERENCES delivery (delivery_id) ON DELETE RESTRICT,
    actor_id bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    decision batch_published_conflict_decision NOT NULL,
    reason text NOT NULL CHECK (length(btrim(reason)) >= 10),
    decided_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (batch_item_id)
);

CREATE INDEX batch_published_conflict_resolution_batch_idx
    ON batch_published_conflict_resolution (batch_id, decided_at, batch_published_conflict_resolution_id);

COMMENT ON TABLE batch_published_conflict_resolution IS
    'Append-only reviewer decisions for staged deliveries that conflict with existing published deliveries.';

-- Down Migration

DROP TABLE IF EXISTS batch_published_conflict_resolution;
DROP TYPE IF EXISTS batch_published_conflict_decision;
