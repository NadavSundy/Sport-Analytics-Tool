import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { DeleteAuthUser, VerifiedIdentity } from '../../src/auth/supabase-auth';
import type { AccountDeletionRepository } from '../../src/modules/account-deletion/account-deletion.repository';
import { createAccountDeletionService } from '../../src/modules/account-deletion/account-deletion.service';
import type { ApplicationAccount } from '../../src/modules/accounts/account';
import { hashAuthenticationSubject } from '../../src/modules/accounts/account-subject';

const now = new Date('2026-08-16T12:00:00.000Z');
const account: ApplicationAccount = {
  accountId: '42',
  subject: 'supabase-user-42',
  displayName: 'Personal Name',
  role: 'administrator',
  approvalState: 'approved',
  competitionIds: ['7'],
  disabled: false,
  deletionState: 'active',
};
const recentIdentity: VerifiedIdentity = {
  uid: 'supabase-user-42',
  displayName: 'Personal Name',
  lastSignInAt: new Date('2026-08-16T11:55:00.000Z'),
};

function repository(
  state:
    'auth_pending' | 'finalization_pending' | 'finalization_failed' | 'deleted' = 'auth_pending',
): AccountDeletionRepository {
  return {
    prepare: vi.fn().mockResolvedValue({ authSubject: 'supabase-user-42', state }),
    markAuthDeletionFailed: vi.fn().mockResolvedValue(undefined),
    markAuthDeleted: vi.fn().mockResolvedValue(undefined),
    markFinalizationFailed: vi.fn().mockResolvedValue(undefined),
    finalize: vi.fn().mockResolvedValue(undefined),
  };
}

describe('account deletion service', () => {
  let deleteAuthUser: ReturnType<typeof vi.fn<DeleteAuthUser>>;

  beforeEach(() => {
    deleteAuthUser = vi.fn<DeleteAuthUser>().mockResolvedValue('deleted');
  });

  test('disables locally before deleting Auth and then finalizes the tombstone', async () => {
    let localAccountDisabled = false;
    const repo = repository();
    vi.mocked(repo.prepare).mockImplementation(async () => {
      localAccountDisabled = true;
      return { authSubject: 'supabase-user-42', state: 'auth_pending' };
    });
    deleteAuthUser.mockImplementation(async () => {
      expect(localAccountDisabled).toBe(true);
      return 'deleted';
    });
    const service = createAccountDeletionService(
      deleteAuthUser,
      repo,
      () => now,
      () => 'deleted:fixed-tombstone',
    );

    await expect(service.deleteAccount(account, recentIdentity)).resolves.toEqual({
      data: { status: 'deleted', retainedCricketData: true },
    });

    expect(repo.markAuthDeleted).toHaveBeenCalledWith('42');
    expect(repo.finalize).toHaveBeenCalledWith(
      '42',
      'deleted:fixed-tombstone',
      hashAuthenticationSubject('supabase-user-42'),
    );
  });

  test('requires a recent sign-in before changing local or external state', async () => {
    const repo = repository();
    const service = createAccountDeletionService(deleteAuthUser, repo, () => now);

    await expect(
      service.deleteAccount(account, {
        ...recentIdentity,
        lastSignInAt: new Date('2026-08-16T11:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ name: 'RecentAuthenticationRequiredError' });
    expect(repo.prepare).not.toHaveBeenCalled();
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  test('rejects an identity that does not own the authenticated account', async () => {
    const repo = repository();
    const service = createAccountDeletionService(deleteAuthUser, repo, () => now);

    await expect(
      service.deleteAccount(account, { ...recentIdentity, uid: 'another-user' }),
    ).rejects.toThrow('does not own');
    expect(repo.prepare).not.toHaveBeenCalled();
  });

  test('does not call Supabase when the initial database operation fails', async () => {
    const repo = repository();
    vi.mocked(repo.prepare).mockRejectedValue(new Error('test database failure'));
    const service = createAccountDeletionService(deleteAuthUser, repo, () => now);

    await expect(service.deleteAccount(account, recentIdentity)).rejects.toThrow(
      'test database failure',
    );
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  test('records an Auth deletion failure and leaves finalization untouched', async () => {
    const repo = repository();
    deleteAuthUser.mockRejectedValue(new Error('test provider failure'));
    const service = createAccountDeletionService(deleteAuthUser, repo, () => now);

    await expect(service.deleteAccount(account, recentIdentity)).rejects.toMatchObject({
      name: 'AccountDeletionIncompleteError',
    });
    expect(repo.markAuthDeletionFailed).toHaveBeenCalledWith('42');
    expect(repo.markAuthDeleted).not.toHaveBeenCalled();
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  test('stays disabled when recording Auth success fails after external deletion', async () => {
    const repo = repository();
    vi.mocked(repo.markAuthDeleted).mockRejectedValue(new Error('test database failure'));
    const service = createAccountDeletionService(deleteAuthUser, repo, () => now);

    await expect(service.deleteAccount(account, recentIdentity)).rejects.toMatchObject({
      name: 'AccountDeletionIncompleteError',
    });
    expect(deleteAuthUser).toHaveBeenCalledOnce();
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  test('records finalization failure after Auth deletion succeeds', async () => {
    const repo = repository();
    vi.mocked(repo.finalize).mockRejectedValue(new Error('test finalization failure'));
    const service = createAccountDeletionService(deleteAuthUser, repo, () => now);

    await expect(service.deleteAccount(account, recentIdentity)).rejects.toMatchObject({
      name: 'AccountDeletionIncompleteError',
    });
    expect(repo.markFinalizationFailed).toHaveBeenCalledWith('42');
  });

  test.each(['finalization_pending', 'finalization_failed'] as const)(
    'retries %s without deleting the Auth user again',
    async (state) => {
      const repo = repository(state);
      const service = createAccountDeletionService(deleteAuthUser, repo, () => now);

      await service.deleteAccount(account, recentIdentity);

      expect(deleteAuthUser).not.toHaveBeenCalled();
      expect(repo.markAuthDeleted).not.toHaveBeenCalled();
      expect(repo.finalize).toHaveBeenCalledOnce();
    },
  );

  test('treats an already deleted account as an idempotent success', async () => {
    const repo = repository('deleted');
    const service = createAccountDeletionService(deleteAuthUser, repo, () => now);
    const deletedAccount: ApplicationAccount = {
      ...account,
      subject: 'deleted:tombstone',
      disabled: true,
      deletionState: 'deleted',
    };

    await expect(service.deleteAccount(deletedAccount, recentIdentity)).resolves.toEqual({
      data: { status: 'deleted', retainedCricketData: true },
    });
    expect(deleteAuthUser).not.toHaveBeenCalled();
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  test('treats a missing Auth user as a safe retry outcome', async () => {
    const repo = repository();
    deleteAuthUser.mockResolvedValue('not_found');
    const service = createAccountDeletionService(deleteAuthUser, repo, () => now);

    await service.deleteAccount(account, recentIdentity);

    expect(repo.markAuthDeleted).toHaveBeenCalledOnce();
    expect(repo.finalize).toHaveBeenCalledOnce();
  });
});
