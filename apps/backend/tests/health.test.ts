import { API_BASE_PATH, CURRENT_API_VERSION } from '@sport-analytics/contracts';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app';

describe(`GET ${API_BASE_PATH}/health`, () => {
  it('returns the API health state', async () => {
    const response = await request(createTestApp()).get(`${API_BASE_PATH}/health`).expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'sport-analytics-api',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.headers['api-version']).toBe(CURRENT_API_VERSION);
  });

  it.each(['/api/v0/health', '/api/v2/health'])(
    'rejects unsupported API version %s predictably',
    async (path) => {
      const response = await request(createTestApp()).get(path).expect(404);

      expect(response.body).toEqual({
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `API version ${path.split('/')[2]} is not supported. Use ${API_BASE_PATH}.`,
        },
      });
    },
  );
});
