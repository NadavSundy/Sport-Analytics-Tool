import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import type { BatchService } from '../../src/modules/batches/batch.service';
import { BatchConflictError, BatchForbiddenError } from '../../src/modules/batches/batch.service';
import { createTestAccount, createTestApp } from '../test-app';

const acceptToken: VerifyAccessToken = async () => ({
  uid: 'batch-user',
  displayName: 'Batch User',
});
const reference = '123e4567-e89b-42d3-a456-426614174000';
const receipt = {
  data: {
    batchReference: reference,
    status: 'stored' as const,
    statusUrl: `/api/v1/batches/${reference}`,
    receivedAt: '2026-09-03T10:00:00.000Z',
  },
};

const status = {
  data: {
    batchReference: reference,
    competitionId: '5',
    status: 'stored' as const,
    statusUrl: `/api/v1/batches/${reference}`,
    receivedAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z',
    progress: { total: 0, processed: 0, accepted: 0, rejected: 0 },
    counts: { accepted: 0, rejected: 0, unresolved: 0, duplicate: 0, conflicting: 0 },
    review: null,
  },
};

function synchronize(account: ReturnType<typeof createTestAccount>): SynchronizeAccount {
  return async () => account;
}
function service(overrides: Partial<BatchService> = {}): BatchService {
  return {
    receive: vi.fn<BatchService['receive']>().mockResolvedValue(receipt),
    getStatus: vi.fn<BatchService['getStatus']>().mockResolvedValue(status),
    list: vi.fn<BatchService['list']>().mockResolvedValue({
      data: [status.data],
      pagination: { nextCursor: null },
    }),
    listForAdmin: vi.fn<BatchService['listForAdmin']>().mockResolvedValue({
      data: [status.data],
      pagination: { nextCursor: null },
    }),
    getReport: vi.fn<BatchService['getReport']>().mockResolvedValue({
      data: {
        batch: status.data,
        errorGroups: [],
        items: [],
        pagination: { nextCursor: null },
        downloadUrl: `/api/v1/batches/${reference}/report/download`,
      },
    }),
    downloadReport: vi.fn<BatchService['downloadReport']>().mockResolvedValue({
      data: { batch: status.data, errorGroups: [], items: [] },
    }),
    review: vi.fn<BatchService['review']>().mockResolvedValue(status),
    resolvePublishedConflict: vi
      .fn<BatchService['resolvePublishedConflict']>()
      .mockResolvedValue(status),
    mapReference: vi.fn<BatchService['mapReference']>().mockResolvedValue({
      data: {
        batchReference: reference,
        decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
        status: 'queued',
        statusUrl: `/api/v1/batches/${reference}`,
        submittedAt: '2026-09-07T12:00:00.000Z',
      },
    }),
    createCanonicalFixture: vi.fn<BatchService['createCanonicalFixture']>().mockResolvedValue({
      data: {
        batchReference: reference,
        decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
        status: 'queued',
        statusUrl: `/api/v1/batches/${reference}`,
        submittedAt: '2026-09-11T12:00:00.000Z',
      },
    }),
    ...overrides,
  };
}
function post(app: ReturnType<typeof createTestApp>) {
  return request(app)
    .post('/api/v1/batches')
    .set('Authorization', 'Bearer batch-token')
    .set('X-Competition-Id', '5')
    .set('Idempotency-Key', 'season-2026-01')
    .set('X-Batch-Package-Version', '1.0')
    .set('X-File-Name', 'season.ndjson')
    .set('Content-Type', 'application/x-ndjson')
    .send('{"manifest":true}\n');
}

