import request from 'supertest';
import express from 'express';
import { describe, expect, test, vi } from 'vitest';

import { createConsumerAuthentication } from '../../src/modules/api-consumers/consumer-authentication';
import type { ApiConsumerRepository } from '../../src/modules/api-consumers/api-consumer.repository';
import type { ApiConsumerService } from '../../src/modules/api-consumers/api-consumer.service';
import { createTestAccount, createTestApp } from '../test-app';

const consumer = {
  id: '7',
  name: 'Partner dashboard',
  rateLimitPerMinute: 2,
  dailyQuota: 3,
  createdAt: '2026-09-07T10:00:00.000Z',
  keys: [
    { id: '9', prefix: 'sat_live_example', createdAt: '2026-09-07T10:00:00.000Z', revokedAt: null },
  ],
};

function service(): ApiConsumerService {
  return {
    issue: vi.fn().mockResolvedValue({
      ...consumer,
      apiKey: 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    }),
    list: vi.fn().mockResolvedValue([consumer]),
    rotate: vi.fn().mockResolvedValue({
      ...consumer,
      apiKey: 'sat_live_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    }),
    revoke: vi.fn().mockResolvedValue(undefined),
  };
}

function repository(overrides: Partial<ApiConsumerRepository> = {}): ApiConsumerRepository {
  return {
    issue: vi.fn(),
    list: vi.fn(),
    rotate: vi.fn(),
    revoke: vi.fn(),
    findActiveConsumer: vi
      .fn()
      .mockResolvedValue({ consumerId: '7', rateLimitPerMinute: 2, dailyQuota: 3 }),
    consumeRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      used: 1,
      resetAt: new Date('2026-09-19T10:01:00.000Z'),
    }),
    consumeDailyQuota: vi.fn().mockResolvedValue({ allowed: true, used: 1 }),
    ...overrides,
  };
}

