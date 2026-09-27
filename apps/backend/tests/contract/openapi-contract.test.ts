import request from 'supertest';
import { describe, expect, test } from 'vitest';

import type { PublicReadService } from '../../src/modules/public-read/public-read.service';
import { createTestApp } from '../test-app';
import { ContractViolation, createOpenApiContract, loadOpenApiDocument } from './openapi-contract';

/**
 * Tests of the contract checker itself (issue #609).
 *
 * A contract test is only worth having if it fails when the implementation and
 * the specification disagree. Each deliberate mismatch below is produced for
 * real, and the test passes only when the checker rejects it with a readable
 * message naming the exchange and the problem.
 */

const contract = createOpenApiContract();

function publicRead(listCompetitions: PublicReadService['listCompetitions']): PublicReadService {
  return { listCompetitions } as unknown as PublicReadService;
}

function violationOf(action: () => void): ContractViolation {
  try {
    action();
  } catch (error) {
    if (error instanceof ContractViolation) return error;
    throw error;
  }
  throw new Error('Expected a contract violation, but the exchange satisfied the contract.');
}

describe('OpenAPI contract checker', () => {
  test('accepts a response that matches the published contract', async () => {
    const response = await request(createTestApp()).get('/api/v1/health').expect(200);

    expect(() => contract.expectResponse(response)).not.toThrow();
  });

  test('deliberate mismatch: rejects a response body missing a documented required property', async () => {
    const app = createTestApp(
      undefined,
      publicRead(async () => ({
        data: [{ competitionId: 'competition_1' } as never],
        pagination: { nextCursor: null },
      })),
    );
    const response = await request(app).get('/api/v1/competitions').expect(200);

    const violation = violationOf(() => contract.expectResponse(response));

    expect(violation.message).toContain(
      'OpenAPI contract violation for GET /api/v1/competitions → 200',
    );
    expect(violation.problems).toContain(
      "response body /data/0 must have required property 'name'",
    );
  });

  test('deliberate mismatch: rejects a status the operation does not document', async () => {
    const app = createTestApp(
      undefined,
      publicRead(async () => {
        throw new Error('Simulated repository failure.');
      }),
    );
    const response = await request(app).get('/api/v1/competitions').expect(500);

    const violation = violationOf(() => contract.expectResponse(response));

    expect(violation.problems).toEqual([
      'status 500 is not documented; documented statuses: 200, 400',
    ]);
  });

  test('deliberate mismatch: rejects a response once the specification requires something the API does not send', async () => {
    const changed = loadOpenApiDocument();
    const schemas = (changed.components as { schemas: Record<string, { required: string[] }> })
      .schemas;
    schemas.HealthResponse!.required.push('uptimeSeconds');
    const changedContract = createOpenApiContract(changed);
    const response = await request(createTestApp()).get('/api/v1/health').expect(200);

    const violation = violationOf(() => changedContract.expectResponse(response));

    expect(violation.problems).toEqual([
      "response body (root) must have required property 'uptimeSeconds'",
    ]);
    // The unchanged contract still accepts the same response.
    expect(() => contract.expectResponse(response)).not.toThrow();
  });

  test('checks request parameters, and requires a declared invalid request to be invalid', async () => {
    const app = createTestApp(
      undefined,
      publicRead(async () => ({ data: [], pagination: { nextCursor: null } })),
    );

    const invalid = await request(app).get('/api/v1/competitions?limit=0').expect(400);
    expect(contract.checkResponse(invalid)).toContain(
      'request query parameter \'limit\'="0": (root) must be >= 1',
    );
    expect(() => contract.expectResponse(invalid, { requestIsInvalid: true })).not.toThrow();

    const valid = await request(app).get('/api/v1/competitions?limit=5').expect(200);
    expect(contract.checkResponse(valid, { requestIsInvalid: true })).toEqual([
      'the test declares the request invalid, but it satisfies the documented parameters and body',
    ]);
  });

  test('prefers a literal path segment over a template parameter', () => {
    expect(contract.findOperation('GET', '/api/v1/fixtures/9/events/export.json')).toEqual({
      method: 'GET',
      template: '/api/v1/fixtures/{fixtureId}/events/export.json',
    });
    expect(contract.findOperation('GET', '/api/v1/fixtures/9/events/12')).toEqual({
      method: 'GET',
      template: '/api/v1/fixtures/{fixtureId}/events/{eventId}',
    });
    expect(contract.findOperation('GET', '/api/v1/not-documented')).toBeUndefined();
  });
});
