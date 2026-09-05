-- Up Migration
--
-- Immutable event-correction lineage and audit history.
--
-- Refs #284

DROP INDEX IF EXISTS delivery_source_event_id_unique;
DROP INDEX IF EXISTS delivery_submission_event_order_unique;
DROP INDEX IF EXISTS delivery_source_batch_item_key;

CREATE UNIQUE INDEX delivery_source_event_revision_unique
    ON delivery (source_event_id, revision)
    WHERE source_event_id IS NOT NULL;

CREATE UNIQUE INDEX delivery_submission_event_revision_unique
    ON delivery (submission_id, submission_event_ordinal, revision)
    WHERE submission_event_ordinal IS NOT NULL;

CREATE UNIQUE INDEX delivery_source_batch_item_revision_unique
    ON delivery (source_batch_item_id, revision)
    WHERE source_batch_item_id IS NOT NULL;

ALTER TABLE delivery
    ADD COLUMN supersedes_delivery_id bigint REFERENCES delivery (delivery_id) ON DELETE RESTRICT;

-- Earlier correction code retained the forward delivery link but cleared the
-- predecessor's direct-submission identity to satisfy the old global unique
-- indexes. Recover that attributable provenance from the current revision and
-- its forward-linked chain before enforcing the stronger invariants.
WITH RECURSIVE revision_lineage AS (
    SELECT
        delivery_id,
        source_event_id,
        submission_id,
        submission_event_ordinal,
        source_batch_item_id
    FROM delivery
    WHERE superseded_at IS NULL
      AND source_event_id IS NOT NULL

    UNION ALL

    SELECT
        previous.delivery_id,
        lineage.source_event_id,
        lineage.submission_id,
        lineage.submission_event_ordinal,
        COALESCE(previous.source_batch_item_id, lineage.source_batch_item_id)
    FROM delivery previous
    JOIN revision_lineage lineage ON previous.superseded_by = lineage.delivery_id
    WHERE previous.delivery_id <> previous.superseded_by
)
UPDATE delivery target
SET source_event_id = lineage.source_event_id,
    submission_id = lineage.submission_id,
    submission_event_ordinal = lineage.submission_event_ordinal,
    source_batch_item_id = lineage.source_batch_item_id
FROM revision_lineage lineage
WHERE target.delivery_id = lineage.delivery_id;

UPDATE delivery replacement
SET supersedes_delivery_id = previous.delivery_id
FROM delivery previous
WHERE previous.superseded_by = replacement.delivery_id
  AND previous.delivery_id <> replacement.delivery_id;

ALTER TABLE delivery
    ADD CONSTRAINT delivery_revision_lineage_ck CHECK (
        (revision = 1 AND supersedes_delivery_id IS NULL)
        OR (revision > 1 AND supersedes_delivery_id IS NOT NULL)
    ),
    ADD CONSTRAINT delivery_revision_positive_ck CHECK (revision > 0),
    ADD CONSTRAINT delivery_not_self_superseding_ck CHECK (
        supersedes_delivery_id IS NULL OR supersedes_delivery_id <> delivery_id
    );

CREATE UNIQUE INDEX delivery_supersedes_revision_unique
    ON delivery (supersedes_delivery_id)
    WHERE supersedes_delivery_id IS NOT NULL;

