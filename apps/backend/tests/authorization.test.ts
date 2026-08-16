import express from 'express';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';
import type { VerifyAccessToken } from '../src/auth/supabase-auth';
import { errorHandler } from '../src/middleware/error-handler';
import { requireAuthentication } from '../src/middleware/require-authentication';
import {
  requireAdministrator,
  requireCompetitionScope,
  requireSubmitter,
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

  app.get('/admin', authenticate, requireAdministrator(), (_request, response) => {
    response.sendStatus(204);
  });

  app.post(
    '/upload/:competitionId',
    authenticate,
    requireSubmitter(),
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

  test('rejects a viewer from an upload route even when legacy approval is approved', async () => {
    const response = await request(
      createAuthorizationTestApp(
        createTestAccount({ approvalState: 'approved', competitionIds: ['7'] }),
      ),
    )
      .post('/upload/7')
      .set('Authorization', 'Bearer viewer-token')
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('allows a submitter within an assigned competition scope', async () => {
    const account = createTestAccount({
      role: 'submitter',
      competitionIds: ['7'],
    });

    await request(createAuthorizationTestApp(account))
      .post('/upload/7')
      .set('Authorization', 'Bearer approved-token')
      .expect(204);
  });

  test('rejects a submitter outside an assigned competition scope', async () => {
    const account = createTestAccount({
      role: 'submitter',
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

  test('allows an admin through an admin-only route', async () => {
    const account = createTestAccount({ role: 'admin' });

    await request(createAuthorizationTestApp(account))
      .get('/admin')
      .set('Authorization', 'Bearer admin-token')
      .expect(204);
  });

  test('rejects a viewer from an admin-only route', async () => {
    const response = await request(createAuthorizationTestApp(createTestAccount()))
      .get('/admin')
      .set('Authorization', 'Bearer viewer-token')
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('rejects a submitter from an admin-only route', async () => {
    const response = await request(
      createAuthorizationTestApp(createTestAccount({ role: 'submitter' })),
    )
      .get('/admin')
      .set('Authorization', 'Bearer submitter-token')
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('allows an admin to submit within an assigned competition scope', async () => {
    const account = createTestAccount({ role: 'admin', competitionIds: ['7'] });

    await request(createAuthorizationTestApp(account))
      .post('/upload/7')
      .set('Authorization', 'Bearer admin-token')
      .expect(204);
  });
});
