import type { PublicEvent } from '@sport-analytics/contracts';
import { describe, expect, test, vi } from 'vitest';

import type { PublicEventRepository } from '../../src/modules/events/event.repository';
import type { ParticipantFixtureRecord } from '../../src/modules/participants/participant.repository';
import { PublicReadInputError } from '../../src/modules/public-read/public-read.errors';
import {
  createPublicReadService,
  type ParticipantFixtureHistoryRepository,
} from '../../src/modules/public-read/public-read.service';

function emptyEventRepository(): PublicEventRepository {
  return {
    fixtureExists: vi.fn().mockResolvedValue(false),
    listAcceptedFixtureEvents: vi.fn().mockResolvedValue({ records: [], hasMore: false }),
    findAcceptedFixtureEvent: vi.fn().mockResolvedValue(null),
  };
}

function participantFixtureRecord(
  overrides: Partial<ParticipantFixtureRecord> = {},
): ParticipantFixtureRecord {
  return {
    fixtureId: '100',
    competitionId: '12',
    competitionName: 'Example Competition',
    ballsPerOver: 6,
    scheduledOvers: 20,
    season: '2026',
    matchType: 'T20',
    teamType: 'international',
    gender: 'male',
    startDate: '2026-08-09',
    endDate: '2026-08-09',
    teamId: '20',
    teamName: 'Team One',
    role: 'player',
    missingFields: [],
    standardInningsCount: 2,
    acceptedEventCount: 120,
    emptyStandardInningsIds: [],
    runsScored: 75,
    ballsFaced: 50,
    fours: 6,
    sixes: 3,
    runsConceded: 24,
    legalBallsBowled: 18,
    wicketsTaken: 2,
    ...overrides,
  };
}

function event(eventId: string, sequenceNumber: number): PublicEvent {
  return {
    eventId,
    fixtureId: '100',
    competitionId: '10',
    competitionName: 'World Twenty20',
    inningsId: '200',
    inningsOrdinal: 0,
    sequenceNumber,
    overNumber: 0,
    positionInOver: sequenceNumber - 1,
    ballNumber: `0.${sequenceNumber}`,
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
      offBat: 1,
      extras: 0,
      total: 1,
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
  };
}

describe('public read event service', () => {
  test('creates a deterministic cursor and resumes after its event position', async () => {
    const listAcceptedFixtureEvents = vi
      .fn<PublicEventRepository['listAcceptedFixtureEvents']>()
      .mockResolvedValueOnce({
        records: [event('500', 1)],
        hasMore: true,
      })
      .mockResolvedValueOnce({
        records: [event('501', 2)],
        hasMore: false,
      });
    const repository: PublicEventRepository = {
      fixtureExists: vi.fn().mockResolvedValue(true),
      listAcceptedFixtureEvents,
      findAcceptedFixtureEvent: vi.fn().mockResolvedValue(null),
    };
    const service = createPublicReadService(repository);

    const firstPage = await service.listFixtureEvents('100', { limit: 1 });
    expect(firstPage?.pagination.nextCursor).toEqual(expect.any(String));

    const secondPage = await service.listFixtureEvents('100', {
      limit: 1,
      cursor: firstPage?.pagination.nextCursor ?? undefined,
    });

    expect(secondPage?.data.map((record) => record.eventId)).toEqual(['501']);
    expect(listAcceptedFixtureEvents).toHaveBeenLastCalledWith({
      fixtureId: '100',
      limit: 1,
      after: {
        inningsOrdinal: 0,
        sequenceNumber: 1,
        eventId: '500',
      },
    });
  });

  test('rejects cursors from a different fixture', async () => {
    const repository: PublicEventRepository = {
      fixtureExists: vi.fn().mockResolvedValue(true),
      listAcceptedFixtureEvents: vi.fn().mockResolvedValue({
        records: [event('500', 1)],
        hasMore: true,
      }),
      findAcceptedFixtureEvent: vi.fn().mockResolvedValue(null),
    };
    const service = createPublicReadService(repository);
    const firstPage = await service.listFixtureEvents('100', { limit: 1 });

    await expect(
      service.listFixtureEvents('101', {
        limit: 1,
        cursor: firstPage?.pagination.nextCursor ?? undefined,
      }),
    ).rejects.toEqual(
      new PublicReadInputError(
        'INVALID_CURSOR',
        'The pagination cursor does not belong to this fixture.',
      ),
    );
  });

  test('returns no collection for an unknown fixture', async () => {
    const repository: PublicEventRepository = {
      fixtureExists: vi.fn().mockResolvedValue(false),
      listAcceptedFixtureEvents: vi.fn(),
      findAcceptedFixtureEvent: vi.fn(),
    };
    const service = createPublicReadService(repository);

    await expect(service.listFixtureEvents('999', { limit: 50 })).resolves.toBeNull();
    expect(repository.listAcceptedFixtureEvents).not.toHaveBeenCalled();
  });
});

