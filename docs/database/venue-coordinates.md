# Venue coordinates and geocoding

`venue` (see the `delivery-event-schema` migration) stores each venue as a named location:

```sql
CREATE TABLE venue (
    venue_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name     text NOT NULL,
    city     text,
    CONSTRAINT venue_name_city_key UNIQUE NULLS NOT DISTINCT (name, city)
);
```

This is the only form venue location takes in the ingested data: Cricsheet match files provide a
`venue` name and an optional `city`, never coordinates. The weather integration, however, requires
latitude/longitude (see [Weather API](../api/weather.md)). The `add-venue-coordinates` migration
adds nullable coordinate columns to bridge the two representations:

```sql
ALTER TABLE venue
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD CONSTRAINT venue_coordinates_complete_ck
    CHECK ((latitude IS NULL) = (longitude IS NULL)),
  ADD CONSTRAINT venue_latitude_range_ck
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT venue_longitude_range_ck
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
```

`latitude`/`longitude` are nullable and are populated lazily rather than at ingestion time:

- A newly ingested venue has `latitude`/`longitude` both `NULL`.
- The first time `GET /api/v1/fixtures/{fixtureId}/weather` is requested for a fixture at that
  venue, the backend geocodes `name`/`city` through Open-Meteo's geocoding API and persists the
  result with `UPDATE venue SET latitude = ..., longitude = ... WHERE venue_id = ...`
  (`updateVenueCoordinates` in `apps/backend/src/modules/fixtures/fixture.repository.ts`).
- Every later request for a fixture at that same venue reads the now-populated columns and skips
  geocoding entirely.

This keeps geocoding a one-time cost per venue rather than a repeated per-request cost, and it
means coordinates are only ever written for venues weather has actually been requested for — no
bulk backfill or ingestion-time geocoding step is required.

The `venue_coordinates_complete_ck` and range checks make it a database-level guarantee that a
venue's coordinates are either both absent or both present and within valid ranges; the backend
does not need to defend against a half-written or out-of-range coordinate pair.

If a venue's name/city cannot be geocoded (an unofficial or ambiguous name, for example), its
coordinates remain `NULL` and the fixture-weather endpoint returns a handled
`LOCATION_NOT_FOUND` response instead of writing anything — no row is left in a partially-resolved
state. See "Location-to-coordinate resolution" in the [Weather API](../api/weather.md) docs for the
full request-level workflow, including error handling for geocoding-provider failures.

## AI Declaration

The preceding document was planned and generated with the assistance of Claude Sonnet 5.
