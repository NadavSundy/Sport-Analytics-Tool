import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { VerifyAccessToken } from '../src/auth/supabase-auth';
import { createTestApp } from './test-app';

describe('GET /api/v1/auth/me', () => {
  it('rejects a request without a bearer token', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();

    const response = await request(createTestApp(verifyAccessToken))
      .get('/api/v1/auth/me')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid authentication token is required.',
      },
    });
  });

  it('rejects a token that cannot be validated', async () => {
    const verifyAccessToken = vi
      .fn<VerifyAccessToken>()
      .mockRejectedValue(new Error('Invalid test token'));

    const response = await request(createTestApp(verifyAccessToken))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-test-token')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyAccessToken).toHaveBeenCalledWith('invalid-test-token');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the verified identity for a valid token', async () => {
    const verifyAccessToken = vi
      .fn<VerifyAccessToken>()
      .mockResolvedValue({ uid: 'supabase-user-123' });

    const response = await request(createTestApp(verifyAccessToken))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-test-token')
      .expect(200);

    expect(verifyAccessToken).toHaveBeenCalledWith('valid-test-token');
    expect(response.body).toEqual({
      identity: {
        subject: 'supabase-user-123',
      },
    });
  });
});
