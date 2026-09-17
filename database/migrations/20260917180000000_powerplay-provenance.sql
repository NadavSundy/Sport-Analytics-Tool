-- Up Migration
--
-- Powerplay rows become public only when their reviewed source batch is fully
-- published. The batch reference retains submitter, checksum, object and review
-- provenance without exposing any of those audit fields in public statistics.
--
-- Refs #633

ALTER TABLE innings_powerplay
    ADD COLUMN source_batch_id bigint REFERENCES batch (batch_id) ON DELETE RESTRICT;

COMMENT ON COLUMN innings_powerplay.source_batch_id IS
    'Reviewed batch whose authoritative innings metadata published this marker; null for trusted corpus imports predating staged publication.';

-- Down Migration

ALTER TABLE innings_powerplay DROP COLUMN IF EXISTS source_batch_id;
