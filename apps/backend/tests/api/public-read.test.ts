import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { PublicReadService } from '../../src/modules/public-read/public-read.service';
import { PublicReadInputError } from '../../src/modules/public-read/public-read.errors';
import { createTestApp } from '../test-app';

function createService(overrides: Partial<PublicReadService> = {}): PublicReadService {
  return {
    async listCompetitions() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getCompetition() {
      return null;
    },

    async listSeasons() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getSeason() {
      return null;
    },

    async listFixtures() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getFixture() {
      return null;
    },

    async listCompetitors() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getCompetitor() {
      return null;
    },

    async listParticipants() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getParticipant() {
      return null;
    },

    ...overrides,
  };
}

describe('public read API', () => {
  test('lists competitions without authentication', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();

    const listCompetitions = vi.fn<PublicReadService['listCompetitions']>().mockResolvedValue({
      data: [
        {
          competitionId: '1',
          name: 'Example Competition',
        },
      ],
      pagination: {
        nextCursor: 'next-page',
      },
    });

    const response = await request(
      createTestApp(
        verifyAccessToken,
        createService({
          listCompetitions,
        }),
      ),
    )
      .get('/api/v1/competitions')
      .expect(200);

    expect(verifyAccessToken).not.toHaveBeenCalled();

    expect(listCompetitions).toHaveBeenCalledWith({
      limit: 50,
    });

    expect(response.body).toEqual({
      data: [
        {
          competitionId: '1',
          name: 'Example Competition',
        },
      ],
      pagination: {
        nextCursor: 'next-page',
      },
    });
  });

  test('retrieves a competition by stable identifier', async () => {
    const getCompetition = vi.fn<PublicReadService['getCompetition']>().mockResolvedValue({
      competitionId: '12',
      name: 'Test Competition',
    });

    const response = await request(
      createTestApp(
        undefined,
        createService({
          getCompetition,
        }),
      ),
    )
      .get('/api/v1/competitions/12')
      .expect(200);

    expect(response.body).toEqual({
      data: {
        competitionId: '12',
        name: 'Test Competition',
      },
    });
  });

  test('lists and retrieves seasons', async () => {
    const listSeasons = vi.fn<PublicReadService['listSeasons']>().mockResolvedValue({
      data: [
        {
          seasonId: 'season_example',
          competitionId: '12',
          label: '2026',
        },
      ],
      pagination: {
        nextCursor: null,
      },
    });

    const getSeason = vi.fn<PublicReadService['getSeason']>().mockResolvedValue({
      seasonId: 'season_example',
      competitionId: '12',
      label: '2026',
    });

    const app = createTestApp(
      undefined,
      createService({
        listSeasons,
        getSeason,
      }),
    );

    await request(app).get('/api/v1/seasons?competitionId=12').expect(200);

    expect(listSeasons).toHaveBeenCalledWith({
      competitionId: '12',
      limit: 50,
    });

    const detail = await request(app).get('/api/v1/seasons/season_example').expect(200);

    expect(detail.body.data.label).toBe('2026');
  });

  test('passes fixture filters and pagination to the service', async () => {
    const listFixtures = vi.fn<PublicReadService['listFixtures']>().mockResolvedValue({
      data: [],
      pagination: {
        nextCursor: 'next-fixture-page',
      },
    });

    const app = createTestApp(
      undefined,
      createService({
        listFixtures,
      }),
    );

    const response = await request(app)
      .get('/api/v1/fixtures')
      .query({
        competitionId: '1',
        competitorId: '2',
        gender: 'female',
        startDateFrom: '2026-01-01',
        startDateTo: '2026-08-09',
        limit: '25',
      })
      .expect(200);

    expect(listFixtures).toHaveBeenCalledWith({
      competitionId: '1',
      competitorId: '2',
      gender: 'female',
      startDateFrom: '2026-01-01',
      startDateTo: '2026-08-09',
      limit: 25,
    });

    expect(response.body.pagination.nextCursor).toBe('next-fixture-page');

    await request(app)
      .get('/api/v1/fixtures')
      .query({
        cursor: 'next-fixture-page',
      })
      .expect(200);

    expect(listFixtures).toHaveBeenLastCalledWith({
      cursor: 'next-fixture-page',
      limit: 50,
    });
  });

  test('retrieves a fixture', async () => {
    const getFixture = vi.fn<PublicReadService['getFixture']>().mockResolvedValue({
      fixtureId: '100',
      competitionId: '12',
      seasonId: 'season_example',
      season: '2026',
      matchType: 'T20',
      teamType: 'international',
      gender: 'male',
      ballsPerOver: 6,
      scheduledOvers: 20,
      startDate: '2026-08-09',
      endDate: '2026-08-09',
    });

    const response = await request(
      createTestApp(
        undefined,
        createService({
          getFixture,
        }),
      ),
    )
      .get('/api/v1/fixtures/100')
      .expect(200);

    expect(response.body.data.fixtureId).toBe('100');
  });

  test('lists and retrieves competitors', async () => {
    const listCompetitors = vi.fn<PublicReadService['listCompetitors']>().mockResolvedValue({
      data: [
        {
          competitorId: '20',
          name: 'Team Example',
        },
      ],
      pagination: {
        nextCursor: null,
      },
    });

    const getCompetitor = vi.fn<PublicReadService['getCompetitor']>().mockResolvedValue({
      competitorId: '20',
      name: 'Team Example',
    });

    const app = createTestApp(
      undefined,
      createService({
        listCompetitors,
        getCompetitor,
      }),
    );

    await request(app).get('/api/v1/competitors?competitionId=12&name=Team').expect(200);

    expect(listCompetitors).toHaveBeenCalledWith({
      competitionId: '12',
      name: 'Team',
      limit: 50,
    });

    const detail = await request(app).get('/api/v1/competitors/20').expect(200);

    expect(detail.body.data.competitorId).toBe('20');
  });

  test('lists and retrieves participants', async () => {
    const listParticipants = vi.fn<PublicReadService['listParticipants']>().mockResolvedValue({
      data: [
        {
          participantId: '30',
          displayName: 'Player Example',
        },
      ],
      pagination: {
        nextCursor: null,
      },
    });

    const getParticipant = vi.fn<PublicReadService['getParticipant']>().mockResolvedValue({
      participantId: '30',
      displayName: 'Player Example',
    });

    const app = createTestApp(
      undefined,
      createService({
        listParticipants,
        getParticipant,
      }),
    );

    await request(app).get('/api/v1/participants?fixtureId=100&competitorId=20').expect(200);

    expect(listParticipants).toHaveBeenCalledWith({
      fixtureId: '100',
      competitorId: '20',
      limit: 50,
    });

    const detail = await request(app).get('/api/v1/participants/30').expect(200);

    expect(detail.body.data.displayName).toBe('Player Example');
  });

  test('returns a clear not-found response for an unknown identifier', async () => {
    const response = await request(
      createTestApp(
        undefined,
        createService({
          getCompetition: async () => null,
        }),
      ),
    )
      .get('/api/v1/competitions/999999')
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Competition not found.',
      },
    });
  });

  test('rejects invalid collection query parameters', async () => {
    const response = await request(createTestApp(undefined, createService()))
      .get('/api/v1/fixtures?limit=999')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  test('rejects an invalid fixture date range', async () => {
    const response = await request(createTestApp(undefined, createService()))
      .get('/api/v1/fixtures')
      .query({
        startDateFrom: '2026-08-09',
        startDateTo: '2026-01-01',
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  test('returns a clear invalid-cursor response', async () => {
    const listCompetitions = vi
      .fn<PublicReadService['listCompetitions']>()
      .mockRejectedValue(
        new PublicReadInputError('INVALID_CURSOR', 'The pagination cursor is invalid.'),
      );

    const response = await request(
      createTestApp(
        undefined,
        createService({
          listCompetitions,
        }),
      ),
    )
      .get('/api/v1/competitions?cursor=broken')
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CURSOR',
        message: 'The pagination cursor is invalid.',
      },
    });
  });
});
