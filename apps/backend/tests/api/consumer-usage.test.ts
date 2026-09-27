import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { ApiConsumerRepository } from '../../src/modules/api-consumers/api-consumer.repository';
import { createTestApp } from '../test-app';

const API_KEY = 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function repository(): ApiConsumerRepository {
  return {
    findActiveConsumer: vi.fn().mockResolvedValue({
      consumerId: 'consumer-a',
      keyId: 'key-a',
      rateLimitPerMinute: 60,
      dailyQuota: 100,
    }),
    consumeRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      used: 4,
      resetAt: new Date('2026-09-27T10:01:00.000Z'),
    }),
    consumeDailyQuota: vi.fn().mockResolvedValue({ allowed: true, used: 12 }),
    listUsage: vi.fn().mockResolvedValue({
      totalRequests: 12,
      entries: [
        {
          date: '2026-09-26',
          endpoint: 'GET /consumer/fixtures/:fixtureId/events',
          statusClass: '2xx',
          requestCount: 8,
        },
      ],
      nextCursor: null,
    }),
  } as unknown as ApiConsumerRepository;
}

describe('consumer usage API', () => {
  test("returns only the authenticated consumer's bounded, deterministic usage aggregate", async () => {
    const repo = repository();
    const response = await request(
      createTestApp(
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
      ),
    )
      .get('/api/v1/consumer/usage?from=2026-09-20&to=2026-09-26&limit=10')
      .set('X-API-Key', API_KEY)
      .expect(200);

    expect(response.body).toEqual({
      data: {
        from: '2026-09-20',
        to: '2026-09-26',
        totalRequests: 12,
        quota: { limit: 100, used: 12, remaining: 88 },
        entries: [
          {
            date: '2026-09-26',
            endpoint: 'GET /consumer/fixtures/:fixtureId/events',
            statusClass: '2xx',
            requestCount: 8,
          },
        ],
      },
    });
    expect(repo.listUsage).toHaveBeenCalledWith('consumer-a', {
      from: '2026-09-20',
      to: '2026-09-26',
      limit: 10,
    });
    expect(JSON.stringify(response.body)).not.toContain(API_KEY);
  });

  test('rejects invalid ranges and does not expose usage without a valid active key', async () => {
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
      repository(),
    );
    await request(app)
      .get('/api/v1/consumer/usage?from=2026-09-27&to=2026-08-01')
      .set('X-API-Key', API_KEY)
      .expect(400);
    await request(app)
      .get('/api/v1/consumer/usage?from=2026-01-01&to=2026-09-27')
      .set('X-API-Key', API_KEY)
      .expect(400);
    await request(app).get('/api/v1/consumer/usage').expect(401);
  });

  test('records a normalized protected route without raw URLs, query values, or key material', async () => {
    const recordUsage = vi.fn().mockResolvedValue(undefined);
    const repo = {
      ...repository(),
      recordUsage,
    } as unknown as ApiConsumerRepository;
    const app = createTestApp(
      undefined,
      {
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
      repo,
    );

    await request(app)
      .get('/api/v1/consumer/fixtures?competitionId=private-value')
      .set('X-API-Key', API_KEY)
      .expect(200);

    expect(recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerId: 'consumer-a',
        keyId: 'key-a',
        endpoint: 'GET /consumer/fixtures',
        statusClass: '2xx',
      }),
    );
    expect(JSON.stringify(recordUsage.mock.calls)).not.toContain('private-value');
    expect(JSON.stringify(recordUsage.mock.calls)).not.toContain(API_KEY);
  });
});
