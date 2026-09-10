import { MAX_SUBMISSION_UPLOAD_BYTES } from '@sport-analytics/contracts';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import { SubmissionValidationError } from '../../src/modules/submissions/submission.errors';
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

const validCorrection = {
  fixtureId: '7',
  schemaVersion: '1.0' as const,
  reason: 'Correct the scorer transcription.',
  event: {
    inningsId: '10',
    overNumber: 0,
    positionInOver: 0,
    ballNumber: '0.1',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '22',
    runs: { offBat: 6, extras: 0, total: 6 },
  },
};

const csvHeader = [
  'fixtureId',
  'schemaVersion',
  'eventId',
  'inningsId',
  'sequenceNumber',
  'overNumber',
  'positionInOver',
  'ballNumber',
  'strikerId',
  'nonStrikerId',
  'bowlerId',
  'runsOffBat',
  'runsExtras',
  'runsTotal',
  'runsNonBoundary',
  'extraWides',
  'extraNoBalls',
  'extraByes',
  'extraLegByes',
  'extraPenalty',
  'wickets',
].join(',');

function validCsv(eventId = validPayload.events[0]!.eventId): string {
  return `${csvHeader}\n7,1.0,${eventId},10,1,0,0,0.1,20,21,22,4,0,4,false,,,,,,[]\n`;
}

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
    correct: vi.fn<SubmissionService['correct']>().mockResolvedValue({
      data: {
        eventId: '123e4567-e89b-42d3-a456-426614174000',
        fixtureId: '7',
        revision: 2,
        refreshedScopes: [
          { scope: 'fixture', participantId: null, competitionId: '5', season: '2026' },
        ],
      },
    }),
    getCorrectionHistory: vi.fn<SubmissionService['getCorrectionHistory']>().mockResolvedValue({
      data: {
        eventId: '123e4567-e89b-42d3-a456-426614174000',
        fixtureId: '7',
        corrections: [],
      },
    }),
  };
}