describe('public participant fixture history service', () => {
  test('maps readable fixture context, statistics and a participant-bound cursor', async () => {
    const listParticipantFixtures = vi
      .fn<ParticipantFixtureHistoryRepository['listParticipantFixtures']>()
      .mockResolvedValueOnce({
        records: [
          participantFixtureRecord({
            missingFields: ['outcome'],
            emptyStandardInningsIds: ['202'],
          }),
        ],
        hasMore: true,
      })
      .mockResolvedValueOnce({ records: [], hasMore: false });
    const repository: ParticipantFixtureHistoryRepository = {
      findParticipantById: vi.fn().mockResolvedValue({
        participantId: '30',
        displayName: 'Player Example',
      }),
      listParticipantFixtures,
      listCompetitorsForFixtures: vi.fn().mockResolvedValue([
        { fixtureId: '100', competitorId: '20', name: 'Team One', ordinal: 1 },
        { fixtureId: '100', competitorId: '21', name: 'Team Two', ordinal: 2 },
      ]),
    };
    const service = createPublicReadService(emptyEventRepository(), repository);

    const firstPage = await service.listParticipantFixtures('30', { limit: 1 });

    expect(firstPage?.data[0]).toMatchObject({
      fixture: {
        fixtureId: '100',
        competitionId: '12',
        competitionName: 'Example Competition',
        seasonId: expect.any(String),
        season: '2026',
        seasonLabel: '2026',
        competitors: [
          { competitorId: '20', name: 'Team One' },
          { competitorId: '21', name: 'Team Two' },
        ],
      },
      competitionName: 'Example Competition',
      competitors: [
        { competitorId: '20', name: 'Team One' },
        { competitorId: '21', name: 'Team Two' },
      ],
      competitor: { competitorId: '20', name: 'Team One' },
      statisticsStatus: 'partial',
      statisticsWarnings: [
        { code: 'SOURCE_DATA_INCOMPLETE', fields: ['outcome'] },
        { code: 'INNINGS_WITHOUT_ACCEPTED_EVENTS', inningsId: '202' },
      ],
      batting: {
        runsScored: 75,
        ballsFaced: 50,
        strikeRate: 150,
      },
      bowling: {
        runsConceded: 24,
        legalBallsBowled: 18,
        oversBowled: '3.0',
        wicketsTaken: 2,
        economyRate: 8,
      },
    });
    expect(firstPage?.pagination.nextCursor).toEqual(expect.any(String));

    await service.listParticipantFixtures('30', {
      limit: 1,
      cursor: firstPage?.pagination.nextCursor ?? undefined,
    });

    expect(listParticipantFixtures).toHaveBeenLastCalledWith({
      participantId: '30',
      limit: 1,
      after: {
        startDate: '2026-08-09',
        fixtureId: '100',
      },
    });
  });

  test('distinguishes missing published statistics from no batting or bowling appearance', async () => {
    const repository: ParticipantFixtureHistoryRepository = {
      findParticipantById: vi.fn().mockResolvedValue({
        participantId: '30',
        displayName: 'Player Example',
      }),
      listParticipantFixtures: vi.fn().mockResolvedValue({
        records: [
          participantFixtureRecord({
            competitionId: null,
            competitionName: null,
            scheduledOvers: null,
            role: null,
            standardInningsCount: 0,
            acceptedEventCount: 0,
            runsScored: null,
            ballsFaced: null,
            fours: null,
            sixes: null,
            runsConceded: null,
            legalBallsBowled: null,
            wicketsTaken: null,
          }),
        ],
        hasMore: false,
      }),
      listCompetitorsForFixtures: vi.fn().mockResolvedValue([]),
    };
    const service = createPublicReadService(emptyEventRepository(), repository);

    const result = await service.listParticipantFixtures('30', { limit: 50 });

    expect(result?.data[0]).toMatchObject({
      statisticsStatus: 'partial',
      statisticsWarnings: [{ code: 'NO_STANDARD_INNINGS' }, { code: 'NO_ACCEPTED_EVENTS' }],
      batting: null,
      bowling: null,
    });
  });

  test('rejects a fixture-history cursor issued for another participant', async () => {
    const repository: ParticipantFixtureHistoryRepository = {
      findParticipantById: vi.fn().mockResolvedValue({
        participantId: '30',
        displayName: 'Player Example',
      }),
      listParticipantFixtures: vi.fn().mockResolvedValue({
        records: [participantFixtureRecord()],
        hasMore: true,
      }),
      listCompetitorsForFixtures: vi.fn().mockResolvedValue([]),
    };
    const service = createPublicReadService(emptyEventRepository(), repository);
    const firstPage = await service.listParticipantFixtures('30', { limit: 1 });

    await expect(
      service.listParticipantFixtures('31', {
        limit: 1,
        cursor: firstPage?.pagination.nextCursor ?? undefined,
      }),
    ).rejects.toEqual(
      new PublicReadInputError(
        'INVALID_CURSOR',
        'The pagination cursor does not belong to this participant.',
      ),
    );
  });
});
