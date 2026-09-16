import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

/**
 * Non-negative checks on the delivery extras columns (issue #623).
 *
 * The contracts reject a negative extra, but the columns are also written by
 * the Cricsheet ingest and any future path, so the database enforces the rule
 * itself. Every test runs inside a transaction that is rolled back.
 */

const MIGRATION = '20260916111247059_delivery-extras-non-negative.sql';

const EXTRAS_COLUMNS = [
  'extra_wides',
  'extra_noballs',
  'extra_byes',
  'extra_legbyes',
  'extra_penalty',
] as const;

async function migrationSections(): Promise<{ down: string; up: string }> {
  const migration = await readFile(
    new URL(`../../../../database/migrations/${MIGRATION}`, import.meta.url),
    'utf8',
  );
  const downMarker = '-- Down Migration';
  const downMarkerIndex = migration.indexOf(downMarker);

  if (downMarkerIndex < 0) {
    throw new Error(`${MIGRATION} does not define a down migration.`);
  }

  return {
    up: migration.slice(0, downMarkerIndex),
    down: migration.slice(downMarkerIndex + downMarker.length),
  };
}

describe.sequential('delivery extras non-negative constraints', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }
    return pool;
  }

  async function withRolledBackTransaction(
    operation: (client: PoolClient) => Promise<void>,
  ): Promise<void> {
    const client = await databasePool().connect();
    try {
      await client.query('BEGIN');
      await operation(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  /** Runs a statement inside a savepoint and returns the error it raised, if any. */
  async function attempt(
    client: PoolClient,
    text: string,
    values: unknown[] = [],
  ): Promise<{ constraint?: string; message: string } | null> {
    await client.query('SAVEPOINT extras_attempt');
    try {
      await client.query(text, values);
      await client.query('RELEASE SAVEPOINT extras_attempt');
      return null;
    } catch (error) {
      await client.query('ROLLBACK TO SAVEPOINT extras_attempt');
      await client.query('RELEASE SAVEPOINT extras_attempt');
      const failure = error as { constraint?: string; message: string };
      return { constraint: failure.constraint, message: failure.message };
    }
  }

  beforeAll(() => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  test('rejects a negative value in each extras column and accepts null, zero and positive', async () => {
    await withRolledBackTransaction(async (client) => {
      const seedPath = resolve(__dirname, '../../../../database/seeds/matches/729307.json');
      const { fixtureId } = await ingestMatchData(client, seedPath, {
        sourceRef: `issue-623-extras-constraint-${process.pid}`,
      });
      const template = await client.query<{ deliveryId: string }>(
        `
          SELECT d.delivery_id::text AS "deliveryId"
          FROM delivery d
          JOIN innings i ON i.innings_id = d.innings_id
          WHERE i.fixture_id = $1
          ORDER BY d.innings_sequence
          LIMIT 1
        `,
        [fixtureId],
      );
      const templateId = template.rows[0]?.deliveryId;
      if (!templateId) {
        throw new Error('Expected the ingested fixture to contain a delivery.');
      }

      let position = 90;
      async function insertWith(column: string, value: number | null) {
        position += 1;
        // A copy of an ingested delivery at an unused position, so every other
        // constraint is satisfied and only the extras value is under test.
        return attempt(
          client,
          `
            INSERT INTO delivery (
              innings_id, over_number, position_in_over, innings_sequence, ball_number,
              striker_id, non_striker_id, bowler_id, runs_off_bat, runs_extras, runs_total,
              non_boundary, submission_id, ${column}
            )
            SELECT
              innings_id, over_number, $2::smallint, 10000 + $2::int, ball_number,
              striker_id, non_striker_id, bowler_id, runs_off_bat, runs_extras, runs_total,
              non_boundary, submission_id, $3::smallint
            FROM delivery
            WHERE delivery_id = $1::bigint
          `,
          [templateId, position, value],
        );
      }

      for (const column of EXTRAS_COLUMNS) {
        const rejected = await insertWith(column, -1);
        expect(rejected?.constraint, column).toBe(`delivery_${column}_nonnegative_ck`);

        for (const value of [null, 0, 3]) {
          expect(await insertWith(column, value), `${column} = ${String(value)}`).toBeNull();
        }
      }
    });
  }, 30_000);

  test('applies and reverts through its up and down sections', async () => {
    const { up, down } = await migrationSections();
    const schemaName = `issue_623_extras_${process.pid}`;

    await withRolledBackTransaction(async (client) => {
      await client.query(`CREATE SCHEMA ${schemaName}`);
      await client.query(`SET LOCAL search_path TO ${schemaName}`);
      await client.query(`
        CREATE TABLE delivery (
          delivery_id int PRIMARY KEY,
          extra_wides smallint,
          extra_noballs smallint,
          extra_byes smallint,
          extra_legbyes smallint,
          extra_penalty smallint
        )
      `);

      const insertNegative = (column: string, id: number) =>
        attempt(client, `INSERT INTO delivery (delivery_id, ${column}) VALUES ($1, -1)`, [id]);

      await client.query(up);
      for (const [index, column] of EXTRAS_COLUMNS.entries()) {
        expect((await insertNegative(column, index))?.constraint).toBe(
          `delivery_${column}_nonnegative_ck`,
        );
      }

      await client.query(down);
      for (const [index, column] of EXTRAS_COLUMNS.entries()) {
        expect(await insertNegative(column, index), column).toBeNull();
      }

      // Existing rows are validated when the checks are added.
      expect((await attempt(client, up))?.message).toMatch(/nonnegative_ck/);

      await client.query('DELETE FROM delivery');
      expect(await attempt(client, up)).toBeNull();
    });
  });
});
