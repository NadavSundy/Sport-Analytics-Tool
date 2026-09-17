import request from 'supertest';
import { describe, expect, test } from 'vitest';

import type { PublicEvent } from '@sport-analytics/contracts';

import { CONSUMER_API_KEY, contractApp } from './contract-app';
import { createOpenApiContract } from './openapi-contract';

/**
 * Representative public, consumer and authenticated operations checked against
 * docs/api/openapi.yaml (issue #609). Services are stubbed; routing,
 * authentication, validation and serialisation are the real implementation.
 */

const contract = createOpenApiContract();

const competition = { competitionId: '10', name: 'World Twenty20' };

const fixture = {
  fixtureId: '100',
  competitionId: '12',
  competitionName: 'Test Competition',
  seasonId: 'season_example',
  season: '2026',
  seasonLabel: '2026',
  competitors: [
    { competitorId: '20', name: 'Team Alpha' },
    { competitorId: '21', name: 'Team Beta' },
  ],
  matchType: 'T20',
  teamType: 'international',
  gender: 'male',
  ballsPerOver: 6,
  scheduledOvers: 20,
  venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
  toss: { winnerCompetitorId: '20', winnerCompetitorName: 'Team Alpha', decision: 'bat' },
  startDate: '2026-08-09',
  endDate: '2026-08-09',
};

const event: PublicEvent = {
  eventId: '500',
  fixtureId: '100',
  competitionId: '10',
  competitionName: 'World Twenty20',
  inningsId: '200',
  inningsOrdinal: 0,
  sequenceNumber: 1,
  overNumber: 0,
  positionInOver: 0,
  ballNumber: '0.1',
  battingCompetitorId: '20',
  battingCompetitorName: 'India',
  bowlingCompetitorId: '21',
  bowlingCompetitorName: 'Pakistan',
  strikerParticipantId: '30',
  strikerParticipantName: 'Opening Batter',
  nonStrikerParticipantId: '31',
  nonStrikerParticipantName: 'Non-striker',
  bowlerParticipantId: '32',
  bowlerParticipantName: 'Opening Bowler',
  runs: { offBat: 4, extras: 0, total: 4, nonBoundary: false },
  extras: { wides: null, noBalls: null, byes: null, legByes: null, penalty: null },
  wickets: [],
};

const fixtureStatistics = {
  fixtureId: '9',
  status: 'complete' as const,
  scope: { superOversIncluded: false },
  outcome: {
    kind: 'tie' as const,
    winnerCompetitorId: null,
    winnerCompetitorName: null,
    eliminatorCompetitorId: null,
    eliminatorCompetitorName: null,
    margin: null,
    method: null,
    decidedByBowlOut: false,
  },
  highestScorers: [],
  warnings: [],
  statistics: [],
};

const release = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.1',
  createdAt: '2026-09-09T10:00:00.000Z',
  formatVersion: '1.0' as const,
  scope: 'published-accepted-deliveries' as const,
  eventCount: 2,
  checksum: 'a'.repeat(64),
  fields: [
    { name: 'eventId', description: 'Stable identifier of the accepted delivery revision.' },
  ],
};

const apiConsumer = {
  id: '7',
  name: 'Partner dashboard',
  rateLimitPerMinute: 60,
  dailyQuota: 10000,
  createdAt: '2026-09-07T10:00:00.000Z',
  keys: [
    { id: '9', prefix: 'sat_live_example', createdAt: '2026-09-07T10:00:00.000Z', revokedAt: null },
  ],
};

function activeConsumerRepository() {
  return {
    findActiveConsumer: async () => ({ consumerId: '7', rateLimitPerMinute: 60, dailyQuota: 100 }),
    consumeDailyQuota: async () => ({ allowed: true, used: 1 }),
  };
}

describe('public operations', () => {
  test('GET /health returns the documented health response', async () => {
    const response = await request(contractApp()).get('/api/v1/health').expect(200);

    contract.expectResponse(response);
  });

  test('GET /competitions returns a documented page, and 400 for an invalid limit', async () => {
    const app = contractApp({
      publicRead: {
        listCompetitions: async () => ({ data: [competition], pagination: { nextCursor: null } }),
      },
    });

    contract.expectResponse(await request(app).get('/api/v1/competitions?limit=5').expect(200));
    contract.expectResponse(await request(app).get('/api/v1/competitions?limit=0').expect(400), {
      requestIsInvalid: true,
    });
  });

  test('GET /fixtures/{fixtureId} returns a documented fixture, and 404 when it is unknown', async () => {
    const found = contractApp({ publicRead: { getFixture: async () => fixture } });
    const missing = contractApp({ publicRead: { getFixture: async () => null } });

    contract.expectResponse(await request(found).get('/api/v1/fixtures/100').expect(200));
    contract.expectResponse(await request(missing).get('/api/v1/fixtures/999').expect(404));
  });

  test('GET /fixtures/{fixtureId}/statistics returns documented fixture statistics', async () => {
    const app = contractApp({
      fixtureStatistics: {
        getFixtureStatistics: async () => fixtureStatistics,
        getFixtureStatistic: async () => null,
      },
    });

    contract.expectResponse(await request(app).get('/api/v1/fixtures/9/statistics').expect(200));
  });

  test('GET /fixtures/{fixtureId}/events/export.csv returns documented CSV', async () => {
    const app = contractApp({ publicRead: { exportFixtureEvents: async () => [event] } });

    const response = await request(app).get('/api/v1/fixtures/100/events/export.csv').expect(200);

    contract.expectResponse(response);
  });

  test('GET /dataset-releases returns documented releases, and 404 for an unknown version', async () => {
    const app = contractApp({
      datasetReleases: { listReleases: async () => [release], getRelease: async () => null },
    });

    contract.expectResponse(await request(app).get('/api/v1/dataset-releases').expect(200));
    contract.expectResponse(
      await request(app).get('/api/v1/dataset-releases/2026.09.9').expect(404),
    );
  });

  test('an unsupported API major version returns the documented UNSUPPORTED_API_VERSION error', async () => {
    const response = await request(contractApp()).get('/api/v2/health').expect(404);

    expect(response.body.error.code).toBe('UNSUPPORTED_API_VERSION');
    expect(contract.schemaProblems('/components/schemas/ApiErrorResponse', response.body)).toEqual(
      [],
    );
    expect(String((contract.document.info as { description: string }).description)).toContain(
      'UNSUPPORTED_API_VERSION',
    );
  });
});

