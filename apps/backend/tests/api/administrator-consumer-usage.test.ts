import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ApiConsumerRepository } from '../../src/modules/api-consumers/api-consumer.repository';
import { createApiConsumerService } from '../../src/modules/api-consumers/api-consumer.service';
import type { ApiConsumerService } from '../../src/modules/api-consumers/api-consumer.service';
import { createTestAccount, createTestApp } from '../test-app';

const consumer = {
  id: '7',
  name: 'Partner dashboard',
  rateLimitPerMinute: 60,
  dailyQuota: 10_000,
  createdAt: '2026-09-01T10:00:00.000Z',
  keys: [
    {
      id: '9',
      prefix: 'sat_live_example',
      createdAt: '2026-09-01T10:00:00.000Z',
      revokedAt: null,
    },
  ],
};

const aggregate = {
  consumer: {
    id: consumer.id,
    name: consumer.name,
    rateLimitPerMinute: consumer.rateLimitPerMinute,
    dailyQuota: consumer.dailyQuota,
  },
  from: '2026-09-20',
  to: '2026-09-26',
  totalRequests: 11,
  entries: [
    {
      date: '2026-09-26',
      endpoint: 'GET /consumer/fixtures/:fixtureId/events',
      statusClass: '2xx' as const,
      requestCount: 8,
    },
    {
      date: '2026-09-26',
      endpoint: 'GET /consumer/fixtures/:fixtureId/events',
      statusClass: '4xx' as const,
      requestCount: 3,
    },
  ],
};

function service(overrides: Partial<ApiConsumerService> = {}): ApiConsumerService {
  return {
    issue: vi.fn(),
    list: vi.fn(),
    usage: vi.fn().mockResolvedValue(aggregate),
    rotate: vi.fn(),
    revoke: vi.fn(),
    ...overrides,
  } as ApiConsumerService;
}

function app(apiConsumers: ApiConsumerService, role: 'admin' | 'viewer' = 'admin') {
  return createTestApp(
    undefined,
    undefined,
    async () => createTestAccount({ role }),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    apiConsumers,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('administrator API consumer usage', () => {
  test('requires bearer authentication and administrator authorization', async () => {
    const apiConsumers = service();

    await request(app(apiConsumers)).get('/api/v1/admin/api-consumers/7/usage').expect(401);
    await request(app(apiConsumers, 'viewer'))
      .get('/api/v1/admin/api-consumers/7/usage')
      .set('Authorization', 'Bearer viewer-token')
      .expect(403);
    expect(apiConsumers.usage).not.toHaveBeenCalled();
  });

  test('returns safe, grouped usage for the selected consumer and explicit UTC window', async () => {
    const apiConsumers = service();
    const response = await request(app(apiConsumers))
      .get('/api/v1/admin/api-consumers/7/usage?from=2026-09-20&to=2026-09-26&limit=25')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body).toEqual({ data: aggregate });
    expect(apiConsumers.usage).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: expect.any(String), role: 'admin' }),
      '7',
      { from: '2026-09-20', to: '2026-09-26', limit: 25 },
    );
    const serialized = JSON.stringify(response.body);
    for (const forbidden of [
      'apiKey',
      'keyHash',
      'Authorization',
      'X-API-Key',
      'requestBody',
      'responsePayload',
      'sat_live_',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  test('uses the same seven-date default, validates real dates and enforces the 31-date maximum', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T15:30:00.000Z'));
    const apiConsumers = service({
      usage: vi.fn().mockResolvedValue({ ...aggregate, from: '2026-09-22', to: '2026-09-28' }),
    });

    await request(app(apiConsumers))
      .get('/api/v1/admin/api-consumers/7/usage')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    expect(apiConsumers.usage).toHaveBeenCalledWith(expect.anything(), '7', {
      from: '2026-09-22',
      to: '2026-09-28',
      limit: 50,
    });

    for (const query of [
      'from=2026-02-30&to=2026-03-01',
      'from=2026-09-28&to=2026-09-27',
      'from=2026-08-01&to=2026-09-28',
      'limit=101',
    ]) {
      await request(app(apiConsumers))
        .get(`/api/v1/admin/api-consumers/7/usage?${query}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    }
    await request(app(apiConsumers))
      .get('/api/v1/admin/api-consumers/not-a-number/usage')
      .set('Authorization', 'Bearer admin-token')
      .expect(422);
  });

  test('returns an empty usage result as success', async () => {
    const apiConsumers = service({
      usage: vi.fn().mockResolvedValue({ ...aggregate, totalRequests: 0, entries: [] }),
    });
    const response = await request(app(apiConsumers))
      .get('/api/v1/admin/api-consumers/7/usage?from=2026-09-20&to=2026-09-26')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body.data).toMatchObject({ totalRequests: 0, entries: [] });
  });

  test('uses owner-scoped lookup and never queries usage for a missing or non-visible consumer', async () => {
    const listUsage = vi.fn();
    const repository = {
      findOwned: vi.fn().mockResolvedValue(null),
      listUsage,
    } as unknown as ApiConsumerRepository;
    const response = await request(app(createApiConsumerService(repository)))
      .get('/api/v1/admin/api-consumers/99/usage?from=2026-09-20&to=2026-09-26')
      .set('Authorization', 'Bearer admin-token')
      .expect(404);

    expect(response.body.error.code).toBe('API_CONSUMER_NOT_FOUND');
    expect(repository.findOwned).toHaveBeenCalledWith(expect.any(String), '99');
    expect(listUsage).not.toHaveBeenCalled();
  });

  test('scopes aggregation to the selected owned consumer', async () => {
    const listUsage = vi.fn().mockResolvedValue({ totalRequests: 11, entries: aggregate.entries });
    const repository = {
      findOwned: vi.fn().mockResolvedValue(consumer),
      listUsage,
    } as unknown as ApiConsumerRepository;
    const response = await request(app(createApiConsumerService(repository)))
      .get('/api/v1/admin/api-consumers/7/usage?from=2026-09-20&to=2026-09-26')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(listUsage).toHaveBeenCalledWith('7', {
      from: '2026-09-20',
      to: '2026-09-26',
      limit: 50,
    });
    expect(response.body.data.consumer.id).toBe('7');
    expect(JSON.stringify(response.body)).not.toContain('consumer-b');
  });
});
