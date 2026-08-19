import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface SeasonRecord {
  competitionId: string;
  competitionName: string;
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
  const innerConditions = ['f.competition_id IS NOT NULL'];
  const outerConditions: string[] = [];
  const values: unknown[] = [];

  if (options.competitionId) {
    values.push(options.competitionId);
    innerConditions.push(`f.competition_id = $${values.length}::bigint`);
  }

  if (options.after) {
    values.push(options.after.competitionId);
    const competitionParameter = values.length;

    values.push(options.after.label);
    const seasonParameter = values.length;

    outerConditions.push(
      `(s.competition_id, s.season) > ($${competitionParameter}::bigint, $${seasonParameter}::text)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const outerWhere = outerConditions.length > 0 ? `WHERE ${outerConditions.join(' AND ')}` : '';

  const result = await executeQuery<SeasonRecord>(
    executor,
    `
      WITH seasons AS (
        SELECT DISTINCT
          f.competition_id,
          f.season
        FROM fixture f
        WHERE ${innerConditions.join(' AND ')}
      )
      SELECT
        s.competition_id::text AS "competitionId",
        c.name AS "competitionName",
        s.season AS label
      FROM seasons s
      INNER JOIN competition c
        ON c.competition_id = s.competition_id
      ${outerWhere}
      ORDER BY s.competition_id ASC, s.season ASC
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
        f.competition_id::text AS "competitionId",
        c.name AS "competitionName",
        f.season AS label
      FROM fixture f
      INNER JOIN competition c
        ON c.competition_id = f.competition_id
      WHERE f.competition_id = $1::bigint
        AND f.season = $2::text
      LIMIT 1
    `,
    [competitionId, label],
  );

  return result.rows[0] ?? null;
}
