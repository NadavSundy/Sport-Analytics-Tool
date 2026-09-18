import { describe, expect, test } from 'vitest';

import { loadOpenApiDocument } from './openapi-contract';

type JsonObject = Record<string, unknown>;

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch']);

function object(value: unknown): JsonObject {
  expect(value).toBeTypeOf('object');
  expect(value).not.toBeNull();
  expect(Array.isArray(value)).toBe(false);
  return value as JsonObject;
}

function operation(document: JsonObject, path: string, method = 'get'): JsonObject {
  const paths = object(document.paths);
  const pathItem = object(paths[path]);
  return object(pathItem[method]);
}

function operations(document: JsonObject): Array<{
  path: string;
  method: string;
  operation: JsonObject;
}> {
  const paths = object(document.paths);
  return Object.entries(paths).flatMap(([path, rawPathItem]) => {
    const pathItem = object(rawPathItem);
    return Object.entries(pathItem)
      .filter(([method]) => HTTP_METHODS.has(method))
      .map(([method, rawOperation]) => ({
        path,
        method,
        operation: object(rawOperation),
      }));
  });
}

function security(operationNode: JsonObject): unknown {
  return operationNode.security;
}

function responseSchema(document: JsonObject, path: string, mediaType: string): JsonObject {
  const responses = object(operation(document, path).responses);
  const ok = object(responses['200']);
  const content = object(ok.content);
  return object(object(content[mediaType]).schema);
}

function parameterKeys(operationNode: JsonObject): Set<string> {
  const parameters = operationNode.parameters;
  expect(Array.isArray(parameters)).toBe(true);

  return new Set(
    (parameters as unknown[]).map((rawParameter) => {
      const parameter = object(rawParameter);
      if (typeof parameter.$ref === 'string') return parameter.$ref;
      return `${String(parameter.in)}:${String(parameter.name)}`;
    }),
  );
}

describe('Swagger/explorer-facing OpenAPI metadata', () => {
  const document = loadOpenApiDocument();
  const allOperations = operations(document);

  test('documents deployed and local development servers', () => {
    expect(document.servers).toEqual([
      {
        url: 'https://statsthegame-api-dev-eecff5bbfjbyhbb2.southafricanorth-01.azurewebsites.net',
        description: 'Deployed development API',
      },
      {
        url: 'http://127.0.0.1:3000',
        description: 'Local development API',
      },
    ]);
  });

  test('defines bearer and X-API-Key security schemes without credentials', () => {
    const components = object(document.components);
    const schemes = object(components.securitySchemes);
    const bearer = object(schemes.bearerAuth);
    const apiKey = object(schemes.apiKeyAuth);

    expect(bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(String(bearer.description)).toContain('Supabase');
    expect(bearer).not.toHaveProperty('example');
    expect(bearer).not.toHaveProperty('default');

    expect(apiKey).toMatchObject({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    });
    expect(String(apiKey.description)).toContain('X-API-Key');
    expect(apiKey).not.toHaveProperty('example');
    expect(apiKey).not.toHaveProperty('default');
  });

  test('keeps operation IDs unique and implementation status explicit', () => {
    const ids = allOperations.map(({ operation }) => operation.operationId);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);

    for (const { path, method, operation: operationNode } of allOperations) {
      expect(
        ['implemented', 'planned'],
        `${method.toUpperCase()} ${path} must carry x-implementation-status`,
      ).toContain(operationNode['x-implementation-status']);
    }
  });

  test('groups operations into understandable API areas', () => {
    for (const { path, method, operation: operationNode } of allOperations) {
      expect(
        Array.isArray(operationNode.tags) && operationNode.tags.length > 0,
        `${method.toUpperCase()} ${path} must have at least one tag`,
      ).toBe(true);
    }

    expect(operation(document, '/api/v1/health').tags).toContain('Health');
    expect(operation(document, '/api/v1/consumer/fixtures').tags).toContain('Consumer API');
    expect(operation(document, '/api/v1/submissions', 'post').tags).toContain('Submissions');
    expect(operation(document, '/api/v1/admin/users').tags).toContain('Administration');
  });

  test('keeps representative public, bearer and API-key security explicit', () => {
    expect(security(operation(document, '/api/v1/health'))).toEqual([]);
    expect(security(operation(document, '/api/v1/auth/me'))).toEqual([{ bearerAuth: [] }]);
    expect(security(operation(document, '/api/v1/consumer/fixtures'))).toEqual([
      { apiKeyAuth: [] },
    ]);
  });

  test('documents consumer event filters and aggregate options', () => {
    expect(
      parameterKeys(operation(document, '/api/v1/consumer/fixtures/{fixtureId}/events')),
    ).toEqual(
      new Set([
        '#/components/parameters/FixtureId',
        '#/components/parameters/Limit',
        '#/components/parameters/Cursor',
        'query:inningsId',
        'query:competitorId',
        'query:participantId',
        'query:overNumber',
        'query:wicketKind',
      ]),
    );

    expect(
      parameterKeys(operation(document, '/api/v1/consumer/fixtures/{fixtureId}/statistics')),
    ).toEqual(
      new Set([
        '#/components/parameters/FixtureId',
        '#/components/parameters/IncludeStatisticContributors',
      ]),
    );

    expect(
      parameterKeys(
        operation(document, '/api/v1/consumer/participants/{participantId}/statistics'),
      ),
    ).toEqual(
      new Set([
        '#/components/parameters/ParticipantId',
        '#/components/parameters/ParticipantAggregateScope',
      ]),
    );
  });

  test('documents consumer JSON and CSV response content', () => {
    expect(
      responseSchema(document, '/api/v1/consumer/fixtures/{fixtureId}', 'application/json').$ref,
    ).toBe('#/components/schemas/FixtureResponse');

    expect(
      responseSchema(document, '/api/v1/consumer/fixtures/{fixtureId}/events', 'application/json')
        .$ref,
    ).toBe('#/components/schemas/PublicEventCollectionResponse');

    expect(
      responseSchema(
        document,
        '/api/v1/consumer/fixtures/{fixtureId}/events/export.json',
        'application/json',
      ).$ref,
    ).toBe('#/components/schemas/PublicEventExportResponse');

    expect(
      responseSchema(
        document,
        '/api/v1/consumer/fixtures/{fixtureId}/events/export.csv',
        'text/csv',
      ),
    ).toMatchObject({ type: 'string', format: 'binary' });

    expect(
      responseSchema(
        document,
        '/api/v1/consumer/fixtures/{fixtureId}/statistics',
        'application/json',
      ).$ref,
    ).toBe('#/components/schemas/FixtureStatisticsResponse');

    expect(
      responseSchema(
        document,
        '/api/v1/consumer/participants/{participantId}/statistics',
        'application/json',
      ).$ref,
    ).toBe('#/components/schemas/ParticipantAggregatesResponse');
  });
});
