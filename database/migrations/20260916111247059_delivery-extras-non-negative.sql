-- Up Migration
-- Refs #623
--
-- Extras are run counts, so none may be negative. The submission contracts
-- already reject a negative extra; these checks enforce the same rule for every
-- write path, including the Cricsheet ingest. NULL remains valid: an extras type
-- that did not occur may be omitted. One ALTER TABLE validates all five checks
-- in a single scan of existing rows.

ALTER TABLE delivery
  ADD CONSTRAINT delivery_extra_wides_nonnegative_ck
    CHECK (extra_wides IS NULL OR extra_wides >= 0),
  ADD CONSTRAINT delivery_extra_noballs_nonnegative_ck
    CHECK (extra_noballs IS NULL OR extra_noballs >= 0),
  ADD CONSTRAINT delivery_extra_byes_nonnegative_ck
    CHECK (extra_byes IS NULL OR extra_byes >= 0),
  ADD CONSTRAINT delivery_extra_legbyes_nonnegative_ck
    CHECK (extra_legbyes IS NULL OR extra_legbyes >= 0),
  ADD CONSTRAINT delivery_extra_penalty_nonnegative_ck
    CHECK (extra_penalty IS NULL OR extra_penalty >= 0);

-- Down Migration

ALTER TABLE delivery
  DROP CONSTRAINT IF EXISTS delivery_extra_penalty_nonnegative_ck,
  DROP CONSTRAINT IF EXISTS delivery_extra_legbyes_nonnegative_ck,
  DROP CONSTRAINT IF EXISTS delivery_extra_byes_nonnegative_ck,
  DROP CONSTRAINT IF EXISTS delivery_extra_noballs_nonnegative_ck,
  DROP CONSTRAINT IF EXISTS delivery_extra_wides_nonnegative_ck;
