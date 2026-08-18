import { describe, expect, test, vi } from 'vitest';
import type { QueryExecutor } from '../../src/database';
import { synchronizeApplicationAccount } from '../../src/modules/accounts/account.repository';
import { hashAuthenticationSubject } from '../../src/modules/accounts/account-subject';

function createExecutor(row: Record<string, unknown>): QueryExecutor {
  return {
    query: vi.fn().mockResolvedValue({
      rows: [{ deletionState: 'active', ...row }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    }),
  } as unknown as QueryExecutor;
}

describe('application account repository', () => {
  test('upserts a verified identity and maps server-owned authorization state', async () => {
    const executor = createExecutor({
      accountId: '42',
      subject: 'supabase-user-42',
      displayName: 'Verified Name',
      role: 'submitter',
      approvalState: 'approved',
      competitionIds: ['7', '9'],
      disabledAt: null,
    });

    const account = await synchronizeApplicationAccount(
      {
        uid: 'supabase-user-42',
        displayName: 'Verified Name',
      },
      executor,
    );

    expect(executor.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (auth_provider, auth_subject) DO UPDATE'),
      [
        'supabase',
        'supabase-user-42',
        'Verified Name',
        hashAuthenticationSubject('supabase-user-42'),
      ],
    );
    expect(account).toEqual({
      accountId: '42',
      subject: 'supabase-user-42',
      displayName: 'Verified Name',
      role: 'submitter',
      approvalState: 'approved',
      competitionIds: ['7', '9'],
      disabled: false,
      deletionState: 'active',
    });
  });
  test.each(['not_requested', 'pending', 'approved', 'rejected'] as const)(
    'does not overwrite persisted %s approval state during re-authentication',
    async (approvalState) => {
      const query = vi.fn().mockResolvedValue({
        rows: [
          {
            accountId: '42',
            subject: 'supabase-user-42',
            displayName: 'Refreshed Name',
            role: 'viewer',
            approvalState,
            competitionIds: [],
            disabledAt: null,
            deletionState: 'active',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const executor = { query } as unknown as QueryExecutor;

      const account = await synchronizeApplicationAccount(
        {
          uid: 'supabase-user-42',
          displayName: 'Refreshed Name',
        },
        executor,
      );

      expect(query).toHaveBeenCalledTimes(1);

      const sql = query.mock.calls[0]?.[0];

      expect(typeof sql).toBe('string');

      if (typeof sql !== 'string') {
        throw new Error('Expected account synchronization to execute SQL.');
      }

      const conflictUpdate = sql.match(
        /ON CONFLICT[\s\S]*?DO UPDATE\s+SET([\s\S]*?)RETURNING/,
      )?.[1];

      expect(conflictUpdate).toBeDefined();
      expect(conflictUpdate).toContain("app_user.deletion_state = 'active'");
      expect(conflictUpdate).toContain('THEN COALESCE(EXCLUDED.display_name');
      expect(conflictUpdate).toContain('THEN now()');

      expect(conflictUpdate).not.toContain('submitter_approval_state');
      expect(conflictUpdate).not.toContain('application_role');

      expect(account.approvalState).toBe(approvalState);
    },
  );

  test('ignores user-controlled role metadata and explicitly creates viewers', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          accountId: '42',
          subject: 'supabase-user-42',
          displayName: 'Verified Name',
          role: 'viewer',
          approvalState: 'not_requested',
          deletionState: 'active',
          competitionIds: [],
          disabledAt: null,
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });
    const executor = { query } as unknown as QueryExecutor;
    const identityWithUntrustedMetadata = {
      uid: 'supabase-user-42',
      displayName: 'Verified Name',
      applicationRole: 'admin',
    };

    const account = await synchronizeApplicationAccount(identityWithUntrustedMetadata, executor);
    const sql = query.mock.calls[0]?.[0];

    expect(sql).toEqual(expect.any(String));

    if (typeof sql !== 'string') {
      throw new Error('Expected account synchronization to execute SQL.');
    }

    expect(sql).toMatch(
      /INSERT INTO app_user\s*\([\s\S]*application_role[\s\S]*\)\s*SELECT \$1, \$2, \$3, 'viewer', now\(\)/,
    );
    expect(sql.match(/ON CONFLICT[\s\S]*?DO UPDATE\s+SET([\s\S]*?)RETURNING/)?.[1]).not.toContain(
      'application_role',
    );
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      'supabase',
      'supabase-user-42',
      'Verified Name',
      hashAuthenticationSubject('supabase-user-42'),
    ]);
    expect(account.role).toBe('viewer');
  });

  test('preserves a persisted admin role during re-authentication', async () => {
    const executor = createExecutor({
      accountId: '42',
      subject: 'supabase-admin-42',
      displayName: 'Admin User',
      role: 'admin',
      approvalState: 'not_requested',
      competitionIds: [],
      disabledAt: null,
    });

    const account = await synchronizeApplicationAccount(
      {
        uid: 'supabase-admin-42',
        displayName: 'Refreshed Admin Name',
      },
      executor,
    );

    expect(account.role).toBe('admin');
  });

  test('fails closed when persisted authorization state is unsupported', async () => {
    const executor = createExecutor({
      accountId: '42',
      subject: 'supabase-user-42',
      displayName: null,
      role: 'owner',
      approvalState: 'approved',
      competitionIds: [],
      disabledAt: null,
    });

    await expect(
      synchronizeApplicationAccount(
        {
          uid: 'supabase-user-42',
          displayName: null,
        },
        executor,
      ),
    ).rejects.toThrow('unsupported role');
  });

  test('resolves a deleted-subject hash before attempting to insert a replacement account', async () => {
    const executor = createExecutor({
      accountId: '42',
      subject: 'deleted:tombstone',
      displayName: null,
      role: 'viewer',
      approvalState: 'not_requested',
      competitionIds: [],
      disabledAt: new Date('2026-08-16T12:00:00.000Z'),
      deletionState: 'deleted',
    });

    const account = await synchronizeApplicationAccount(
      { uid: 'former-supabase-user', displayName: 'Must not return' },
      executor,
    );

    const sql = vi.mocked(executor.query).mock.calls[0]?.[0];
    expect(sql).toContain('deleted_auth_subject_hash = $4');
    expect(sql).toContain('WHERE NOT EXISTS (SELECT 1 FROM deleted_account)');
    expect(account).toMatchObject({
      subject: 'deleted:tombstone',
      displayName: null,
      disabled: true,
      deletionState: 'deleted',
    });
  });
});
