import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface CompetitionRecord {
  competitionId: string;
  name: string;
}

export interface CompetitionListOptions {
  limit: number;
  name?: string;
  after?: {
    name: string;
    competitionId: string;
  };
}

export interface CompetitionPage {
  records: CompetitionRecord[];
  hasMore: boolean;
}

export async function listCompetitions(
  options: CompetitionListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitionPage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.name) {
    values.push(`%${options.name}%`);
    conditions.push(`name ILIKE $${values.length}`);
  }

  if (options.after) {
    values.push(options.after.name);
    const nameParameter = values.length;

    values.push(options.after.competitionId);
    const idParameter = values.length;

    conditions.push(`(name, competition_id) > ($${nameParameter}::text, $${idParameter}::bigint)`);
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await executeQuery<CompetitionRecord>(
    executor,
    `
      SELECT
        competition_id::text AS "competitionId",
        name
      FROM competition
      ${where}
      ORDER BY name ASC, competition_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findCompetitionById(
  competitionId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitionRecord | null> {
  const result = await executeQuery<CompetitionRecord>(
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
