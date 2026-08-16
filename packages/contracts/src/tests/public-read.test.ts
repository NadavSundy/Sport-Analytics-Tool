import { describe, expect, test } from 'vitest';

import {
  fixtureEventListQuerySchema,
  fixtureListQuerySchema,
  fixtureStatisticsQuerySchema,
  fixtureStatisticsResponseSchema,
  participantListQuerySchema,
  publicEventCollectionResponseSchema,
  seasonSchema,
} from '../public-read';

describe('public read contracts', () => {
  test('validates a season with a stable opaque identifier', () => {
    expect(
      seasonSchema.safeParse({
        seasonId: 'season_opaque-value',
        competitionId: '12',
        label: '2025/26',
      }).success,
    ).toBe(true);
  });

  test('applies pagination defaults', () => {
    expect(participantListQuerySchema.parse({})).toEqual({
      limit: 50,
    });
  });

  test('accepts fixture filters', () => {
    expect(
      fixtureListQuerySchema.parse({
        competitionId: '1',
        competitorId: '2',
        gender: 'female',
        startDateFrom: '2026-01-01',
        startDateTo: '2026-08-09',
        limit: '25',
      }),
    ).toEqual({
      competitionId: '1',
      competitorId: '2',
      gender: 'female',
      startDateFrom: '2026-01-01',
      startDateTo: '2026-08-09',
      limit: 25,
    });
  });

  test('rejects an invalid fixture date range', () => {
    expect(
      fixtureListQuerySchema.safeParse({
        startDateFrom: '2026-08-09',
        startDateTo: '2026-01-01',
      }).success,
    ).toBe(false);
  });

  test('accepts cricket event filters and applies pagination defaults', () => {
    expect(
      fixtureEventListQuerySchema.parse({
        inningsId: '10',
        competitorId: '20',
        participantId: '30',
        overNumber: '4',
        wicketKind: 'caught',
      }),
    ).toEqual({
      inningsId: '10',
      competitorId: '20',
      participantId: '30',
      overNumber: 4,
      wicketKind: 'caught',
      limit: 50,
    });
  });

  test('validates a public event collection without submission audit fields', () => {
    const result = publicEventCollectionResponseSchema.safeParse({
      data: [
        {
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
        },
      ],
      pagination: {
        nextCursor: null,
      },
    });

    expect(result.success).toBe(true);
  });

  test('parses the opt-in statistic contributor expansion', () => {
    expect(fixtureStatisticsQuerySchema.parse({})).toEqual({
      includeContributors: false,
    });
    expect(
      fixtureStatisticsQuerySchema.parse({
        includeContributors: 'true',
      }),
    ).toEqual({
      includeContributors: true,
    });
  });

  test('validates a fixture statistics response', () => {
    expect(
      fixtureStatisticsResponseSchema.safeParse({
        data: {
          fixtureId: '9',
          status: 'complete',
          scope: { superOversIncluded: false },
          outcome: {
            kind: 'tie',
            winnerCompetitorId: null,
            eliminatorCompetitorId: null,
            margin: null,
            method: null,
            decidedByBowlOut: false,
          },
          warnings: [],
          statistics: [],
        },
      }).success,
    ).toBe(true);
  });
});
