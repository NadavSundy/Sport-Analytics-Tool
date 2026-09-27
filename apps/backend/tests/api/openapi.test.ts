import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { CURRENT_API_VERSION } from '@sport-analytics/contracts';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import { createTestApp } from '../test-app';

const sourceSpecificationPath = path.resolve(
  process.cwd(),
  '..',
  '..',
  'docs',
  'api',
  'openapi.yaml',
);

describe('GET /openapi.yaml', () => {
  it('serves the authoritative OpenAPI specification anonymously', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const sourceSpecification = await readFile(sourceSpecificationPath, 'utf8');

    const response = await request(createTestApp(verifyAccessToken))
      .get('/openapi.yaml')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/^application\/yaml(?:;|$)/);
    expect(response.text).toBe(sourceSpecification);
    expect(response.text).toContain('openapi: 3.1.0');
    expect(response.text).toContain('title: Sport Analytics API');
    expect(response.text).toContain('supportedVersions: [v1]');
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it('leaves the normal versioned API routing unchanged', async () => {
    const app = createTestApp();

    const health = await request(app).get('/api/v1/health').expect(200);
    expect(health.headers['api-version']).toBe(CURRENT_API_VERSION);

    const unsupported = await request(app).get('/api/v2/health').expect(404);
    expect(unsupported.body).toEqual({
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: 'API version v2 is not supported. Use /api/v1.',
      },
    });
  });
});
