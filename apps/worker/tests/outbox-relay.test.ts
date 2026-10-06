import type { Pool } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../src/logger';
import { OutboxRelay } from '../src/outbox-relay';

const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

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

  it('leaves an empty outbox untouched and preserves the configured claim bounds', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const sender = { send: vi.fn() };
    const relay = new OutboxRelay({ query } as unknown as Pool, sender, logger, {
      workerId: 'worker-1',
      pollIntervalMs: 250,
      claimTtlMs: 12_345,
      batchSize: 7,
    });

    await relay.runCycle();

    expect(sender.send).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2::integer'), [
      'worker-1',
      7,
      12_345,
    ]);
    expect(relay.metrics).toEqual({ claimed: 0, published: 0, publishFailures: 0, cycles: 1 });
  });

  it('records a database claim error without attempting downstream delivery', async () => {
    const query = vi.fn().mockRejectedValue(new Error('database unavailable'));
    const sender = { send: vi.fn() };
    const relay = new OutboxRelay({ query } as unknown as Pool, sender, logger, {
      workerId: 'worker-1',
      pollIntervalMs: 250,
      claimTtlMs: 30_000,
      batchSize: 20,
    });

    await relay.runCycle();

    expect(sender.send).not.toHaveBeenCalled();
    expect(relay.metrics).toMatchObject({ cycles: 1, claimed: 0, publishFailures: 1 });
    expect(logger.warn).toHaveBeenCalledWith('Outbox claim failed.', { errorName: 'Error' });
  });

  it('remains retryable when both publication and best-effort lease release fail', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ outboxMessageId: '123e4567-e89b-42d3-a456-426614174000', body: { command: 1 } }],
      })
      .mockRejectedValueOnce(new Error('database disconnected'));
    const sender = { send: vi.fn().mockRejectedValue('broker refused') };
    const relay = new OutboxRelay({ query } as unknown as Pool, sender, logger, {
      workerId: 'worker-1',
      pollIntervalMs: 250,
      claimTtlMs: 30_000,
      batchSize: 20,
    });

    await expect(relay.runCycle()).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledTimes(2);
    expect(relay.metrics).toMatchObject({ claimed: 1, published: 0, publishFailures: 1 });
    expect(logger.warn).toHaveBeenCalledWith('Outbox publish failed; commands remain retryable.', {
      count: 1,
      errorName: 'UnknownError',
    });
  });

  it('runs one scheduled cycle, rejects duplicate starts, and stops without another poll', async () => {
    vi.useFakeTimers();
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const relay = new OutboxRelay({ query } as unknown as Pool, { send: vi.fn() }, logger, {
      workerId: 'worker-1',
      pollIntervalMs: 100,
      claimTtlMs: 30_000,
      batchSize: 20,
    });

    relay.start();
    expect(() => relay.start()).toThrow('Outbox relay has already started.');
    await vi.advanceTimersByTimeAsync(0);
    await relay.stop();
    await vi.advanceTimersByTimeAsync(500);

    expect(query).toHaveBeenCalledOnce();
    expect(relay.metrics.cycles).toBe(1);
  });
});
