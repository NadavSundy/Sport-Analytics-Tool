-- Up Migration

-- Participant aggregates resolve every authoritative event relationship without
-- scanning the delivery or fielder corpus. Striker, bowler and dismissed-player
-- lookups already have equivalent indexes in the base event schema.
CREATE INDEX delivery_non_striker_idx
  ON delivery (non_striker_id)
  WHERE superseded_at IS NULL;

CREATE INDEX delivery_wicket_fielder_person_idx
  ON delivery_wicket_fielder (person_id)
  WHERE person_id IS NOT NULL;

-- Down Migration

DROP INDEX IF EXISTS delivery_wicket_fielder_person_idx;
DROP INDEX IF EXISTS delivery_non_striker_idx;
