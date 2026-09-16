import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { FixtureStatistic, ParticipantFixture, PublicEvent } from '@sport-analytics/contracts';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { PublicReadService } from '../../src/modules/public-read/public-read.service';
import {
  FixtureEventExportTooLargeError,
  PublicReadInputError,
} from '../../src/modules/public-read/public-read.errors';
import type { FixtureStatisticsService } from '../../src/modules/statistics/fixture-statistics.service';
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

    async exportFixtureEvents() {
      return [];
    },

    async getFixtureEvent() {
      return null;
    },

    ...overrides,
  };
}

function statisticsServiceReturning(statistic: FixtureStatistic | null): FixtureStatisticsService {
  return {
    async getFixtureStatistics() {
      return null;
    },
    getFixtureStatistic: vi
      .fn<FixtureStatisticsService['getFixtureStatistic']>()
      .mockResolvedValue(statistic),
  };
}

function contributingEvent(eventId: string, sequenceNumber: number) {
  return {
    eventId,
    fixtureId: '100',
    inningsId: '200',
    inningsOrdinal: 0,
    sequenceNumber,
    strikerParticipantId: '30',
    strikerParticipantName: 'Opening Batter',
    bowlerParticipantId: '32',
    bowlerParticipantName: 'Opening Bowler',
    runs: { offBat: 4, extras: 0, total: 4 },
    extras: { wides: null, noBalls: null, byes: null, legByes: null, penalty: null },
    nonBoundary: false,
    bowlerWickets: 0,
    wicketsLost: 0,
  };
}

function participantTraceStatistic(eventIds: string[]): FixtureStatistic {
  return {
    statisticId: 'stat_player',
    fixtureId: '100',
    scope: 'participant',
    statisticCode: 'participant_fixture',
    participantId: '30',
    participantName: 'Opening Batter',
    competitorId: '20',
    competitorName: 'India',
    sourceEventCount: eventIds.length,
    batting: { runsScored: 8, ballsFaced: 2, strikeRate: 400, fours: 2, sixes: 0 },
    bowling: null,
    contributingEvents: eventIds.map((eventId, index) => contributingEvent(eventId, index + 1)),
  };
}

