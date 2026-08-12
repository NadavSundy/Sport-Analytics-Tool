import express from 'express';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';
import type { VerifyAccessToken } from '../src/auth/supabase-auth';
import { errorHandler } from '../src/middleware/error-handler';
import { requireAuthentication } from '../src/middleware/require-authentication';
import {
  requireAdministrator,
  requireApprovedSubmitter,
  requireCompetitionScope,
} from '../src/middleware/require-authorization';
import type { ApplicationAccount } from '../src/modules/accounts/account';
import type { SynchronizeAccount } from '../src/modules/accounts/account.service';
import { createTestAccount } from './test-app';

const acceptToken: VerifyAccessToken = async () => ({
  uid: 'authorization-test-user',
  displayName: 'Authorization Test User',
});

function createAuthorizationTestApp(
  account: ApplicationAccount,
  verifyAccessToken: VerifyAccessToken = acceptToken,
) {
  const synchronizeAccount: SynchronizeAccount = async () => account;
  const authenticate = requireAuthentication(verifyAccessToken, synchronizeAccount);
  const app = express();

  app.get('/administrator', authenticate, requireAdministrator(), (_request, response) => {
    response.sendStatus(204);
  });

  app.post(
    '/upload/:competitionId',
    authenticate,
    requireApprovedSubmitter(),
    requireCompetitionScope((request_) => request_.params.competitionId),
    (_request, response) => {
      response.sendStatus(204);
    },
  );

  app.use(errorHandler);

  return app;
}

describe('role and scope authorization', () => {
  test('rejects an anonymous request before account authorization', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();

    const response = await request(
      createAuthorizationTestApp(createTestAccount(), verifyAccessToken),
    )
      .post('/upload/7')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  test('rejects a normal signed-in user from an upload route', async () => {
    const response = await request(createAuthorizationTestApp(createTestAccount()))
      .post('/upload/7')
      .set('Authorization', 'Bearer viewer-token')
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('allows an approved submitter within an assigned competition scope', async () => {
    const account = createTestAccount({
      approvalState: 'approved',
      competitionIds: ['7'],
    });

    await request(createAuthorizationTestApp(account))
      .post('/upload/7')
      .set('Authorization', 'Bearer approved-token')
      .expect(204);
  });

  test('rejects an approved submitter outside an assigned competition scope', async () => {
    const account = createTestAccount({
      approvalState: 'approved',
      competitionIds: ['8'],
    });

    const response = await request(createAuthorizationTestApp(account))
      .post('/upload/7')
      .set('Authorization', 'Bearer out-of-scope-token')
      .expect(403);

    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'The authenticated account is not permitted to perform this operation.',
      },
    });
  });

  test('allows an administrator through an administrator-only route', async () => {
    const account = createTestAccount({ role: 'administrator' });

    await request(createAuthorizationTestApp(account))
      .get('/administrator')
      .set('Authorization', 'Bearer administrator-token')
      .expect(204);
  });

  test('rejects a non-administrator from an administrator-only route', async () => {
    const response = await request(createAuthorizationTestApp(createTestAccount()))
      .get('/administrator')
      .set('Authorization', 'Bearer viewer-token')
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
