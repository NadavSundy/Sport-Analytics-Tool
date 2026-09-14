import { describe, expect, test, vi } from 'vitest';

import type { AuthenticatedApiClient } from '../../api/client';
import { batchUploadIdempotencyKey, uploadBatch } from './batch-api';

function fileWithBytes(bytes: string, name: string): File {
  const file = new File([bytes], name, { type: 'application/json' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new TextEncoder().encode(bytes).buffer,
  });
  return file;
}

describe('batch upload idempotency key', () => {
  test('reuses the key for unchanged bytes and separates content and competition', async () => {
    const unchanged = fileWithBytes('same package', 'first.json');
    const reselected = fileWithBytes('same package', 'again.json');
    const changed = fileWithBytes('corrected package', 'first.json');

    const firstKey = await batchUploadIdempotencyKey('5', unchanged);
    await expect(batchUploadIdempotencyKey('5', reselected)).resolves.toBe(firstKey);
    await expect(batchUploadIdempotencyKey('5', changed)).resolves.not.toBe(firstKey);
    await expect(batchUploadIdempotencyKey('6', unchanged)).resolves.not.toBe(firstKey);
  });

  test('sends explicit correction provenance with a replacement upload', async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        batchReference: '323e4567-e89b-42d3-a456-426614174000',
        status: 'stored',
        statusUrl: '/api/v1/batches/323e4567-e89b-42d3-a456-426614174000',
        receivedAt: '2026-09-14T10:00:00.000Z',
      },
    });
    await uploadBatch(
      { request } as unknown as AuthenticatedApiClient,
      '5',
      fileWithBytes('corrected package', 'corrected.json'),
      'corrected-key',
      '223e4567-e89b-42d3-a456-426614174000',
    );
    expect(request).toHaveBeenCalledWith(
      '/batches',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Replaces-Batch-Reference': '223e4567-e89b-42d3-a456-426614174000',
        }),
      }),
    );
  });
});
