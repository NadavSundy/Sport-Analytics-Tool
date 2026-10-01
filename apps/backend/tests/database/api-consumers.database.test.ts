import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import {
  createApiConsumerRepository,
  hashApiKey,
} from '../../src/modules/api-consumers/api-consumer.repository';
import { createAnonymousAccessRepository } from '../../src/modules/api-consumers/anonymous-access.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

const sourcePrefix = `api-consumer-test-${process.pid}`;

describe.sequential('API consumer key persistence', () => {
  let pool: Pool;
  let accountId: string;
  let otherAccountId: string;

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
    const otherAccount = await executeQuery<{ id: string }>(
      pool,
      `INSERT INTO app_user (auth_provider, auth_subject, display_name, application_role, submitter_approval_state)
      VALUES ('test', $1, 'Other API Consumer Test', 'admin', 'not_requested') RETURNING app_user_id::text AS id`,
      [`${sourcePrefix}-other`],
    );
    otherAccountId = otherAccount.rows[0]!.id;
  });

  afterAll(async () => {
    await pool?.end();
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

    const active = await repository.findActiveConsumer(hashApiKey(second));
    await repository.recordUsage!({
      consumerId: issued.id,
      keyId: active!.keyId!,
      endpoint: 'GET /consumer/fixtures/:fixtureId/events',
      statusClass: '2xx',
      at: new Date('2026-09-27T10:00:00.000Z'),
    });
    await repository.recordUsage!({
      consumerId: issued.id,
      keyId: active!.keyId!,
      endpoint: 'GET /consumer/fixtures/:fixtureId/events',
      statusClass: '2xx',
      at: new Date('2026-09-27T11:00:00.000Z'),
    });
    await repository.recordUsage!({
      consumerId: issued.id,
      keyId: active!.keyId!,
      endpoint: 'GET /consumer/fixtures/:fixtureId/events',
      statusClass: '4xx',
      at: new Date('2026-09-27T12:00:00.000Z'),
    });

    const otherRaw = 'sat_live_ccccccccccccccccccccccccccccccccccccccccccc';
    const other = await repository.issue(
      otherAccountId,
      { name: 'Other owner consumer', rateLimitPerMinute: 10, dailyQuota: 100 },
      {
        raw: otherRaw,
        prefix: otherRaw.slice(0, 17),
        hash: hashApiKey(otherRaw),
      },
    );
    const otherActive = await repository.findActiveConsumer(hashApiKey(otherRaw));
    await repository.recordUsage!({
      consumerId: other.id,
      keyId: otherActive!.keyId!,
      endpoint: 'GET /consumer/competitions',
      statusClass: '5xx',
      at: new Date('2026-09-27T13:00:00.000Z'),
    });
    const usage = await repository.listUsage!(issued.id, {
      from: '2026-09-27',
      to: '2026-09-27',
      limit: 10,
    });
    expect(usage).toEqual({
      totalRequests: 3,
      entries: [
        {
          date: '2026-09-27',
          endpoint: 'GET /consumer/fixtures/:fixtureId/events',
          statusClass: '2xx',
          requestCount: 2,
        },
        {
          date: '2026-09-27',
          endpoint: 'GET /consumer/fixtures/:fixtureId/events',
          statusClass: '4xx',
          requestCount: 1,
        },
      ],
    });
    expect(await repository.findOwned(accountId, issued.id)).toMatchObject({ id: issued.id });
    expect(await repository.findOwned(accountId, other.id)).toBeNull();
    expect(JSON.stringify(usage)).not.toContain('GET /consumer/competitions');
    const telemetry = await executeQuery<{ rawKey: string | null; query: string | null }>(
      pool,
      `SELECT null::text AS "rawKey", null::text AS query FROM api_consumer_request_usage
       WHERE api_consumer_id = $1`,
      [issued.id],
    );
    expect(telemetry.rows[0]).toEqual({ rawKey: null, query: null });

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

  test('atomically enforces shared per-source and global anonymous minute budgets', async () => {
    const repository = createAnonymousAccessRepository(pool);
    const at = new Date('2099-09-30T10:00:20.000Z');
    await executeQuery(
      pool,
      `DELETE FROM api_anonymous_source_minute_usage WHERE window_start = date_trunc('minute', $1::timestamptz)`,
      [at],
    );
    await executeQuery(
      pool,
      `DELETE FROM api_anonymous_global_minute_usage WHERE window_start = date_trunc('minute', $1::timestamptz)`,
      [at],
    );

    const sourceA = 'a'.repeat(64);
    const sourceB = 'b'.repeat(64);
    const firstSourceResults = await Promise.all(
      Array.from({ length: 3 }, () =>
        repository.consume({ sourceKey: sourceA, sourceLimit: 2, globalLimit: 3, at }),
      ),
    );
    expect(firstSourceResults.filter((result) => result.allowed)).toHaveLength(2);
    expect(firstSourceResults.filter((result) => result.exceeded === 'source')).toHaveLength(1);

    await expect(
      repository.consume({ sourceKey: sourceB, sourceLimit: 2, globalLimit: 3, at }),
    ).resolves.toMatchObject({ allowed: true, sourceUsed: 1, globalUsed: 3 });
    await expect(
      repository.consume({ sourceKey: sourceB, sourceLimit: 2, globalLimit: 3, at }),
    ).resolves.toMatchObject({ allowed: false, exceeded: 'global', globalUsed: 3 });

    const counters = await executeQuery<{ sourceKey: string; requestCount: number }>(
      pool,
      `SELECT source_key AS "sourceKey", request_count AS "requestCount"
       FROM api_anonymous_source_minute_usage
       WHERE window_start = date_trunc('minute', $1::timestamptz)
       ORDER BY source_key`,
      [at],
    );
    expect(counters.rows).toEqual([
      { sourceKey: sourceA, requestCount: 2 },
      { sourceKey: sourceB, requestCount: 1 },
    ]);

    await expect(
      repository.consume({
        sourceKey: sourceA,
        sourceLimit: 2,
        globalLimit: 3,
        at: new Date('2099-09-30T10:01:00.000Z'),
      }),
    ).resolves.toMatchObject({ allowed: true, sourceUsed: 1, globalUsed: 1 });
  });
});
