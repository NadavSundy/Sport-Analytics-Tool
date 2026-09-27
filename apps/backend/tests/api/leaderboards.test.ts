import type { Leaderboard } from '@sport-analytics/contracts';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { LeaderboardsService } from '../../src/modules/statistics/leaderboards.service';
import { createTestApp } from '../test-app';
import { createOpenApiContract } from '../contract/openapi-contract';

const openApi = createOpenApiContract();

const competitionLeaderboard: Leaderboard = {
  scope: 'competition',
  competitionId: '10',
  competitionName: 'Example League',
  metric: 'most_runs',
  limit: 2,
  qualification: null,
  tieBreakers: ['metricValue', 'participantName', 'participantId'],
  entries: [
    { rank: 1, participantId: '7', participantName: 'A Batter', value: 500 },
    { rank: 2, participantId: '8', participantName: 'B Batter', value: 450 },
  ],
};

const seasonLeaderboard: Leaderboard = {
  ...competitionLeaderboard,
  scope: 'season',
  seasonId: 'season_opaque',
  season: '2026/27',
  metric: 'highest_strike_rate',
  qualification: {
    field: 'ballsFaced',
    minimum: 100,
    rationale: 'A minimum of 100 balls faced excludes short cameo innings.',
  },
};

function appWith(service: LeaderboardsService) {
  return createTestApp(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    service,
  );
}

describe('public leaderboard API', () => {
  test('returns a bounded competition leaderboard and passes the parsed query', async () => {
    const getLeaderboard = vi
      .fn<LeaderboardsService['getLeaderboard']>()
      .mockResolvedValue(competitionLeaderboard);

    const response = await request(appWith({ getLeaderboard }))
      .get('/api/v1/statistics/leaderboards')
      .query({ scope: 'competition', competitionId: '10', metric: 'most_runs', limit: '2' })
      .expect(200);

    expect(getLeaderboard).toHaveBeenCalledWith({
      scope: 'competition',
      competitionId: '10',
      metric: 'most_runs',
      limit: 2,
    });
    expect(response.body.data).toEqual(competitionLeaderboard);
    openApi.expectResponse(response);
  });

  test('returns an explicitly scoped season leaderboard', async () => {
    const getLeaderboard = vi
      .fn<LeaderboardsService['getLeaderboard']>()
      .mockResolvedValue(seasonLeaderboard);

    const response = await request(appWith({ getLeaderboard }))
      .get('/api/v1/statistics/leaderboards')
      .query({
        scope: 'season',
        seasonId: 'season_opaque',
        metric: 'highest_strike_rate',
      })
      .expect(200);

    expect(getLeaderboard).toHaveBeenCalledWith({
      scope: 'season',
      seasonId: 'season_opaque',
      metric: 'highest_strike_rate',
      limit: 10,
    });
    expect(response.body.data.scope).toBe('season');
    openApi.expectResponse(response);
  });

  test.each([
    { competitionId: '10', metric: 'most_runs' },
    { scope: 'competition', competitionId: '10', metric: 'unknown' },
    { scope: 'competition', competitionId: '10', metric: 'most_runs', limit: '51' },
    { scope: 'season', metric: 'most_runs' },
    {
      scope: 'season',
      seasonId: 'season_opaque',
      competitionId: '10',
      metric: 'most_runs',
    },
  ])('rejects invalid leaderboard query %#', async (query) => {
    const getLeaderboard = vi.fn<LeaderboardsService['getLeaderboard']>();
    const response = await request(appWith({ getLeaderboard }))
      .get('/api/v1/statistics/leaderboards')
      .query(query)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(getLeaderboard).not.toHaveBeenCalled();
  });

  test('reports an unknown scope', async () => {
    const getLeaderboard = vi.fn<LeaderboardsService['getLeaderboard']>().mockResolvedValue(null);

    const response = await request(appWith({ getLeaderboard }))
      .get('/api/v1/statistics/leaderboards')
      .query({ scope: 'competition', competitionId: '999', metric: 'most_runs' })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
