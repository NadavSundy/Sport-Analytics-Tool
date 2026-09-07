import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

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
    const repo = repository();
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
});
