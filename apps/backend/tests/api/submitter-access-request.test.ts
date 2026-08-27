import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { SubmitterAccessService } from '../../src/modules/submitter-access/submitter-access.service';
import {
  InvalidRequestedCompetitionError,
  SubmitterAccessConflictError,
} from '../../src/modules/submitter-access/submitter-access.errors';
import { createTestAccount, createTestApp } from '../test-app';

function mockSubmitterAccessService(): SubmitterAccessService {
  return {
    requestAccess: vi.fn<SubmitterAccessService['requestAccess']>().mockResolvedValue({
      data: {
        accountId: '1',
        approvalState: 'pending',
        requestedCompetition: { competitionId: '7', name: 'Premier T20' },
      },
    }),
  };
}

describe('submitter access request API', () => {
  test('rejects unauthenticated requests before request processing', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const service = mockSubmitterAccessService();

    const response = await request(
      createTestApp(verifyAccessToken, undefined, undefined, undefined, undefined, service),
    )
      .post('/api/v1/submitter-access-requests')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(service.requestAccess).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid authentication token is required.',
      },
    });
  });

  test('creates a pending request for the authenticated application account', async () => {
    const service = mockSubmitterAccessService();
    const account = createTestAccount({
      accountId: '42',
      approvalState: 'not_requested',
    });

    const synchronizeAccount = async () => account;

    const response = await request(
      createTestApp(undefined, undefined, synchronizeAccount, undefined, undefined, service),
    )
      .post('/api/v1/submitter-access-requests')
      .set('Authorization', 'Bearer test-token')
      .send({ competitionId: '7' })
      .expect(201);

    expect(service.requestAccess).toHaveBeenCalledOnce();
    expect(service.requestAccess).toHaveBeenCalledWith(account, { competitionId: '7' });

    expect(response.body).toEqual({
      data: {
        accountId: '1',
        approvalState: 'pending',
        requestedCompetition: { competitionId: '7', name: 'Premier T20' },
      },
    });
  });

  test('rejects a duplicate active request', async () => {
    const service = mockSubmitterAccessService();

    vi.mocked(service.requestAccess).mockRejectedValue(
      new SubmitterAccessConflictError(
        'REQUEST_ALREADY_PENDING',
        'A submitter access request is already pending.',
      ),
    );

    const response = await request(
      createTestApp(undefined, undefined, undefined, undefined, undefined, service),
    )
      .post('/api/v1/submitter-access-requests')
      .set('Authorization', 'Bearer test-token')
      .send({ competitionId: '7' })
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: 'REQUEST_ALREADY_PENDING',
        message: 'A submitter access request is already pending.',
      },
    });
  });

  test('rejects an already-approved submitter', async () => {
    const service = mockSubmitterAccessService();

    vi.mocked(service.requestAccess).mockRejectedValue(
      new SubmitterAccessConflictError(
        'SUBMITTER_ALREADY_APPROVED',
        'The authenticated account is already an approved submitter.',
      ),
    );

    const response = await request(
      createTestApp(undefined, undefined, undefined, undefined, undefined, service),
    )
      .post('/api/v1/submitter-access-requests')
      .set('Authorization', 'Bearer test-token')
      .send({ competitionId: '7' })
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: 'SUBMITTER_ALREADY_APPROVED',
        message: 'The authenticated account is already an approved submitter.',
      },
    });
  });

  test.each([{ fixtureId: '42' }, { competitionId: 'not-an-id' }, {}])(
    'rejects a request without a valid competition identifier',
    async (body) => {
      const service = mockSubmitterAccessService();

      const response = await request(
        createTestApp(undefined, undefined, undefined, undefined, undefined, service),
      )
        .post('/api/v1/submitter-access-requests')
        .set('Authorization', 'Bearer test-token')
        .send(body)
        .expect(422);

      expect(service.requestAccess).not.toHaveBeenCalled();
      expect(response.body.error).toMatchObject({ code: 'VALIDATION_FAILED' });
    },
  );

  test('rejects a competition that no longer exists', async () => {
    const service = mockSubmitterAccessService();
    vi.mocked(service.requestAccess).mockRejectedValue(new InvalidRequestedCompetitionError());

    const response = await request(
      createTestApp(undefined, undefined, undefined, undefined, undefined, service),
    )
      .post('/api/v1/submitter-access-requests')
      .set('Authorization', 'Bearer test-token')
      .send({ competitionId: '99' })
      .expect(422);

    expect(response.body.error).toMatchObject({
      code: 'INVALID_COMPETITION_SCOPE',
      message: 'The requested competition does not exist.',
    });
  });
});
