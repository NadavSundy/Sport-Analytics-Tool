import {
  FIXTURE_EVENT_EXPORT_MAX_EVENTS,
  FIXTURE_EVENT_EXPORT_PAGE_SIZE,
  type PublicEvent,
} from '@sport-analytics/contracts';
import { describe, expect, test, vi } from 'vitest';

import type { PublicEventRepository } from '../../src/modules/events/event.repository';
import type { ParticipantFixtureRecord } from '../../src/modules/participants/participant.repository';
import {
  FixtureEventExportTooLargeError,
  PublicReadInputError,
} from '../../src/modules/public-read/public-read.errors';
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
    wides: 0,
    noBalls: 0,
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

/**
 * A repository that pages like the real keyset query: it honours `after` and
 * `limit` and reports `hasMore`, so an export only reaches later events by
 * following the cursors the service issues.
 */
function keysetEventRepository(
  events: PublicEvent[],
  options: { failOnPage?: number } = {},
): PublicEventRepository & {
  listAcceptedFixtureEvents: ReturnType<
    typeof vi.fn<PublicEventRepository['listAcceptedFixtureEvents']>
  >;
} {
  let pagesRead = 0;
  const listAcceptedFixtureEvents = vi.fn<PublicEventRepository['listAcceptedFixtureEvents']>(
    async (query) => {
      pagesRead += 1;
      if (pagesRead === options.failOnPage) {
        throw new Error('Connection terminated unexpectedly');
      }

      const start = query.after
        ? events.findIndex((candidate) => candidate.eventId === query.after?.eventId) + 1
        : 0;
      return {
        records: events.slice(start, start + query.limit),
        hasMore: start + query.limit < events.length,
      };
    },
  );

  return {
    fixtureExists: vi.fn().mockResolvedValue(true),
    listAcceptedFixtureEvents,
    findAcceptedFixtureEvent: vi.fn().mockResolvedValue(null),
  };
}

function eventsInOrder(count: number): PublicEvent[] {
  return Array.from({ length: count }, (_, index) => event(String(1000 + index), index + 1));
}

describe('public fixture event export service', () => {
  // Issue #467: a single page of 100 was exported and its cursor discarded.
  test('follows the cursor until the result set is exhausted', async () => {
    const events = eventsInOrder(250);
    const repository = keysetEventRepository(events);
    const service = createPublicReadService(repository);

    const exported = await service.exportFixtureEvents('100', { inningsId: '200' });

    expect(exported?.map((record) => record.eventId)).toEqual(
      events.map((record) => record.eventId),
    );
    expect(repository.fixtureExists).toHaveBeenCalledTimes(1);
    expect(repository.listAcceptedFixtureEvents).toHaveBeenCalledTimes(3);
    expect(repository.listAcceptedFixtureEvents.mock.calls.map(([query]) => query)).toEqual([
      { fixtureId: '100', inningsId: '200', limit: FIXTURE_EVENT_EXPORT_PAGE_SIZE },
      {
        fixtureId: '100',
        inningsId: '200',
        limit: FIXTURE_EVENT_EXPORT_PAGE_SIZE,
        after: { inningsOrdinal: 0, sequenceNumber: 100, eventId: '1099' },
      },
      {
        fixtureId: '100',
        inningsId: '200',
        limit: FIXTURE_EVENT_EXPORT_PAGE_SIZE,
        after: { inningsOrdinal: 0, sequenceNumber: 200, eventId: '1199' },
      },
    ]);
  });

  test('returns a result set of exactly the bound in full', async () => {
    const service = createPublicReadService(
      keysetEventRepository(eventsInOrder(FIXTURE_EVENT_EXPORT_MAX_EVENTS)),
    );

    await expect(service.exportFixtureEvents('100', {})).resolves.toHaveLength(
      FIXTURE_EVENT_EXPORT_MAX_EVENTS,
    );
  });

  test('fails the whole export past the bound instead of returning a short result', async () => {
    const repository = keysetEventRepository(eventsInOrder(FIXTURE_EVENT_EXPORT_MAX_EVENTS + 1));
    const service = createPublicReadService(repository);

    await expect(service.exportFixtureEvents('100', {})).rejects.toBeInstanceOf(
      FixtureEventExportTooLargeError,
    );
    // Bounded paging: the loop stops as soon as the bound is passed.
    expect(repository.listAcceptedFixtureEvents).toHaveBeenCalledTimes(
      FIXTURE_EVENT_EXPORT_MAX_EVENTS / FIXTURE_EVENT_EXPORT_PAGE_SIZE + 1,
    );
  });

  test('propagates a failure partway through paging rather than the pages already read', async () => {
    const service = createPublicReadService(
      keysetEventRepository(eventsInOrder(250), { failOnPage: 2 }),
    );

    await expect(service.exportFixtureEvents('100', {})).rejects.toThrow(
      'Connection terminated unexpectedly',
    );
  });

  test('restricts an export to given events and returns no result for an unknown fixture', async () => {
    const repository = keysetEventRepository(eventsInOrder(3));
    const service = createPublicReadService(repository);

    await service.exportFixtureEvents('100', { eventIds: ['1000', '1002'] });
    expect(repository.listAcceptedFixtureEvents).toHaveBeenCalledWith({
      fixtureId: '100',
      eventIds: ['1000', '1002'],
      limit: FIXTURE_EVENT_EXPORT_PAGE_SIZE,
    });

    const missing = keysetEventRepository([]);
    vi.mocked(missing.fixtureExists).mockResolvedValue(false);
    await expect(
      createPublicReadService(missing).exportFixtureEvents('999', {}),
    ).resolves.toBeNull();
    expect(missing.listAcceptedFixtureEvents).not.toHaveBeenCalled();
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
        wides: 0,
        noBalls: 0,
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
