import type { Pool } from 'pg';

import { executeQuery, getDatabasePool, withTransaction } from '../../database';

interface AnonymousAccessResult {
  allowed: boolean;
  sourceUsed: number;
  globalUsed: number;
  exceeded: 'source' | 'global' | null;
  resetAt: Date;
}

export interface AnonymousAccessRepository {
  consume(input: {
    sourceKey: string;
    sourceLimit: number;
    globalLimit: number;
    at: Date;
  }): Promise<AnonymousAccessResult>;
}

interface CounterRow {
  requestCount: number;
  windowStart: Date;
}

export function createAnonymousAccessRepository(
  pool: Pool = getDatabasePool(),
): AnonymousAccessRepository {
  return {
    async consume({ sourceKey, sourceLimit, globalLimit, at }) {
      return withTransaction(pool, async (client) => {
        const insertedGlobal = await executeQuery(
          client,
          `INSERT INTO api_anonymous_global_minute_usage (window_start, request_count)
           VALUES (date_trunc('minute', $1::timestamptz), 0)
           ON CONFLICT (window_start) DO NOTHING`,
          [at],
        );
        if (insertedGlobal.rowCount === 1) {
          await executeQuery(
            client,
            `DELETE FROM api_anonymous_source_minute_usage
             WHERE window_start < date_trunc('minute', $1::timestamptz) - INTERVAL '2 days'`,
            [at],
          );
          await executeQuery(
            client,
            `DELETE FROM api_anonymous_global_minute_usage
             WHERE window_start < date_trunc('minute', $1::timestamptz) - INTERVAL '2 days'`,
            [at],
          );
        }

        const global = await executeQuery<CounterRow>(
          client,
          `SELECT request_count AS "requestCount", window_start AS "windowStart"
           FROM api_anonymous_global_minute_usage
           WHERE window_start = date_trunc('minute', $1::timestamptz)
           FOR UPDATE`,
          [at],
        );
        const globalCounter = global.rows[0]!;
        const resetAt = new Date(globalCounter.windowStart.getTime() + 60_000);
        if (globalCounter.requestCount >= globalLimit) {
          return {
            allowed: false,
            sourceUsed: 0,
            globalUsed: globalLimit,
            exceeded: 'global',
            resetAt,
          };
        }

        await executeQuery(
          client,
          `INSERT INTO api_anonymous_source_minute_usage
            (source_key, window_start, request_count)
           VALUES ($1, date_trunc('minute', $2::timestamptz), 0)
           ON CONFLICT (source_key, window_start) DO NOTHING`,
          [sourceKey, at],
        );
        const source = await executeQuery<CounterRow>(
          client,
          `SELECT request_count AS "requestCount", window_start AS "windowStart"
           FROM api_anonymous_source_minute_usage
           WHERE source_key = $1 AND window_start = date_trunc('minute', $2::timestamptz)
           FOR UPDATE`,
          [sourceKey, at],
        );
        const sourceCounter = source.rows[0]!;
        if (sourceCounter.requestCount >= sourceLimit) {
          return {
            allowed: false,
            sourceUsed: sourceLimit,
            globalUsed: globalCounter.requestCount,
            exceeded: 'source',
            resetAt,
          };
        }

        await executeQuery(
          client,
          `UPDATE api_anonymous_global_minute_usage
           SET request_count = request_count + 1
           WHERE window_start = $1`,
          [globalCounter.windowStart],
        );
        await executeQuery(
          client,
          `UPDATE api_anonymous_source_minute_usage
           SET request_count = request_count + 1
           WHERE source_key = $1 AND window_start = $2`,
          [sourceKey, sourceCounter.windowStart],
        );

        return {
          allowed: true,
          sourceUsed: sourceCounter.requestCount + 1,
          globalUsed: globalCounter.requestCount + 1,
          exceeded: null,
          resetAt,
        };
      });
    },
  };
}

export function createLazyAnonymousAccessRepository(): AnonymousAccessRepository {
  let repository: AnonymousAccessRepository | undefined;
  return {
    consume: (...args) => (repository ??= createAnonymousAccessRepository()).consume(...args),
  };
}
