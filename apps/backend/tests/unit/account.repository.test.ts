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
