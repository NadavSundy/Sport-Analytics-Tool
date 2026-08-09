import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface FixtureParticipantRecord {
  participantId: string;
  displayName: string;
  teamId: string;
  teamName: string;
  role: string | null;
}

type FixtureParticipantRow = FixtureParticipantRecord;

export async function listFixtureParticipants(
  fixtureId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureParticipantRecord[]> {
  const result = await executeQuery<FixtureParticipantRow>(
    executor,
    `
      SELECT
        person.person_id::text AS "participantId",
        person.display_name AS "displayName",
        team.team_id::text AS "teamId",
        team.name AS "teamName",
        fixture_squad.role
      FROM fixture_squad
      INNER JOIN person
        ON person.person_id = fixture_squad.person_id
      INNER JOIN team
        ON team.team_id = fixture_squad.team_id
      WHERE fixture_squad.fixture_id = $1
      ORDER BY
        team.name ASC,
        person.display_name ASC,
        person.person_id ASC
    `,
    [fixtureId],
  );

  return result.rows;
}
