import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { VerifyAccessToken } from '../src/auth/supabase-auth';
import type { SynchronizeAccount } from '../src/modules/accounts/account.service';
import { createTestAccount, createTestApp } from './test-app';

describe('GET /api/v1/auth/me', () => {
  it('rejects a request without a bearer token', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();

    const response = await request(createTestApp(verifyAccessToken))
      .get('/api/v1/auth/me')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid authentication token is required.',
      },
    });
  });

  it('rejects a token that cannot be validated', async () => {
    const verifyAccessToken = vi
      .fn<VerifyAccessToken>()
      .mockRejectedValue(new Error('Invalid test token'));

    const response = await request(createTestApp(verifyAccessToken))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-test-token')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).toHaveBeenCalledWith('invalid-test-token');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the synchronized application profile for a valid token', async () => {
    const verifyAccessToken = vi
      .fn<VerifyAccessToken>()
      .mockResolvedValue({ uid: 'supabase-user-123', displayName: 'Supabase User' });
    const synchronizeAccount = vi.fn<SynchronizeAccount>().mockResolvedValue(
      createTestAccount({
        accountId: '42',
        subject: 'supabase-user-123',
        displayName: 'Supabase User',
        role: 'administrator',
        approvalState: 'approved',
        competitionIds: ['7', '12'],
      }),
    );

    const response = await request(createTestApp(verifyAccessToken, undefined, synchronizeAccount))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-test-token')
      .expect(200);

    expect(verifyAccessToken).toHaveBeenCalledWith('valid-test-token');
    expect(synchronizeAccount).toHaveBeenCalledWith({
      uid: 'supabase-user-123',
      displayName: 'Supabase User',
    });
    expect(response.body).toEqual({
      user: {
        id: '42',
        subject: 'supabase-user-123',
        displayName: 'Supabase User',
        role: 'administrator',
        approvalState: 'approved',
        competitionIds: ['7', '12'],
      },
    });
  });
  it.each(['not_requested', 'pending', 'rejected'] as const)(
    'returns the synchronized %s submitter access state',
    async (approvalState) => {
      const verifyAccessToken = vi.fn<VerifyAccessToken>().mockResolvedValue({
        uid: `supabase-user-${approvalState}`,
        displayName: 'Supabase User',
      });

      const synchronizeAccount = vi.fn<SynchronizeAccount>().mockResolvedValue(
        createTestAccount({
          subject: `supabase-user-${approvalState}`,
          displayName: 'Supabase User',
          approvalState,
          competitionIds: [],
        }),
      );

      const response = await request(
        createTestApp(verifyAccessToken, undefined, synchronizeAccount),
      )
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${approvalState}-test-token`)
        .expect(200);

      expect(response.body.user.approvalState).toBe(approvalState);
    },
  );

  it('does not classify an expired token as an authorization failure', async () => {
    const verifyAccessToken = vi
      .fn<VerifyAccessToken>()
      .mockRejectedValue(new Error('Token expired'));
    const synchronizeAccount = vi.fn<SynchronizeAccount>();

    const response = await request(createTestApp(verifyAccessToken, undefined, synchronizeAccount))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer expired-test-token')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(synchronizeAccount).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a disabled synchronized account with a consistent forbidden response', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>().mockResolvedValue({
      uid: 'disabled-user',
      displayName: null,
    });
    const synchronizeAccount = vi
      .fn<SynchronizeAccount>()
      .mockResolvedValue(createTestAccount({ disabled: true }));

    const response = await request(createTestApp(verifyAccessToken, undefined, synchronizeAccount))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer disabled-user-token')
      .expect(403);

    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'The authenticated account is not permitted to perform this operation.',
      },
    });
  });
});
