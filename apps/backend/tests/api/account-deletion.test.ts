import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import {
  AccountDeletionIncompleteError,
  RecentAuthenticationRequiredError,
} from '../../src/modules/account-deletion/account-deletion.errors';
import type { AccountDeletionService } from '../../src/modules/account-deletion/account-deletion.service';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import { createTestAccount, createTestApp } from '../test-app';

const recentIdentity = {
  uid: 'account-owner',
  displayName: 'Account Owner',
  lastSignInAt: new Date('2026-08-16T12:00:00.000Z'),
};

function appWithDeletionService(
  service: AccountDeletionService,
  verifyAccessToken: VerifyAccessToken = async () => recentIdentity,
  synchronizeAccount: SynchronizeAccount = async () =>
    createTestAccount({ accountId: '42', subject: 'account-owner' }),
) {
  return createTestApp(
    verifyAccessToken,
    undefined,
    synchronizeAccount,
    undefined,
    undefined,
    undefined,
    service,
  );
}

describe('DELETE /api/v1/account', () => {
  it('rejects unauthenticated requests without calling deletion', async () => {
    const service = { deleteAccount: vi.fn() } as unknown as AccountDeletionService;
    const verifyAccessToken = vi.fn<VerifyAccessToken>();

    await request(appWithDeletionService(service, verifyAccessToken))
      .delete('/api/v1/account')
      .send({ confirmation: 'DELETE' })
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(service.deleteAccount).not.toHaveBeenCalled();
  });

  it('requires exact confirmation and rejects a client-supplied target account', async () => {
    const service = { deleteAccount: vi.fn() } as unknown as AccountDeletionService;

    const missingConfirmation = await request(appWithDeletionService(service))
      .delete('/api/v1/account')
      .set('Authorization', 'Bearer valid-test-token')
      .send({})
      .expect(422);
    expect(missingConfirmation.body.error.code).toBe('DELETION_CONFIRMATION_REQUIRED');

    const suppliedTarget = await request(appWithDeletionService(service))
      .delete('/api/v1/account')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ confirmation: 'DELETE', accountId: '99' })
      .expect(422);
    expect(suppliedTarget.body.error.code).toBe('DELETION_CONFIRMATION_REQUIRED');
    expect(service.deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes only the authenticated application account', async () => {
    const deleteAccount = vi.fn<AccountDeletionService['deleteAccount']>().mockResolvedValue({
      data: { status: 'deleted', retainedCricketData: true },
    });
    const service = { deleteAccount };

    const response = await request(appWithDeletionService(service))
      .delete('/api/v1/account')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ confirmation: 'DELETE' })
      .expect(200);

    expect(deleteAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: '42', subject: 'account-owner' }),
      recentIdentity,
    );
    expect(response.body).toEqual({
      data: { status: 'deleted', retainedCricketData: true },
    });
  });

  it('returns a safe recent-authentication requirement', async () => {
    const service: AccountDeletionService = {
      deleteAccount: vi.fn().mockRejectedValue(new RecentAuthenticationRequiredError()),
    };

    const response = await request(appWithDeletionService(service))
      .delete('/api/v1/account')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ confirmation: 'DELETE' })
      .expect(403);

    expect(response.body.error).toEqual({
      code: 'RECENT_AUTHENTICATION_REQUIRED',
      message: 'Please sign in again before deleting your account.',
    });
  });

  it('reports partial failure without provider or database details', async () => {
    const service: AccountDeletionService = {
      deleteAccount: vi.fn().mockRejectedValue(new AccountDeletionIncompleteError()),
    };

    const response = await request(appWithDeletionService(service))
      .delete('/api/v1/account')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ confirmation: 'DELETE' })
      .expect(503);

    expect(response.body.error.code).toBe('ACCOUNT_DELETION_INCOMPLETE');
    expect(JSON.stringify(response.body)).not.toMatch(/supabase|database|secret/i);
  });
});
