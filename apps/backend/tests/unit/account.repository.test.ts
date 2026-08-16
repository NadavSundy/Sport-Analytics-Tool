import { describe, expect, test, vi } from 'vitest';
import type { QueryExecutor } from '../../src/database';
import { synchronizeApplicationAccount } from '../../src/modules/accounts/account.repository';

function createExecutor(row: Record<string, unknown>): QueryExecutor {
  return {
    query: vi.fn().mockResolvedValue({
      rows: [row],
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
      role: 'viewer',
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
      ['supabase', 'supabase-user-42', 'Verified Name'],
    );
    expect(account).toEqual({
      accountId: '42',
      subject: 'supabase-user-42',
      displayName: 'Verified Name',
      role: 'viewer',
      approvalState: 'approved',
      competitionIds: ['7', '9'],
      disabled: false,
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
      expect(conflictUpdate).toContain('display_name = COALESCE');
      expect(conflictUpdate).toContain('last_authenticated_at = now()');

      expect(conflictUpdate).not.toContain('submitter_approval_state');
      expect(conflictUpdate).not.toContain('application_role');

      expect(account.approvalState).toBe(approvalState);
    },
  );

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
});
