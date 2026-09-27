import { describe, expect, it, vi } from 'vitest';

import { PermanentJobError, type ReceivedJob } from '../src/delivery-pump';
import { createJobHandler } from '../src/job-handler';

const message = (body: unknown): ReceivedJob => ({
  body,
  deliveryCount: 1,
  messageId: 'message-1',
});

describe('worker job dispatcher', () => {
  it('routes probe, validation, publication and dataset release contracts independently', async () => {
    const probe = vi.fn().mockResolvedValue(undefined);
    const batchValidation = vi.fn().mockResolvedValue(undefined);
    const batchPublication = vi.fn().mockResolvedValue(undefined);
    const datasetRelease = vi.fn().mockResolvedValue(undefined);

    const handler = createJobHandler({
      probe,
      batchValidation,
      batchPublication,
      datasetRelease,
    });

    const signal = new AbortController().signal;

    await handler(message({ type: 'worker.probe', version: 1 }), signal);
    await handler(message({ type: 'batch.validate', version: 1 }), signal);
    await handler(message({ type: 'batch.publish', version: 1 }), signal);
    await handler(message({ type: 'dataset-release.generate', version: 1 }), signal);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(batchValidation).toHaveBeenCalledTimes(1);
    expect(batchPublication).toHaveBeenCalledTimes(1);
    expect(datasetRelease).toHaveBeenCalledTimes(1);
  });

  it('dead-letters unknown command versions as permanent contract faults', async () => {
    const handler = createJobHandler({
      probe: vi.fn(),
      batchValidation: vi.fn(),
      batchPublication: vi.fn(),
      datasetRelease: vi.fn(),
    });

    await expect(
      handler(message({ type: 'batch.validate', version: 2 }), new AbortController().signal),
    ).rejects.toBeInstanceOf(PermanentJobError);
  });
});
