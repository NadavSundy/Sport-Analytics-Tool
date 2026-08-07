import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

describe('PostgreSQL transaction behaviour', () => {
  let client: Client | undefined;

  function getClient(): Client {
    if (!client) {
      throw new Error('Test database client has not been initialised.');
    }

    return client;
  }

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
    if (client) {
      await client.end();
    }
  });

  test('rolls back changes made inside a transaction', async () => {
    const databaseClient = getClient();

    const originalResult = await databaseClient.query<{
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
    const temporaryNote = 'Temporary rollback test value.';

    await databaseClient.query('BEGIN');

    try {
      await databaseClient.query(
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [temporaryNote],
      );

      const insideTransaction = await databaseClient.query<{
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
      await databaseClient.query('ROLLBACK');
    }

    const afterRollback = await databaseClient.query<{
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

  test('commits changes made inside a transaction', async () => {
    const databaseClient = getClient();

    const originalResult = await databaseClient.query<{
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
    const committedNote = 'Temporary commit test value.';

    try {
      await databaseClient.query('BEGIN');

      await databaseClient.query(
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [committedNote],
      );

      await databaseClient.query('COMMIT');

      const afterCommit = await databaseClient.query<{
        note: string;
      }>(
        `
          SELECT note
          FROM database_health
          WHERE id = 1
        `,
      );

      expect(afterCommit.rows[0].note).toBe(committedNote);
    } finally {
      // Restore the original value so this test leaves no data behind.
      await databaseClient.query(
        `
          UPDATE database_health
          SET note = $1
          WHERE id = 1
        `,
        [originalNote],
      );
    }
  });
});