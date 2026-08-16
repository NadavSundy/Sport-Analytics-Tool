import { describe, expect, test } from 'vitest';

import {
  fixtureListQuerySchema,
  fixtureStatisticsQuerySchema,
  fixtureStatisticsResponseSchema,
  participantListQuerySchema,
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
