import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { FixtureStatisticsService } from '../../src/modules/statistics/fixture-statistics.service';
import { createTestApp } from '../test-app';

function createService(
  overrides: Partial<FixtureStatisticsService> = {},
): FixtureStatisticsService {
  return {
    async getFixtureStatistics() {
      return null;
    },
    async getFixtureStatistic() {
      return null;
    },
    ...overrides,
  };
}

describe('public fixture statistics API', () => {
  test('returns fixture statistics without authentication', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const getFixtureStatistics = vi
      .fn<FixtureStatisticsService['getFixtureStatistics']>()
      .mockResolvedValue({
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
      });

    const response = await request(
      createTestApp(
        verifyAccessToken,
        undefined,
        undefined,
        createService({ getFixtureStatistics }),
      ),
    )
      .get('/api/v1/fixtures/9/statistics')
      .expect(200);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(getFixtureStatistics).toHaveBeenCalledWith('9', {
      includeContributors: false,
    });
    expect(response.body.data.fixtureId).toBe('9');
  });

  test('retrieves a stable statistic resource with requested trace events', async () => {
    const getFixtureStatistic = vi
      .fn<FixtureStatisticsService['getFixtureStatistic']>()
      .mockResolvedValue({
        statisticId: 'stat_stable',
        fixtureId: '9',
        scope: 'innings',
        statisticCode: 'team_total',
        inningsId: '11',
        inningsOrdinal: 0,
        competitorId: '2',
        sourceEventCount: 0,
        metrics: {
          deliveryRuns: 0,
          penaltyRuns: 5,
          totalRuns: 5,
        },
        contributingEvents: [],
      });

    const response = await request(
      createTestApp(undefined, undefined, undefined, createService({ getFixtureStatistic })),
    )
      .get('/api/v1/fixtures/9/statistics/stat_stable?includeContributors=true')
      .expect(200);

    expect(getFixtureStatistic).toHaveBeenCalledWith('9', 'stat_stable', {
      includeContributors: true,
    });
    expect(response.body.data.statisticId).toBe('stat_stable');
  });

  test('rejects an invalid contributor option before calling the service', async () => {
    const getFixtureStatistics = vi.fn<FixtureStatisticsService['getFixtureStatistics']>();

    const response = await request(
      createTestApp(undefined, undefined, undefined, createService({ getFixtureStatistics })),
    )
      .get('/api/v1/fixtures/9/statistics?includeContributors=yes')
      .expect(400);

    expect(getFixtureStatistics).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  test('returns not found for an unpublished fixture or unknown statistic', async () => {
    await request(createTestApp(undefined, undefined, undefined, createService()))
      .get('/api/v1/fixtures/9/statistics/unknown')
      .expect(404)
      .expect({
        error: {
          code: 'NOT_FOUND',
          message: 'Fixture statistics not found.',
        },
      });
  });
});
