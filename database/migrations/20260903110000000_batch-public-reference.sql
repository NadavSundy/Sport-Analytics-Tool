-- Up Migration
-- Issue #277: external callers receive an opaque reference, never a batch primary key.
ALTER TABLE batch
    ADD COLUMN batch_reference uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD CONSTRAINT batch_reference_key UNIQUE (batch_reference);

COMMENT ON COLUMN batch.batch_reference IS
    'Opaque UUID used by submitters for receipt status; it is not a database identifier.';

-- Down Migration
ALTER TABLE batch DROP CONSTRAINT IF EXISTS batch_reference_key;
ALTER TABLE batch DROP COLUMN IF EXISTS batch_reference;
