import type {
  FixtureStatistic,
  FixtureStatistics,
  FixtureStatisticsQuery,
} from '@sport-analytics/contracts';

import { deriveFixtureStatistics } from './fixture-statistics.derivation';
import {
  createFixtureStatisticsCache,
  type FixtureStatisticsCache,
  type FixtureStatisticsCacheRead,
} from './fixture-statistics.cache';
import type { FixtureStatisticsSource } from './fixture-statistics.model';
import { loadFixtureStatisticsSource } from './fixture-statistics.repository';

export type LoadFixtureStatisticsSource = (
  fixtureId: string,
) => Promise<FixtureStatisticsSource | null>;

export interface FixtureStatisticsService {
  getFixtureStatistics(
    fixtureId: string,
    query: FixtureStatisticsQuery,
  ): Promise<FixtureStatistics | null>;
  getFixtureStatistic(
    fixtureId: string,
    statisticId: string,
    query: FixtureStatisticsQuery,
  ): Promise<FixtureStatistic | null>;
}

const databaseIdPattern = /^\d+$/;

export function createFixtureStatisticsService(
  loadSource: LoadFixtureStatisticsSource = loadFixtureStatisticsSource,
  cache?: FixtureStatisticsCache | null,
): FixtureStatisticsService {
  let resolvedCache = cache;

  function publicStatisticsCache(): FixtureStatisticsCache | null {
    if (resolvedCache === undefined && loadSource === loadFixtureStatisticsSource) {
      resolvedCache = createFixtureStatisticsCache();
    }
    return resolvedCache ?? null;
  }

  // PostgreSQL delivery rows are authoritative and the cache is disposable, so
  // neither cache operation may fail a response the authoritative path can
  // still produce. A failed read falls through to derivation; a failed write
  // leaves the derived response untouched and only costs the next reader a
  // repeated derivation.
  async function readCache(fixtureId: string): Promise<FixtureStatisticsCacheRead | null> {
    try {
      return (await publicStatisticsCache()?.read(fixtureId)) ?? null;
    } catch {
      console.warn('Fixture statistics cache read failed; deriving from PostgreSQL instead.');
      return null;
    }
  }

  async function writeCache(
    fixtureId: string,
    dataVersion: number,
    statistics: FixtureStatistics,
  ): Promise<void> {
    try {
      await publicStatisticsCache()?.write(fixtureId, dataVersion, statistics);
    } catch {
      console.warn('Fixture statistics cache write failed; the derived response is unaffected.');
    }
  }

  async function derive(
    fixtureId: string,
    query: FixtureStatisticsQuery,
  ): Promise<FixtureStatistics | null> {
    if (!databaseIdPattern.test(fixtureId)) {
      return null;
    }

    // Contributor traces are explicit audit/reproduction requests and are not cached.
    const cacheRead = query.includeContributors ? null : await readCache(fixtureId);
    if (cacheRead?.value) return cacheRead.value;

    const source = await loadSource(fixtureId);
    if (!source) {
      return null;
    }

    const statistics = deriveFixtureStatistics(source, {
      includeContributors: query.includeContributors,
    });
    if (cacheRead && !query.includeContributors) {
      await writeCache(fixtureId, cacheRead.dataVersion, statistics);
    }
    return statistics;
  }

  return {
    getFixtureStatistics: derive,

    async getFixtureStatistic(fixtureId, statisticId, query) {
      const fixtureStatistics = await derive(fixtureId, query);
      if (!fixtureStatistics) {
        return null;
      }

      return (
        fixtureStatistics.statistics.find((statistic) => statistic.statisticId === statisticId) ??
        null
      );
    },
  };
}
