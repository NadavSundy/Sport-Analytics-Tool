import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { AnonymousAccessRepository } from '../../src/modules/api-consumers/anonymous-access.repository';
import type { ApiConsumerRepository } from '../../src/modules/api-consumers/api-consumer.repository';
import { createTestApp } from '../test-app';

const API_KEY = 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const resetAt = new Date('2026-09-30T10:01:00.000Z');

function consumerRepository(overrides: Partial<ApiConsumerRepository> = {}): ApiConsumerRepository {
  return {
    issue: vi.fn(),
    list: vi.fn(),
    findOwned: vi.fn(),
    rotate: vi.fn(),
    revoke: vi.fn(),
    findActiveConsumer: vi.fn().mockResolvedValue({
      consumerId: 'consumer-7',
      keyId: 'key-9',
      rateLimitPerMinute: 60,
      dailyQuota: 10_000,
    }),
    consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true, used: 1, resetAt }),
    consumeDailyQuota: vi.fn().mockResolvedValue({ allowed: true, used: 1 }),
    recordUsage: vi.fn().mockResolvedValue(undefined),
    listUsage: vi.fn().mockResolvedValue({ totalRequests: 0, entries: [] }),
    ...overrides,
  };
}

function anonymousRepository(
  overrides: Partial<AnonymousAccessRepository> = {},
): AnonymousAccessRepository {
  return {
    consume: vi.fn().mockResolvedValue({
      allowed: true,
      sourceUsed: 1,
      globalUsed: 1,
      exceeded: null,
      resetAt,
    }),
    ...overrides,
  };
}

function createCanonicalApp(
  consumers: ApiConsumerRepository,
  anonymous: AnonymousAccessRepository,
) {
  return createTestApp(
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
    consumers,
    undefined,
    undefined,
    undefined,
    undefined,
    anonymous,
  );
}

describe('canonical cricket-resource access', () => {
  test('admits a missing API key under the bounded anonymous policy', async () => {
    const consumers = consumerRepository();
    const anonymous = anonymousRepository();

    const response = await request(createCanonicalApp(consumers, anonymous))
      .get('/api/v1/competitions')
      .expect('RateLimit-Limit', '30')
      .expect('RateLimit-Remaining', '29')
      .expect(200);

    expect(response.headers['x-quota-limit']).toBeUndefined();
    expect(anonymous.consume).toHaveBeenCalledOnce();
    expect(anonymous.consume).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        sourceLimit: 30,
        globalLimit: 600,
      }),
    );
    expect(JSON.stringify(vi.mocked(anonymous.consume).mock.calls)).not.toContain('127.0.0.1');
    expect(consumers.findActiveConsumer).not.toHaveBeenCalled();
  });

  test('uses a valid API key for consumer limits, quota and safe canonical-route telemetry', async () => {
    const consumers = consumerRepository();
    const anonymous = anonymousRepository();

    await request(createCanonicalApp(consumers, anonymous))
      .get('/api/v1/competitions?name=Premier')
      .set('X-API-Key', API_KEY)
      .expect('RateLimit-Limit', '60')
      .expect('X-Quota-Limit', '10000')
      .expect(200);

    expect(anonymous.consume).not.toHaveBeenCalled();
    expect(consumers.findActiveConsumer).toHaveBeenCalledOnce();
    await vi.waitFor(() =>
      expect(consumers.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          consumerId: 'consumer-7',
          keyId: 'key-9',
          endpoint: 'GET /competitions',
          statusClass: '2xx',
        }),
      ),
    );
    expect(JSON.stringify(vi.mocked(consumers.recordUsage).mock.calls)).not.toContain('Premier');
    expect(JSON.stringify(vi.mocked(consumers.recordUsage).mock.calls)).not.toContain(API_KEY);
  });

  test.each([
    ['malformed', 'not-a-key'],
    ['unknown or revoked', API_KEY],
  ])(
    'rejects a supplied %s key instead of falling back to anonymous access',
    async (_name, key) => {
      const consumers = consumerRepository({ findActiveConsumer: vi.fn().mockResolvedValue(null) });
      const anonymous = anonymousRepository();

      const response = await request(createCanonicalApp(consumers, anonymous))
        .get('/api/v1/competitions')
        .set('X-API-Key', key)
        .expect('WWW-Authenticate', 'ApiKey')
        .expect(401);

      expect(response.body.error.code).toBe('API_KEY_UNAUTHORIZED');
      expect(anonymous.consume).not.toHaveBeenCalled();
    },
  );

  test('bounds anonymous requests and fails closed when the shared limiter is unavailable', async () => {
    const limited = anonymousRepository({
      consume: vi.fn().mockResolvedValue({
        allowed: false,
        sourceUsed: 30,
        globalUsed: 50,
        exceeded: 'source',
        resetAt,
      }),
    });
    const limitedResponse = await request(createCanonicalApp(consumerRepository(), limited))
      .get('/api/v1/competitions')
      .expect(429);
    expect(limitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(limitedResponse.headers['retry-after']).toBeDefined();

    const unavailable = anonymousRepository({
      consume: vi.fn().mockRejectedValue(new Error('database unavailable')),
    });
    const unavailableResponse = await request(createCanonicalApp(consumerRepository(), unavailable))
      .get('/api/v1/competitions')
      .expect(503);
    expect(unavailableResponse.body.error.code).toBe('RATE_LIMIT_UNAVAILABLE');
  });

  test('applies consumer rate and daily quota exhaustion on canonical reads', async () => {
    const rateLimitedConsumers = consumerRepository({
      consumeRateLimit: vi.fn().mockResolvedValue({ allowed: false, used: 60, resetAt }),
    });
    const rateLimited = await request(
      createCanonicalApp(rateLimitedConsumers, anonymousRepository()),
    )
      .get('/api/v1/competitions')
      .set('X-API-Key', API_KEY)
      .expect(429);
    expect(rateLimited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

    const quotaLimitedConsumers = consumerRepository({
      consumeDailyQuota: vi.fn().mockResolvedValue({ allowed: false, used: 10_000 }),
    });
    const quotaLimited = await request(
      createCanonicalApp(quotaLimitedConsumers, anonymousRepository()),
    )
      .get('/api/v1/competitions')
      .set('X-API-Key', API_KEY)
      .expect(429);
    expect(quotaLimited.body.error.code).toBe('QUOTA_EXCEEDED');
  });

  test('does not apply anonymous admission to operations outside the explicit cricket-read list', async () => {
    const anonymous = anonymousRepository();

    await request(createCanonicalApp(consumerRepository(), anonymous))
      .get('/api/v1/health')
      .expect(200);

    expect(anonymous.consume).not.toHaveBeenCalled();
  });

  test('keeps consumer usage key-only and deprecates authenticated cricket-resource aliases', async () => {
    const consumers = consumerRepository();
    const anonymous = anonymousRepository();
    const app = createCanonicalApp(consumers, anonymous);

    await request(app).get('/api/v1/consumer/usage').expect(401);

    const alias = await request(app)
      .get('/api/v1/consumer/competitions?name=Premier')
      .set('X-API-Key', API_KEY)
      .expect('Deprecation', '?1')
      .expect(200);

    expect(alias.headers.link).toBe('</api/v1/competitions?name=Premier>; rel="successor-version"');
  });
});
