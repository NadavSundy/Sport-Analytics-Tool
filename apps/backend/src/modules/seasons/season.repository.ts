import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface SeasonRecord {
  competitionId: string;
  label: string;
}

export interface SeasonListOptions {
  limit: number;
  competitionId?: string;
  after?: {
    competitionId: string;
    label: string;
  };
}

export async function listSeasons(
  options: SeasonListOptions,
  executor: QueryExecutor = getDatabasePool(),
) {
  const innerConditions = ['competition_id IS NOT NULL'];
  const outerConditions: string[] = [];
  const values: unknown[] = [];

  if (options.competitionId) {
    values.push(options.competitionId);
    innerConditions.push(`competition_id = $${values.length}::bigint`);
  }

  if (options.after) {
    values.push(options.after.competitionId);
    const competitionParameter = values.length;

    values.push(options.after.label);
    const seasonParameter = values.length;

    outerConditions.push(
      `(competition_id, season) > ($${competitionParameter}::bigint, $${seasonParameter}::text)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const outerWhere = outerConditions.length > 0 ? `WHERE ${outerConditions.join(' AND ')}` : '';

  const result = await executeQuery<SeasonRecord>(
    executor,
    `
      WITH seasons AS (
        SELECT DISTINCT competition_id, season
        FROM fixture
        WHERE ${innerConditions.join(' AND ')}
      )
      SELECT
        competition_id::text AS "competitionId",
        season AS label
      FROM seasons
      ${outerWhere}
      ORDER BY competition_id ASC, season ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findSeason(
  competitionId: string,
  label: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<SeasonRecord | null> {
  const result = await executeQuery<SeasonRecord>(
    executor,
    `
      SELECT
        competition_id::text AS "competitionId",
        season AS label
      FROM fixture
      WHERE competition_id = $1
        AND season = $2
      LIMIT 1
    `,
    [competitionId, label],
  );

  return result.rows[0] ?? null;
}
