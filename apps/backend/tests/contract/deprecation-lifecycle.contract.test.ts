import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { PublicReadService } from '../../src/modules/public-read/public-read.service';
import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';

import {
  createDeprecationMiddleware,
  deprecatedOperations,
} from '../../src/middleware/api-deprecation';
import { createTestApp } from '../test-app';

const sourceSpecificationPath = path.resolve(
  process.cwd(),
  '..',
  '..',
  'docs',
  'api',
  'openapi.yaml',
);

const deprecatedExportPath = '/api/v1/consumer/fixtures/{fixtureId}/events/export.json';
const replacementPath = '/api/v1/fixtures/{fixtureId}/events/export.json';

function appWithExport() {
  return createTestApp(undefined, {
    exportFixtureEvents: async () => [],
  } as PublicReadService);
}

describe('API deprecation lifecycle', () => {
  test('defines every former consumer cricket-resource alias as a canonical-path deprecation', async () => {
    expect(deprecatedOperations).toHaveLength(13);
    for (const deprecation of deprecatedOperations) {
      expect(deprecation.path).toMatch(/^\/api\/v1\/consumer\//);
      expect(deprecation.replacementPath).toMatch(/^\/api\/v1\/(?!consumer\/)/);
    }

    const document = parse(await readFile(sourceSpecificationPath, 'utf8')) as {
      paths: Record<string, Record<string, Record<string, unknown>>>;
    };
    for (const deprecation of deprecatedOperations) {
      const openApiPath = deprecation.path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}');
      const operation = document.paths[openApiPath]?.get;
      expect(operation?.deprecated, openApiPath).toBe(true);
      expect(operation?.description, openApiPath).toContain(
        deprecation.replacementPath.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}'),
      );
    }
  });

  test('restores the canonical export and leaves lifecycle metadata off canonical paths', async () => {
    const response = await request(appWithExport())
      .get('/api/v1/fixtures/100/events/export.json?overNumber=3')
      .expect(200);

    expect(response.body).toEqual({ data: [] });
    expect(response.headers.deprecation).toBeUndefined();
    expect(response.headers.sunset).toBeUndefined();
    expect(response.headers.link).toBeUndefined();
  });

  test('does not add deprecation metadata to unaffected v1 operations', async () => {
    const response = await request(appWithExport()).get('/api/v1/health').expect(200);

    expect(response.headers.deprecation).toBeUndefined();
    expect(response.headers.sunset).toBeUndefined();
    expect(response.headers.link).toBeUndefined();
  });

  test('represents the deprecated operation, successor route, and response headers in OpenAPI', async () => {
    const document = parse(await readFile(sourceSpecificationPath, 'utf8')) as {
      paths: Record<string, Record<string, Record<string, unknown>>>;
    };
    const operation = document.paths[deprecatedExportPath]?.get;
    const successor = document.paths[replacementPath]?.get;

    expect(operation?.deprecated).toBe(true);
    expect(operation?.description).toContain(replacementPath);
    expect(operation?.description).toContain('no retirement date is scheduled');
    expect(operation?.responses).toMatchObject({
      '200': {
        headers: {
          Deprecation: { $ref: '#/components/headers/Deprecation' },
          Link: { $ref: '#/components/headers/SuccessorLink' },
        },
      },
    });
    expect(successor?.deprecated).not.toBe(true);
    expect(successor?.security).toEqual([{}, { apiKeyAuth: [] }]);
  });

  test('rejects a deprecation configuration without a replacement target', () => {
    expect(() =>
      createDeprecationMiddleware([
        {
          method: 'GET',
          path: '/api/v1/consumer/fixtures/:fixtureId/events/export.json',
          replacementPath: '',
        },
      ]),
    ).toThrow(/replacement/i);
  });
});
