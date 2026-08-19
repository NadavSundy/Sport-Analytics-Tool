import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { ParticipantFixture, PublicEvent } from '@sport-analytics/contracts';

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

    async listParticipantFixtures() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async listFixtureEvents() {
      return {
        data: [],
        pagination: {
          nextCursor: null,
        },
      };
    },

    async getFixtureEvent() {
      return null;
    },

    ...overrides,
  };
}

function publicEvent(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    eventId: '500',
    fixtureId: '100',
    inningsId: '200',
    inningsOrdinal: 0,
    sequenceNumber: 1,
    overNumber: 0,
    positionInOver: 0,
    ballNumber: '0.1',
    battingCompetitorId: '20',
    bowlingCompetitorId: '21',
    strikerParticipantId: '30',
    nonStrikerParticipantId: '31',
    bowlerParticipantId: '32',
    runs: {
      offBat: 4,
      extras: 0,
      total: 4,
      nonBoundary: false,
    },
    extras: {
      wides: null,
      noBalls: null,
      byes: null,
      legByes: null,
      penalty: null,
    },
    wickets: [],
    ...overrides,
  };
}

function participantFixture(overrides: Partial<ParticipantFixture> = {}): ParticipantFixture {
  return {
    fixture: {
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
    },
    competitionName: 'Example Competition',
    competitors: [
      { competitorId: '20', name: 'Team One' },
      { competitorId: '21', name: 'Team Two' },
    ],
    competitor: { competitorId: '20', name: 'Team One' },
    role: 'player',
    statisticsStatus: 'complete',
    statisticsWarnings: [],
    batting: {
      runsScored: 55,
      ballsFaced: 40,
      fours: 4,
      sixes: 2,
      strikeRate: 137.5,
    },
    bowling: null,
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
          competitionName: 'Example Competition',
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
      competitionName: 'Example Competition',
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

    expect(detail.body.data).toEqual({
      seasonId: 'season_example',
      competitionId: '12',
      competitionName: 'Example Competition',
      label: '2026',
    });
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
      competitionName: 'Test Competition',
      seasonId: 'season_example',
      season: '2026',
      seasonLabel: '2026',
      competitors: [
        {
          competitorId: '20',
          name: 'Team Alpha',
        },
        {
          competitorId: '21',
          name: 'Team Beta',
        },
      ],
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

    expect(response.body.data).toMatchObject({
      fixtureId: '100',
      competitionName: 'Test Competition',
      seasonLabel: '2026',
      competitors: [
        {
          competitorId: '20',
          name: 'Team Alpha',
        },
        {
          competitorId: '21',
          name: 'Team Beta',
        },
      ],
    });
  });

  test('lists ordered accepted fixture events anonymously with filters and pagination', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const events = [
      publicEvent(),
      publicEvent({
        eventId: '501',
        sequenceNumber: 2,
        positionInOver: 1,
        ballNumber: '0.2',
      }),
    ];
    const listFixtureEvents = vi.fn<PublicReadService['listFixtureEvents']>().mockResolvedValue({
      data: events,
      pagination: {
        nextCursor: 'next-event-page',
      },
    });

    const response = await request(
      createTestApp(
        verifyAccessToken,
        createService({
          listFixtureEvents,
        }),
      ),
    )
      .get('/api/v1/fixtures/100/events')
      .query({
        inningsId: '200',
        competitorId: '20',
        participantId: '30',
        overNumber: '0',
        wicketKind: 'caught',
        limit: '2',
      })
      .expect(200);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(listFixtureEvents).toHaveBeenCalledWith('100', {
      inningsId: '200',
      competitorId: '20',
      participantId: '30',
      overNumber: 0,
      wicketKind: 'caught',
      limit: 2,
    });
    expect(response.body.data.map((event: PublicEvent) => event.eventId)).toEqual(['500', '501']);
    expect(response.body.pagination.nextCursor).toBe('next-event-page');
    expect(response.body.data[0]).not.toHaveProperty('submissionId');
    expect(response.body.data[0]).not.toHaveProperty('submittedBy');
    expect(response.body.data[0]).not.toHaveProperty('recordedAt');
  });

  test('retrieves an accepted fixture event by stable identifier', async () => {
    const getFixtureEvent = vi
      .fn<PublicReadService['getFixtureEvent']>()
      .mockResolvedValue(publicEvent());

    const response = await request(
      createTestApp(
        undefined,
        createService({
          getFixtureEvent,
        }),
      ),
    )
      .get('/api/v1/fixtures/100/events/500')
      .expect(200);

    expect(getFixtureEvent).toHaveBeenCalledWith('100', '500');
    expect(response.body.data.eventId).toBe('500');
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

  test('lists a participant fixture history anonymously with readable match context', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const listParticipantFixtures = vi
      .fn<PublicReadService['listParticipantFixtures']>()
      .mockResolvedValue({
        data: [
          participantFixture({
            statisticsStatus: 'partial',
            statisticsWarnings: [
              {
                code: 'SOURCE_DATA_INCOMPLETE',
                message: 'The accepted source identifies fields that were unavailable.',
                fields: ['outcome'],
              },
            ],
          }),
        ],
        pagination: {
          nextCursor: 'next-match-page',
        },
      });

    const response = await request(
      createTestApp(
        verifyAccessToken,
        createService({
          listParticipantFixtures,
        }),
      ),
    )
      .get('/api/v1/participants/30/fixtures?limit=10')
      .expect(200);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(listParticipantFixtures).toHaveBeenCalledWith('30', { limit: 10 });
    expect(response.body.data[0]).toMatchObject({
      competitionName: 'Example Competition',
      competitors: [{ name: 'Team One' }, { name: 'Team Two' }],
      statisticsStatus: 'partial',
      batting: {
        runsScored: 55,
      },
      bowling: null,
    });
    expect(response.body.pagination.nextCursor).toBe('next-match-page');
    expect(JSON.stringify(response.body)).not.toContain('submissionId');
    expect(JSON.stringify(response.body)).not.toContain('submittedBy');
    expect(JSON.stringify(response.body)).not.toContain('audit');
  });

  test('returns not found when fixture history is requested for an unknown participant', async () => {
    const response = await request(
      createTestApp(
        undefined,
        createService({
          listParticipantFixtures: async () => null,
        }),
      ),
    )
      .get('/api/v1/participants/999/fixtures')
      .expect(404);

    expect(response.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Participant not found.',
    });
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

  test('returns fixture-event validation and not-found errors', async () => {
    const service = createService({
      listFixtureEvents: async () => null,
      getFixtureEvent: async () => null,
    });
    const app = createTestApp(undefined, service);

    const invalidFilter = await request(app)
      .get('/api/v1/fixtures/100/events?overNumber=-1')
      .expect(400);
    expect(invalidFilter.body.error.code).toBe('VALIDATION_FAILED');

    const missingFixture = await request(app).get('/api/v1/fixtures/999/events').expect(404);
    expect(missingFixture.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Fixture not found.',
    });

    const missingEvent = await request(app).get('/api/v1/fixtures/100/events/999').expect(404);
    expect(missingEvent.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Event not found.',
    });
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
