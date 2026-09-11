import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

interface FixtureCompetitorRecord {
  competitorId: string;
  name: string;
}

export interface FixtureRecord {
  fixtureId: string;
  competitionId: string | null;
  competitionName: string | null;
  season: string;
  competitors: FixtureCompetitorRecord[];
  matchType: string;
  teamType: string;
  gender: string;
  ballsPerOver: number;
  scheduledOvers: number | null;
  startDate: string;
  endDate: string;
}

export interface FixtureWeatherContextRecord {
  fixtureId: string;
  date: string;
  venue: {
    venueId: string;
    name: string;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}


export interface FixtureListOptions {
  limit: number;
  competitionId?: string;
  season?: string;
  competitorId?: string;
  gender?: string;
  startDateFrom?: string;
  startDateTo?: string;
  after?: {
    startDate: string;
    fixtureId: string;
  };
}

export interface FixturePage {
  records: FixtureRecord[];
  hasMore: boolean;
}

export async function listFixtures(
  options: FixtureListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixturePage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.competitionId) {
    values.push(options.competitionId);
    conditions.push(`f.competition_id = $${values.length}::bigint`);
  }

  if (options.season) {
    values.push(options.season);
    conditions.push(`f.season = $${values.length}::text`);
  }

  if (options.competitorId) {
    values.push(options.competitorId);
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM fixture_team ft
        WHERE ft.fixture_id = f.fixture_id
          AND ft.team_id = $${values.length}::bigint
      )
    `);
  }

  if (options.gender) {
    values.push(options.gender);
    conditions.push(`f.gender = $${values.length}::text`);
  }

  if (options.startDateFrom) {
    values.push(options.startDateFrom);
    conditions.push(`f.start_date >= $${values.length}::date`);
  }

  if (options.startDateTo) {
    values.push(options.startDateTo);
    conditions.push(`f.start_date <= $${values.length}::date`);
  }

  if (options.after) {
    values.push(options.after.startDate);
    const dateParameter = values.length;

    values.push(options.after.fixtureId);
    const idParameter = values.length;

    conditions.push(
      `(f.start_date, f.fixture_id) > ($${dateParameter}::date, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await executeQuery<FixtureRecord>(
    executor,
    `
      SELECT
        f.fixture_id::text AS "fixtureId",
        f.competition_id::text AS "competitionId",
        c.name AS "competitionName",
        f.season,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'competitorId', ft.team_id::text,
                'name', t.name
              )
              ORDER BY ft.ordinal ASC
            )
            FROM fixture_team ft
            INNER JOIN team t
              ON t.team_id = ft.team_id
            WHERE ft.fixture_id = f.fixture_id
          ),
          '[]'::jsonb
        ) AS competitors,
        f.match_type AS "matchType",
        f.team_type AS "teamType",
        f.gender,
        f.balls_per_over AS "ballsPerOver",
        f.scheduled_overs AS "scheduledOvers",
        f.start_date::text AS "startDate",
        f.end_date::text AS "endDate"
      FROM fixture f
      LEFT JOIN competition c
        ON c.competition_id = f.competition_id
      ${where}
      ORDER BY f.start_date ASC, f.fixture_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findFixtureById(
  fixtureId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureRecord | null> {
  const result = await executeQuery<FixtureRecord>(
    executor,
    `
      SELECT
        f.fixture_id::text AS "fixtureId",
        f.competition_id::text AS "competitionId",
        c.name AS "competitionName",
        f.season,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'competitorId', ft.team_id::text,
                'name', t.name
              )
              ORDER BY ft.ordinal ASC
            )
            FROM fixture_team ft
            INNER JOIN team t
              ON t.team_id = ft.team_id
            WHERE ft.fixture_id = f.fixture_id
          ),
          '[]'::jsonb
        ) AS competitors,
        f.match_type AS "matchType",
        f.team_type AS "teamType",
        f.gender,
        f.balls_per_over AS "ballsPerOver",
        f.scheduled_overs AS "scheduledOvers",
        f.start_date::text AS "startDate",
        f.end_date::text AS "endDate"
      FROM fixture f
      LEFT JOIN competition c
        ON c.competition_id = f.competition_id
      WHERE f.fixture_id = $1::bigint
    `,
    [fixtureId],
  );

  return result.rows[0] ?? null;
}

/**
 * Persists resolved geocoding coordinates against a venue so future lookups
 * reuse the stored value instead of geocoding the same venue again.
 *
 * The `venue` table enforces `latitude`/`longitude` are both null or both
 * within their valid ranges (see the `add-venue-coordinates` migration), so
 * an out-of-range value here fails at the database level rather than
 * silently persisting bad data.
 */
export async function updateVenueCoordinates(
  venueId: string,
  latitude: number,
  longitude: number,
  executor: QueryExecutor = getDatabasePool(),
): Promise<void> {
  await executeQuery(
    executor,
    `
      UPDATE venue
      SET latitude = $2::double precision,
          longitude = $3::double precision
      WHERE venue_id = $1::bigint
    `,
    [venueId, latitude, longitude],
  );
}

export async function findFixtureWeatherContext(
  fixtureId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureWeatherContextRecord | null> {
  const result = await executeQuery<FixtureWeatherContextRecord>(
    executor,
    `
      SELECT
        f.fixture_id::text AS "fixtureId",
        f.start_date::text AS "date",
        CASE WHEN v.venue_id IS NULL THEN NULL ELSE jsonb_build_object(
          'venueId', v.venue_id::text,
          'name', v.name,
          'city', v.city,
          'latitude', v.latitude,
          'longitude', v.longitude
        ) END AS venue
      FROM fixture f
      LEFT JOIN venue v ON v.venue_id = f.venue_id
      WHERE f.fixture_id = $1::bigint
    `,
    [fixtureId],
  );

  return result.rows[0] ?? null;
}
