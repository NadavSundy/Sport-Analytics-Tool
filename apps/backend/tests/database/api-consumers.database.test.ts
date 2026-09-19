import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import {
  createApiConsumerRepository,
  hashApiKey,
} from '../../src/modules/api-consumers/api-consumer.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const sourcePrefix = `api-consumer-test-${process.pid}`;

describe.sequential('API consumer key persistence', () => {
  let pool: Pool;
  let accountId: string;

  beforeAll(async () => {
    const url = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: url.toString() });
    const account = await executeQuery<{ id: string }>(
      pool,
      `INSERT INTO app_user (auth_provider, auth_subject, display_name, application_role, submitter_approval_state)
      VALUES ('test', $1, 'API Consumer Test', 'admin', 'not_requested') RETURNING app_user_id::text AS id`,
      [sourcePrefix],
    );
    accountId = account.rows[0]!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  test('stores only hashes, rotates/revokes active key lookup, and atomically enforces the daily quota', async () => {
    const repository = createApiConsumerRepository(pool);
    const first = 'sat_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const issued = await repository.issue(
      accountId,
      { name: 'Database consumer', rateLimitPerMinute: 2, dailyQuota: 2 },
      {
        raw: first,
        prefix: first.slice(0, 17),
        hash: hashApiKey(first),
      },
    );
    const persisted = await executeQuery<{ hash: string; rawCount: number }>(
      pool,
      `SELECT key_hash AS hash,
      (SELECT count(*)::int FROM api_consumer_key WHERE key_hash = $2) AS "rawCount" FROM api_consumer_key WHERE api_consumer_id = $1`,
      [issued.id, first],
    );
    expect(persisted.rows[0]!.hash).toBe(hashApiKey(first));
    expect(persisted.rows[0]!.rawCount).toBe(0);
    expect(await repository.findActiveConsumer(hashApiKey(first))).toMatchObject({
      consumerId: issued.id,
    });

    const second = 'sat_live_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const rotated = await repository.rotate(accountId, issued.id, {
      raw: second,
      prefix: second.slice(0, 17),
      hash: hashApiKey(second),
    });
    expect(rotated.keys.filter((key) => key.revokedAt === null)).toHaveLength(1);
    expect(await repository.findActiveConsumer(hashApiKey(first))).toBeNull();
    expect(await repository.findActiveConsumer(hashApiKey(second))).toMatchObject({
      consumerId: issued.id,
    });

    await expect(repository.consumeDailyQuota(issued.id, 2)).resolves.toEqual({
      allowed: true,
      used: 1,
    });
    await expect(repository.consumeDailyQuota(issued.id, 2)).resolves.toEqual({
      allowed: true,
      used: 2,
    });
    await expect(repository.consumeDailyQuota(issued.id, 2)).resolves.toEqual({
      allowed: false,
      used: 2,
    });

    const firstWindow = new Date('2026-09-19T10:00:59.900Z');
    const firstWindowResults = await Promise.all(
      Array.from({ length: 4 }, () => repository.consumeRateLimit(issued.id, 2, firstWindow)),
    );
    expect(firstWindowResults.filter((result) => result.allowed)).toHaveLength(2);
    expect(firstWindowResults.filter((result) => !result.allowed)).toHaveLength(2);
    expect(firstWindowResults.map((result) => result.resetAt.toISOString())).toEqual(
      Array(4).fill('2026-09-19T10:01:00.000Z'),
    );

    await expect(
      repository.consumeRateLimit(issued.id, 2, new Date('2026-09-19T10:01:00.000Z')),
    ).resolves.toMatchObject({
      allowed: true,
      used: 1,
      resetAt: new Date('2026-09-19T10:02:00.000Z'),
    });
  });
});
