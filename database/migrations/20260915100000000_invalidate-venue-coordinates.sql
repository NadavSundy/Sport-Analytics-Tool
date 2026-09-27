-- Up Migration

CREATE OR REPLACE FUNCTION invalidate_venue_coordinates_on_location_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name OR NEW.city IS DISTINCT FROM OLD.city THEN
    NEW.latitude := NULL;
    NEW.longitude := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER venue_location_coordinates_invalidation_trg
  BEFORE UPDATE OF name, city ON venue
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_venue_coordinates_on_location_change();

-- Down Migration

DROP TRIGGER IF EXISTS venue_location_coordinates_invalidation_trg ON venue;
DROP FUNCTION IF EXISTS invalidate_venue_coordinates_on_location_change();
