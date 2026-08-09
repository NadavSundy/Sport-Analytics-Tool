import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface CompetitionRecord {
  competitionId: string;
  name: string;
}

type CompetitionRow = CompetitionRecord;

export async function listCompetitions(
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitionRecord[]> {
  const result = await executeQuery<CompetitionRow>(
    executor,
    `
      SELECT
        competition_id::text AS "competitionId",
        name
      FROM competition
      ORDER BY name ASC, competition_id ASC
    `,
  );

  return result.rows;
}

export async function findCompetitionById(
  competitionId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitionRecord | null> {
  const result = await executeQuery<CompetitionRow>(
    executor,
    `
      SELECT
        competition_id::text AS "competitionId",
        name
      FROM competition
      WHERE competition_id = $1
    `,
    [competitionId],
  );

  return result.rows[0] ?? null;
}
