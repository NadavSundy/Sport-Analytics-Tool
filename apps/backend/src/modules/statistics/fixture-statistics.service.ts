import type {
  FixtureStatistic,
  FixtureStatistics,
  FixtureStatisticsQuery,
} from '@sport-analytics/contracts';

import { deriveFixtureStatistics } from './fixture-statistics.derivation';
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
): FixtureStatisticsService {
  async function derive(
    fixtureId: string,
    query: FixtureStatisticsQuery,
  ): Promise<FixtureStatistics | null> {
    if (!databaseIdPattern.test(fixtureId)) {
      return null;
    }

    const source = await loadSource(fixtureId);
    if (!source) {
      return null;
    }

    return deriveFixtureStatistics(source, {
      includeContributors: query.includeContributors,
    });
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
