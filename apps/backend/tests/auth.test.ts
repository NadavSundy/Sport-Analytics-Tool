import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { VerifyIdToken } from '../src/auth/firebase-auth';
import { createTestApp } from './test-app';

describe('GET /api/v1/auth/me', () => {
  it('rejects a request without a bearer token', async () => {
    const verifyIdToken = vi.fn<VerifyIdToken>();

    const response = await request(createTestApp(verifyIdToken))
      .get('/api/v1/auth/me')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid authentication token is required.',
      },
    });
  });

  it('rejects a token that cannot be validated', async () => {
    const verifyIdToken = vi.fn<VerifyIdToken>().mockRejectedValue(new Error('Invalid test token'));

    const response = await request(createTestApp(verifyIdToken))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-test-token')
      .expect('WWW-Authenticate', 'Bearer')
      .expect(401);

    expect(verifyIdToken).toHaveBeenCalledWith('invalid-test-token');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the verified identity for a valid token', async () => {
    const verifyIdToken = vi.fn<VerifyIdToken>().mockResolvedValue({ uid: 'firebase-user-123' });

    const response = await request(createTestApp(verifyIdToken))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-test-token')
      .expect(200);

    expect(verifyIdToken).toHaveBeenCalledWith('valid-test-token');
    expect(response.body).toEqual({
      identity: {
        subject: 'firebase-user-123',
      },
    });
  });
});
