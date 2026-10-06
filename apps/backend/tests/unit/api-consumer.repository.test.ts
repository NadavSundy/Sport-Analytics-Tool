import { describe, expect, test, vi } from 'vitest';

import type { Pool, PoolClient } from 'pg';

import {
  ApiConsumerNotFoundError,
  createApiConsumerRepository,
  hashApiKey,
} from '../../src/modules/api-consumers/api-consumer.repository';

const queryResult = <Row>(rows: Row[], rowCount = rows.length) => ({
  rows,
  rowCount,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

const consumerRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: '44',
  name: 'Research client',
  rateLimitPerMinute: 60,
  dailyQuota: 1000,
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  ...overrides,
});

const keyRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: '55',
  consumerId: '44',
  prefix: 'sat_live_abcd',
  createdAt: new Date('2026-09-01T10:01:00.000Z'),
  revokedAt: null,
  ...overrides,
});

function transactionalPool(query: ReturnType<typeof vi.fn>) {
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  return {
    pool: { connect: vi.fn().mockResolvedValue(client), query } as unknown as Pool,
    release,
  };
}

describe('API consumer repository', () => {
  test('hashes API keys deterministically without retaining raw credentials', () => {
    expect(hashApiKey('sat_live_secret')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashApiKey('sat_live_secret')).toBe(hashApiKey('sat_live_secret'));
    expect(hashApiKey('sat_live_secret')).not.toBe(hashApiKey('sat_live_other'));
  });

  test('issues a consumer and its first key atomically for the owner', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([consumerRow()]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([consumerRow()]))
      .mockResolvedValueOnce(queryResult([keyRow()]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool, release } = transactionalPool(query);

    const issued = await createApiConsumerRepository(pool).issue(
      '7',
      { name: 'Research client', rateLimitPerMinute: 60, dailyQuota: 1000 },
      { raw: 'sat_live_secret', prefix: 'sat_live_abcd', hash: 'hash-value' },
    );

    expect(issued).toMatchObject({ id: '44', keys: [{ id: '55', revokedAt: null }] });
    expect(query.mock.calls[1]?.[1]).toEqual(['7', 'Research client', 60, 1000]);
    expect(query.mock.calls[3]?.[1]).toEqual(['44', 'sat_live_abcd', 'hash-value']);
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  test('lists and finds only consumers owned by the requesting account', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([{ id: '44' }]))
      .mockResolvedValueOnce(queryResult([consumerRow()]))
      .mockResolvedValueOnce(queryResult([keyRow()]))
      .mockResolvedValueOnce(queryResult([{ id: '44' }]))
      .mockResolvedValueOnce(queryResult([consumerRow()]))
      .mockResolvedValueOnce(
        queryResult([keyRow({ revokedAt: new Date('2026-09-02T10:00:00.000Z') })]),
      )
      .mockResolvedValueOnce(queryResult([]));
    const repository = createApiConsumerRepository({ query } as unknown as Pool);

    await expect(repository.list('7')).resolves.toMatchObject([{ id: '44', keys: [{ id: '55' }] }]);
    await expect(repository.findOwned('7', '44')).resolves.toMatchObject({
      id: '44',
      keys: [{ revokedAt: '2026-09-02T10:00:00.000Z' }],
    });
    await expect(repository.findOwned('8', '44')).resolves.toBeNull();
    expect(query.mock.calls[3]?.[1]).toEqual(['44', '7']);
  });

  test('rotates keys under an ownership lock and rejects unknown consumers', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ id: '44' }]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([consumerRow()]))
      .mockResolvedValueOnce(queryResult([keyRow({ prefix: 'sat_live_new' })]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    await expect(
      createApiConsumerRepository(pool).rotate('7', '44', {
        raw: 'sat_live_new_secret',
        prefix: 'sat_live_new',
        hash: 'new-hash',
      }),
    ).resolves.toMatchObject({ keys: [{ prefix: 'sat_live_new' }] });
    expect(query.mock.calls[1]?.[0]).toContain('FOR UPDATE');
    expect(query.mock.calls[2]?.[0]).toContain('revoked_at = now()');
    expect(query.mock.calls[3]?.[1]).toEqual(['44', 'sat_live_new', 'new-hash']);

    const missingQuery = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]));
    const missing = transactionalPool(missingQuery);
    await expect(
      createApiConsumerRepository(missing.pool).rotate('7', '404', {
        raw: 'unused',
        prefix: 'unused',
        hash: 'unused',
      }),
    ).rejects.toBeInstanceOf(ApiConsumerNotFoundError);
  });

  test('revokes only a live key owned by the account', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([], 1))
      .mockResolvedValueOnce(queryResult([], 0));
    const repository = createApiConsumerRepository({ query } as unknown as Pool);

    await expect(repository.revoke('7', '44', '55')).resolves.toBeUndefined();
    expect(query.mock.calls[0]?.[1]).toEqual(['55', '44', '7']);
    await expect(repository.revoke('8', '44', '55')).rejects.toBeInstanceOf(
      ApiConsumerNotFoundError,
    );
  });

  test('authenticates only active approved consumers and preserves missing state', async () => {
    const active = { consumerId: '44', keyId: '55', rateLimitPerMinute: 60, dailyQuota: 1000 };
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([active]))
      .mockResolvedValueOnce(queryResult([]));
    const repository = createApiConsumerRepository({ query } as unknown as Pool);

    await expect(repository.findActiveConsumer('hash-value')).resolves.toEqual(active);
    await expect(repository.findActiveConsumer('revoked-hash')).resolves.toBeNull();
    expect(query.mock.calls[0]?.[0]).toContain("access_request.request_state = 'approved'");
    expect(query.mock.calls[0]?.[0]).toContain('key.revoked_at IS NULL');
  });

  test('enforces minute and daily bounds with exact usage counts', async () => {
    const at = new Date('2026-09-01T10:00:42.000Z');
    const windowStart = new Date('2026-09-01T10:00:00.000Z');
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([{ requestCount: 3, windowStart }]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ requestCount: 9 }]))
      .mockResolvedValueOnce(queryResult([]));
    const repository = createApiConsumerRepository({ query } as unknown as Pool);

    await expect(repository.consumeRateLimit('44', 60, at)).resolves.toEqual({
      allowed: true,
      used: 3,
      resetAt: new Date('2026-09-01T10:01:00.000Z'),
    });
    await expect(repository.consumeRateLimit('44', 60, at)).resolves.toEqual({
      allowed: false,
      used: 60,
      resetAt: new Date('2026-09-01T10:01:00.000Z'),
    });
    await expect(repository.consumeDailyQuota('44', 1000)).resolves.toEqual({
      allowed: true,
      used: 9,
    });
    await expect(repository.consumeDailyQuota('44', 1000)).resolves.toEqual({
      allowed: false,
      used: 1000,
    });
  });

  test('records and lists bounded usage aggregates with an empty-total fallback', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ totalRequests: 12 }]))
      .mockResolvedValueOnce(
        queryResult([
          {
            date: '2026-09-01',
            endpoint: '/api/v1/fixtures',
            statusClass: '2xx',
            requestCount: 12,
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]));
    const repository = createApiConsumerRepository({ query } as unknown as Pool);
    const at = new Date('2026-09-01T10:00:00.000Z');

    await repository.recordUsage?.({
      consumerId: '44',
      keyId: '55',
      endpoint: '/api/v1/fixtures',
      statusClass: '2xx',
      at,
    });
    expect(query.mock.calls[0]?.[1]).toEqual(['44', '55', at, '/api/v1/fixtures', '2xx']);
    await expect(
      repository.listUsage?.('44', { from: '2026-09-01', to: '2026-09-02', limit: 20 }),
    ).resolves.toEqual({
      totalRequests: 12,
      entries: [
        { date: '2026-09-01', endpoint: '/api/v1/fixtures', statusClass: '2xx', requestCount: 12 },
      ],
    });
    await expect(
      repository.listUsage?.('44', { from: '2026-09-03', to: '2026-09-04', limit: 20 }),
    ).resolves.toEqual({ totalRequests: 0, entries: [] });
  });
});
