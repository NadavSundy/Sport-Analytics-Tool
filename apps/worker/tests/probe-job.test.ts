import { describe, expect, it, vi } from 'vitest';

import { PermanentJobError, type ReceivedJob } from '../src/delivery-pump';
import type { Logger } from '../src/logger';
import { createProbeJobHandler } from '../src/probe-job';

const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe('deployment probe job', () => {
  it('checks database and private object storage without writing domain data', async () => {
    const database = vi.fn(async () => undefined);
    const objectStorage = vi.fn(async () => undefined);
    const handler = createProbeJobHandler({ database, objectStorage }, logger);
    const message: ReceivedJob = {
      body: {
        type: 'worker.probe',
        version: 1,
        commandId: '00000000-0000-4000-8000-000000000365',
        traceId: 'manual-recovery-check',
      },
      deliveryCount: 2,
      messageId: 'probe-365',
    };

    await handler(message, new AbortController().signal);
    await handler(message, new AbortController().signal);

    expect(database).toHaveBeenCalledTimes(2);
    expect(objectStorage).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown job types and versions as permanent contract failures', async () => {
    const handler = createProbeJobHandler({ database: vi.fn(), objectStorage: vi.fn() }, logger);

    await expect(
      handler(
        { body: { type: 'batch.validate', version: 1 }, deliveryCount: 1, messageId: 'future' },
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(PermanentJobError);
  });
});