describe('direct event submission API', () => {
  test('corrects a fully validated event for an in-scope submitter', async () => {
    const service = mockSubmissionService();
    const account = createTestAccount({ role: 'submitter', competitionIds: ['5'] });

    const response = await request(
      createTestApp(acceptToken, undefined, synchronizeWith(account), undefined, service),
    )
      .put('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000')
      .set('Authorization', 'Bearer approved-token')
      .send(validCorrection)
      .expect(200);

    expect(service.correct).toHaveBeenCalledWith(
      account,
      '123e4567-e89b-42d3-a456-426614174000',
      expect.objectContaining({
        fixtureId: '7',
        schemaVersion: '1.0',
        event: expect.objectContaining({ runs: expect.objectContaining({ total: 6 }) }),
      }),
    );
    expect(response.body.data).toMatchObject({
      fixtureId: '7',
      revision: 2,
      refreshedScopes: [{ scope: 'fixture', participantId: null }],
    });
  });

  test('requires a correction reason before service processing', async () => {
    const service = mockSubmissionService();

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
        undefined,
        service,
      ),
    )
      .put('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000')
      .set('Authorization', 'Bearer approved-token')
      .send({ ...validCorrection, reason: '   ' })
      .expect(422);

    expect(response.body.error.details).toEqual([expect.objectContaining({ field: 'reason' })]);
    expect(service.correct).not.toHaveBeenCalled();
  });

  test('returns correction history to an authenticated authorised submitter', async () => {
    const service = mockSubmissionService();
    const account = createTestAccount({ role: 'submitter', competitionIds: ['5'] });

    const response = await request(
      createTestApp(acceptToken, undefined, synchronizeWith(account), undefined, service),
    )
      .get('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000/history')
      .set('Authorization', 'Bearer approved-token')
      .expect(200);

    expect(service.getCorrectionHistory).toHaveBeenCalledWith(
      account,
      '123e4567-e89b-42d3-a456-426614174000',
    );
    expect(response.body.data.corrections).toEqual([]);
  });

  test('rejects anonymous and viewer correction-history requests', async () => {
    const anonymousService = mockSubmissionService();
    await request(
      createTestApp(vi.fn<VerifyAccessToken>(), undefined, undefined, undefined, anonymousService),
    )
      .get('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000/history')
      .expect(401);
    expect(anonymousService.getCorrectionHistory).not.toHaveBeenCalled();

    const viewerService = mockSubmissionService();
    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'viewer' })),
        undefined,
        viewerService,
      ),
    )
      .get('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000/history')
      .set('Authorization', 'Bearer viewer-token')
      .expect(403);
    expect(viewerService.getCorrectionHistory).not.toHaveBeenCalled();
  });

  test('rejects an invalid correction before it reaches storage', async () => {
    const service = mockSubmissionService();

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
        undefined,
        service,
      ),
    )
      .put('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000')
      .set('Authorization', 'Bearer approved-token')
      .send({
        ...validCorrection,
        event: { ...validCorrection.event, runs: { offBat: 4, extras: 0, total: 5 } },
      })
      .expect(422);

    expect(service.correct).not.toHaveBeenCalled();
  });

  test('rejects an unauthorised correction before service processing', async () => {
    const service = mockSubmissionService();

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ approvalState: 'approved', competitionIds: ['5'] })),
        undefined,
        service,
      ),
    )
      .put('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000')
      .set('Authorization', 'Bearer viewer-token')
      .send(validCorrection)
      .expect(403);

    expect(service.correct).not.toHaveBeenCalled();
  });
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

  test('rejects a viewer even when legacy approval and competition scope are present', async () => {
    const service = mockSubmissionService();

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ approvalState: 'approved', competitionIds: ['5'] })),
        undefined,
        service,
      ),
    )
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer viewer-token')
      .send(validPayload)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(service.submit).not.toHaveBeenCalled();
  });

  test('accepts and reports provenance for an in-scope submitter', async () => {
    const service = mockSubmissionService();
    const account = createTestAccount({
      role: 'submitter',
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

  test('normalises an uploaded JSON file through the direct submission contract', async () => {
    const service = mockSubmissionService();
    const account = createTestAccount({ role: 'submitter', competitionIds: ['5'] });

    await request(
      createTestApp(acceptToken, undefined, synchronizeWith(account), undefined, service),
    )
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer approved-token')
      .attach('file', Buffer.from(JSON.stringify(validPayload)), {
        filename: 'match-events.json',
        contentType: 'application/json',
      })
      .expect(201);

    const [submittedAccount, submission, sourceFile] = vi.mocked(service.submit).mock.calls[0]!;
    expect(submittedAccount).toBe(account);
    expect(submission).toMatchObject(validPayload);
    expect(sourceFile).toMatchObject({
      fileName: 'match-events.json',
      mediaType: 'application/json',
      sizeBytes: expect.any(Number),
    });
  });

  test('normalises an uploaded CSV file through the direct submission contract', async () => {
    const service = mockSubmissionService();
    const account = createTestAccount({ role: 'submitter', competitionIds: ['5'] });

    await request(
      createTestApp(acceptToken, undefined, synchronizeWith(account), undefined, service),
    )
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer approved-token')
      .attach('file', Buffer.from(validCsv()), {
        filename: 'match-events.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(service.submit).toHaveBeenCalledWith(
      account,
      expect.objectContaining({ fixtureId: '7', schemaVersion: '1.0' }),
      expect.objectContaining({ fileName: 'match-events.csv', mediaType: 'text/csv' }),
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  test('rejects an invalid uploaded row before it reaches the submission service', async () => {
    const service = mockSubmissionService();

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
        undefined,
        service,
      ),
    )
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer approved-token')
      .attach('file', Buffer.from(validCsv().replace(',4,0,4,false,', ',4,0,5,false,')), {
        filename: 'invalid-events.csv',
        contentType: 'text/csv',
      })
      .expect(422);

    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventIndex: 0, field: 'events.0.runs.total' }),
      ]),
    );
    expect(service.submit).not.toHaveBeenCalled();
  });

  test('rejects unsupported and oversized uploaded files', async () => {
    const service = mockSubmissionService();
    const app = createTestApp(
      acceptToken,
      undefined,
      synchronizeWith(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
      undefined,
      service,
    );

    await request(app)
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer approved-token')
      .attach('file', Buffer.from('not a spreadsheet'), {
        filename: 'events.txt',
        contentType: 'text/plain',
      })
      .expect(422);

    const atLimit = await request(app)
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer approved-token')
      .attach('file', Buffer.alloc(MAX_SUBMISSION_UPLOAD_BYTES), {
        filename: 'events.json',
        contentType: 'application/json',
      })
      .expect(422);

    expect(atLimit.body.error.code).toBe('VALIDATION_FAILED');

    const oversized = await request(app)
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer approved-token')
      .attach('file', Buffer.alloc(MAX_SUBMISSION_UPLOAD_BYTES + 1), {
        filename: 'events.json',
        contentType: 'application/json',
      })
      .expect(413);

    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(service.submit).not.toHaveBeenCalled();
  });

  test('enforces competition scope for an uploaded submission in the shared service', async () => {
    const storeAcceptedSubmission = vi.fn<SubmissionRepository['storeAcceptedSubmission']>();
    const service = createSubmissionService({
      async findFixtureScope() {
        return { fixtureId: '7', competitionId: '5' };
      },
      storeAcceptedSubmission,
    });

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'submitter', competitionIds: ['6'] })),
        undefined,
        service,
      ),
    )
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer out-of-scope-token')
      .attach('file', Buffer.from(JSON.stringify(validPayload)), {
        filename: 'match-events.json',
        contentType: 'application/json',
      })
      .expect(403);

    expect(storeAcceptedSubmission).not.toHaveBeenCalled();
  });

  test('allows an admin without a competition scope to submit for any competition', async () => {
    const storeAcceptedSubmission = vi.fn<SubmissionRepository['storeAcceptedSubmission']>(
      async () => ({
        submissionId: '30',
        fixtureId: '7',
        submitterId: '1',
        status: 'accepted',
        receivedAt: '2026-08-13T16:00:00.000Z',
        schemaVersion: '1.0',
        eventCount: 1,
      }),
    );
    const service = createSubmissionService({
      async findFixtureScope() {
        return { fixtureId: '7', competitionId: '5' };
      },
      storeAcceptedSubmission,
    });
    const account = createTestAccount({ role: 'admin' });

    await request(
      createTestApp(acceptToken, undefined, synchronizeWith(account), undefined, service),
    )
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer admin-token')
      .send(validPayload)
      .expect(201);

    expect(storeAcceptedSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ fixtureId: validPayload.fixtureId }),
      account.accountId,
      undefined,
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
  });

  test('allows an admin without a competition scope to upload a submission', async () => {
    const storeAcceptedSubmission = vi.fn<SubmissionRepository['storeAcceptedSubmission']>(
      async () => ({
        submissionId: '30',
        fixtureId: '7',
        submitterId: '1',
        status: 'accepted',
        receivedAt: '2026-08-13T16:00:00.000Z',
        schemaVersion: '1.0',
        eventCount: 1,
      }),
    );
    const service = createSubmissionService({
      async findFixtureScope() {
        return { fixtureId: '7', competitionId: '5' };
      },
      storeAcceptedSubmission,
    });

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'admin' })),
        undefined,
        service,
      ),
    )
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer admin-token')
      .attach('file', Buffer.from(validCsv('123e4567-e89b-42d3-a456-426614174098')), {
        filename: 'match-events.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(storeAcceptedSubmission).toHaveBeenCalledOnce();
  });

  test('rejects a submitter outside the fixture competition scope', async () => {
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
        synchronizeWith(createTestAccount({ role: 'submitter', competitionIds: ['6'] })),
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

  test('rejects a correction outside the source event competition scope', async () => {
    const storeAcceptedCorrection = vi.fn<SubmissionRepository['storeAcceptedCorrection']>();
    const repository: SubmissionRepository = {
      async findFixtureScope() {
        return { fixtureId: '7', competitionId: '5' };
      },
      async findCorrectionTarget() {
        return { fixtureId: '7', competitionId: '5', season: '2026', sequenceNumber: 1 };
      },
      storeAcceptedSubmission: vi.fn<SubmissionRepository['storeAcceptedSubmission']>(),
      storeAcceptedCorrection,
    };
    const service = createSubmissionService(repository);

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'submitter', competitionIds: ['6'] })),
        undefined,
        service,
      ),
    )
      .put('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000')
      .set('Authorization', 'Bearer out-of-scope-token')
      .send(validCorrection)
      .expect(403);

    expect(storeAcceptedCorrection).not.toHaveBeenCalled();
  });

  test('allows an admin without a competition scope to correct an event', async () => {
    const storeAcceptedCorrection = vi.fn<SubmissionRepository['storeAcceptedCorrection']>(
      async () => ({
        eventId: '123e4567-e89b-42d3-a456-426614174000',
        fixtureId: '7',
        revision: 2,
        refreshedScopes: [],
      }),
    );
    const repository: SubmissionRepository = {
      async findCorrectionTarget() {
        return { fixtureId: '7', competitionId: '5', season: '2026', sequenceNumber: 1 };
      },
      storeAcceptedSubmission: vi.fn<SubmissionRepository['storeAcceptedSubmission']>(),
      storeAcceptedCorrection,
    };
    const service = createSubmissionService(repository);

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'admin' })),
        undefined,
        service,
      ),
    )
      .put('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174000')
      .set('Authorization', 'Bearer admin-token')
      .send(validCorrection)
      .expect(200);

    expect(storeAcceptedCorrection).toHaveBeenCalledOnce();
  });

  test('returns event-indexed validation details without invoking storage', async () => {
    const service = mockSubmissionService();

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'submitter' })),
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
      synchronizeWith(createTestAccount({ role: 'submitter' })),
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
      synchronizeWith(createTestAccount({ role: 'submitter' })),
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
  test('returns versioned cricket-rule details from authoritative repository validation', async () => {
    const storeAcceptedSubmission = vi
      .fn<SubmissionRepository['storeAcceptedSubmission']>()
      .mockRejectedValue(
        new SubmissionValidationError('The submission contains invalid cricket event data.', [
          {
            code: 'UNKNOWN_DISMISSAL_KIND',
            message: 'The dismissal kind is not recognised by the configured cricket vocabulary.',
            field: 'wickets.0.kind',
            eventIndex: 0,
            ruleVersion: '1.0',
            severity: 'error',
          },
        ]),
      );

    const repository: SubmissionRepository = {
      async findFixtureScope() {
        return {
          fixtureId: '7',
          competitionId: '5',
        };
      },
      storeAcceptedSubmission,
    };

    const service = createSubmissionService(repository);

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(
          createTestAccount({
            role: 'submitter',
            competitionIds: ['5'],
          }),
        ),
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
            wickets: [
              {
                kind: 'dismissed by vibes',
                playerOutId: '20',
              },
            ],
          },
        ],
      })
      .expect(422);

    expect(response.body.error.details).toEqual([
      expect.objectContaining({
        code: 'UNKNOWN_DISMISSAL_KIND',
        field: 'wickets.0.kind',
        eventIndex: 0,
        ruleVersion: '1.0',
        severity: 'error',
      }),
    ]);

    expect(storeAcceptedSubmission).toHaveBeenCalledOnce();
  });

  test('accepts a dismissal kind held in the lookup table without a contract change', async () => {
    const repository: SubmissionRepository = {
      async findFixtureScope() {
        return { fixtureId: '7', competitionId: '5' };
      },
      async storeAcceptedSubmission() {
        return {
          submissionId: '30',
          fixtureId: '7',
          submitterId: '1',
          status: 'accepted' as const,
          receivedAt: '2026-08-13T16:00:00.000Z',
          schemaVersion: '1.0' as const,
          eventCount: 1,
        };
      },
    };
    const service = createSubmissionService(repository);

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
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
            wickets: [{ kind: 'retired not out', playerOutId: '20' }],
          },
        ],
      })
      .expect(201);
  });

  test('rejects a printed ball number that is not in the published form', async () => {
    const service = mockSubmissionService();

    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronizeWith(createTestAccount({ role: 'submitter' })),
        undefined,
        service,
      ),
    )
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer approved-token')
      .send({
        ...validPayload,
        events: [{ ...validPayload.events[0], ballNumber: 'first ball of the over' }],
      })
      .expect(422);

    expect(response.body.error.details[0]).toMatchObject({
      field: 'events.0.ballNumber',
      eventIndex: 0,
    });
    expect(service.submit).not.toHaveBeenCalled();
  });
});
