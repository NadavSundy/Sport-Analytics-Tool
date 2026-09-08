-- Up Migration
--
-- Adds the distinct return-for-correction lifecycle and decision values used by
-- the authorised batch review workflow. One final review decision is retained
-- per batch; retries reuse that decision and resume publication idempotently.
--
-- Refs #283

ALTER TYPE batch_state ADD VALUE 'correction_requested' AFTER 'awaiting_review';
ALTER TYPE batch_review_decision_kind ADD VALUE 'returned_for_correction';

CREATE UNIQUE INDEX batch_review_decision_batch_key
    ON batch_review_decision (batch_id);

COMMENT ON INDEX batch_review_decision_batch_key IS
    'Serialises one final reviewer decision per validated batch; approval retries reuse it.';

-- Down Migration

DROP INDEX IF EXISTS batch_review_decision_batch_key;

DROP TRIGGER IF EXISTS batch_review_decision_prevent_delete ON batch_review_decision;
ALTER TABLE batch_review_decision
    ALTER COLUMN decision TYPE text USING decision::text;
DELETE FROM batch_review_decision WHERE decision = 'returned_for_correction';
DROP TYPE batch_review_decision_kind;
CREATE TYPE batch_review_decision_kind AS ENUM ('approved', 'rejected');
ALTER TABLE batch_review_decision
    ALTER COLUMN decision TYPE batch_review_decision_kind
    USING decision::batch_review_decision_kind;
CREATE TRIGGER batch_review_decision_prevent_delete
    BEFORE DELETE ON batch_review_decision
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_provenance_delete();

UPDATE batch SET state = 'rejected' WHERE state = 'correction_requested';
DO $$
BEGIN
    IF to_regclass('batch_state_transition') IS NOT NULL THEN
        UPDATE batch_state_transition
        SET from_state = 'rejected'
        WHERE from_state = 'correction_requested';
        UPDATE batch_state_transition
        SET to_state = 'rejected'
        WHERE to_state = 'correction_requested';
    END IF;
END
$$;

ALTER TABLE batch ALTER COLUMN state DROP DEFAULT;
ALTER TABLE batch ALTER COLUMN state TYPE text USING state::text;
DO $$
BEGIN
    IF to_regclass('batch_state_transition') IS NOT NULL THEN
        ALTER TABLE batch_state_transition ALTER COLUMN from_state TYPE text USING from_state::text;
        ALTER TABLE batch_state_transition ALTER COLUMN to_state TYPE text USING to_state::text;
    END IF;
END
$$;
DROP TYPE batch_state;
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
ALTER TABLE batch
    ALTER COLUMN state TYPE batch_state USING state::batch_state,
    ALTER COLUMN state SET DEFAULT 'received';
DO $$
BEGIN
    IF to_regclass('batch_state_transition') IS NOT NULL THEN
        ALTER TABLE batch_state_transition
            ALTER COLUMN from_state TYPE batch_state USING from_state::batch_state,
            ALTER COLUMN to_state TYPE batch_state USING to_state::batch_state;
    END IF;
END
$$;
