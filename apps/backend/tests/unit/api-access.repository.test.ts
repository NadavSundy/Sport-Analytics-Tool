import { describe, expect, test, vi } from 'vitest';

import type { Pool, PoolClient } from 'pg';

import {
  ApiAccessConflictError,
  ApiAccessRequestNotFoundError,
  createApiAccessRepository,
} from '../../src/modules/api-consumers/api-access.repository';

const queryResult = <Row>(rows: Row[], rowCount = rows.length) => ({
  rows,
  rowCount,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

const requestRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: '31',
  requesterAccountId: '7',
  name: 'University research client',
  intendedUse: 'Analyse public cricket statistics.',
  state: 'pending',
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  reviewedAt: null,
  reviewReason: null,
  reviewedById: null,
  reviewedByName: null,
  consumerId: null,
  requesterAuthSubject: 'auth-subject-7',
  requesterDisplayName: 'Nadia',
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

describe('API access repository', () => {
  test('creates one pending request transactionally and maps its public record', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ id: '31' }]))
      .mockResolvedValueOnce(queryResult([requestRow()]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool, release } = transactionalPool(query);

    const created = await createApiAccessRepository(pool).createRequest('7', {
      name: 'University research client',
      intendedUse: 'Analyse public cricket statistics.',
    });

    expect(created).toEqual({
      id: '31',
      requesterAccountId: '7',
      name: 'University research client',
      intendedUse: 'Analyse public cricket statistics.',
      state: 'pending',
      createdAt: '2026-09-01T10:00:00.000Z',
      reviewedAt: null,
      reviewedBy: null,
      reviewReason: null,
    });
    expect(query.mock.calls[1]?.[0]).toContain('pg_advisory_xact_lock');
    expect(query.mock.calls[3]?.[1]).toEqual([
      '7',
      'University research client',
      'Analyse public cricket statistics.',
    ]);
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  test('rejects a duplicate active request before insertion and rolls back', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ exists: 1 }]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    await expect(
      createApiAccessRepository(pool).createRequest('7', {
        name: 'Duplicate',
        intendedUse: 'Duplicate active request.',
      }),
    ).rejects.toBeInstanceOf(ApiAccessConflictError);
    expect(
      query.mock.calls.some((call) =>
        String(call[0]).includes('INSERT INTO api_consumer_access_request'),
      ),
    ).toBe(false);
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('ROLLBACK');
  });

  test('returns the owner request with consumer key metadata and supports an empty state', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([requestRow({ state: 'approved', consumerId: '44' })]))
      .mockResolvedValueOnce(
        queryResult([
          {
            id: '44',
            name: 'University research client',
            rateLimitPerMinute: 60,
            dailyQuota: 1000,
            createdAt: new Date('2026-09-01T11:00:00.000Z'),
          },
        ]),
      )
      .mockResolvedValueOnce(
        queryResult([
          {
            id: '55',
            prefix: 'sat_live_abcd',
            createdAt: new Date('2026-09-01T11:01:00.000Z'),
            revokedAt: new Date('2026-09-02T11:01:00.000Z'),
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]));
    const repository = createApiAccessRepository({ query } as unknown as Pool);

    const owned = await repository.getOwn('7');
    expect(owned).toMatchObject({
      request: { id: '31', state: 'approved' },
      consumer: {
        id: '44',
        rateLimitPerMinute: 60,
        keys: [
          {
            id: '55',
            prefix: 'sat_live_abcd',
            createdAt: '2026-09-01T11:01:00.000Z',
            revokedAt: '2026-09-02T11:01:00.000Z',
          },
        ],
      },
    });
    await expect(repository.getOwn('8')).resolves.toEqual({ request: null, consumer: null });
  });

  test('lists pending requests in deterministic order with requester identity', async () => {
    const query = vi.fn().mockResolvedValue(queryResult([requestRow()]));
    const requests = await createApiAccessRepository({ query } as unknown as Pool).listPending();

    expect(requests[0]).toMatchObject({
      id: '31',
      requesterAuthSubject: 'auth-subject-7',
      requesterDisplayName: 'Nadia',
    });
    expect(query.mock.calls[0]?.[0]).toContain(
      'ORDER BY request.created_at, request.api_consumer_access_request_id',
    );
  });

  test('approves a pending request, creates its consumer, and records the review', async () => {
    const locked = requestRow();
    const reviewed = requestRow({
      state: 'approved',
      consumerId: '44',
      reviewedAt: new Date('2026-09-01T11:00:00.000Z'),
      reviewedById: '3',
      reviewedByName: 'Administrator',
      reviewReason: 'Approved for research.',
    });
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([locked]))
      .mockResolvedValueOnce(queryResult([{ id: '44' }]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([reviewed]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    const decision = await createApiAccessRepository(pool).decide('3', '31', {
      decision: 'approved',
      rateLimitPerMinute: 60,
      dailyQuota: 1000,
      reviewReason: 'Approved for research.',
    });

    expect(decision).toMatchObject({
      state: 'approved',
      reviewedBy: { id: '3', displayName: 'Administrator' },
      reviewReason: 'Approved for research.',
    });
    expect(query.mock.calls[2]?.[0]).toContain('INSERT INTO api_consumer');
    expect(query.mock.calls[2]?.[1]).toEqual(['7', 'University research client', 60, 1000]);
    expect(query.mock.calls[3]?.[1]).toEqual([
      '31',
      'approved',
      '44',
      '3',
      'Approved for research.',
    ]);
  });

  test('rejects missing and already-decided requests without creating consumers', async () => {
    async function decideWith(rows: ReturnType<typeof requestRow>[]) {
      const query = vi
        .fn()
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce(queryResult(rows))
        .mockResolvedValueOnce(queryResult([]));
      const { pool } = transactionalPool(query);
      const promise = createApiAccessRepository(pool).decide('3', '31', {
        decision: 'rejected',
        reviewReason: 'Insufficient detail.',
      });
      return { query, promise };
    }

    const missing = await decideWith([]);
    await expect(missing.promise).rejects.toBeInstanceOf(ApiAccessRequestNotFoundError);
    const decided = await decideWith([requestRow({ state: 'approved' })]);
    await expect(decided.promise).rejects.toBeInstanceOf(ApiAccessConflictError);
    expect(
      decided.query.mock.calls.some((call) => String(call[0]).includes('INSERT INTO api_consumer')),
    ).toBe(false);
  });

  test('lists consumers, updates limits, revokes live keys, and rejects missing targets', async () => {
    const consumer = {
      id: '44',
      name: 'University research client',
      rateLimitPerMinute: 60,
      dailyQuota: 1000,
      createdAt: new Date('2026-09-01T11:00:00.000Z'),
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([{ id: '44' }]))
      .mockResolvedValueOnce(queryResult([consumer]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([], 1))
      .mockResolvedValueOnce(queryResult([{ ...consumer, rateLimitPerMinute: 30 }]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([], 1))
      .mockResolvedValueOnce(queryResult([], 0));
    const repository = createApiAccessRepository({ query } as unknown as Pool);

    await expect(repository.listConsumers()).resolves.toMatchObject([{ id: '44', keys: [] }]);
    await expect(repository.updateLimits('44', 30, 500)).resolves.toMatchObject({
      id: '44',
      rateLimitPerMinute: 30,
    });
    expect(query.mock.calls[3]?.[1]).toEqual(['44', 30, 500]);
    await expect(repository.revokeAnyKey('44', '55')).resolves.toBeUndefined();
    await expect(repository.revokeAnyKey('44', 'missing')).rejects.toBeInstanceOf(
      ApiAccessRequestNotFoundError,
    );
  });
});
