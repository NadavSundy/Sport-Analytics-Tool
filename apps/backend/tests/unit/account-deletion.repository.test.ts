import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { createAccountDeletionRepository } from '../../src/modules/account-deletion/account-deletion.repository';

function executorWithRows(...rows: Array<Array<Record<string, unknown>>>): QueryExecutor {
  const query = vi.fn();

  for (const resultRows of rows) {
    query.mockResolvedValueOnce({
      rows: resultRows,
      rowCount: resultRows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });
  }

  return { query } as unknown as QueryExecutor;
}

describe('account deletion repository', () => {
  test('prepares deletion by disabling permissions and removing scopes atomically', async () => {
    const executor = executorWithRows([{ authSubject: 'supabase-user-42', state: 'auth_pending' }]);
    const repository = createAccountDeletionRepository(executor);

    await expect(repository.prepare('42')).resolves.toEqual({
      authSubject: 'supabase-user-42',
      state: 'auth_pending',
    });

    const [sql, values] = vi.mocked(executor.query).mock.calls[0] ?? [];
    expect(sql).toContain('disabled_at = COALESCE(disabled_at, now())');
    expect(sql).toContain("application_role = 'viewer'");
    expect(sql).toContain("submitter_approval_state = 'not_requested'");
    expect(sql).toContain('DELETE FROM submitter_competition_scope');
    expect(sql).not.toMatch(/DELETE FROM\s+(submission|delivery|fixture)/i);
    expect(values).toEqual(['42']);
  });

  test('finalizes personal fields with a tombstone and never deletes cricket data', async () => {
    const executor = executorWithRows([{ state: 'deleted' }]);
    const repository = createAccountDeletionRepository(executor);

    await repository.finalize('42', 'deleted:tombstone', 'a'.repeat(64));

    const [sql, values] = vi.mocked(executor.query).mock.calls[0] ?? [];
    expect(sql).toContain('auth_subject = $2');
    expect(sql).toContain('display_name = NULL');
    expect(sql).toContain("deletion_state = 'deleted'");
    expect(sql).toContain('deleted_auth_subject_hash = $3');
    expect(sql).toContain('DELETE FROM submitter_competition_scope');
    expect(sql).not.toMatch(/DELETE FROM\s+(app_user|submission|delivery|fixture)/i);
    expect(values).toEqual(['42', 'deleted:tombstone', 'a'.repeat(64)]);
  });

  test('rejects an unsupported persisted deletion state', async () => {
    const executor = executorWithRows([{ authSubject: 'user', state: 'unknown' }]);
    const repository = createAccountDeletionRepository(executor);

    await expect(repository.prepare('42')).rejects.toThrow('unsupported deletion state');
  });
});
