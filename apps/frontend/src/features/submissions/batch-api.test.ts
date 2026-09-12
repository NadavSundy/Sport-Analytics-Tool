import { describe, expect, test } from 'vitest';

import { batchUploadIdempotencyKey } from './batch-api';

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
});
