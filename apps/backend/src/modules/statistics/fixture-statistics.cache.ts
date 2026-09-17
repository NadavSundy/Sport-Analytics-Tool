import type { FixtureStatistics } from '@sport-analytics/contracts';

import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';

const fixtureStatisticsCacheTtlSeconds = 60;
const cacheContractVersion = 'v2';
const cacheResource = 'fixture-statistics';

export interface FixtureStatisticsCacheRead {
  dataVersion: number;
  value: FixtureStatistics | null;
}

export interface FixtureStatisticsCache {
  read(fixtureId: string): Promise<FixtureStatisticsCacheRead | null>;
  write(fixtureId: string, dataVersion: number, value: FixtureStatistics): Promise<void>;
}

function cacheKey(fixtureId: string, dataVersion: number): string {
  return `sat:${cacheContractVersion}:${cacheResource}:fixture:${fixtureId}:v${dataVersion}`;
}

function cacheKeyPrefix(fixtureId: string): string {
  return `sat:${cacheContractVersion}:${cacheResource}:fixture:${fixtureId}:v`;
}

interface CacheRow {
  dataVersion: number;
  payload: FixtureStatistics | null;
}

export function createFixtureStatisticsCache(
  executor: QueryExecutor = getDatabasePool(),
): FixtureStatisticsCache {
  return {
    async read(fixtureId) {
      const result = await executeQuery<CacheRow>(
        executor,
        `
          SELECT COALESCE(version.data_version, 0)::int AS "dataVersion", cache.payload
          FROM fixture
          LEFT JOIN fixture_statistics_cache_version version
            ON version.fixture_id = fixture.fixture_id
          LEFT JOIN fixture_statistics_cache cache
            ON cache.fixture_id = fixture.fixture_id
           AND cache.data_version = COALESCE(version.data_version, 0)
           AND cache.cache_key = $2::text || COALESCE(version.data_version, 0)::text
           AND cache.expires_at > now()
          WHERE fixture.fixture_id = $1::bigint
        `,
        [fixtureId, cacheKeyPrefix(fixtureId)],
      );
      const row = result.rows[0];
      return row ? { dataVersion: row.dataVersion, value: row.payload } : null;
    },

    async write(fixtureId, dataVersion, value) {
      await executeQuery(
        executor,
        `
          INSERT INTO fixture_statistics_cache (
            cache_key, fixture_id, data_version, payload, expires_at
          )
          SELECT $3, fixture.fixture_id, $2::bigint, $4::jsonb,
                 now() + make_interval(secs => $5::int)
          FROM fixture
          LEFT JOIN fixture_statistics_cache_version version
            ON version.fixture_id = fixture.fixture_id
          WHERE fixture.fixture_id = $1::bigint
            AND COALESCE(version.data_version, 0) = $2::bigint
          ON CONFLICT (cache_key) DO UPDATE
          SET payload = EXCLUDED.payload,
              expires_at = EXCLUDED.expires_at,
              created_at = now()
        `,
        [
          fixtureId,
          dataVersion,
          cacheKey(fixtureId, dataVersion),
          JSON.stringify(value),
          fixtureStatisticsCacheTtlSeconds,
        ],
      );
    },
  };
}
