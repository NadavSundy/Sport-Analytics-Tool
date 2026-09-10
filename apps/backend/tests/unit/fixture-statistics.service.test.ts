import { describe, expect, test, vi } from 'vitest';
import type { FixtureStatistics } from '@sport-analytics/contracts';

import type { FixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.model';
import {
  createFixtureStatisticsService,
  type LoadFixtureStatisticsSource,
} from '../../src/modules/statistics/fixture-statistics.service';
import type { FixtureStatisticsCache } from '../../src/modules/statistics/fixture-statistics.cache';

function source(): FixtureStatisticsSource {
  return {
    fixtureId: '9',
    ballsPerOver: 6,
    missingFields: [],
    outcome: 'tie',
    winnerCompetitorId: null,
    winnerCompetitorName: null,
    eliminatorCompetitorId: null,
    eliminatorCompetitorName: null,
    outcomeByRuns: null,
    outcomeByWickets: null,
    outcomeMethod: null,
    decidedByBowlOut: false,
    innings: [],
    events: [],
  };
}

describe('fixture statistics cache-aside service', () => {
  test('caches a public miss and serves the next identical read without deriving again', async () => {
    let cached: FixtureStatistics | null = null;
    const cache: FixtureStatisticsCache = {
      read: vi.fn(async () => ({ dataVersion: 7, value: cached })),
      write: vi.fn(async (_fixtureId, _dataVersion, value) => {
        cached = value;
      }),
    };
    const loadSource = vi.fn<LoadFixtureStatisticsSource>().mockResolvedValue(source());
    const service = createFixtureStatisticsService(loadSource, cache);

    const first = await service.getFixtureStatistics('9', { includeContributors: false });
    const second = await service.getFixtureStatistics('9', { includeContributors: false });

    expect(first).toEqual(second);
    expect(loadSource).toHaveBeenCalledOnce();
    expect(cache.write).toHaveBeenCalledWith('9', 7, first);
    expect(cache.read).toHaveBeenCalledTimes(2);
  });

  // The cache is disposable and PostgreSQL remains authoritative, so neither
  // cache operation may turn a derivable fixture into a failed public read.
  // The tests above only ever exercise a cache that succeeds, so a cache-side
  // failure reaching the reader as "match statistics could not be loaded" was
  // never covered.
  test('derives from PostgreSQL when the cache read fails', async () => {
    const cache: FixtureStatisticsCache = {
      read: vi.fn(async () => {
        throw new Error('cache unavailable');
      }),
      write: vi.fn(),
    };
    const loadSource = vi.fn<LoadFixtureStatisticsSource>().mockResolvedValue(source());
    const service = createFixtureStatisticsService(loadSource, cache);

    const statistics = await service.getFixtureStatistics('9', { includeContributors: false });

    expect(statistics?.fixtureId).toBe('9');
    expect(loadSource).toHaveBeenCalledOnce();
    // A read that never produced a version cannot address a cache entry.
    expect(cache.write).not.toHaveBeenCalled();
  });

  test('still returns derived statistics when the cache write fails', async () => {
    const cache: FixtureStatisticsCache = {
      read: vi.fn(async () => ({ dataVersion: 7, value: null })),
      write: vi.fn(async () => {
        throw new Error('cache write rejected');
      }),
    };
    const loadSource = vi.fn<LoadFixtureStatisticsSource>().mockResolvedValue(source());
    const service = createFixtureStatisticsService(loadSource, cache);

    const statistics = await service.getFixtureStatistics('9', { includeContributors: false });

    expect(statistics?.fixtureId).toBe('9');
    expect(cache.write).toHaveBeenCalledOnce();
  });

  test('never caches contributor traces', async () => {
    const cache: FixtureStatisticsCache = {
      read: vi.fn(),
      write: vi.fn(),
    };
    const loadSource = vi.fn<LoadFixtureStatisticsSource>().mockResolvedValue(source());
    const service = createFixtureStatisticsService(loadSource, cache);

    await service.getFixtureStatistics('9', { includeContributors: true });
    await service.getFixtureStatistics('9', { includeContributors: true });

    expect(loadSource).toHaveBeenCalledTimes(2);
    expect(cache.read).not.toHaveBeenCalled();
    expect(cache.write).not.toHaveBeenCalled();
  });
});
