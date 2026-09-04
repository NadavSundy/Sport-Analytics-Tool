import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../src/logger';
import { OutboxRelay } from '../src/outbox-relay';

const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe('transactional outbox relay', () => {
  it('publishes a claimed command with the stable outbox id then marks it published', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            outboxMessageId: '123e4567-e89b-42d3-a456-426614174000',
            body: { type: 'batch.validate', version: 1 },
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const sender = { send: vi.fn().mockResolvedValue(undefined) };
    const relay = new OutboxRelay({ query } as unknown as Pool, sender, logger, {
      workerId: 'worker-1',
      pollIntervalMs: 1000,
      claimTtlMs: 30000,
      batchSize: 20,
    });

    await relay.runCycle();

    expect(sender.send).toHaveBeenCalledWith([
      {
        messageId: '123e4567-e89b-42d3-a456-426614174000',
        body: { type: 'batch.validate', version: 1 },
      },
    ]);
    expect(query).toHaveBeenCalledTimes(2);
    expect(relay.metrics).toMatchObject({ claimed: 1, published: 1, publishFailures: 0 });
  });

  it('releases the lease and keeps the command retryable when broker publication fails', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            outboxMessageId: '123e4567-e89b-42d3-a456-426614174000',
            body: { type: 'batch.validate', version: 1 },
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const sender = { send: vi.fn().mockRejectedValue(new Error('broker unavailable')) };
    const relay = new OutboxRelay({ query } as unknown as Pool, sender, logger, {
      workerId: 'worker-1',
      pollIntervalMs: 1000,
      claimTtlMs: 30000,
      batchSize: 20,
    });

    await relay.runCycle();

    expect(query).toHaveBeenCalledTimes(2);
    expect(relay.metrics.publishFailures).toBe(1);
    expect(relay.metrics.published).toBe(0);
  });
});
