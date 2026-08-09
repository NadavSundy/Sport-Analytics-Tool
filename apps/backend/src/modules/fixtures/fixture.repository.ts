import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface FixtureRecord {
  fixtureId: string;
  sourceRef: string;
  competitionId: string | null;
  season: string;
  matchType: string;
  teamType: string;
  gender: string;
  ballsPerOver: number;
  scheduledOvers: number | null;
  venueId: string | null;
  startDate: string;
  endDate: string;
}

type FixtureRow = FixtureRecord;

export async function findFixtureById(
  fixtureId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureRecord | null> {
  const result = await executeQuery<FixtureRow>(
    executor,
    `
      SELECT
        fixture_id::text AS "fixtureId",
        source_ref AS "sourceRef",
        competition_id::text AS "competitionId",
        season,
        match_type AS "matchType",
        team_type AS "teamType",
        gender,
        balls_per_over AS "ballsPerOver",
        scheduled_overs AS "scheduledOvers",
        venue_id::text AS "venueId",
        start_date::text AS "startDate",
        end_date::text AS "endDate"
      FROM fixture
      WHERE fixture_id = $1
    `,
    [fixtureId],
  );

  return result.rows[0] ?? null;
}
