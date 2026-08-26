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

  async function insertCompetition(client: PoolClient, suffix: string): Promise<string> {
    const result = await executeQuery<{ competitionId: string }>(
      client,
      `
        INSERT INTO competition (name)
        VALUES ($1)
        RETURNING competition_id::text AS "competitionId"
      `,
      [`${sourcePrefix}-${suffix}`],
    );

    return result.rows[0].competitionId;
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
      const competitionId = await insertCompetition(client, 'new-request-competition');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId, competitionId)).resolves.toEqual({
        accountId,
        approvalState: 'pending',
        requestedCompetition: {
          competitionId,
          name: `${sourcePrefix}-new-request-competition`,
        },
      });

      const persisted = await executeQuery<{
        approvalState: string;
        requestedCompetitionId: string | null;
      }>(
        client,
        `
          SELECT
            submitter_approval_state AS "approvalState",
            submitter_requested_competition_id::text AS "requestedCompetitionId"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(persisted.rows[0].approvalState).toBe('pending');
      expect(persisted.rows[0].requestedCompetitionId).toBe(competitionId);

      await expect(repository.requestAccess(accountId, competitionId)).rejects.toMatchObject({
        code: 'REQUEST_ALREADY_PENDING',
      });
    });
  });

  test('allows a previously rejected account to request access again', async () => {
    await withRolledBackTransaction(async (client) => {
      const accountId = await insertAccount(client, 'rejected-request', 'rejected');
      const competitionId = await insertCompetition(client, 'rejected-request-competition');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId, competitionId)).resolves.toEqual({
        accountId,
        approvalState: 'pending',
        requestedCompetition: {
          competitionId,
          name: `${sourcePrefix}-rejected-request-competition`,
        },
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
      const competitionId = await insertCompetition(client, 'approved-request-competition');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId, competitionId)).rejects.toMatchObject({
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

  test('does not create a pending request for a nonexistent competition', async () => {
    await withRolledBackTransaction(async (client) => {
      const accountId = await insertAccount(client, 'missing-competition', 'not_requested');
      const repository = createSubmitterAccessRepository(client);

      await expect(repository.requestAccess(accountId, '9223372036854775806')).rejects.toThrow(
        'The requested competition does not exist.',
      );

      const persisted = await executeQuery<{
        approvalState: string;
        requestedCompetitionId: string | null;
      }>(
        client,
        `
          SELECT
            submitter_approval_state AS "approvalState",
            submitter_requested_competition_id::text AS "requestedCompetitionId"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      expect(persisted.rows[0]).toEqual({
        approvalState: 'not_requested',
        requestedCompetitionId: null,
      });
    });
  });
});
