-- Up Migration
--
-- Preserve package correction intent through staging and bind an accepted
-- correction to the published delivery revision resolved during validation.
--
-- Refs #484

CREATE TYPE batch_item_operation AS ENUM ('upsert', 'correction');

ALTER TABLE batch_item
    ADD COLUMN operation batch_item_operation NOT NULL DEFAULT 'upsert',
    ADD COLUMN corrects_source_identity text,
    ADD COLUMN correction_target_delivery_id bigint REFERENCES delivery (delivery_id) ON DELETE RESTRICT,
    ADD CONSTRAINT batch_item_correction_metadata_ck CHECK (
        (operation = 'upsert'
         AND corrects_source_identity IS NULL
         AND correction_target_delivery_id IS NULL)
        OR
        (operation = 'correction'
         AND corrects_source_identity IS NOT NULL
         AND length(btrim(corrects_source_identity)) > 0)
    );

COMMENT ON COLUMN batch_item.operation IS
    'Whether the staged package item is an ordinary upsert or an immutable correction.';

COMMENT ON COLUMN batch_item.corrects_source_identity IS
    'Externally owned stable delivery identity supplied by correctsEventId.';

COMMENT ON COLUMN batch_item.correction_target_delivery_id IS
    'Published delivery revision deterministically resolved as the correction target during validation.';

-- Batch deliveries published before this migration did not retain the
-- canonical source-event UUID used by immutable revision history. Give every
-- existing batch lineage one stable UUID before enabling batch corrections.
ALTER TABLE delivery DISABLE TRIGGER delivery_protect_revision;

WITH batch_lineage AS (
    SELECT source_batch_item_id,
           COALESCE(min(source_event_id::text)::uuid, gen_random_uuid()) AS source_event_id
    FROM delivery
    WHERE source_batch_item_id IS NOT NULL
    GROUP BY source_batch_item_id
)
UPDATE delivery target
SET source_event_id = batch_lineage.source_event_id,
    submission_event_ordinal = source_item.ordinal
FROM batch_lineage
JOIN batch_item source_item
  ON source_item.batch_item_id = batch_lineage.source_batch_item_id
WHERE target.source_batch_item_id = batch_lineage.source_batch_item_id
  AND target.source_event_id IS NULL;

ALTER TABLE delivery ENABLE TRIGGER delivery_protect_revision;

-- Down Migration

ALTER TABLE batch_item
    DROP CONSTRAINT IF EXISTS batch_item_correction_metadata_ck,
    DROP COLUMN IF EXISTS correction_target_delivery_id,
    DROP COLUMN IF EXISTS corrects_source_identity,
    DROP COLUMN IF EXISTS operation;

DROP TYPE IF EXISTS batch_item_operation;
