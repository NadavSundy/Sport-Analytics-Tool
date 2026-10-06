import { describe, expect, test, vi } from 'vitest';

import type { Pool, PoolClient } from 'pg';

import {
  AdminManagementConflictError,
  AdminUserNotFoundError,
  InvalidCompetitionScopesError,
} from '../../src/modules/admin/admin.errors';
import { createAdminRepository } from '../../src/modules/admin/admin.repository';

const queryResult = <Row>(rows: Row[], rowCount = rows.length) => ({
  rows,
  rowCount,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

const userRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: '7',
  authSubject: 'auth-subject-7',
  displayName: 'Nadia',
  role: 'viewer',
  approvalState: 'pending',
  requestedCompetitionId: '2',
  requestedCompetitionName: 'Premier League',
  competitionIds: [],
  competitionNames: [],
  disabledAt: null,
  updatedAt: new Date('2026-09-01T10:00:00.000Z'),
  submitterAccessUpdatedAt: null,
  submitterAccessUpdatedById: null,
  submitterAccessUpdatedByDisplayName: null,
  previouslyRevoked: false,
  ...overrides,
});

function transactionalPool(query: ReturnType<typeof vi.fn>) {
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  return {
    pool: { connect: vi.fn().mockResolvedValue(client), query } as unknown as Pool,
    release,
  };
}

