import type { ApiConsumer, ApiConsumerIssue } from '@sport-analytics/contracts';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

import { executeQuery, getDatabasePool, withTransaction, type QueryExecutor } from '../../database';

interface ConsumerRow {
  id: string;
  name: string;
  rateLimitPerMinute: number;
  dailyQuota: number;
  createdAt: Date;
}

interface KeyRow {
  id: string;
  consumerId: string;
  prefix: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface ActiveConsumer {
  consumerId: string;
  rateLimitPerMinute: number;
  dailyQuota: number;
}

export interface ApiConsumerRepository {
  issue(ownerAccountId: string, issue: ApiConsumerIssue, key: GeneratedKey): Promise<ApiConsumer>;
  list(ownerAccountId: string): Promise<ApiConsumer[]>;
  rotate(ownerAccountId: string, consumerId: string, key: GeneratedKey): Promise<ApiConsumer>;
  revoke(ownerAccountId: string, consumerId: string, keyId: string): Promise<void>;
  findActiveConsumer(keyHash: string): Promise<ActiveConsumer | null>;
  consumeDailyQuota(consumerId: string, quota: number): Promise<{ allowed: boolean; used: number }>;
}

export interface GeneratedKey {
  raw: string;
  prefix: string;
  hash: string;
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function mapConsumer(row: ConsumerRow, keys: KeyRow[]): ApiConsumer {
  return {
    id: row.id,
    name: row.name,
    rateLimitPerMinute: row.rateLimitPerMinute,
    dailyQuota: row.dailyQuota,
    createdAt: row.createdAt.toISOString(),
    keys: keys.map((key) => ({
      id: key.id,
      prefix: key.prefix,
      createdAt: key.createdAt.toISOString(),
      revokedAt: key.revokedAt?.toISOString() ?? null,
    })),
  };
}

async function readConsumer(
  executor: QueryExecutor,
  consumerId: string,
): Promise<ApiConsumer | null> {
  const consumers = await executeQuery<ConsumerRow>(
    executor,
    `SELECT api_consumer_id::text AS id, name,
      rate_limit_per_minute AS "rateLimitPerMinute", daily_quota AS "dailyQuota", created_at AS "createdAt"
     FROM api_consumer WHERE api_consumer_id = $1`,
    [consumerId],
  );
  const consumer = consumers.rows[0];
  if (!consumer) return null;
  const keys = await executeQuery<KeyRow>(
    executor,
    `SELECT api_consumer_key_id::text AS id, api_consumer_id::text AS "consumerId",
      key_prefix AS prefix, created_at AS "createdAt", revoked_at AS "revokedAt"
     FROM api_consumer_key WHERE api_consumer_id = $1 ORDER BY api_consumer_key_id`,
    [consumerId],
  );
  return mapConsumer(consumer, keys.rows);
}

export function createApiConsumerRepository(pool: Pool = getDatabasePool()): ApiConsumerRepository {
  return {
    async issue(ownerAccountId, issue, key) {
      return withTransaction(pool, async (client) => {
        const inserted = await executeQuery<ConsumerRow>(
          client,
          `INSERT INTO api_consumer (owner_app_user_id, name, rate_limit_per_minute, daily_quota)
           VALUES ($1, $2, $3, $4)
           RETURNING api_consumer_id::text AS id, name, rate_limit_per_minute AS "rateLimitPerMinute",
             daily_quota AS "dailyQuota", created_at AS "createdAt"`,
          [ownerAccountId, issue.name, issue.rateLimitPerMinute, issue.dailyQuota],
        );
        const consumer = inserted.rows[0]!;
        await executeQuery(
          client,
          `INSERT INTO api_consumer_key (api_consumer_id, key_prefix, key_hash) VALUES ($1, $2, $3)`,
          [consumer.id, key.prefix, key.hash],
        );
        return (await readConsumer(client, consumer.id))!;
      });
    },
    async list(ownerAccountId) {
      const rows = await executeQuery<{ id: string }>(
        pool,
        `SELECT api_consumer_id::text AS id FROM api_consumer
         WHERE owner_app_user_id = $1 ORDER BY api_consumer_id`,
        [ownerAccountId],
      );
      return Promise.all(
        rows.rows.map((row) => readConsumer(pool, row.id).then((consumer) => consumer!)),
      );
    },
    async rotate(ownerAccountId, consumerId, key) {
      return withTransaction(pool, async (client) => {
        const owned = await executeQuery<{ id: string }>(
          client,
          `SELECT api_consumer_id::text AS id FROM api_consumer
           WHERE api_consumer_id = $1 AND owner_app_user_id = $2 FOR UPDATE`,
          [consumerId, ownerAccountId],
        );
        if (!owned.rows[0]) throw new ApiConsumerNotFoundError();
        await executeQuery(
          client,
          `UPDATE api_consumer_key SET revoked_at = now()
          WHERE api_consumer_id = $1 AND revoked_at IS NULL`,
          [consumerId],
        );
        await executeQuery(
          client,
          `INSERT INTO api_consumer_key (api_consumer_id, key_prefix, key_hash)
          VALUES ($1, $2, $3)`,
          [consumerId, key.prefix, key.hash],
        );
        return (await readConsumer(client, consumerId))!;
      });
    },
    async revoke(ownerAccountId, consumerId, keyId) {
      const result = await executeQuery(
        pool,
        `UPDATE api_consumer_key SET revoked_at = now()
         WHERE api_consumer_key_id = $1 AND revoked_at IS NULL
           AND api_consumer_id = $2 AND EXISTS (
             SELECT 1 FROM api_consumer WHERE api_consumer_id = $2 AND owner_app_user_id = $3
           )`,
        [keyId, consumerId, ownerAccountId],
      );
      if (result.rowCount !== 1) throw new ApiConsumerNotFoundError();
    },
    async findActiveConsumer(keyHash) {
      const result = await executeQuery<ActiveConsumer>(
        pool,
        `SELECT consumer.api_consumer_id::text AS "consumerId",
          consumer.rate_limit_per_minute AS "rateLimitPerMinute", consumer.daily_quota AS "dailyQuota"
         FROM api_consumer_key key
         JOIN api_consumer consumer ON consumer.api_consumer_id = key.api_consumer_id
         WHERE key.key_hash = $1 AND key.revoked_at IS NULL`,
        [keyHash],
      );
      return result.rows[0] ?? null;
    },
    async consumeDailyQuota(consumerId, quota) {
      const result = await executeQuery<{ requestCount: number }>(
        pool,
        `INSERT INTO api_consumer_daily_usage (api_consumer_id, usage_date, request_count)
         VALUES ($1, CURRENT_DATE, 1)
         ON CONFLICT (api_consumer_id, usage_date) DO UPDATE
           SET request_count = api_consumer_daily_usage.request_count + 1
           WHERE api_consumer_daily_usage.request_count < $2
         RETURNING request_count AS "requestCount"`,
        [consumerId, quota],
      );
      const used = result.rows[0]?.requestCount;
      return used === undefined ? { allowed: false, used: quota } : { allowed: true, used };
    },
  };
}

/** Avoid opening the application pool for routes that do not use consumer keys. */
export function createLazyApiConsumerRepository(): ApiConsumerRepository {
  let repository: ApiConsumerRepository | undefined;
  const resolved = () => (repository ??= createApiConsumerRepository());
  return {
    issue: (...args) => resolved().issue(...args),
    list: (...args) => resolved().list(...args),
    rotate: (...args) => resolved().rotate(...args),
    revoke: (...args) => resolved().revoke(...args),
    findActiveConsumer: (...args) => resolved().findActiveConsumer(...args),
    consumeDailyQuota: (...args) => resolved().consumeDailyQuota(...args),
  };
}

export class ApiConsumerNotFoundError extends Error {
  constructor() {
    super('The API consumer or key was not found.');
  }
}