describe('API consumer key lifecycle and protections', () => {
  test('only administrators can issue a key and the secret is returned once', async () => {
    const apiConsumerService = service();
    const response = await request(
      createTestApp(
        undefined,
        undefined,
        async () => createTestAccount({ role: 'admin' }),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        apiConsumerService,
        repository(),
      ),
    )
      .post('/api/v1/admin/api-consumers')
      .set('Authorization', 'Bearer admin-token')
      .send({ name: 'Partner dashboard', rateLimitPerMinute: 2, dailyQuota: 3 })
      .expect(201);
    expect(response.body.data.apiKey).toMatch(/^sat_live_/);
    expect(apiConsumerService.issue).toHaveBeenCalledOnce();

    const listed = await request(
      createTestApp(
        undefined,
        undefined,
        async () => createTestAccount({ role: 'admin' }),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        apiConsumerService,
        repository(),
      ),
    )
      .get('/api/v1/admin/api-consumers')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    expect(JSON.stringify(listed.body)).not.toContain(
      'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
  });

  test('rejects missing, malformed and revoked keys without exposing key details', async () => {
    const revoked = repository({ findActiveConsumer: vi.fn().mockResolvedValue(null) });
    const app = createTestApp(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      revoked,
    );
    await request(app)
      .get('/api/v1/consumer/competitions')
      .expect('WWW-Authenticate', 'ApiKey')
      .expect(401);
    const response = await request(app)
      .get('/api/v1/consumer/competitions')
      .set('X-API-Key', 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      .expect(401);
    expect(response.body.error.code).toBe('API_KEY_UNAUTHORIZED');
  });

  test('enforces a consumer rate limit and emits rate and quota metadata', async () => {
    const repo = repository({
      consumeRateLimit: vi
        .fn()
        .mockResolvedValueOnce({
          allowed: true,
          used: 1,
          resetAt: new Date('2026-09-19T10:01:00.000Z'),
        })
        .mockResolvedValueOnce({
          allowed: true,
          used: 2,
          resetAt: new Date('2026-09-19T10:01:00.000Z'),
        })
        .mockResolvedValueOnce({
          allowed: false,
          used: 2,
          resetAt: new Date('2026-09-19T10:01:00.000Z'),
        }),
    });
    const app = createTestApp(
      undefined,
      {
        async listCompetitions() {
          return { data: [], pagination: { nextCursor: null } };
        },
      } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repo,
    );
    const key = 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    await request(app)
      .get('/api/v1/consumer/competitions')
      .set('X-API-Key', key)
      .expect('RateLimit-Limit', '2')
      .expect('X-Quota-Remaining', '2')
      .expect(200);
    await request(app).get('/api/v1/consumer/competitions').set('X-API-Key', key).expect(200);
    const limited = await request(app)
      .get('/api/v1/consumer/competitions')
      .set('X-API-Key', key)
      .expect(429);
    expect(limited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  test('returns quota exceeded when the durable counter refuses another request', async () => {
    const repo = repository({
      consumeDailyQuota: vi.fn().mockResolvedValue({ allowed: false, used: 3 }),
    });
    const app = createTestApp(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repo,
    );
    const response = await request(app)
      .get('/api/v1/consumer/competitions')
      .set('X-API-Key', 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      .expect(429);
    expect(response.headers['x-quota-limit']).toBe('3');
    expect(response.body.error.code).toBe('QUOTA_EXCEEDED');
  });

  test.each([
    '/api/v1/consumer/fixtures/1/events',
    '/api/v1/consumer/fixtures/1/events/export.json',
    '/api/v1/consumer/fixtures/1/statistics',
    '/api/v1/consumer/fixtures/1/statistics/runs/events/export.json',
  ])('does not allow consumer reads to bypass key enforcement through %s', async (path) => {
    const response = await request(createTestApp()).get(path).expect(401);

    expect(response.headers['www-authenticate']).toBe('ApiKey');
    expect(response.body.error.code).toBe('API_KEY_UNAUTHORIZED');
  });

  test('shares the rate limit between consumer aliases and protected fixture event reads', async () => {
    const app = createTestApp(
      undefined,
      {
        async listCompetitions() {
          return { data: [], pagination: { nextCursor: null } };
        },
        async listFixtures() {
          return { data: [], pagination: { nextCursor: null } };
        },
      } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository({
        findActiveConsumer: vi
          .fn()
          .mockResolvedValue({ consumerId: '7', rateLimitPerMinute: 1, dailyQuota: 3 }),
        consumeRateLimit: vi
          .fn()
          .mockResolvedValueOnce({
            allowed: true,
            used: 1,
            resetAt: new Date('2026-09-19T10:01:00.000Z'),
          })
          .mockResolvedValueOnce({
            allowed: false,
            used: 1,
            resetAt: new Date('2026-09-19T10:01:00.000Z'),
          }),
      }),
    );
    const key = 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    await request(app).get('/api/v1/consumer/competitions').set('X-API-Key', key).expect(200);
    const limited = await request(app)
      .get('/api/v1/consumer/fixtures/1/events')
      .set('X-API-Key', key)
      .expect(429);

    expect(limited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  test('shares an atomic fixed window across replicas and survives an instance restart', async () => {
    const requestCounts = new Map<string, number>();
    const now = new Date('2026-09-19T10:00:20.000Z');
    const repo = repository({
      consumeRateLimit: vi.fn(async (consumerId: string, limit: number, at: Date) => {
        const windowStart = new Date(at);
        windowStart.setUTCSeconds(0, 0);
        const key = `${consumerId}:${windowStart.toISOString()}`;
        const used = (requestCounts.get(key) ?? 0) + 1;
        if (used <= limit) requestCounts.set(key, used);
        return {
          allowed: used <= limit,
          used: Math.min(used, limit),
          resetAt: new Date(windowStart.getTime() + 60_000),
        };
      }),
    });
    const createReplica = () => {
      const app = express();
      app.get(
        '/consumer',
        createConsumerAuthentication(repo, () => now),
        (_request, response) => response.status(200).json({ data: [] }),
      );
      return app;
    };
    const key = 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    await request(createReplica()).get('/consumer').set('X-API-Key', key).expect(200);
    await request(createReplica()).get('/consumer').set('X-API-Key', key).expect(200);
    const limited = await request(createReplica())
      .get('/consumer')
      .set('X-API-Key', key)
      .expect(429);

    expect(limited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(repo.consumeRateLimit).toHaveBeenCalledTimes(3);
  });

  test('starts a new deterministic UTC-minute window after expiry', async () => {
    const repo = repository({
      consumeRateLimit: vi
        .fn()
        .mockResolvedValueOnce({
          allowed: true,
          used: 1,
          resetAt: new Date('2026-09-19T10:01:00.000Z'),
        })
        .mockResolvedValueOnce({
          allowed: true,
          used: 1,
          resetAt: new Date('2026-09-19T10:02:00.000Z'),
        }),
    });
    let now = new Date('2026-09-19T10:00:59.900Z');
    const app = express();
    app.get(
      '/consumer',
      createConsumerAuthentication(repo, () => now),
      (_request, response) => response.status(200).json({ data: [] }),
    );
    const key = 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    await request(app).get('/consumer').set('X-API-Key', key).expect('RateLimit-Reset', '1').expect(200);
    now = new Date('2026-09-19T10:01:00.000Z');
    await request(app).get('/consumer').set('X-API-Key', key).expect('RateLimit-Reset', '60').expect(200);
  });

  test('fails closed when the shared rate-limit store is unavailable', async () => {
    const app = express();
    app.get(
      '/consumer',
      createConsumerAuthentication(
        repository({ consumeRateLimit: vi.fn().mockRejectedValue(new Error('database unavailable')) }),
      ),
      (_request, response) => response.status(200).json({ data: [] }),
    );

    const response = await request(app)
      .get('/consumer')
      .set('X-API-Key', 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      .expect(503);

    expect(response.body.error.code).toBe('RATE_LIMIT_UNAVAILABLE');
  });
});
