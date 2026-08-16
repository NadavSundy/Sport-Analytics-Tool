import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import { createAdminRepository } from '../../src/modules/admin/admin.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const sourcePrefix = `admin-management-test-${process.pid}`;

describe.sequential('administrator user-management database integration', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
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

    pool = new Pool({ connectionString: databaseUrl.toString() });
  });

  afterAll(async () => {
    if (pool) {
      await executeQuery(
        pool,
        `
          DELETE FROM app_user
          WHERE auth_provider = 'test'
            AND auth_subject LIKE $1
        `,
        [`${sourcePrefix}%`],
      );
      await executeQuery(pool, 'DELETE FROM competition WHERE name LIKE $1', [`${sourcePrefix}%`]);
      await pool.end();
    }
  });

  test('atomically approves, re-scopes, and revokes a submitter with an administrator audit', async () => {
    const accounts = await executeQuery<{ accountId: string; subject: string }>(
      databasePool(),
      `
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          display_name,
          application_role,
          submitter_approval_state
        )
        VALUES
          ('test', $1, 'Database Administrator', 'admin', 'not_requested'),
          ('test', $2, 'Database Contributor', 'viewer', 'pending')
        RETURNING
          app_user_id::text AS "accountId",
          auth_subject AS subject
      `,
      [`${sourcePrefix}-admin`, `${sourcePrefix}-contributor`],
    );
    const administratorId = accounts.rows.find((row) => row.subject.endsWith('-admin'))!.accountId;
    const contributorId = accounts.rows.find((row) =>
      row.subject.endsWith('-contributor'),
    )!.accountId;
    const competitions = await executeQuery<{ competitionId: string; name: string }>(
      databasePool(),
      `
        INSERT INTO competition (name)
        VALUES ($1), ($2)
        RETURNING competition_id::text AS "competitionId", name
      `,
      [`${sourcePrefix}-Premier T20`, `${sourcePrefix}-University League`],
    );
    const premierScope = competitions.rows.find((row) => row.name.endsWith('Premier T20'))!;
    const universityScope = competitions.rows.find((row) =>
      row.name.endsWith('University League'),
    )!;
    const repository = createAdminRepository(databasePool());

    const listed = await repository.listUserManagementData();
    expect(listed.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: contributorId,
          role: 'viewer',
          approvalState: 'pending',
        }),
      ]),
    );
    expect(listed.availableScopes).toEqual(
      expect.arrayContaining([
        { competitionId: premierScope.competitionId, name: premierScope.name },
        { competitionId: universityScope.competitionId, name: universityScope.name },
      ]),
    );

    const approved = await repository.updateSubmitterAccess(contributorId, administratorId, {
      approved: true,
      competitionIds: [premierScope.competitionId, universityScope.competitionId],
    });
    expect(approved).toMatchObject({
      id: contributorId,
      role: 'submitter',
      approvalState: 'approved',
      submitterAccessUpdatedBy: {
        id: administratorId,
        displayName: 'Database Administrator',
      },
    });
    expect(approved.submitterAccessUpdatedAt).not.toBeNull();
    expect(approved.competitionScopes.map((scope) => scope.competitionId)).toEqual(
      expect.arrayContaining([premierScope.competitionId, universityScope.competitionId]),
    );

    const reScoped = await repository.updateSubmitterAccess(contributorId, administratorId, {
      approved: true,
      competitionIds: [universityScope.competitionId],
    });
    expect(reScoped.competitionScopes).toEqual([
      { competitionId: universityScope.competitionId, name: universityScope.name },
    ]);

    await expect(
      repository.updateSubmitterAccess(contributorId, administratorId, {
        approved: true,
        competitionIds: ['9223372036854775806'],
      }),
    ).rejects.toMatchObject({ competitionIds: ['9223372036854775806'] });

    const afterInvalidScope = await repository.listUserManagementData();
    expect(
      afterInvalidScope.users.find((user) => user.id === contributorId)?.competitionScopes,
    ).toEqual([{ competitionId: universityScope.competitionId, name: universityScope.name }]);

    const revoked = await repository.updateSubmitterAccess(contributorId, administratorId, {
      approved: false,
      competitionIds: [],
    });
    expect(revoked).toMatchObject({
      role: 'viewer',
      approvalState: 'rejected',
      competitionScopes: [],
      submitterAccessUpdatedBy: { id: administratorId },
    });
  });
});
