import { describe, expect, test, vi } from 'vitest';

import { createSeasonId } from '../../src/modules/public-read/season-id';
import {
  createLeaderboardsService,
  LEADERBOARD_QUALIFICATIONS,
  type LoadLeaderboardSource,
} from '../../src/modules/statistics/leaderboards.service';

describe('leaderboard service', () => {
  test('decodes an explicit season scope and exposes its qualification', async () => {
    const loadSource = vi.fn<LoadLeaderboardSource>().mockResolvedValue({
      competitionName: 'Example League',
      metric: 'highest_strike_rate',
      rows: [{ rank: 1, participantId: '7', participantName: 'A Batter', value: 150 }],
    });
    const seasonId = createSeasonId({ competitionId: '10', label: '2026/27' });

    const result = await createLeaderboardsService(loadSource).getLeaderboard({
      scope: 'season',
      seasonId,
      metric: 'highest_strike_rate',
      limit: 10,
    });

    expect(loadSource).toHaveBeenCalledWith(
      { competitionId: '10', season: '2026/27' },
      'highest_strike_rate',
      10,
    );
    expect(result).toMatchObject({
      scope: 'season',
      seasonId,
      season: '2026/27',
      qualification: { field: 'ballsFaced', minimum: 100 },
    });
  });

  test('defines a server-side qualification for every rate metric and none for totals', () => {
    expect(LEADERBOARD_QUALIFICATIONS.most_runs).toBeNull();
    expect(LEADERBOARD_QUALIFICATIONS.most_wickets).toBeNull();
    expect(LEADERBOARD_QUALIFICATIONS.most_fours).toBeNull();
    expect(LEADERBOARD_QUALIFICATIONS.most_sixes).toBeNull();

    for (const metric of [
      'highest_batting_average',
      'highest_strike_rate',
      'best_bowling_average',
      'best_economy_rate',
      'best_bowling_strike_rate',
    ] as const) {
      expect(LEADERBOARD_QUALIFICATIONS[metric]?.minimum).toBeGreaterThan(0);
      expect(LEADERBOARD_QUALIFICATIONS[metric]?.rationale).toBeTruthy();
    }
  });

  test('rejects malformed opaque and database identifiers before querying', async () => {
    const loadSource = vi.fn<LoadLeaderboardSource>();
    const service = createLeaderboardsService(loadSource);

    await expect(
      service.getLeaderboard({
        scope: 'season',
        seasonId: 'season_not-valid',
        metric: 'most_runs',
        limit: 10,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_FILTER' });
    await expect(
      service.getLeaderboard({
        scope: 'competition',
        competitionId: 'not-a-database-id',
        metric: 'most_runs',
        limit: 10,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_FILTER' });
    expect(loadSource).not.toHaveBeenCalled();
  });
});
