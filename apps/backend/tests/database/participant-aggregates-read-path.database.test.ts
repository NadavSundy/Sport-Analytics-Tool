import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { advanceParticipantStatisticsVersions } from '@sport-analytics/batch-processing';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { createSeasonId } from '../../src/modules/public-read/season-id';
import { deriveParticipantAggregates } from '../../src/modules/statistics/participant-aggregates.derivation';
import { loadParticipantAggregatesSource } from '../../src/modules/statistics/participant-aggregates.repository';
import { createParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import {
  createParticipantAggregateSnapshotStore,
  invalidateParticipantAggregateSnapshots,
} from '../../src/modules/statistics/participant-aggregates.snapshot';

/**
 * The participant aggregates read path over stored snapshots (issue #592):
 * stored rows are served only while current, a read miss derives live and
 * refreshes, and a refresh never makes a read wait.
 */

const seedPath = resolve(__dirname, '../../../../database/seeds/matches/423788.json');
const snapshotMigration = '20260918100000000_participant-aggregate-snapshots.sql';
const sourcePrefix = `aggregate-read-path-${process.pid}`;
const promptMs = 2_000;

describe.sequential('participant aggregates read path over stored snapshots', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }
    return pool;
  }

  async function withRolledBackTransaction(
    operation: (client: PoolClient) => Promise<void>,
  ): Promise<void> {
    const client = await databasePool().connect();
    try {
      await client.query('BEGIN');
      await operation(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  /** A pool whose connections are the test's client and whose transactions are savepoints. */
  function savepointPool(client: PoolClient): Pool {
    const statements: Record<string, string> = {
      BEGIN: 'SAVEPOINT store_transaction',
      COMMIT: 'RELEASE SAVEPOINT store_transaction',
      ROLLBACK: 'ROLLBACK TO SAVEPOINT store_transaction',
    };
    const transactionClient = {
      query: (text: string, values?: unknown[]) => client.query(statements[text] ?? text, values),
      release: () => undefined,
    };
    return {
      connect: async () => transactionClient,
      query: (text: string, values?: unknown[]) => client.query(text, values),
    } as unknown as Pool;
  }

  /** A service over the test's transaction, with a loader that counts live derivations. */
  function serviceFor(executor: PoolClient | Pool, storePool: Pool) {
    const loadSource = vi.fn((participantId: string) =>
      loadParticipantAggregatesSource(participantId, executor),
    );
    const service = createParticipantAggregatesService(
      loadSource,
      createParticipantAggregateSnapshotStore(storePool),
    );
    return { service, loadSource };
  }

  async function liveAggregates(executor: PoolClient | Pool, participantId: string) {
    const source = await loadParticipantAggregatesSource(participantId, executor);
    return source && deriveParticipantAggregates(source, { createSeasonId });
  }

  async function ingestedPlayer(client: PoolClient, label: string): Promise<string> {
    const { fixtureId } = await ingestMatchData(client, seedPath, {
      sourceRef: `${sourcePrefix}-${label}`,
    });
    const result = await client.query<{ personId: string }>(
      `SELECT person_id::text AS "personId" FROM fixture_squad
       WHERE fixture_id = $1::bigint ORDER BY person_id LIMIT 1`,
      [fixtureId],
    );
    return result.rows[0]!.personId;
  }

  async function stateRow(executor: PoolClient | Pool, participantId: string) {
    const result = await executor.query<{ row: string }>(
      `SELECT to_jsonb(state)::text AS row FROM participant_aggregate_snapshot_state state
       WHERE participant_id = $1::bigint`,
      [participantId],
    );
    return result.rows[0]?.row ?? null;
  }

  /** Fails the test instead of hanging when a read waits for a lock. */
  async function prompt<T>(operation: Promise<T>): Promise<{ value: T; elapsedMs: number }> {
    const started = Date.now();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`The read waited over ${promptMs} ms.`)), promptMs);
    });
    try {
      const value = await Promise.race([operation, timeout]);
      return { value, elapsedMs: Date.now() - started };
    } finally {
      clearTimeout(timer);
    }
  }

  beforeAll(() => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  test('derives live on the first read and serves identical stored rows afterwards', async () => {
    await withRolledBackTransaction(async (client) => {
      const participantId = await ingestedPlayer(client, 'serves');
      const { service, loadSource } = serviceFor(client, savepointPool(client));

      const first = await service.getParticipantAggregates(participantId, {});
      expect(loadSource).toHaveBeenCalledTimes(1);
      expect(first).toEqual(await liveAggregates(client, participantId));
      expect(await stateRow(client, participantId)).not.toBeNull();

      const second = await service.getParticipantAggregates(participantId, {});
      const scoped = await service.getParticipantAggregates(participantId, { scope: 'season' });
      expect(loadSource).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
      expect(scoped?.statistics.length).toBeGreaterThan(0);
      expect(scoped?.statistics.every((statistic) => statistic.scope === 'season')).toBe(true);
    });
  });

  test('stops serving stored rows once a tracked write advances the version', async () => {
    await withRolledBackTransaction(async (client) => {
      const participantId = await ingestedPlayer(client, 'tracked-first');
      const { service, loadSource } = serviceFor(client, savepointPool(client));
      const before = await service.getParticipantAggregates(participantId, {});

      // A second fixture for the same players: ingest advances their versions.
      await ingestedPlayer(client, 'tracked-second');
      const after = await service.getParticipantAggregates(participantId, {});

      expect(loadSource).toHaveBeenCalledTimes(2);
      expect(after).toEqual(await liveAggregates(client, participantId));
      expect(after).not.toEqual(before);

      await service.getParticipantAggregates(participantId, {});
      expect(loadSource).toHaveBeenCalledTimes(2);
    });
  });

  test('never serves or stores rows for a participant without a statistics version', async () => {
    await withRolledBackTransaction(async (client) => {
      const participantId = (
        await client.query<{ personId: string }>(
          `INSERT INTO person (source_ref, display_name) VALUES ($1, $1)
           RETURNING person_id::text AS "personId"`,
          [`${sourcePrefix}-untracked`],
        )
      ).rows[0]!.personId;
      const { service, loadSource } = serviceFor(client, savepointPool(client));

      const first = await service.getParticipantAggregates(participantId, {});
      await service.getParticipantAggregates(participantId, {});

      expect(loadSource).toHaveBeenCalledTimes(2);
      expect(first).toEqual(await liveAggregates(client, participantId));
      expect(await stateRow(client, participantId)).toBeNull();
    });
  });

  test('stops serving stored rows built under a different definition', async () => {
    await withRolledBackTransaction(async (client) => {
      const participantId = await ingestedPlayer(client, 'definition');
      const { service, loadSource } = serviceFor(client, savepointPool(client));
      await service.getParticipantAggregates(participantId, {});

      await client.query(
        `UPDATE participant_aggregate_snapshot_state SET definition_version = $2
         WHERE participant_id = $1::bigint`,
        [participantId, 'b'.repeat(64)],
      );
      const read = await service.getParticipantAggregates(participantId, {});

      expect(loadSource).toHaveBeenCalledTimes(2);
      expect(read).toEqual(await liveAggregates(client, participantId));
    });
  });

  test('stops serving stored rows after an untracked write invalidates them', async () => {
    const migration = await readFile(
      new URL(`../../../../database/migrations/${snapshotMigration}`, import.meta.url),
      'utf8',
    );
    const up = migration.slice(0, migration.indexOf('-- Down Migration'));
    // Invalidation deletes every state row. The snapshot tables and function
    // are created in a scratch schema first on the search path, so it cannot
    // lock rows that other database test files refresh; every other table
    // still resolves to the public schema.
    const schema = `issue_592_read_path_${process.pid}`;

    await withRolledBackTransaction(async (client) => {
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}, public`);
      await client.query(up);
      const participantId = await ingestedPlayer(client, 'invalidated');
      const { service, loadSource } = serviceFor(client, savepointPool(client));
      await service.getParticipantAggregates(participantId, {});
      await service.getParticipantAggregates(participantId, {});
      expect(loadSource).toHaveBeenCalledTimes(1);

      // An untracked repair: an innings is marked a super over without any
      // version advancing, which removes it from every aggregate.
      await client.query(
        `UPDATE innings SET is_super_over = true
         WHERE innings_id = (
           SELECT i.innings_id FROM innings i
           JOIN fixture_squad fs ON fs.fixture_id = i.fixture_id
           WHERE fs.person_id = $1::bigint
           ORDER BY i.innings_id DESC LIMIT 1
         )`,
        [participantId],
      );
      expect(await invalidateParticipantAggregateSnapshots(client)).toBeGreaterThanOrEqual(1);
      const read = await service.getParticipantAggregates(participantId, {});

      expect(loadSource).toHaveBeenCalledTimes(2);
      expect(read).toEqual(await liveAggregates(client, participantId));
    });
  });

  test('returns live values promptly and writes nothing while another session holds the lease', async () => {
    await withRolledBackTransaction(async (client) => {
      const participantId = await ingestedPlayer(client, 'lease');
      const { service, loadSource } = serviceFor(client, savepointPool(client));
      const holder = await databasePool().connect();

      try {
        await holder.query(
          `SELECT pg_advisory_lock(
             hashtextextended('participant-aggregate-snapshot:' || $1::bigint::text, 0)
           )`,
          [participantId],
        );
        const { value } = await prompt(service.getParticipantAggregates(participantId, {}));

        expect(value).toEqual(await liveAggregates(client, participantId));
        expect(loadSource).toHaveBeenCalledTimes(1);
        expect(await stateRow(client, participantId)).toBeNull();
      } finally {
        await holder.query('SELECT pg_advisory_unlock_all()');
        holder.release();
      }
    });
  });

  test('returns live values promptly and writes nothing while another session locks the version row', async () => {
    // The lock holder is a separate session, so the participant and version are
    // committed. The person has no fixtures and is left in place, as other
    // database tests leave theirs.
    const participantId = (
      await databasePool().query<{ personId: string }>(
        `INSERT INTO person (source_ref, display_name) VALUES ($1, $1)
         RETURNING person_id::text AS "personId"`,
        [`${sourcePrefix}-row-lock`],
      )
    ).rows[0]!.personId;
    await advanceParticipantStatisticsVersions(databasePool(), [participantId]);
    const { service, loadSource } = serviceFor(databasePool(), databasePool());
    const holder = await databasePool().connect();

    try {
      await holder.query('BEGIN');
      await holder.query(
        `SELECT 1 FROM participant_statistics_version WHERE participant_id = $1::bigint FOR UPDATE`,
        [participantId],
      );
      const { value } = await prompt(service.getParticipantAggregates(participantId, {}));

      expect(value).toEqual(await liveAggregates(databasePool(), participantId));
      expect(loadSource).toHaveBeenCalledTimes(1);
      expect(await stateRow(databasePool(), participantId)).toBeNull();
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
  });
});
