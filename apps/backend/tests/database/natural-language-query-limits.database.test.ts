import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import type { NaturalLanguageQueryBucket } from '../../src/modules/analytics-query/natural-language-query.limiter';
import { createNaturalLanguageQueryUsageRepository } from '../../src/modules/analytics-query/natural-language-query.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const keyPrefix = `nl-query-test-${process.pid}`;
const WINDOW = new Date('2026-10-01T12:34:00.000Z');
const DAY = new Date('2026-10-01T00:00:00.000Z');

describe.sequential('natural-language query limit persistence', () => {
  let pool: Pool;

  beforeAll(() => {
    const url = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: url.toString() });
  });

  afterAll(async () => {
    await executeQuery(pool, 'DELETE FROM natural_language_query_usage WHERE bucket_key LIKE $1', [
      `${keyPrefix}%`,
    ]);
    await pool.end();
  });

  test('counts a bucket up to its limit and then refuses', async () => {
    const repository = createNaturalLanguageQueryUsageRepository(pool);
    const key = `${keyPrefix}-minute`;

    const first = await repository.consume('client_minute', key, WINDOW, 2);
    const second = await repository.consume('client_minute', key, WINDOW, 2);
    const third = await repository.consume('client_minute', key, WINDOW, 2);

    expect(first).toEqual({ allowed: true, used: 1 });
    expect(second).toEqual({ allowed: true, used: 2 });
    expect(third).toEqual({ allowed: false, used: 2 });
  });

  // An exhausted bucket must not be driven higher by further attempts, or the
  // stored count would say more requests were admitted than were.
  test('does not increment past the limit once refused', async () => {
    const repository = createNaturalLanguageQueryUsageRepository(pool);
    const key = `${keyPrefix}-capped`;

    await repository.consume('client_minute', key, WINDOW, 1);
    await repository.consume('client_minute', key, WINDOW, 1);
    await repository.consume('client_minute', key, WINDOW, 1);

    const stored = await executeQuery<{ requestCount: number }>(
      pool,
      `SELECT request_count AS "requestCount" FROM natural_language_query_usage
       WHERE bucket_kind = 'client_minute' AND bucket_key = $1 AND window_start = $2`,
      [key, WINDOW],
    );

    expect(stored.rows[0]?.requestCount).toBe(1);
  });

  test('keeps separate counts per bucket kind, key and window', async () => {
    const repository = createNaturalLanguageQueryUsageRepository(pool);
    const key = `${keyPrefix}-separate`;

    await repository.consume('client_minute', key, WINDOW, 5);
    await repository.consume('client_minute', key, WINDOW, 5);
    const otherKind = await repository.consume('client_day', key, DAY, 5);
    const otherKey = await repository.consume('client_minute', `${key}-other`, WINDOW, 5);
    const otherWindow = await repository.consume(
      'client_minute',
      key,
      new Date('2026-10-01T12:35:00.000Z'),
      5,
    );

    expect(otherKind).toEqual({ allowed: true, used: 1 });
    expect(otherKey).toEqual({ allowed: true, used: 1 });
    expect(otherWindow).toEqual({ allowed: true, used: 1 });
  });

  test('counts the global bucket under its empty key', async () => {
    const repository = createNaturalLanguageQueryUsageRepository(pool);
    const window = new Date('2031-01-01T00:00:00.000Z');

    const first = await repository.consume('global_day', '', window, 2);
    const second = await repository.consume('global_day', '', window, 2);

    expect([first.allowed, second.allowed]).toEqual([true, true]);
    await executeQuery(
      pool,
      `DELETE FROM natural_language_query_usage WHERE bucket_kind = 'global_day' AND window_start = $1`,
      [window],
    );
  });

  // Concurrent admissions share one row, so the primary key has to serialise
  // them: more admissions than the limit would mean paying for calls the limit
  // was supposed to prevent.
  test('admits no more than the limit under concurrent attempts', async () => {
    const repository = createNaturalLanguageQueryUsageRepository(pool);
    const key = `${keyPrefix}-concurrent`;

    const results = await Promise.all(
      Array.from({ length: 12 }, () => repository.consume('client_minute', key, WINDOW, 4)),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(4);
  });

  test('rejects a bucket kind the table does not name', async () => {
    const repository = createNaturalLanguageQueryUsageRepository(pool);

    await expect(
      repository.consume(
        'client_hour' as NaturalLanguageQueryBucket,
        `${keyPrefix}-invalid`,
        WINDOW,
        5,
      ),
    ).rejects.toThrow();
  });

  describe('the daily client salt', () => {
    test('generates a salt on first use and returns the same salt afterwards', async () => {
      const repository = createNaturalLanguageQueryUsageRepository(pool);
      const usageDate = '2031-02-03';

      const first = await repository.readClientSalt(usageDate);
      const second = await repository.readClientSalt(usageDate);

      expect(first).toHaveLength(32);
      expect(first.equals(second)).toBe(true);
      await executeQuery(
        pool,
        'DELETE FROM natural_language_query_client_salt WHERE usage_date = $1',
        [usageDate],
      );
    });

    test('gives different dates different salts', async () => {
      const repository = createNaturalLanguageQueryUsageRepository(pool);

      const first = await repository.readClientSalt('2031-02-04');
      const second = await repository.readClientSalt('2031-02-05');

      expect(first.equals(second)).toBe(false);
      await executeQuery(
        pool,
        'DELETE FROM natural_language_query_client_salt WHERE usage_date = ANY($1::date[])',
        [['2031-02-04', '2031-02-05']],
      );
    });

    // Two replicas can reach a new date at the same moment; both must end up
    // with the one salt that was stored, or their client hashes would disagree.
    test('returns one salt when a date is first read concurrently', async () => {
      const repository = createNaturalLanguageQueryUsageRepository(pool);
      const usageDate = '2031-02-06';

      const salts = await Promise.all(
        Array.from({ length: 6 }, () => repository.readClientSalt(usageDate)),
      );

      const distinct = new Set(salts.map((salt) => salt.toString('hex')));
      expect(distinct.size).toBe(1);
      await executeQuery(
        pool,
        'DELETE FROM natural_language_query_client_salt WHERE usage_date = $1',
        [usageDate],
      );
    });
  });
});
