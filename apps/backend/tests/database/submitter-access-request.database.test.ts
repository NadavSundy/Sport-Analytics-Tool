import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import { createSubmitterAccessRepository } from '../../src/modules/submitter-access/submitter-access.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const sourcePrefix = `submitter-access-test-${process.pid}`;

describe.sequential('submitter access request database integration', () => {
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

  async function insertAccount(
    client: PoolClient,
    suffix: string,
    approvalState: 'not_requested' | 'pending' | 'approved' | 'rejected',
  ): Promise<string> {
    const result = await executeQuery<{ accountId: string }>(
      client,
      `
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          submitter_approval_state
        )
        VALUES ('test', $1, $2)
        RETURNING app_user_id::text AS "accountId"
      `,
      [`${sourcePrefix}-${suffix}`, approvalState],
    );

    return result.rows[0].accountId;
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

  test('persists a pending request and prevents a second active request', async () => {
    await withRolledBackTransaction(async (client) => {
      const accountId = await insertAccount(client, 'new-request', 'not_requested');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId)).resolves.toEqual({
        accountId,
        approvalState: 'pending',
      });

      const persisted = await executeQuery<{ approvalState: string }>(
        client,
        `
          SELECT submitter_approval_state AS "approvalState"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(persisted.rows[0].approvalState).toBe('pending');

      await expect(repository.requestAccess(accountId)).rejects.toMatchObject({
        code: 'REQUEST_ALREADY_PENDING',
      });
    });
  });

  test('allows a previously rejected account to request access again', async () => {
    await withRolledBackTransaction(async (client) => {
      const accountId = await insertAccount(client, 'rejected-request', 'rejected');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId)).resolves.toEqual({
        accountId,
        approvalState: 'pending',
      });

      const persisted = await executeQuery<{ approvalState: string }>(
        client,
        `
          SELECT submitter_approval_state AS "approvalState"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(persisted.rows[0].approvalState).toBe('pending');
    });
  });

  test('does not change an already-approved submitter', async () => {
    await withRolledBackTransaction(async (client) => {
      const accountId = await insertAccount(client, 'approved-request', 'approved');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId)).rejects.toMatchObject({
        code: 'SUBMITTER_ALREADY_APPROVED',
      });

      const persisted = await executeQuery<{ approvalState: string }>(
        client,
        `
          SELECT submitter_approval_state AS "approvalState"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(persisted.rows[0].approvalState).toBe('approved');
    });
  });
});
