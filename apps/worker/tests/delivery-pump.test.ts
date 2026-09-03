import { describe, expect, it, vi } from 'vitest';

import {
  DeliveryPump,
  PermanentJobError,
  type DeliveryReceiver,
  type ReceivedJob,
} from '../src/delivery-pump';
import type { Logger } from '../src/logger';

function createLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function createReceiver() {
  let handlers:
    | {
        processError(error: Error): Promise<void>;
        processMessage(message: ReceivedJob): Promise<void>;
      }
    | undefined;
  const receiver: DeliveryReceiver = {
    subscribe: vi.fn((nextHandlers) => {
      handlers = nextHandlers;
      return { close: vi.fn(async () => undefined) };
    }),
    complete: vi.fn(async () => undefined),
    abandon: vi.fn(async () => undefined),
    deadLetter: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  return { receiver, handlers: () => handlers };
}

const message: ReceivedJob = {
  body: { type: 'worker.probe', version: 1 },
  deliveryCount: 1,
  messageId: 'outbox-1',
};

describe('DeliveryPump', () => {
  it('settles a delivery only after its handler commits successfully', async () => {
    const order: string[] = [];
    const { receiver, handlers } = createReceiver();
    vi.mocked(receiver.complete).mockImplementation(async () => {
      order.push('complete');
    });
    const pump = new DeliveryPump(
      receiver,
      async () => {
        order.push('handle');
      },
      createLogger(),
    );

    pump.start();
    await handlers()?.processMessage(message);

    expect(order).toEqual(['handle', 'complete']);
    expect(pump.metrics).toMatchObject({ received: 1, completed: 1, active: 0 });
  });

  it('abandons transient failures so peek-lock expiry or restart can redeliver them', async () => {
    const { receiver, handlers } = createReceiver();
    const pump = new DeliveryPump(
      receiver,
      async () => {
        throw new Error('temporary dependency failure');
      },
      createLogger(),
    );

    pump.start();
    await handlers()?.processMessage(message);

    expect(receiver.abandon).toHaveBeenCalledWith(message);
    expect(receiver.complete).not.toHaveBeenCalled();
    expect(pump.metrics.abandoned).toBe(1);
  });

  it('dead-letters unsupported contracts without retrying them', async () => {
    const { receiver, handlers } = createReceiver();
    const pump = new DeliveryPump(
      receiver,
      async () => {
        throw new PermanentJobError('UnsupportedJobContract', 'unsupported');
      },
      createLogger(),
    );

    pump.start();
    await handlers()?.processMessage(message);

    expect(receiver.deadLetter).toHaveBeenCalledWith(
      message,
      'UnsupportedJobContract',
      'unsupported',
    );
    expect(receiver.abandon).not.toHaveBeenCalled();
  });

  it('drains an active delivery before closing during graceful shutdown', async () => {
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { receiver, handlers } = createReceiver();
    const pump = new DeliveryPump(receiver, async () => pending, createLogger());
    pump.start();

    const processing = handlers()?.processMessage(message);
    const stopping = pump.stop(1_000);
    expect(receiver.close).not.toHaveBeenCalled();
    finish?.();

    await expect(stopping).resolves.toBe(true);
    await processing;
    expect(receiver.complete).toHaveBeenCalledOnce();
    expect(receiver.close).toHaveBeenCalledOnce();
  });

  it('ends the receiver after the drain deadline so broker locks can expire and recover', async () => {
    const { receiver, handlers } = createReceiver();
    const pump = new DeliveryPump(
      receiver,
      async (_message, signal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        }),
      createLogger(),
    );
    pump.start();
    const processing = handlers()?.processMessage(message);

    await expect(pump.stop(5)).resolves.toBe(false);
    await processing;

    expect(receiver.close).toHaveBeenCalledOnce();
    expect(receiver.abandon).toHaveBeenCalledWith(message);
    expect(receiver.complete).not.toHaveBeenCalled();
  });
});
