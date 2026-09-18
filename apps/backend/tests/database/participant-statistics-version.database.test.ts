import { readFile } from 'node:fs/promises';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

/**
 * The participant statistics data version table (issue #592). Every test runs
 * inside a transaction that is rolled back.
 */

const MIGRATION = '20260917100000000_participant-statistics-versions.sql';

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

describe.sequential('participant statistics version schema', () => {
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

  async function insertPerson(client: PoolClient, role: string): Promise<string> {
    const result = await client.query<{ personId: string }>(
      `INSERT INTO person (source_ref, display_name)
       VALUES ($1, $1)
       RETURNING person_id::text AS "personId"`,
      [`participant-statistics-version-${process.pid}-${role}`],
    );
    return result.rows[0]!.personId;
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

  test('holds one positive version per participant and follows the person on delete', async () => {
    await withRolledBackTransaction(async (client) => {
      const participantId = await insertPerson(client, 'participant');

      await client.query(
        `INSERT INTO participant_statistics_version (participant_id) VALUES ($1::bigint)`,
        [participantId],
      );
      const inserted = await client.query<{ dataVersion: string }>(
        `SELECT data_version::text AS "dataVersion"
         FROM participant_statistics_version WHERE participant_id=$1::bigint`,
        [participantId],
      );
      expect(inserted.rows).toEqual([{ dataVersion: '1' }]);

      await client.query('SAVEPOINT duplicate_version');
      await expect(
        client.query(
          `INSERT INTO participant_statistics_version (participant_id) VALUES ($1::bigint)`,
          [participantId],
        ),
      ).rejects.toMatchObject({ constraint: 'participant_statistics_version_pkey' });
      await client.query('ROLLBACK TO SAVEPOINT duplicate_version');

      await client.query('SAVEPOINT zero_version');
      await expect(
        client.query(
          `UPDATE participant_statistics_version SET data_version=0 WHERE participant_id=$1::bigint`,
          [participantId],
        ),
      ).rejects.toMatchObject({
        constraint: 'participant_statistics_version_data_version_positive_ck',
      });
      await client.query('ROLLBACK TO SAVEPOINT zero_version');

      await client.query(`DELETE FROM person WHERE person_id=$1::bigint`, [participantId]);
      const remaining = await client.query(
        `SELECT 1 FROM participant_statistics_version WHERE participant_id=$1::bigint`,
        [participantId],
      );
      expect(remaining.rowCount).toBe(0);
    });
  });

  test('applies and reverts through its up and down sections', async () => {
    const { up, down } = await migrationSections();
    // Every event write now advances the live table, so dropping it here would
    // block and could deadlock parallel database tests. The sections run in a
    // scratch schema placed first on the search path instead; the reference to
    // person still resolves to the public table.
    const schema = `issue_592_migration_${process.pid}`;
    const tableExists = async (client: PoolClient) =>
      (
        await client.query<{ exists: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS exists`, [
          `${schema}.participant_statistics_version`,
        ])
      ).rows[0]!.exists;

    await withRolledBackTransaction(async (client) => {
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}, public`);
      // A stub person table in the scratch schema: a foreign key to the live
      // person table would lock it against inserts by parallel test files
      // until this transaction rolls back.
      await client.query(`CREATE TABLE person (person_id bigint PRIMARY KEY)`);
      expect(await tableExists(client)).toBe(false);
      await client.query(up);
      expect(await tableExists(client)).toBe(true);
      await client.query(down);
      expect(await tableExists(client)).toBe(false);
    });
  });
});