function publicEvent(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
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
      venue: null,
      toss: null,
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
      .get('/api/v1/competitions?name=World%20Twenty20')
      .expect(200);

    expect(verifyAccessToken).not.toHaveBeenCalled();

    expect(listCompetitions).toHaveBeenCalledWith({
      limit: 50,
      name: 'World Twenty20',
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

    await request(app).get('/api/v1/seasons?competitionId=12&name=2026').expect(200);

    expect(listSeasons).toHaveBeenCalledWith({
      competitionId: '12',
      limit: 50,
      name: '2026',
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
      venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
      toss: {
        winnerCompetitorId: '20',
        winnerCompetitorName: 'Team Alpha',
        decision: 'bat',
      },
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
      venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
      toss: {
        winnerCompetitorId: '20',
        winnerCompetitorName: 'Team Alpha',
        decision: 'bat',
      },
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

  // Before #467 this test asserted a single page of 100 was exported and its
  // cursor, deliberately named 'not-exported', discarded.
  test('exports every filtered fixture event, not a single page', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const events = Array.from({ length: 125 }, (_, index) =>
      publicEvent({ eventId: String(500 + index), sequenceNumber: index + 1 }),
    );
    const listFixtureEvents = vi.fn<PublicReadService['listFixtureEvents']>();
    const exportFixtureEvents = vi
      .fn<PublicReadService['exportFixtureEvents']>()
      .mockResolvedValue(events);

    const response = await request(
      createTestApp(
        verifyAccessToken,
        createService({
          exportFixtureEvents,
          listFixtureEvents,
        }),
      ),
    )
      .get('/api/v1/fixtures/100/events/export.json')
      .query({
        inningsId: '200',
        competitorId: '20',
        participantId: '30',
        overNumber: '0',
        wicketKind: 'caught',
      })
      .expect('Content-Type', /application\/json/)
      .expect(200);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(exportFixtureEvents).toHaveBeenCalledWith('100', {
      inningsId: '200',
      competitorId: '20',
      participantId: '30',
      overNumber: 0,
      wicketKind: 'caught',
    });
    // The export must not bypass the paging service with a single page read.
    expect(listFixtureEvents).not.toHaveBeenCalled();
    expect(response.body.data).toHaveLength(125);
    expect(response.body.data[0]).toEqual({
      ...publicEvent(),
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    });
    expect(JSON.stringify(response.body)).not.toContain('submissionId');
    expect(JSON.stringify(response.body)).not.toContain('audit');
  });

  test('exports deterministic CSV rows with a download filename', async () => {
    const exportFixtureEvents = vi
      .fn<PublicReadService['exportFixtureEvents']>()
      .mockResolvedValue([
        publicEvent({
          wickets: [
            {
              wicketId: '700',
              kind: 'caught, "behind"',
              playerOutParticipantId: '30',
              playerOutParticipantName: 'Opening Batter',
              fielders: [
                {
                  participantId: '33',
                  participantName: 'Wicket Keeper',
                  isSubstitute: false,
                },
              ],
            },
          ],
        }),
      ]);

    const response = await request(
      createTestApp(
        undefined,
        createService({
          exportFixtureEvents,
        }),
      ),
    )
      .get('/api/v1/fixtures/100/events/export.csv?wicketKind=caught')
      .expect('Content-Type', /text\/csv/)
      .expect('Content-Disposition', 'attachment; filename="fixture-100-wicket-caught-events.csv"')
      .expect(200);

    expect(exportFixtureEvents).toHaveBeenCalledWith('100', {
      wicketKind: 'caught',
    });
    expect(response.text).toBe(
      'eventId,fixtureId,competitionId,competitionName,inningsId,inningsOrdinal,sequenceNumber,overNumber,positionInOver,ballNumber,battingCompetitorId,battingCompetitorName,bowlingCompetitorId,bowlingCompetitorName,strikerParticipantId,strikerParticipantName,nonStrikerParticipantId,nonStrikerParticipantName,bowlerParticipantId,bowlerParticipantName,runsOffBat,runsExtras,runsTotal,runsNonBoundary,extrasWides,extrasNoBalls,extrasByes,extrasLegByes,extrasPenalty,wicketCount,wicketIds,wicketKinds,playersOutParticipantIds,playersOutParticipantNames,fielderParticipantIds,fielderParticipantNames\r\n' +
        '"500","100","10","World Twenty20","200","0","1","0","0","0.1","20","India","21","Pakistan","30","Opening Batter","31","Non-striker","32","Opening Bowler","4","0","4","false","0","0","0","0","0","1","700","caught, ""behind""","30","Opening Batter","33","Wicket Keeper"\r\n',
    );
  });

  test('returns empty fixture-event exports without pagination metadata', async () => {
    const app = createTestApp(
      undefined,
      createService({
        exportFixtureEvents: async () => [],
      }),
    );

    await request(app)
      .get('/api/v1/fixtures/100/events/export.json')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .expect({ data: [] });

    const csv = await request(app)
      .get('/api/v1/fixtures/100/events/export.csv')
      .expect('Content-Type', /text\/csv/)
      .expect(200);

    expect(csv.text).toMatch(/^eventId,fixtureId,/);
  });

  test('rejects invalid and paginated fixture-event export filters', async () => {
    const exportFixtureEvents = vi.fn<PublicReadService['exportFixtureEvents']>();
    const app = createTestApp(undefined, createService({ exportFixtureEvents }));

    await request(app).get('/api/v1/fixtures/100/events/export.json?overNumber=-1').expect(400);
    await request(app).get('/api/v1/fixtures/100/events/export.csv?limit=101').expect(400);
    await request(app).get('/api/v1/fixtures/100/events/export.csv?cursor=abc').expect(400);

    expect(exportFixtureEvents).not.toHaveBeenCalled();
  });

  test('states that an export is too large instead of sending a short file', async () => {
    const app = createTestApp(
      undefined,
      createService({
        exportFixtureEvents: async () => {
          throw new FixtureEventExportTooLargeError(5000);
        },
      }),
    );

    for (const format of ['json', 'csv']) {
      const response = await request(app)
        .get(`/api/v1/fixtures/100/events/export.${format}`)
        .expect('Content-Type', /application\/json/)
        .expect(422);

      expect(response.headers['content-disposition']).toBeUndefined();
      expect(response.body.error).toEqual({
        code: 'EXPORT_TOO_LARGE',
        message:
          'This export has more than 5000 events. Narrow it with an innings, team, player, over or wicket-kind filter.',
      });
    }
  });

  test('surfaces a failure partway through paging as an error, not a short file', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = createTestApp(
      undefined,
      createService({
        exportFixtureEvents: async () => {
          throw new Error('Connection terminated unexpectedly');
        },
      }),
    );

    const response = await request(app)
      .get('/api/v1/fixtures/100/events/export.csv')
      .expect('Content-Type', /application\/json/)
      .expect(500);

    expect(response.headers['content-disposition']).toBeUndefined();
    expect(response.text).not.toContain('eventId,fixtureId');
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  test('exports exactly the events a calculation trace displays', async () => {
    const traced = participantTraceStatistic(['500', '503']);
    const statisticsService = statisticsServiceReturning(traced);
    const exportFixtureEvents = vi
      .fn<PublicReadService['exportFixtureEvents']>()
      .mockResolvedValue([
        publicEvent({ eventId: '500' }),
        publicEvent({ eventId: '503', sequenceNumber: 4 }),
      ]);
    const app = createTestApp(
      undefined,
      createService({ exportFixtureEvents }),
      undefined,
      statisticsService,
    );

    const csv = await request(app)
      .get('/api/v1/fixtures/100/statistics/stat_player/events/export.csv')
      .expect('Content-Type', /text\/csv/)
      .expect('Content-Disposition', 'attachment; filename="fixture-100-player-30-events.csv"')
      .expect(200);

    expect(statisticsService.getFixtureStatistic).toHaveBeenCalledWith('100', 'stat_player', {
      includeContributors: true,
    });
    // The trace's own events, never the participant filter, which also matches
    // non-striker, dismissal and fielding rows the trace does not display.
    expect(exportFixtureEvents).toHaveBeenCalledWith('100', { eventIds: ['500', '503'] });
    const rows = csv.text.trimEnd().split('\r\n').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.split(',')[0])).toEqual(['"500"', '"503"']);

    const json = await request(app)
      .get('/api/v1/fixtures/100/statistics/stat_player/events/export.json')
      .expect(200);
    expect(json.body.data.map((event: PublicEvent) => event.eventId)).toEqual(['500', '503']);
  });

  test('refuses a trace export whose rows no longer match the trace', async () => {
    const app = createTestApp(
      undefined,
      createService({
        exportFixtureEvents: async () => [publicEvent({ eventId: '500' })],
      }),
      undefined,
      statisticsServiceReturning(participantTraceStatistic(['500', '503'])),
    );

    const response = await request(app)
      .get('/api/v1/fixtures/100/statistics/stat_player/events/export.csv')
      .expect(409);

    expect(response.headers['content-disposition']).toBeUndefined();
    expect(response.body.error.code).toBe('EXPORT_TRACE_CHANGED');
  });

  test('rejects filters on a trace export and reports an unknown statistic', async () => {
    const exportFixtureEvents = vi.fn<PublicReadService['exportFixtureEvents']>();
    const statisticsService = statisticsServiceReturning(null);
    const app = createTestApp(
      undefined,
      createService({ exportFixtureEvents }),
      undefined,
      statisticsService,
    );

    await request(app)
      .get('/api/v1/fixtures/100/statistics/stat_player/events/export.csv?participantId=30')
      .expect(400);
    const missing = await request(app)
      .get('/api/v1/fixtures/100/statistics/stat_unknown/events/export.json')
      .expect(404);

    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect(exportFixtureEvents).not.toHaveBeenCalled();
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

    await request(app)
      .get('/api/v1/participants?fixtureId=100&competitorId=20&name=Player')
      .expect(200);

    expect(listParticipants).toHaveBeenCalledWith({
      fixtureId: '100',
      competitorId: '20',
      limit: 50,
      name: 'Player',
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
