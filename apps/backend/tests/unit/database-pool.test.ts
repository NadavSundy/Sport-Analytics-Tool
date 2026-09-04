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
});
