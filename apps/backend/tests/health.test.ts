import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('GET /api/v1/health', () => {
  it('returns the API health state', async () => {
    const response = await request(createApp()).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'sport-analytics-api',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});
