import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery, withTransaction } from '../../src/database';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

describe('database transaction helper', () => {
  let pool: Pool | undefined;

  function getPool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }

    return pool;
  }

  beforeAll(() => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );

    pool = new Pool({
      connectionString: databaseUrl.toString(),
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  test('commits a successful multi-step transaction', async () => {
    const databasePool = getPool();

    const originalResult = await executeQuery<{ note: string }>(
      databasePool,
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(originalResult.rowCount).toBe(1);

    const originalNote = originalResult.rows[0].note;
    const committedNote = 'Temporary transaction commit test value.';

    try {
      const transactionResult = await withTransaction(databasePool, async (client) => {
        await executeQuery(
          client,
          `
            UPDATE database_health
            SET note = $1
            WHERE id = 1
          `,
          [committedNote],
        );

        const insideTransaction = await executeQuery<{ note: string }>(
          client,
          `
            SELECT note
            FROM database_health
            WHERE id = 1
          `,
        );

        return insideTransaction.rows[0].note;
      });

      expect(transactionResult).toBe(committedNote);

      const afterCommit = await executeQuery<{ note: string }>(
        databasePool,
        `
          SELECT note
          FROM database_health
          WHERE id = 1
        `,
      );

      expect(afterCommit.rows[0].note).toBe(committedNote);
    } finally {
      await executeQuery(
        databasePool,
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [originalNote],
      );
    }
  });

  test('rolls back all changes when an operation fails', async () => {
    const databasePool = getPool();

    const originalResult = await executeQuery<{ note: string }>(
      databasePool,
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(originalResult.rowCount).toBe(1);

    const originalNote = originalResult.rows[0].note;
    const temporaryNote = 'Temporary transaction rollback test value.';

    await expect(
      withTransaction(databasePool, async (client) => {
        await executeQuery(
          client,
          `
            UPDATE database_health
            SET note = $1
            WHERE id = 1
          `,
          [temporaryNote],
        );

        const insideTransaction = await executeQuery<{ note: string }>(
          client,
          `
            SELECT note
            FROM database_health
            WHERE id = 1
          `,
        );

        expect(insideTransaction.rows[0].note).toBe(temporaryNote);

        throw new Error('Force transaction rollback.');
      }),
    ).rejects.toThrow('Force transaction rollback.');

    const afterRollback = await executeQuery<{ note: string }>(
      databasePool,
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(afterRollback.rows[0].note).toBe(originalNote);
  });
});
