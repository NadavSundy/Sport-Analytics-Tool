import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface CompetitorRecord {
  competitorId: string;
  name: string;
}

export interface CompetitorListOptions {
  limit: number;
  competitionId?: string;
  season?: string;
  name?: string;
  after?: {
    name: string;
    competitorId: string;
  };
}

export interface CompetitorPage {
  records: CompetitorRecord[];
  hasMore: boolean;
}

export async function listCompetitors(
  options: CompetitorListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitorPage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.name) {
    values.push(`%${options.name}%`);
    conditions.push(`t.name ILIKE $${values.length}`);
  }

  if (options.competitionId || options.season) {
    const fixtureConditions = ['ft.team_id = t.team_id'];

    if (options.competitionId) {
      values.push(options.competitionId);
      fixtureConditions.push(`f.competition_id = $${values.length}::bigint`);
    }

    if (options.season) {
      values.push(options.season);
      fixtureConditions.push(`f.season = $${values.length}::text`);
    }

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM fixture_team ft
        INNER JOIN fixture f
          ON f.fixture_id = ft.fixture_id
        WHERE ${fixtureConditions.join(' AND ')}
      )
    `);
  }

  if (options.after) {
    values.push(options.after.name);
    const nameParameter = values.length;

    values.push(options.after.competitorId);
    const idParameter = values.length;

    conditions.push(`(t.name, t.team_id) > ($${nameParameter}::text, $${idParameter}::bigint)`);
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await executeQuery<CompetitorRecord>(
    executor,
    `
      SELECT
        t.team_id::text AS "competitorId",
        t.name
      FROM team t
      ${where}
      ORDER BY t.name ASC, t.team_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findCompetitorById(
  competitorId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<CompetitorRecord | null> {
  const result = await executeQuery<CompetitorRecord>(
    executor,
    `
      SELECT
        team_id::text AS "competitorId",
        name
      FROM team
      WHERE team_id = $1::bigint
    `,
    [competitorId],
  );

  return result.rows[0] ?? null;
}
