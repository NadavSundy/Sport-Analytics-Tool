import { createServer } from 'node:net';

import { afterEach, describe, expect, test } from 'vitest';

import { closeDatabasePool, getDatabasePool } from '../../src/database';

describe('application database pool', () => {
  afterEach(async () => {
    await closeDatabasePool();
    delete process.env.DATABASE_URL;
  });

  test('retains one idle client so normal idle periods do not force a cold reconnect', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/sport_analytics';

    const pool = getDatabasePool();

    expect(pool.options.min).toBe(1);
    expect(pool.options.max).toBe(10);
    expect(pool.options.idleTimeoutMillis).toBe(30_000);
  });

  // Without this bound pg-pool installs no connection timer at all: a stalled
  // connection leaves the query pending indefinitely, so the request never
  // fails and the interface never leaves its loading state. The configuration
  // assertion above passed while this bound was absent, which is how its
  // removal reached the deployed environment.
  test('bounds how long a request waits for a connection so a stall fails visibly', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/sport_analytics';

    const pool = getDatabasePool();

    expect(pool.options.connectionTimeoutMillis).toBe(10_000);
  });

  test('a stalled connection rejects rather than pending forever', async () => {
    const server = createServer((socket) => {
      // Accept the connection and never answer the PostgreSQL startup message.
      socket.on('data', () => {});
      socket.on('error', () => {});
    });

    const port = await new Promise<number>((resolvePort, rejectPort) => {
      server.once('error', rejectPort);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          rejectPort(new Error('Could not allocate a port for the stalled connection test.'));
          return;
        }
        resolvePort(address.port);
      });
    });

    process.env.DATABASE_URL = `postgresql://test:test@127.0.0.1:${port}/sport_analytics`;

    try {
      const outcome = await Promise.race([
        getDatabasePool()
          .query('SELECT 1')
          .then(
            () => 'resolved',
            () => 'rejected',
          ),
        new Promise<string>((resolvePending) =>
          setTimeout(() => resolvePending('pending'), 15_000),
        ),
      ]);

      expect(outcome).toBe('rejected');
    } finally {
      await new Promise<void>((closed) => server.close(() => closed()));
    }
  }, 30_000);
});
