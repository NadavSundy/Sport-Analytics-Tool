import express from 'express';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import { createApiAccessRouter } from '../../src/modules/api-consumers/api-access.routes';
import type { ApiAccessService } from '../../src/modules/api-consumers/api-access.service';
import { createTestAccount } from '../test-app';

const verify = async () => ({ uid: 'requester', displayName: 'Requester' });

function service(overrides: Partial<ApiAccessService> = {}): ApiAccessService {
  return {
    requestAccess: vi.fn(),
    getOwnAccess: vi.fn().mockResolvedValue({ request: null, consumer: null }),
    listPending: vi.fn().mockResolvedValue([]),
    decide: vi.fn(),
    generateKey: vi.fn(),
    rotateKey: vi.fn(),
    revokeOwnKey: vi.fn(),
    getOwnUsage: vi.fn(),
    listConsumers: vi.fn().mockResolvedValue([]),
    updateLimits: vi.fn(),
    revokeAnyKey: vi.fn(),
    ...overrides,
  };
}

function app(apiAccess: ApiAccessService, role: 'viewer' | 'admin' = 'viewer', accountId = '11') {
  const application = express();
  application.use(express.json());
  application.use(
    '/api/v1',
    createApiAccessRouter(verify, async () => createTestAccount({ accountId, role }), apiAccess),
  );
  return application;
}

describe('API consumer access request lifecycle', () => {
  test('an authenticated user submits validated application details and sees their state', async () => {
    const apiAccess = service({
      requestAccess: vi.fn().mockResolvedValue({
        id: '4',
        requesterAccountId: '11',
        name: 'Match model',
        intendedUse: 'Evaluate match predictions in a university project.',
        state: 'pending',
        createdAt: '2026-10-04T10:00:00.000Z',
        reviewedAt: null,
        reviewedBy: null,
        reviewReason: null,
      }),
    });
    const response = await request(app(apiAccess))
      .post('/api/v1/account/api-access/requests')
      .set('Authorization', 'Bearer user-token')
      .send({
        name: 'Match model',
        intendedUse: 'Evaluate match predictions in a university project.',
      })
      .expect(201);

    expect(response.body.data.state).toBe('pending');
    expect(apiAccess.requestAccess).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: '11' }),
      expect.objectContaining({ name: 'Match model' }),
    );
    await request(app(apiAccess))
      .post('/api/v1/account/api-access/requests')
      .set('Authorization', 'Bearer user-token')
      .send({ name: '', intendedUse: 'short' })
      .expect(422);
  });

  test('only an administrator can review a pending request and approval returns no secret', async () => {
    const apiAccess = service({
      decide: vi.fn().mockResolvedValue({
        id: '4',
        requesterAccountId: '11',
        name: 'Match model',
        intendedUse: 'Research analysis',
        state: 'approved',
        createdAt: '2026-10-04T10:00:00.000Z',
        reviewedAt: '2026-10-04T11:00:00.000Z',
        reviewedBy: { id: '1', displayName: 'Admin' },
        reviewReason: 'Approved for research use.',
      }),
    });
    const payload = {
      decision: 'approved',
      reviewReason: 'Approved for research use.',
      rateLimitPerMinute: 30,
      dailyQuota: 2000,
    };
    await request(app(apiAccess, 'viewer'))
      .patch('/api/v1/admin/api-access-requests/4')
      .set('Authorization', 'Bearer token')
      .send(payload)
      .expect(403);
    const response = await request(app(apiAccess, 'admin', '1'))
      .patch('/api/v1/admin/api-access-requests/4')
      .set('Authorization', 'Bearer token')
      .send(payload)
      .expect(200);
    expect(JSON.stringify(response.body)).not.toContain('sat_live_');
  });

  test('only an administrator can list pending requests with requester username and email', async () => {
    const apiAccess = service({
      listPending: vi.fn().mockResolvedValue([
        {
          id: '4',
          requesterAccountId: '11',
          name: 'Match model',
          intendedUse: 'Research analysis',
          state: 'pending',
          createdAt: '2026-10-04T10:00:00.000Z',
          reviewedAt: null,
          reviewedBy: null,
          reviewReason: null,
          requester: { displayName: 'Research User', email: 'research@example.com' },
        },
      ]),
    });

    await request(app(apiAccess, 'viewer'))
      .get('/api/v1/admin/api-access-requests')
      .set('Authorization', 'Bearer token')
      .expect(403);
    const response = await request(app(apiAccess, 'admin', '1'))
      .get('/api/v1/admin/api-access-requests')
      .set('Authorization', 'Bearer token')
      .expect(200);
    expect(response.body.data.requests[0].requester).toEqual({
      displayName: 'Research User',
      email: 'research@example.com',
    });
  });

  test('an approved owner explicitly generates a key and another user cannot manage it', async () => {
    const apiAccess = service({
      generateKey: vi.fn().mockResolvedValue({
        consumer: {
          id: '7',
          name: 'Match model',
          rateLimitPerMinute: 30,
          dailyQuota: 2000,
          createdAt: '2026-10-04T11:00:00.000Z',
          keys: [],
        },
        apiKey: 'sat_live_once',
      }),
    });
    const response = await request(app(apiAccess, 'viewer', '11'))
      .post('/api/v1/account/api-consumers/7/keys')
      .set('Authorization', 'Bearer token')
      .expect(201);
    expect(response.body.data.apiKey).toBe('sat_live_once');
    expect(apiAccess.generateKey).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: '11' }),
      '7',
    );
  });

  test('an approved owner requests usage for an inclusive UTC date range', async () => {
    const getOwnUsage = vi.fn().mockResolvedValue({
      consumer: {
        id: '7',
        name: 'Match model',
        rateLimitPerMinute: 30,
        dailyQuota: 2000,
      },
      from: '2026-10-01',
      to: '2026-10-05',
      totalRequests: 27,
      entries: [],
    });
    const apiAccess = service({ getOwnUsage });

    const response = await request(app(apiAccess, 'viewer', '11'))
      .get('/api/v1/account/api-consumers/7/usage?from=2026-10-01&to=2026-10-05&limit=100')
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(response.body.data.totalRequests).toBe(27);
    expect(getOwnUsage).toHaveBeenCalledWith(expect.objectContaining({ accountId: '11' }), '7', {
      from: '2026-10-01',
      to: '2026-10-05',
      limit: 100,
    });
  });
});
