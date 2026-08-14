import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import type { SubmissionRepository } from '../../src/modules/submissions/submission.repository';
import {
  createSubmissionService,
  type SubmissionService,
} from '../../src/modules/submissions/submission.service';
import { createTestAccount, createTestApp } from '../test-app';

const validPayload = {
  fixtureId: '7',
  schemaVersion: '1.0' as const,
  events: [
    {
      eventId: '123e4567-e89b-42d3-a456-426614174000',
      inningsId: '10',
      sequenceNumber: 1,
      overNumber: 0,
      positionInOver: 0,
      ballNumber: '0.1',
      strikerId: '20',
      nonStrikerId: '21',
      bowlerId: '22',
      runs: {
        offBat: 4,
        extras: 0,
        total: 4,
      },
    },
  ],
};

const acceptToken: VerifyAccessToken = async () => ({
  uid: 'approved-user',
  displayName: 'Approved User',
});

function synchronizeWith(account: ReturnType<typeof createTestAccount>): SynchronizeAccount {
  return async () => account;
}

function mockSubmissionService(): SubmissionService {
  return {
    submit: vi.fn<SubmissionService['submit']>().mockResolvedValue({
      data: {
        submissionId: '30',
        fixtureId: '7',
        submitterId: '1',
        status: 'accepted',
        receivedAt: '2026-08-13T16:00:00.000Z',
        schemaVersion: '1.0',
        eventCount: 1,
      },
    }),
  };
}

describe('direct event submission API', () => {
  test('rejects anonymous requests before submission processing', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const service = mockSubmissionService();

    const response = await request(
      createTestApp(verifyAccessToken, undefined, undefined, undefined, service),
    )
      .post('/api/v1/submissions')
      .send(validPayload)
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(service.submit).not.toHaveBeenCalled();
  });

  test('rejects signed-in users who are not approved submitters', async () => {
    const service = mockSubmissionService();

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ approvalState: 'pending' })),
        undefined,
        service,
      ),
    )
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer pending-token')
      .send(validPayload)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(service.submit).not.toHaveBeenCalled();
  });

  test('accepts and reports provenance for an approved in-scope submitter', async () => {
    const service = mockSubmissionService();
    const account = createTestAccount({
      approvalState: 'approved',
      competitionIds: ['5'],
    });

    const response = await request(
      createTestApp(acceptToken, undefined, synchronizeWith(account), undefined, service),
    )
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer approved-token')
      .send(validPayload)
      .expect(201);

    expect(service.submit).toHaveBeenCalledWith(
      account,
      expect.objectContaining({
        fixtureId: '7',
        schemaVersion: '1.0',
      }),
    );
    expect(response.body).toEqual({
      data: {
        submissionId: '30',
        fixtureId: '7',
        submitterId: '1',
        status: 'accepted',
        receivedAt: '2026-08-13T16:00:00.000Z',
        schemaVersion: '1.0',
        eventCount: 1,
      },
    });
  });

  test('rejects an approved submitter outside the fixture competition scope', async () => {
    const storeAcceptedSubmission = vi.fn<SubmissionRepository['storeAcceptedSubmission']>();
    const repository: SubmissionRepository = {
      async findFixtureScope() {
        return { fixtureId: '7', competitionId: '5' };
      },
      storeAcceptedSubmission,
    };
    const service = createSubmissionService(repository);

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ approvalState: 'approved', competitionIds: ['6'] })),
        undefined,
        service,
      ),
    )
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer out-of-scope-token')
      .send(validPayload)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(storeAcceptedSubmission).not.toHaveBeenCalled();
  });

  test('returns event-indexed validation details without invoking storage', async () => {
    const service = mockSubmissionService();

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ approvalState: 'approved' })),
        undefined,
        service,
      ),
    )
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer approved-token')
      .send({
        ...validPayload,
        events: [
          {
            ...validPayload.events[0],
            runs: { offBat: 4, extras: 1, total: 4 },
          },
        ],
      })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'events.0.runs.total',
          eventIndex: 0,
        }),
      ]),
    );
    expect(service.submit).not.toHaveBeenCalled();
  });

  test('enforces the authenticated submission rate limit', async () => {
    const service = mockSubmissionService();
    const app = createTestApp(
      acceptToken,
      undefined,
      synchronizeWith(createTestAccount({ approvalState: 'approved' })),
      undefined,
      service,
    );

    for (let requestNumber = 0; requestNumber < 30; requestNumber += 1) {
      await request(app)
        .post('/api/v1/submissions')
        .set('Authorization', 'Bearer approved-token')
        .send(validPayload)
        .expect(201);
    }

    const response = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer approved-token')
      .send(validPayload)
      .expect(429);

    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(service.submit).toHaveBeenCalledTimes(30);
  });

  test('returns predictable errors for malformed JSON and oversized payloads', async () => {
    const service = mockSubmissionService();
    const app = createTestApp(
      acceptToken,
      undefined,
      synchronizeWith(createTestAccount({ approvalState: 'approved' })),
      undefined,
      service,
    );

    const malformed = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer approved-token')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');

    const oversized = await request(app)
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer approved-token')
      .send({ ignored: 'x'.repeat(1_050_000) })
      .expect(413);
    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
