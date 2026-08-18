import type { PublicEvent } from '@sport-analytics/contracts';
import { describe, expect, test, vi } from 'vitest';

import type { PublicEventRepository } from '../../src/modules/events/event.repository';
import { PublicReadInputError } from '../../src/modules/public-read/public-read.errors';
import { createPublicReadService } from '../../src/modules/public-read/public-read.service';

function event(eventId: string, sequenceNumber: number): PublicEvent {
  return {
    eventId,
    fixtureId: '100',
    inningsId: '200',
    inningsOrdinal: 0,
    sequenceNumber,
    overNumber: 0,
    positionInOver: sequenceNumber - 1,
    ballNumber: `0.${sequenceNumber}`,
    battingCompetitorId: '20',
    bowlingCompetitorId: '21',
    strikerParticipantId: '30',
    nonStrikerParticipantId: '31',
    bowlerParticipantId: '32',
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
