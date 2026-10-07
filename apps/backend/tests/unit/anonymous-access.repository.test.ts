import { describe, expect, test, vi } from 'vitest';

import type { Pool, PoolClient } from 'pg';

import { createAnonymousAccessRepository } from '../../src/modules/api-consumers/anonymous-access.repository';

const queryResult = <Row>(rows: Row[], rowCount = rows.length) => ({
  rows,
  rowCount,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

function poolWithQuery(query: ReturnType<typeof vi.fn>) {
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  return {
    pool: { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool,
    release,
  };
}

describe('anonymous access repository', () => {
  test('increments source and global counters atomically and performs bounded cleanup once', async () => {
    const windowStart = new Date('2026-09-01T10:00:00.000Z');
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([], 1))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ requestCount: 4, windowStart }]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ requestCount: 2, windowStart }]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool, release } = poolWithQuery(query);

    const result = await createAnonymousAccessRepository(pool).consume({
      sourceKey: 'hash:source',
      sourceLimit: 10,
      globalLimit: 100,
      at: new Date('2026-09-01T10:00:42.000Z'),
    });

    expect(result).toEqual({
      allowed: true,
      sourceUsed: 3,
      globalUsed: 5,
      exceeded: null,
      resetAt: new Date('2026-09-01T10:01:00.000Z'),
    });
    expect(
      query.mock.calls.filter((call) => String(call[0]).includes("INTERVAL '2 days'")),
    ).toHaveLength(2);
    expect(query.mock.calls[7]?.[0]).toContain('UPDATE api_anonymous_global_minute_usage');
    expect(query.mock.calls[8]?.[0]).toContain('UPDATE api_anonymous_source_minute_usage');
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  test('stops at the global bound without reading or incrementing a source counter', async () => {
    const windowStart = new Date('2026-09-01T10:00:00.000Z');
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([], 0))
      .mockResolvedValueOnce(queryResult([{ requestCount: 100, windowStart }]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = poolWithQuery(query);

    await expect(
      createAnonymousAccessRepository(pool).consume({
        sourceKey: 'hash:source',
        sourceLimit: 10,
        globalLimit: 100,
        at: windowStart,
      }),
    ).resolves.toEqual({
      allowed: false,
      sourceUsed: 0,
      globalUsed: 100,
      exceeded: 'global',
      resetAt: new Date('2026-09-01T10:01:00.000Z'),
    });
    expect(
      query.mock.calls.some((call) =>
        String(call[0]).includes('api_anonymous_source_minute_usage'),
      ),
    ).toBe(false);
  });

  test('stops at the per-source bound without incrementing either counter', async () => {
    const windowStart = new Date('2026-09-01T10:00:00.000Z');
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([], 0))
      .mockResolvedValueOnce(queryResult([{ requestCount: 30, windowStart }]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ requestCount: 10, windowStart }]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = poolWithQuery(query);

    await expect(
      createAnonymousAccessRepository(pool).consume({
        sourceKey: 'hash:source',
        sourceLimit: 10,
        globalLimit: 100,
        at: windowStart,
      }),
    ).resolves.toEqual({
      allowed: false,
      sourceUsed: 10,
      globalUsed: 30,
      exceeded: 'source',
      resetAt: new Date('2026-09-01T10:01:00.000Z'),
    });
    expect(query.mock.calls.filter((call) => String(call[0]).startsWith('UPDATE'))).toHaveLength(0);
  });
});
