import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { DatabaseDeliveryReceiver } from '../src/database-delivery-receiver';

const databaseMessage = {
  messageId: '55555555-5555-4555-8555-555555555555',
  outboxMessageId: '55555555-5555-4555-8555-555555555555',
  deliveryCount: 2,
  body: { type: 'worker.probe', version: 1 },
};

function poolWithQuery(query: ReturnType<typeof vi.fn>) {
  return { query } as unknown as Pool;
}

describe('database delivery receiver', () => {
  it('claims the oldest available row with a bounded read and delivers its durable context', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          outboxMessageId: databaseMessage.outboxMessageId,
          deliveryCount: databaseMessage.deliveryCount,
          body: databaseMessage.body,
        },
      ],
      rowCount: 1,
    });
    const receiver = new DatabaseDeliveryReceiver(poolWithQuery(query), 'worker-866', 60_000);
    const processMessage = vi.fn().mockResolvedValue(undefined);
    const processError = vi.fn().mockResolvedValue(undefined);

    const subscription = receiver.subscribe({ processMessage, processError });
    await vi.waitFor(() => expect(processMessage).toHaveBeenCalledOnce());
    await subscription.close();

    expect(processMessage).toHaveBeenCalledWith(databaseMessage);
    expect(processError).not.toHaveBeenCalled();
    const [sql, values] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('ORDER BY created_at,outbox_message_id');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED LIMIT 1');
    expect(values).toEqual(['worker-866']);
  });

  it('reports database failures without fabricating a delivery', async () => {
    const query = vi.fn().mockRejectedValue('connection lost');
    const receiver = new DatabaseDeliveryReceiver(poolWithQuery(query), 'worker-866', 60_000);
    const processMessage = vi.fn().mockResolvedValue(undefined);
    const processError = vi.fn().mockResolvedValue(undefined);

    const subscription = receiver.subscribe({ processMessage, processError });
    await vi.waitFor(() => expect(processError).toHaveBeenCalledOnce());
    await subscription.close();

    expect(processMessage).not.toHaveBeenCalled();
    expect(processError).toHaveBeenCalledWith(new Error('Database delivery failed.'));
  });

  it('acknowledges and abandons only the row claimed by this worker', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const receiver = new DatabaseDeliveryReceiver(poolWithQuery(query), 'worker-866', 60_000);

    await receiver.complete(databaseMessage);
    await receiver.abandon(databaseMessage);

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SET published_at=now(),claim_owner=NULL'),
      [databaseMessage.outboxMessageId, 'worker-866'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET claim_owner=NULL,claim_expires_at=NULL'),
      [databaseMessage.outboxMessageId, 'worker-866'],
    );
    await expect(
      receiver.complete({ messageId: 'missing', deliveryCount: 1, body: {} }),
    ).rejects.toThrow('no database outbox context');
  });

  it('dead-letters the durable job and acknowledges the row in one transaction', async () => {
    const statements: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: vi.fn(async (text: string, values?: unknown[]) => {
        statements.push({ text, values });
        return { rows: [], rowCount: 1 };
      }),
      release: vi.fn(),
    } as unknown as PoolClient;
    const database = { connect: vi.fn(async () => client) } as unknown as Pool;
    const receiver = new DatabaseDeliveryReceiver(database, 'worker-866', 60_000);

    await receiver.deadLetter(databaseMessage, 'UnsupportedJob', 'x'.repeat(700));

    expect(statements.map((entry) => entry.text)).toEqual([
      'BEGIN',
      expect.stringContaining("SET state='dead_lettered'"),
      expect.stringContaining('SET published_at=now()'),
      'COMMIT',
    ]);
    expect(statements[1]?.values).toEqual([
      databaseMessage.outboxMessageId,
      'UnsupportedJob',
      'x'.repeat(500),
    ]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back a failed dead-letter transaction and preserves the original error', async () => {
    const failure = new Error('job update failed');
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    } as unknown as PoolClient;
    const receiver = new DatabaseDeliveryReceiver(
      { connect: vi.fn(async () => client) } as unknown as Pool,
      'worker-866',
      60_000,
    );

    await expect(receiver.deadLetter(databaseMessage, 'Failure', 'detail')).rejects.toBe(failure);

    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('stops polling after close', async () => {
    vi.useFakeTimers();
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const receiver = new DatabaseDeliveryReceiver(poolWithQuery(query), 'worker-866', 25);
    const handlers = {
      processMessage: vi.fn().mockResolvedValue(undefined),
      processError: vi.fn().mockResolvedValue(undefined),
    };

    receiver.subscribe(handlers);
    await vi.advanceTimersByTimeAsync(0);
    expect(query).toHaveBeenCalledOnce();

    await receiver.close();
    await vi.advanceTimersByTimeAsync(100);
    expect(query).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
