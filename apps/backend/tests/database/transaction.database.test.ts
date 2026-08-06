import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

describe('PostgreSQL transaction behaviour', () => {
  let client: Client;

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );

    client = new Client({
      connectionString: databaseUrl.toString(),
    });

    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  test('rolls back changes made inside a transaction', async () => {
    const originalResult = await client.query<{
      note: string;
    }>(
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(originalResult.rowCount).toBe(1);

    const originalNote = originalResult.rows[0].note;
    const temporaryNote = 'Temporary transaction test value.';

    await client.query('BEGIN');

    try {
      await client.query(
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [temporaryNote],
      );

      const insideTransaction = await client.query<{
        note: string;
      }>(
        `
          SELECT note
          FROM database_health
          WHERE id = 1
        `,
      );

      expect(insideTransaction.rows[0].note).toBe(temporaryNote);
    } finally {
      await client.query('ROLLBACK');
    }

    const afterRollback = await client.query<{
      note: string;
    }>(
      `
        SELECT note
        FROM database_health
        WHERE id = 1
      `,
    );

    expect(afterRollback.rows[0].note).toBe(originalNote);
  });
});
