import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface SeasonRecord {
  competitionId: string;
  competitionName: string;
  label: string;
}

export interface SeasonListOptions {
  limit: number;
  competitionId?: string;
  name?: string;
  after?: {
    competitionId: string;
    label: string;
  };
}

export interface SeasonPage {
  records: SeasonRecord[];
  hasMore: boolean;
  totalRecords: number;
}

export async function listSeasons(
  options: SeasonListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<SeasonPage> {
  const innerConditions = ['f.competition_id IS NOT NULL'];
  // Split so the total reflects the filters (name) but not the cursor
  // position: paging further through the same filtered set must not
  // change how many pages it reports.
  const filterConditions: string[] = [];
  const cursorConditions: string[] = [];
  const values: unknown[] = [];

  if (options.competitionId) {
    values.push(options.competitionId);
    innerConditions.push(`f.competition_id = $${values.length}::bigint`);
  }

  if (options.name) {
    values.push(`%${options.name}%`);
    filterConditions.push(`(s.season ILIKE $${values.length} OR c.name ILIKE $${values.length})`);
  }

  if (options.after) {
    values.push(options.after.competitionId);
    const competitionParameter = values.length;

    values.push(options.after.label);
    const seasonParameter = values.length;

    cursorConditions.push(
      `(competition_id, season) > ($${competitionParameter}::bigint, $${seasonParameter}::text)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const filterWhere = filterConditions.length > 0 ? `WHERE ${filterConditions.join(' AND ')}` : '';
  const cursorWhere = cursorConditions.length > 0 ? `WHERE ${cursorConditions.join(' AND ')}` : '';

  const result = await executeQuery<SeasonRecord & { totalRecords: number }>(
    executor,
    `
      WITH seasons AS (
        SELECT DISTINCT
          f.competition_id,
          f.season
        FROM fixture f
        WHERE ${innerConditions.join(' AND ')}
      ),
      filtered_seasons AS (
        SELECT
          s.competition_id,
          s.season,
          c.name AS competition_name,
          COUNT(*) OVER()::integer AS "totalRecords"
        FROM seasons s
        INNER JOIN competition c
          ON c.competition_id = s.competition_id
        ${filterWhere}
      )
      SELECT
        competition_id::text AS "competitionId",
        competition_name AS "competitionName",
        season AS label,
        "totalRecords"
      FROM filtered_seasons
      ${cursorWhere}
      ORDER BY competition_id ASC, season ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
    totalRecords: result.rows[0]?.totalRecords ?? 0,
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