describe('batch receipt API', () => {
  test('mounts batch workflows when payload storage is not configured', async () => {
    const response = await request(createTestApp()).get('/api/v1/batches').expect(401);

    expect(response.body).not.toMatchObject({
      error: { code: 'UNSUPPORTED_API_VERSION' },
    });
  });

  test('keeps batch report routes available when payload storage is not configured', async () => {
    const response = await request(createTestApp())
      .get(`/api/v1/batches/${reference}/report`)
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  test('returns an opaque staged receipt for an authorised submitter', async () => {
    const batchService = service();
    const account = createTestAccount({ role: 'submitter', competitionIds: ['5'] });
    const response = await post(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(account),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        batchService,
      ),
    ).expect(202);
    expect(response.headers.location).toBe(receipt.data.statusUrl);
    expect(response.body).toEqual(receipt);
    expect(batchService.receive).toHaveBeenCalledWith(
      account,
      expect.objectContaining({ competitionId: '5', mediaType: 'application/x-ndjson' }),
      expect.anything(),
    );
  });

  test('returns asynchronous validation progress for the owned batch', async () => {
    const batchService = service();
    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        batchService,
      ),
    )
      .get(`/api/v1/batches/${reference}`)
      .set('Authorization', 'Bearer batch-token')
      .expect(200);

    expect(response.body).toEqual(status);
    expect(batchService.getStatus).toHaveBeenCalledWith(expect.anything(), reference);
  });

  test('lists the authenticated submitter batches with pagination', async () => {
    const batchService = service();
    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        batchService,
      ),
    )
      .get('/api/v1/batches?limit=25&status=awaiting_review')
      .set('Authorization', 'Bearer batch-token')
      .expect(200);
    expect(response.body.data).toEqual([status.data]);
    expect(batchService.list).toHaveBeenCalledWith(expect.anything(), {
      limit: 25,
      status: 'awaiting_review',
    });
  });

  test('lists global batch history only through the administrator endpoint', async () => {
    const batchService = service();
    const adminApp = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'admin' })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      batchService,
    );

    await request(adminApp)
      .get('/api/v1/admin/batches?limit=25&status=published')
      .set('Authorization', 'Bearer batch-token')
      .expect(200);

    expect(batchService.listForAdmin).toHaveBeenCalledWith(expect.anything(), {
      limit: 25,
      status: 'published',
    });

    const submitterApp = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      batchService,
    );
    await request(submitterApp)
      .get('/api/v1/admin/batches')
      .set('Authorization', 'Bearer batch-token')
      .expect(403);
  });

  test('returns a paginated report and machine-readable download', async () => {
    const batchService = service();
    const app = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      batchService,
    );
    await request(app)
      .get(`/api/v1/batches/${reference}/report?limit=10`)
      .set('Authorization', 'Bearer batch-token')
      .expect(200);
    const download = await request(app)
      .get(`/api/v1/batches/${reference}/report/download`)
      .set('Authorization', 'Bearer batch-token')
      .expect(200)
      .expect('Content-Type', /json/);
    expect(download.headers['content-disposition']).toContain(`${reference}-report.json`);
    expect(batchService.getReport).toHaveBeenCalledWith(expect.anything(), reference, {
      limit: 10,
    });
    expect(batchService.downloadReport).toHaveBeenCalledWith(expect.anything(), reference);
  });

  test.each([
    ['all accepted', 3, 0, 'published'],
    ['partially rejected', 2, 1, 'partially_published'],
    ['fully rejected', 0, 3, 'rejected'],
  ] as const)(
    'exposes %s batch outcomes through the report API',
    async (_case, accepted, rejected, lifecycle) => {
      const report = {
        data: {
          batch: {
            ...status.data,
            status: lifecycle,
            progress: { total: 3, processed: 3, accepted, rejected },
            counts: { accepted, rejected, unresolved: rejected, duplicate: 0, conflicting: 0 },
          },
          errorGroups: rejected ? [{ ruleCode: 'EVENT_SCHEMA_INVALID', count: rejected }] : [],
          items: [],
          pagination: { nextCursor: null },
          downloadUrl: `/api/v1/batches/${reference}/report/download`,
        },
      };
      const batchService = service({ getReport: vi.fn().mockResolvedValue(report) });
      const response = await request(
        createTestApp(
          acceptToken,
          undefined,
          synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          batchService,
        ),
      )
        .get(`/api/v1/batches/${reference}/report`)
        .set('Authorization', 'Bearer batch-token')
        .expect(200);
      expect(response.body.data.batch).toMatchObject({
        status: lifecycle,
        counts: { accepted, rejected },
      });
    },
  );

  test('rejects malformed metadata before receipt processing', async () => {
    const batchService = service();
    const app = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'submitter' })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      batchService,
    );
    await request(app)
      .post('/api/v1/batches')
      .set('Authorization', 'Bearer batch-token')
      .set('Content-Type', 'application/zip')
      .send('x')
      .expect(422);
    expect(batchService.receive).not.toHaveBeenCalled();
  });

  test('does not expose another submitter batch and permits an administrator reviewer', async () => {
    const deniedService = service({
      getReport: vi.fn().mockRejectedValue(new BatchForbiddenError()),
    });
    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        deniedService,
      ),
    )
      .get(`/api/v1/batches/${reference}/report`)
      .set('Authorization', 'Bearer batch-token')
      .expect(403);

    const reviewerService = service();
    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount({ role: 'admin' })),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        reviewerService,
      ),
    )
      .get(`/api/v1/batches/${reference}/report`)
      .set('Authorization', 'Bearer batch-token')
      .expect(200);
  });

  test('requires submitter authorisation before reading the payload', async () => {
    const batchService = service();
    await post(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount()),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        batchService,
      ),
    ).expect(403);
    expect(batchService.receive).not.toHaveBeenCalled();
  });

  test('accepts an authorised opaque reference mapping for asynchronous processing', async () => {
    const mapReference = vi.fn<BatchService['mapReference']>().mockResolvedValue({
      data: {
        batchReference: reference,
        decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
        status: 'queued',
        statusUrl: `/api/v1/batches/${reference}`,
        submittedAt: '2026-09-07T12:00:00.000Z',
      },
    });
    const app = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      service({ mapReference }),
    );
    const decision = {
      itemOrdinal: 1,
      referencePath: 'fixtures.0.innings.0.events.1.striker',
      candidateReference: 'e7b5945d-d738-5fc8-9278-8b15f50ab7c5',
      decisionKey: 'map-smith-1',
    };
    await request(app)
      .post(`/api/v1/batches/${reference}/reference-mappings`)
      .set('Authorization', 'Bearer batch-token')
      .send(decision)
      .expect(202);
    expect(mapReference).toHaveBeenCalledWith(expect.anything(), reference, decision);
  });

  test('rejects malformed and conflicting reference mapping decisions', async () => {
    const mapReference = vi
      .fn<BatchService['mapReference']>()
      .mockRejectedValue(new BatchConflictError('The candidate is stale.'));
    const app = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      service({ mapReference }),
    );
    await request(app)
      .post(`/api/v1/batches/${reference}/reference-mappings`)
      .set('Authorization', 'Bearer batch-token')
      .send({ itemOrdinal: -1, referencePath: '', candidateReference: 'invalid', decisionKey: '' })
      .expect(422);
    const response = await request(app)
      .post(`/api/v1/batches/${reference}/reference-mappings`)
      .set('Authorization', 'Bearer batch-token')
      .send({
        itemOrdinal: 1,
        referencePath: 'fixtures.0.striker',
        candidateReference: 'e7b5945d-d738-5fc8-9278-8b15f50ab7c5',
        decisionKey: 'stale',
      })
      .expect(409);
    expect(response.body.error.code).toBe('BATCH_REFERENCE_MAPPING_CONFLICT');
  });

  test.each(['approved', 'rejected', 'returned_for_correction'] as const)(
    'accepts an authorised %s review decision with a reason',
    async (decision) => {
      const review = vi.fn<BatchService['review']>().mockResolvedValue(status);
      const batchService = service({ review });
      await request(
        createTestApp(
          acceptToken,
          undefined,
          synchronize(createTestAccount({ role: 'admin', competitionIds: ['5'] })),
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          batchService,
        ),
      )
        .post(`/api/v1/batches/${reference}/review`)
        .set('Authorization', 'Bearer batch-token')
        .send({ decision, reason: 'Reviewed against the validation report.' })
        .expect(200);
      expect(review).toHaveBeenCalledWith(expect.anything(), reference, {
        decision,
        reason: 'Reviewed against the validation report.',
      });
    },
  );

  test('restricts review decisions to administrators and validates the review reason', async () => {
    const batchService = service();

    const submitterApp = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      batchService,
    );
    await request(submitterApp)
      .post(`/api/v1/batches/${reference}/review`)
      .set('Authorization', 'Bearer batch-token')
      .send({ decision: 'approved', reason: 'Approve.' })
      .expect(403);

    const viewerApp = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount()),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      batchService,
    );
    await request(viewerApp)
      .post(`/api/v1/batches/${reference}/review`)
      .set('Authorization', 'Bearer batch-token')
      .send({ decision: 'approved', reason: 'Approve.' })
      .expect(403);

    const adminApp = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'admin', competitionIds: ['5'] })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      batchService,
    );
    await request(adminApp)
      .post(`/api/v1/batches/${reference}/review`)
      .set('Authorization', 'Bearer batch-token')
      .send({ decision: 'approved', reason: '   ' })
      .expect(422);

    expect(batchService.review).not.toHaveBeenCalled();
  });

  test('returns a conflict for a competing or unsafe review decision', async () => {
    const batchService = service({
      review: vi.fn().mockRejectedValue(new BatchConflictError('A decision already exists.')),
    });
    const response = await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount({ role: 'admin', competitionIds: ['5'] })),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        batchService,
      ),
    )
      .post(`/api/v1/batches/${reference}/review`)
      .set('Authorization', 'Bearer batch-token')
      .send({ decision: 'rejected', reason: 'Conflicting retry.' })
      .expect(409);
    expect(response.body.error.code).toBe('BATCH_REVIEW_CONFLICT');
  });

  test('lets only administrators resolve a published-delivery conflict', async () => {
    const resolvePublishedConflict = vi
      .fn<BatchService['resolvePublishedConflict']>()
      .mockResolvedValue(status);
    const batchService = service({ resolvePublishedConflict });
    const requestBody = {
      itemOrdinal: 4,
      existingDeliveryId: '88',
      decision: 'replace_published' as const,
      reason: 'The submitted scorecard corrects the published delivery.',
    };

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount({ role: 'admin', competitionIds: ['5'] })),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        batchService,
      ),
    )
      .post(`/api/v1/batches/${reference}/conflicts/resolve`)
      .set('Authorization', 'Bearer batch-token')
      .send(requestBody)
      .expect(200);

    expect(resolvePublishedConflict).toHaveBeenCalledWith(
      expect.anything(),
      reference,
      requestBody,
    );

    await request(
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        batchService,
      ),
    )
      .post(`/api/v1/batches/${reference}/conflicts/resolve`)
      .set('Authorization', 'Bearer batch-token')
      .send(requestBody)
      .expect(403);
  });

  test('returns a generic error for an unexpected conflict-resolution failure and keeps 409 wording', async () => {
    // #529: the deployed failure was a raw database error inside resolution. It must
    // reach the reviewer as a generic 500 with no database or constraint detail,
    // while a known conflict keeps its actionable 409 message.
    const requestBody = {
      itemOrdinal: 0,
      existingDeliveryId: '2342246',
      decision: 'use_existing' as const,
      reason: 'The published delivery is the verified record.',
    };
    const app = (resolvePublishedConflict: BatchService['resolvePublishedConflict']) =>
      createTestApp(
        acceptToken,
        undefined,
        synchronize(createTestAccount({ role: 'admin', competitionIds: ['5'] })),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        service({ resolvePublishedConflict }),
      );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const failed = await request(
        app(
          vi
            .fn<BatchService['resolvePublishedConflict']>()
            .mockRejectedValue(
              new Error('column "source_event_id" does not exist in delivery_current'),
            ),
        ),
      )
        .post(`/api/v1/batches/${reference}/conflicts/resolve`)
        .set('Authorization', 'Bearer batch-token')
        .send(requestBody)
        .expect(500);
      expect(failed.body).toEqual({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected server error occurred.',
        },
      });
      expect(JSON.stringify(failed.body)).not.toMatch(/source_event_id|delivery_current|column/);

      const conflicted = await request(
        app(
          vi
            .fn<BatchService['resolvePublishedConflict']>()
            .mockRejectedValue(
              new BatchConflictError(
                'The published conflict changed or is ambiguous. Refresh the report before deciding.',
              ),
            ),
        ),
      )
        .post(`/api/v1/batches/${reference}/conflicts/resolve`)
        .set('Authorization', 'Bearer batch-token')
        .send(requestBody)
        .expect(409);
      expect(conflicted.body.error).toEqual({
        code: 'BATCH_CONFLICT_RESOLUTION_CONFLICT',
        message:
          'The published conflict changed or is ambiguous. Refresh the report before deciding.',
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  test('restricts canonical fixture creation to administrators and routes a valid decision', async () => {
    const createCanonicalFixture = vi
      .fn<BatchService['createCanonicalFixture']>()
      .mockResolvedValue({
        data: {
          batchReference: reference,
          decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
          status: 'queued',
          statusUrl: `/api/v1/batches/${reference}`,
          submittedAt: '2026-09-11T12:00:00.000Z',
        },
      });
    const requestBody = {
      itemOrdinal: 1,
      referencePath: 'fixtures.0',
      decisionKey: 'create-fixture',
    };
    const submitterApp = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'submitter', competitionIds: ['5'] })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      service({ createCanonicalFixture }),
    );
    await request(submitterApp)
      .post(`/api/v1/batches/${reference}/canonical-fixtures`)
      .set('Authorization', 'Bearer batch-token')
      .send(requestBody)
      .expect(403);
    const adminApp = createTestApp(
      acceptToken,
      undefined,
      synchronize(createTestAccount({ role: 'admin', competitionIds: ['5'] })),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      service({ createCanonicalFixture }),
    );
    await request(adminApp)
      .post(`/api/v1/batches/${reference}/canonical-fixtures`)
      .set('Authorization', 'Bearer batch-token')
      .send(requestBody)
      .expect(202);
    expect(createCanonicalFixture).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
      reference,
      requestBody,
    );
  });
});
