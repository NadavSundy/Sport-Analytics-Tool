import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

export interface ParticipantRecord {
  participantId: string;
  displayName: string;
}

export interface FixtureParticipantRecord {
  participantId: string;
  displayName: string;
  teamId: string;
  teamName: string;
  role: string | null;
}

export interface ParticipantListOptions {
  limit: number;
  fixtureId?: string;
  competitorId?: string;
  name?: string;
  after?: {
    displayName: string;
    participantId: string;
  };
}

export interface ParticipantPage {
  records: ParticipantRecord[];
  hasMore: boolean;
}

export async function listParticipants(
  options: ParticipantListOptions,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ParticipantPage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.name) {
    values.push(`%${options.name}%`);
    conditions.push(`p.display_name ILIKE $${values.length}`);
  }

  if (options.fixtureId || options.competitorId) {
    const squadConditions = ['fs.person_id = p.person_id'];

    if (options.fixtureId) {
      values.push(options.fixtureId);
      squadConditions.push(`fs.fixture_id = $${values.length}::bigint`);
    }

    if (options.competitorId) {
      values.push(options.competitorId);
      squadConditions.push(`fs.team_id = $${values.length}::bigint`);
    }

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM fixture_squad fs
        WHERE ${squadConditions.join(' AND ')}
      )
    `);
  }

  if (options.after) {
    values.push(options.after.displayName);
    const nameParameter = values.length;

    values.push(options.after.participantId);
    const idParameter = values.length;

    conditions.push(
      `(p.display_name, p.person_id) > ($${nameParameter}::text, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await executeQuery<ParticipantRecord>(
    executor,
    `
      SELECT
        p.person_id::text AS "participantId",
        p.display_name AS "displayName"
      FROM person p
      ${where}
      ORDER BY p.display_name ASC, p.person_id ASC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

export async function findParticipantById(
  participantId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ParticipantRecord | null> {
  const result = await executeQuery<ParticipantRecord>(
    executor,
    `
      SELECT
        person_id::text AS "participantId",
        display_name AS "displayName"
      FROM person
      WHERE person_id = $1::bigint
    `,
    [participantId],
  );

  return result.rows[0] ?? null;
}

export async function listFixtureParticipants(
  fixtureId: string,
  executor: QueryExecutor = getDatabasePool(),
): Promise<FixtureParticipantRecord[]> {
  const result = await executeQuery<FixtureParticipantRecord>(
    executor,
    `
      SELECT
        p.person_id::text AS "participantId",
        p.display_name AS "displayName",
        t.team_id::text AS "teamId",
        t.name AS "teamName",
        fs.role
      FROM fixture_squad fs
      INNER JOIN person p
        ON p.person_id = fs.person_id
      INNER JOIN team t
        ON t.team_id = fs.team_id
      WHERE fs.fixture_id = $1::bigint
      ORDER BY
        t.name ASC,
        p.display_name ASC,
        p.person_id ASC
    `,
    [fixtureId],
  );

  return result.rows;
}
