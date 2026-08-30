-- Up Migration

ALTER TABLE venue
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD CONSTRAINT venue_coordinates_complete_ck
    CHECK ((latitude IS NULL) = (longitude IS NULL)),
  ADD CONSTRAINT venue_latitude_range_ck
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT venue_longitude_range_ck
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

-- Down Migration

ALTER TABLE venue
  DROP CONSTRAINT IF EXISTS venue_longitude_range_ck,
  DROP CONSTRAINT IF EXISTS venue_latitude_range_ck,
  DROP CONSTRAINT IF EXISTS venue_coordinates_complete_ck,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS latitude;