CREATE FUNCTION protect_delivery_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (to_jsonb(NEW) - ARRAY['superseded_at', 'superseded_by', 'source_batch_item_id'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['superseded_at', 'superseded_by', 'source_batch_item_id']) THEN
        RAISE EXCEPTION 'Published delivery revision content and provenance cannot be overwritten.'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.source_batch_item_id IS NOT NULL
       AND NEW.source_batch_item_id IS DISTINCT FROM OLD.source_batch_item_id THEN
        RAISE EXCEPTION 'Published delivery source-item provenance cannot be changed.'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.superseded_at IS NOT NULL
       AND (NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
            OR NEW.superseded_by IS DISTINCT FROM OLD.superseded_by)
       AND NOT (
           OLD.superseded_by = OLD.delivery_id
           AND NEW.superseded_at = OLD.superseded_at
           AND NEW.superseded_by <> OLD.delivery_id
       ) THEN
        RAISE EXCEPTION 'Superseded delivery lineage cannot be changed.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_protect_revision
    BEFORE UPDATE ON delivery
    FOR EACH ROW
    EXECUTE FUNCTION protect_delivery_revision();

CREATE FUNCTION validate_delivery_revision_lineage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    previous delivery%ROWTYPE;
BEGIN
    IF NEW.revision = 1 THEN
        RETURN NEW;
    END IF;

    SELECT * INTO previous
    FROM delivery
    WHERE delivery_id = NEW.supersedes_delivery_id;

    IF NOT FOUND
       OR previous.revision + 1 <> NEW.revision
       OR previous.source_event_id IS DISTINCT FROM NEW.source_event_id
       OR previous.submission_id IS DISTINCT FROM NEW.submission_id
       OR previous.submission_event_ordinal IS DISTINCT FROM NEW.submission_event_ordinal
       OR previous.source_batch_item_id IS DISTINCT FROM NEW.source_batch_item_id
       OR previous.innings_sequence IS DISTINCT FROM NEW.innings_sequence THEN
        RAISE EXCEPTION 'A delivery revision must preserve provenance and occurrence sequence and increment its predecessor revision by one.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_validate_revision_lineage
    BEFORE INSERT ON delivery
    FOR EACH ROW
    EXECUTE FUNCTION validate_delivery_revision_lineage();

CREATE TABLE delivery_correction_history (
    delivery_correction_history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_event_id                uuid NOT NULL,
    previous_delivery_id           bigint NOT NULL UNIQUE REFERENCES delivery (delivery_id) ON DELETE RESTRICT,
    replacement_delivery_id        bigint NOT NULL UNIQUE REFERENCES delivery (delivery_id) ON DELETE RESTRICT,
    requester_id                   bigint NOT NULL REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    requested_at                   timestamptz NOT NULL DEFAULT now(),
    reason                         text NOT NULL,
    previous_state                 jsonb NOT NULL,
    resulting_state                jsonb NOT NULL,
    original_submission_id         bigint NOT NULL REFERENCES submission (submission_id) ON DELETE RESTRICT,
    original_submission_ordinal    integer,
    original_batch_item_id         bigint REFERENCES batch_item (batch_item_id) ON DELETE RESTRICT,
    reviewer_id                    bigint REFERENCES app_user (app_user_id) ON DELETE RESTRICT,
    review_decision                batch_review_decision_kind,
    reviewed_at                    timestamptz,
    review_reason                  text,

    CONSTRAINT delivery_correction_distinct_revisions_ck CHECK (
        previous_delivery_id <> replacement_delivery_id
    ),
    CONSTRAINT delivery_correction_reason_ck CHECK (length(btrim(reason)) > 0),
    CONSTRAINT delivery_correction_states_ck CHECK (
        jsonb_typeof(previous_state) = 'object' AND jsonb_typeof(resulting_state) = 'object'
    ),
    CONSTRAINT delivery_correction_review_ck CHECK (
        (reviewer_id IS NULL AND review_decision IS NULL AND reviewed_at IS NULL AND review_reason IS NULL)
        OR
        (reviewer_id IS NOT NULL AND review_decision IS NOT NULL AND reviewed_at IS NOT NULL
         AND review_reason IS NOT NULL AND length(btrim(review_reason)) > 0)
    )
);

CREATE INDEX delivery_correction_history_event_idx
    ON delivery_correction_history (source_event_id, requested_at, delivery_correction_history_id);

CREATE FUNCTION prevent_delivery_correction_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Delivery correction history is append-only.'
        USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER delivery_correction_history_prevent_update
    BEFORE UPDATE ON delivery_correction_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delivery_correction_history_mutation();

CREATE TRIGGER delivery_correction_history_prevent_delete
    BEFORE DELETE ON delivery_correction_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delivery_correction_history_mutation();

COMMENT ON TABLE delivery_correction_history IS
    'Append-only audit record for every accepted correction, including actor, reason, immutable before/after states, revision lineage, and original source provenance.';

-- Down Migration

DROP TRIGGER IF EXISTS delivery_correction_history_prevent_delete ON delivery_correction_history;
DROP TRIGGER IF EXISTS delivery_correction_history_prevent_update ON delivery_correction_history;
DROP FUNCTION IF EXISTS prevent_delivery_correction_history_mutation();
DROP INDEX IF EXISTS delivery_correction_history_event_idx;
DROP TABLE IF EXISTS delivery_correction_history;

DROP TRIGGER IF EXISTS delivery_validate_revision_lineage ON delivery;
DROP FUNCTION IF EXISTS validate_delivery_revision_lineage();
DROP TRIGGER IF EXISTS delivery_protect_revision ON delivery;
DROP FUNCTION IF EXISTS protect_delivery_revision();
DROP INDEX IF EXISTS delivery_supersedes_revision_unique;

ALTER TABLE delivery
    DROP CONSTRAINT IF EXISTS delivery_not_self_superseding_ck,
    DROP CONSTRAINT IF EXISTS delivery_revision_positive_ck,
    DROP CONSTRAINT IF EXISTS delivery_revision_lineage_ck,
    DROP COLUMN IF EXISTS supersedes_delivery_id;

DROP INDEX IF EXISTS delivery_source_batch_item_revision_unique;
DROP INDEX IF EXISTS delivery_submission_event_revision_unique;
DROP INDEX IF EXISTS delivery_source_event_revision_unique;

UPDATE delivery
SET source_event_id = NULL,
    submission_event_ordinal = NULL,
    source_batch_item_id = NULL
WHERE superseded_at IS NOT NULL;

CREATE UNIQUE INDEX delivery_source_event_id_unique
    ON delivery (source_event_id)
    WHERE source_event_id IS NOT NULL;

CREATE UNIQUE INDEX delivery_submission_event_order_unique
    ON delivery (submission_id, submission_event_ordinal)
    WHERE submission_event_ordinal IS NOT NULL;

CREATE UNIQUE INDEX delivery_source_batch_item_key
    ON delivery (source_batch_item_id)
    WHERE source_batch_item_id IS NOT NULL;