describe('admin repository', () => {
  test('lists mapped active users and deterministic competition scopes', async () => {
    const query = vi.fn(async (sqlValue: unknown) => {
      const sql = String(sqlValue);
      if (sql.includes('FROM competition') && !sql.includes('LEFT JOIN competition')) {
        return queryResult([{ competitionId: '2', name: 'Premier League' }]);
      }
      return queryResult([
        userRow({
          role: 'submitter',
          approvalState: 'approved',
          requestedCompetitionId: null,
          requestedCompetitionName: null,
          competitionIds: ['2'],
          competitionNames: ['Premier League'],
          submitterAccessUpdatedAt: new Date('2026-09-01T11:00:00.000Z'),
          submitterAccessUpdatedById: '3',
          submitterAccessUpdatedByDisplayName: 'Administrator',
          previouslyRevoked: true,
        }),
      ]);
    });

    const data = await createAdminRepository({ query } as unknown as Pool).listUserManagementData();
    expect(data).toEqual({
      users: [
        expect.objectContaining({
          id: '7',
          authSubject: 'auth-subject-7',
          role: 'submitter',
          requestedCompetition: null,
          competitionScopes: [{ competitionId: '2', name: 'Premier League' }],
          disabled: false,
          updatedAt: '2026-09-01T10:00:00.000Z',
          submitterAccessUpdatedAt: '2026-09-01T11:00:00.000Z',
          submitterAccessUpdatedBy: { id: '3', displayName: 'Administrator' },
          previouslyRevoked: true,
        }),
      ],
      availableScopes: [{ competitionId: '2', name: 'Premier League' }],
    });
    expect(query.mock.calls.some((call) => String(call[0]).includes("WHEN 'pending' THEN 0"))).toBe(
      true,
    );
  });

  test('approves exactly the requested competition and persists role, history, and scope atomically', async () => {
    const approvedUser = userRow({
      role: 'submitter',
      approvalState: 'approved',
      requestedCompetitionId: null,
      requestedCompetitionName: null,
      competitionIds: ['2'],
      competitionNames: ['Premier League'],
      submitterAccessUpdatedAt: new Date('2026-09-01T11:00:00.000Z'),
      submitterAccessUpdatedById: '3',
      submitterAccessUpdatedByDisplayName: 'Administrator',
    });
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(
        queryResult([
          {
            role: 'viewer',
            approvalState: 'pending',
            requestedCompetitionId: '2',
            requestedCompetitionAlreadyGranted: false,
            disabledAt: null,
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([{ competitionId: '2' }]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([approvedUser]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool, release } = transactionalPool(query);

    const result = await createAdminRepository(pool).updateSubmitterAccess('7', '3', {
      approved: true,
      competitionIds: ['2', '2'],
    });

    expect(result).toMatchObject({
      role: 'submitter',
      competitionScopes: [{ competitionId: '2' }],
    });
    expect(query.mock.calls[2]?.[1]).toEqual([['2']]);
    expect(query.mock.calls[3]?.[1]).toEqual(['7', 'submitter', 'approved', '3']);
    expect(query.mock.calls[4]?.[1]).toEqual(['7', 'approved', '2', '3']);
    expect(query.mock.calls[6]?.[1]).toEqual(['7', ['2']]);
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  test('rejects invalid approval scopes and rolls back without changing the account', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(
        queryResult([
          {
            role: 'viewer',
            approvalState: 'pending',
            requestedCompetitionId: '2',
            requestedCompetitionAlreadyGranted: false,
            disabledAt: null,
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    await expect(
      createAdminRepository(pool).updateSubmitterAccess('7', '3', {
        approved: true,
        competitionIds: ['9'],
      }),
    ).rejects.toBeInstanceOf(AdminManagementConflictError);
    expect(query.mock.calls.some((call) => String(call[0]).includes('UPDATE app_user'))).toBe(
      false,
    );
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('ROLLBACK');
  });

  test('rejects unknown competition identifiers after validating the requested scope', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(
        queryResult([
          {
            role: 'submitter',
            approvalState: 'approved',
            requestedCompetitionId: null,
            requestedCompetitionAlreadyGranted: false,
            disabledAt: null,
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([{ competitionId: '2' }]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    await expect(
      createAdminRepository(pool).updateSubmitterAccess('7', '3', {
        approved: true,
        competitionIds: ['2', '404'],
      }),
    ).rejects.toBeInstanceOf(InvalidCompetitionScopesError);
  });

  test('rejects a pending request and preserves the absence of competition grants', async () => {
    const rejectedUser = userRow({
      approvalState: 'rejected',
      requestedCompetitionId: null,
      requestedCompetitionName: null,
    });
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(
        queryResult([
          {
            role: 'viewer',
            approvalState: 'pending',
            requestedCompetitionId: '2',
            requestedCompetitionAlreadyGranted: false,
            disabledAt: null,
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([rejectedUser]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    await expect(
      createAdminRepository(pool).rejectSubmitterAccessRequest('7', '3'),
    ).resolves.toMatchObject({
      approvalState: 'rejected',
    });
    expect(query.mock.calls[2]?.[1]).toEqual(['7', 'viewer', 'rejected', '3']);
    expect(query.mock.calls[3]?.[1]).toEqual(['7', 'rejected', '2', '3']);
    expect(query.mock.calls.some((call) => String(call[0]).includes('unnest($2::bigint[])'))).toBe(
      false,
    );
  });

  test('promotes an active non-admin account and rejects missing accounts', async () => {
    const adminUser = userRow({
      role: 'admin',
      approvalState: 'approved',
      requestedCompetitionId: null,
      requestedCompetitionName: null,
    });
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(
        queryResult([
          {
            role: 'viewer',
            approvalState: 'not_requested',
            requestedCompetitionId: null,
            requestedCompetitionAlreadyGranted: false,
            disabledAt: null,
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([adminUser]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    await expect(
      createAdminRepository(pool).updateRole('7', '3', { role: 'admin' }),
    ).resolves.toMatchObject({ role: 'admin' });
    expect(query.mock.calls[2]?.[1]).toEqual(['7', '3']);

    const missingQuery = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]));
    const missing = transactionalPool(missingQuery);
    await expect(
      createAdminRepository(missing.pool).updateRole('404', '3', { role: 'admin' }),
    ).rejects.toBeInstanceOf(AdminUserNotFoundError);
  });

  test('fails fast on corrupt mapped role and scope data', async () => {
    for (const row of [
      userRow({ role: 'owner' }),
      userRow({ approvalState: 'awaiting' }),
      userRow({ competitionIds: ['2'], competitionNames: [] }),
      userRow({ requestedCompetitionId: '2', requestedCompetitionName: null }),
    ]) {
      const query = vi.fn(async (sqlValue: unknown) =>
        String(sqlValue).includes('FROM competition') && !String(sqlValue).includes('LEFT JOIN')
          ? queryResult([])
          : queryResult([row]),
      );
      await expect(
        createAdminRepository({ query } as unknown as Pool).listUserManagementData(),
      ).rejects.toThrow();
    }
  });
});
