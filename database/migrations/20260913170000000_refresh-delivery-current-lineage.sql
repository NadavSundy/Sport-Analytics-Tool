-- Up Migration
--
-- Reconcile legacy published deliveries without rewriting the entire historical
-- delivery corpus. PostgreSQL SELECT * views retain the column list captured
-- when the view is created, so refresh delivery_current after the later lineage
-- columns were added.
--
-- Legacy rows may legitimately predate source_event_id and
-- submission_event_ordinal. Permit those two provenance fields to be initialised
-- exactly once, without allowing cricket content or existing provenance to be
-- changed. The backend resolves lineage lazily only when a reviewer approves a
-- correction for that specific delivery.
--
-- Refs #522

CREATE OR REPLACE FUNCTION protect_delivery_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- A legacy published row may acquire immutable lineage once. No cricket
    -- content or other provenance may change during this transition.
    IF OLD.source_event_id IS NULL
       AND OLD.submission_event_ordinal IS NULL
       AND NEW.source_event_id IS NOT NULL
       AND NEW.submission_event_ordinal IS NOT NULL
       AND (to_jsonb(NEW) - ARRAY['source_event_id', 'submission_event_ordinal'])
           IS NOT DISTINCT FROM
           (to_jsonb(OLD) - ARRAY['source_event_id', 'submission_event_ordinal']) THEN
        RETURN NEW;
    END IF;

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

CREATE OR REPLACE FUNCTION ensure_delivery_legacy_lineage(p_delivery_id bigint)
RETURNS TABLE(source_event_id uuid, innings_sequence integer)
LANGUAGE plpgsql
AS $$
DECLARE
    v_submission_id bigint;
BEGIN
    SELECT delivery.submission_id
    INTO v_submission_id
    FROM delivery
    JOIN submission
      ON submission.submission_id = delivery.submission_id
     AND submission.status = 'accepted'
    WHERE delivery.delivery_id = p_delivery_id
      AND delivery.superseded_at IS NULL
    FOR UPDATE OF delivery;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Serialise synthetic ordinal allocation within one original submission.
    PERFORM pg_advisory_xact_lock(
        hashtextextended('delivery-lineage:' || v_submission_id::text, 0)
    );

    UPDATE delivery target
    SET source_event_id = gen_random_uuid(),
        submission_event_ordinal = (
            SELECT COALESCE(max(existing.submission_event_ordinal) + 1, 0)
            FROM delivery existing
            WHERE existing.submission_id = v_submission_id
        )
    WHERE target.delivery_id = p_delivery_id
      AND target.source_event_id IS NULL
      AND target.submission_event_ordinal IS NULL;

    RETURN QUERY
    SELECT target.source_event_id, target.innings_sequence
    FROM delivery target
    WHERE target.delivery_id = p_delivery_id
      AND target.superseded_at IS NULL;
END;
$$;

COMMENT ON FUNCTION ensure_delivery_legacy_lineage(bigint) IS
    'Initialises immutable provenance only for the legacy published delivery being approved as a correction target.';

CREATE OR REPLACE VIEW delivery_current AS
SELECT *
FROM delivery
WHERE superseded_at IS NULL;

COMMENT ON VIEW delivery_current IS
    'The live state of every delivery. All derivation reads this view; correction history is available from the base table.';

-- Down Migration
--
-- The refreshed view shape and any one-time provenance initialised by the helper
-- are intentionally retained because later correction history may depend on
-- them. Remove only the helper; the trigger remains strict while continuing to
-- permit the safe one-time legacy-provenance transition.

DROP FUNCTION IF EXISTS ensure_delivery_legacy_lineage(bigint);