describe('consumer (API key) operations', () => {
  test('GET /consumer/competitions returns a documented page for an active key', async () => {
    const app = contractApp({
      publicRead: {
        listCompetitions: async () => ({ data: [competition], pagination: { nextCursor: null } }),
      },
      apiConsumerRepository: activeConsumerRepository(),
    });

    const response = await request(app)
      .get('/api/v1/consumer/competitions')
      .set('X-API-Key', CONSUMER_API_KEY)
      .expect(200);

    contract.expectResponse(response);
  });

  test('GET /consumer/competitions returns the documented 401 without a key', async () => {
    const response = await request(
      contractApp({ apiConsumerRepository: activeConsumerRepository() }),
    )
      .get('/api/v1/consumer/competitions')
      .expect(401);

    contract.expectResponse(response);
    expect(response.headers['www-authenticate']).toBe('ApiKey');
  });
});

describe('authenticated operations', () => {
  test('GET /auth/me returns the documented profile, and 401 without a token', async () => {
    const app = contractApp();

    contract.expectResponse(
      await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer token').expect(200),
    );
    contract.expectResponse(await request(app).get('/api/v1/auth/me').expect(401));
  });

  test('POST /submitter-access-requests returns 201, and 422 for an invalid body', async () => {
    const app = contractApp();
    const valid = { competitionId: '5' };
    const invalid = { competitionId: 'not-an-identifier' };

    contract.expectResponse(
      await request(app)
        .post('/api/v1/submitter-access-requests')
        .set('Authorization', 'Bearer token')
        .send(valid)
        .expect(201),
      { requestBody: valid },
    );
    contract.expectResponse(
      await request(app)
        .post('/api/v1/submitter-access-requests')
        .set('Authorization', 'Bearer token')
        .send(invalid)
        .expect(422),
      { requestBody: invalid, requestIsInvalid: true },
    );
  });

  test('GET /provenance/submissions returns 200 to an administrator and 403 to a viewer', async () => {
    const provenance = {
      listSubmissions: async () => ({ data: [], pagination: { nextCursor: null } }),
    };
    const administrator = contractApp({ account: { role: 'admin' }, provenance });
    const viewer = contractApp({ account: { role: 'viewer' }, provenance });

    contract.expectResponse(
      await request(administrator)
        .get('/api/v1/provenance/submissions')
        .set('Authorization', 'Bearer token')
        .expect(200),
    );
    contract.expectResponse(
      await request(viewer)
        .get('/api/v1/provenance/submissions')
        .set('Authorization', 'Bearer token')
        .expect(403),
    );
  });

  test('POST /admin/api-consumers returns 201 to an administrator and 403 to a viewer', async () => {
    const body = { name: 'Partner dashboard', rateLimitPerMinute: 60, dailyQuota: 10000 };
    const apiConsumers = {
      issue: async () => ({ ...apiConsumer, apiKey: CONSUMER_API_KEY }),
    };

    contract.expectResponse(
      await request(contractApp({ account: { role: 'admin' }, apiConsumers }))
        .post('/api/v1/admin/api-consumers')
        .set('Authorization', 'Bearer token')
        .send(body)
        .expect(201),
      { requestBody: body },
    );
    contract.expectResponse(
      await request(contractApp({ account: { role: 'viewer' }, apiConsumers }))
        .post('/api/v1/admin/api-consumers')
        .set('Authorization', 'Bearer token')
        .send(body)
        .expect(403),
      { requestBody: body },
    );
  });
});

describe('deprecation metadata', () => {
  test('a deprecated field remains in responses until its documented retirement', async () => {
    const schemas = (contract.document.components as { schemas: Record<string, unknown> }).schemas;
    const profile = schemas.CurrentUserProfileResponse as {
      properties: { user: { properties: { approvalState: { deprecated?: boolean } } } };
    };
    expect(profile.properties.user.properties.approvalState.deprecated).toBe(true);

    const response = await request(contractApp({ account: { approvalState: 'pending' } }))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer token')
      .expect(200);

    contract.expectResponse(response);
    expect(response.body.user.approvalState).toBe('pending');
  });

  test('every deprecated operation explains its replacement in its description', () => {
    const deprecated = contract.operations().filter((operation) => {
      const [method, path] = operation.split(' ') as [string, string];
      const paths = contract.document.paths as Record<
        string,
        Record<string, { deprecated?: boolean }>
      >;
      return paths[path]?.[method.toLowerCase()]?.deprecated === true;
    });

    for (const operation of deprecated) {
      const [method, path] = operation.split(' ') as [string, string];
      const paths = contract.document.paths as Record<
        string,
        Record<string, { description?: string }>
      >;
      expect(paths[path]?.[method.toLowerCase()]?.description, operation).toMatch(/\S/);
    }
  });
});
