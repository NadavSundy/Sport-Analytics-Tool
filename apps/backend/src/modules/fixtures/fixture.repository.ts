import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface FixtureRecord {
  fixtureId: string;
  competitionId: string | null;
  season: string;
  matchType: string;
  teamType: string;
  gender: string;
  ballsPerOver: number;
  scheduledOvers: number | null;
  startDate: string;
  endDate: string;
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
        f.season,
        f.match_type AS "matchType",
        f.team_type AS "teamType",
        f.gender,
        f.balls_per_over AS "ballsPerOver",
        f.scheduled_overs AS "scheduledOvers",
        f.start_date::text AS "startDate",
        f.end_date::text AS "endDate"
      FROM fixture f
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
        fixture_id::text AS "fixtureId",
        competition_id::text AS "competitionId",
        season,
        match_type AS "matchType",
        team_type AS "teamType",
        gender,
        balls_per_over AS "ballsPerOver",
        scheduled_overs AS "scheduledOvers",
        start_date::text AS "startDate",
        end_date::text AS "endDate"
      FROM fixture
      WHERE fixture_id = $1::bigint
    `,
    [fixtureId],
  );

  return result.rows[0] ?? null;
}
