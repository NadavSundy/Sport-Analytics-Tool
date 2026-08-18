import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import { createAdminRepository } from '../../src/modules/admin/admin.repository';
import { createSubmitterAccessRepository } from '../../src/modules/submitter-access/submitter-access.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const sourcePrefix = `admin-management-test-${process.pid}`;

interface PersistedSubmitterAccess {
  role: string;
  approvalState: string;
  competitionIds: string[];
  submitterAccessUpdatedAt: Date | null;
  submitterAccessUpdatedBy: string | null;
}

describe.sequential('administrator user-management database integration', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }

    return pool;
  }

  async function loadPersistedAccess(accountId: string): Promise<PersistedSubmitterAccess> {
    const result = await executeQuery<PersistedSubmitterAccess>(
      databasePool(),
      `
        SELECT
          account.application_role AS role,
          account.submitter_approval_state AS "approvalState",
          COALESCE(
            array_agg(scope.competition_id::text ORDER BY scope.competition_id)
              FILTER (WHERE scope.competition_id IS NOT NULL),
            ARRAY[]::text[]
          ) AS "competitionIds",
          account.submitter_access_updated_at AS "submitterAccessUpdatedAt",
          account.submitter_access_updated_by::text AS "submitterAccessUpdatedBy"
        FROM app_user account
        LEFT JOIN submitter_competition_scope scope
          ON scope.app_user_id = account.app_user_id
        WHERE account.app_user_id = $1
        GROUP BY account.app_user_id
      `,
      [accountId],
    );

    return result.rows[0]!;
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

    const beforeInvalidScope = await loadPersistedAccess(contributorId);

    await expect(
      repository.updateSubmitterAccess(contributorId, administratorId, {
        approved: true,
        competitionIds: ['9223372036854775806'],
      }),
    ).rejects.toMatchObject({ competitionIds: ['9223372036854775806'] });

    await expect(loadPersistedAccess(contributorId)).resolves.toEqual(beforeInvalidScope);

    const revoked = await repository.updateSubmitterAccess(contributorId, administratorId, {
      approved: false,
      competitionIds: [],
    });
    expect(revoked).toMatchObject({
      role: 'viewer',
      approvalState: 'approved',
      competitionScopes: [],
      submitterAccessUpdatedBy: { id: administratorId },
    });

    const afterRevocation = await loadPersistedAccess(contributorId);
    await expect(
      repository.updateSubmitterAccess(contributorId, administratorId, {
        approved: false,
        competitionIds: [],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SUBMITTER_ACCESS_TRANSITION' });
    await expect(loadPersistedAccess(contributorId)).resolves.toEqual(afterRevocation);
  });

  test('rejects invalid approvals without changing persisted access', async () => {
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
          ('test', $1, 'Transition Administrator', 'admin', 'not_requested'),
          ('test', $2, 'No Request', 'viewer', 'not_requested'),
          ('test', $3, 'Rejected Request', 'viewer', 'rejected'),
          ('test', $4, 'Pending Request', 'viewer', 'pending')
        RETURNING app_user_id::text AS "accountId", auth_subject AS subject
      `,
      [
        `${sourcePrefix}-transition-admin`,
        `${sourcePrefix}-not-requested`,
        `${sourcePrefix}-rejected`,
        `${sourcePrefix}-pending`,
      ],
    );
    const accountId = (suffix: string) =>
      accounts.rows.find((row) => row.subject.endsWith(suffix))!.accountId;
    const competition = await executeQuery<{ competitionId: string }>(
      databasePool(),
      'INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text AS "competitionId"',
      [`${sourcePrefix}-Transition League`],
    );
    const competitionId = competition.rows[0]!.competitionId;
    const administratorId = accountId('-transition-admin');
    const repository = createAdminRepository(databasePool());

    for (const suffix of ['-not-requested', '-rejected']) {
      const targetId = accountId(suffix);
      const before = await loadPersistedAccess(targetId);

      await expect(
        repository.updateSubmitterAccess(targetId, administratorId, {
          approved: true,
          competitionIds: [competitionId],
        }),
      ).rejects.toMatchObject({ code: 'INVALID_SUBMITTER_ACCESS_TRANSITION' });

      await expect(loadPersistedAccess(targetId)).resolves.toEqual(before);
    }

    await expect(
      repository.updateSubmitterAccess(accountId('-pending'), administratorId, {
        approved: true,
        competitionIds: [competitionId],
      }),
    ).resolves.toMatchObject({
      role: 'submitter',
      approvalState: 'approved',
      competitionScopes: [{ competitionId }],
    });
  });

  test('rejects only a pending request, clears scopes, and permits a new request', async () => {
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
          ('test', $1, 'Rejection Administrator', 'admin', 'not_requested'),
          ('test', $2, 'Pending Rejection', 'viewer', 'pending'),
          ('test', $3, 'Existing Submitter', 'submitter', 'approved'),
          ('test', $4, 'No Revoke Viewer', 'viewer', 'not_requested')
        RETURNING app_user_id::text AS "accountId", auth_subject AS subject
      `,
      [
        `${sourcePrefix}-rejection-admin`,
        `${sourcePrefix}-pending-rejection`,
        `${sourcePrefix}-existing-submitter`,
        `${sourcePrefix}-no-revoke-viewer`,
      ],
    );
    const accountId = (suffix: string) =>
      accounts.rows.find((row) => row.subject.endsWith(suffix))!.accountId;
    const competition = await executeQuery<{ competitionId: string }>(
      databasePool(),
      'INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text AS "competitionId"',
      [`${sourcePrefix}-Rejection League`],
    );
    const competitionId = competition.rows[0]!.competitionId;
    const administratorId = accountId('-rejection-admin');
    const pendingId = accountId('-pending-rejection');
    const submitterId = accountId('-existing-submitter');
    const viewerId = accountId('-no-revoke-viewer');
    const repository = createAdminRepository(databasePool());

    await executeQuery(
      databasePool(),
      `
        INSERT INTO submitter_competition_scope (app_user_id, competition_id)
        VALUES ($1, $2), ($3, $2)
      `,
      [pendingId, competitionId, submitterId],
    );

    const rejected = await repository.rejectSubmitterAccessRequest(pendingId, administratorId);
    expect(rejected).toMatchObject({
      id: pendingId,
      role: 'viewer',
      approvalState: 'rejected',
      competitionScopes: [],
      submitterAccessUpdatedBy: { id: administratorId },
    });
    expect(rejected.submitterAccessUpdatedAt).not.toBeNull();

    const beforeInvalidRejection = await loadPersistedAccess(submitterId);
    await expect(
      repository.rejectSubmitterAccessRequest(submitterId, administratorId),
    ).rejects.toMatchObject({ code: 'INVALID_SUBMITTER_ACCESS_TRANSITION' });
    await expect(loadPersistedAccess(submitterId)).resolves.toEqual(beforeInvalidRejection);

    const beforeInvalidRevocation = await loadPersistedAccess(viewerId);
    await expect(
      repository.updateSubmitterAccess(viewerId, administratorId, {
        approved: false,
        competitionIds: [],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SUBMITTER_ACCESS_TRANSITION' });
    await expect(loadPersistedAccess(viewerId)).resolves.toEqual(beforeInvalidRevocation);

    const requestRepository = createSubmitterAccessRepository(databasePool());
    await expect(requestRepository.requestAccess(pendingId)).resolves.toEqual({
      accountId: pendingId,
      approvalState: 'pending',
    });
    await expect(loadPersistedAccess(pendingId)).resolves.toMatchObject({
      role: 'viewer',
      approvalState: 'pending',
      competitionIds: [],
    });
  });

  test('protects administrator and disabled targets without changing persisted access', async () => {
    const accounts = await executeQuery<{ accountId: string; subject: string }>(
      databasePool(),
      `
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          display_name,
          application_role,
          submitter_approval_state,
          disabled_at
        )
        VALUES
          ('test', $1, 'Protection Administrator', 'admin', 'not_requested', NULL),
          ('test', $2, 'Other Administrator', 'admin', 'pending', NULL),
          ('test', $3, 'Disabled Request', 'viewer', 'pending', now())
        RETURNING app_user_id::text AS "accountId", auth_subject AS subject
      `,
      [
        `${sourcePrefix}-protection-admin`,
        `${sourcePrefix}-other-admin`,
        `${sourcePrefix}-disabled-request`,
      ],
    );
    const accountId = (suffix: string) =>
      accounts.rows.find((row) => row.subject.endsWith(suffix))!.accountId;
    const administratorId = accountId('-protection-admin');
    const repository = createAdminRepository(databasePool());

    for (const [suffix, code] of [
      ['-other-admin', 'ADMIN_ACCOUNT_NOT_MANAGEABLE'],
      ['-disabled-request', 'DISABLED_ACCOUNT_NOT_MANAGEABLE'],
    ] as const) {
      const targetId = accountId(suffix);
      const before = await loadPersistedAccess(targetId);

      await expect(
        repository.rejectSubmitterAccessRequest(targetId, administratorId),
      ).rejects.toMatchObject({ code });
      await expect(loadPersistedAccess(targetId)).resolves.toEqual(before);
    }
  });
});
