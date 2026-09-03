import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { closeHealthServer, HealthMonitor, startHealthServer } from '../src/health';
import type { Logger } from '../src/logger';

const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const metrics = {
  active: 0,
  abandoned: 0,
  completed: 0,
  deadLettered: 0,
  deliveryErrors: 0,
  received: 0,
};
const servers: Awaited<ReturnType<typeof startHealthServer>>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => closeHealthServer(server)));
});

describe('worker health', () => {
  it('reports liveness independently while readiness includes all dependency results', async () => {
    const monitor = new HealthMonitor(
      {
        database: async () => undefined,
        objectStorage: async () => undefined,
        serviceBus: async () => {
          throw new Error('queue unavailable');
        },
      },
      60_000,
      500,
      logger,
    );
    await monitor.start();
    const server = await startHealthServer(0, monitor, metrics, 'worker-test');
    servers.push(server);
    const port = (server.address() as AddressInfo).port;

    const live = await fetch(`http://127.0.0.1:${port}/health/live`);
    const ready = await fetch(`http://127.0.0.1:${port}/health/ready`);

    expect(live.status).toBe(200);
    expect(await live.json()).toMatchObject({ service: 'sport-analytics-worker', status: 'live' });
    expect(ready.status).toBe(503);
    expect(await ready.json()).toMatchObject({
      status: 'not_ready',
      dependencies: {
        database: { status: 'up' },
        objectStorage: { status: 'up' },
        serviceBus: { status: 'down' },
      },
    });
    await monitor.stop();
  });

  it('becomes unready before shutdown while keeping the process live during drain', async () => {
    const monitor = new HealthMonitor(
      {
        database: async () => undefined,
        objectStorage: async () => undefined,
        serviceBus: async () => undefined,
      },
      60_000,
      500,
      logger,
    );
    await monitor.start();
    expect(monitor.ready).toBe(true);
    monitor.markShuttingDown();
    expect(monitor.ready).toBe(false);
    await monitor.stop();
  });
});
