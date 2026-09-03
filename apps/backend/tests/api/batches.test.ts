import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import type { BatchService } from '../../src/modules/batches/batch.service';
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

function synchronize(account: ReturnType<typeof createTestAccount>): SynchronizeAccount {
  return async () => account;
}
function service(): BatchService {
  return {
    receive: vi.fn<BatchService['receive']>().mockResolvedValue(receipt),
    getStatus: vi.fn<BatchService['getStatus']>().mockResolvedValue(receipt),
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
});
