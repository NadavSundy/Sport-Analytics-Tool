import { resolve } from 'node:path';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { loadParticipantAggregatesSource } from '../../src/modules/statistics/participant-aggregates.repository';
import {
  createParticipantAggregateSnapshotStore,
  participantAggregateScopeKey,
  refreshParticipantAggregateSnapshots,
} from '../../src/modules/statistics/participant-aggregates.snapshot';
import { isolatedMatchCopy } from './isolated-match-copy';

/**
 * The participant aggregate snapshot store (issue #592): what a refresh writes,
 * and when it writes nothing. Each test runs in a transaction that is rolled
 * back; the store's own transactions become savepoints inside it.
 */

const seedPath = resolve(__dirname, '../../../../database/seeds/matches/423788.json');
const sourcePrefix = `snapshot-store-${process.pid}`;

describe.sequential('participant aggregate snapshot store', () => {
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

  async function ingestedParticipants(client: PoolClient, label: string): Promise<string[]> {
    const { fixtureId } = await ingestMatchData(client, isolatedMatchCopy(seedPath, sourcePrefix), {
      sourceRef: `${sourcePrefix}-${label}`,
    });
    const result = await client.query<{ personId: string }>(
      `SELECT person_id::text AS "personId" FROM fixture_squad
       WHERE fixture_id = $1::bigint ORDER BY person_id`,
      [fixtureId],
    );
    return result.rows.map((row) => row.personId);
  }

  async function storedRows(client: PoolClient, participantId: string) {
    const result = await client.query<{ row: string }>(
      `SELECT to_jsonb(snapshot)::text AS row FROM participant_aggregate_snapshot snapshot
       WHERE participant_id = $1::bigint ORDER BY scope_key`,
      [participantId],
    );
    const state = await client.query<{ row: string }>(
      `SELECT to_jsonb(state)::text AS row FROM participant_aggregate_snapshot_state state
       WHERE participant_id = $1::bigint`,
      [participantId],
    );
    return { scopes: result.rows.map((row) => row.row), state: state.rows[0]?.row ?? null };
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

  test('stores exactly the live rows, keyed by scope, and serves them while current', async () => {
    await withRolledBackTransaction(async (client) => {
      const [participantId] = await ingestedParticipants(client, 'stores');
      const store = createParticipantAggregateSnapshotStore(savepointPool(client));
      const loadSource = (id: string) => loadParticipantAggregatesSource(id, client);

      const outcomes = await refreshParticipantAggregateSnapshots([participantId!], {
        store,
        loadSource,
      });
      expect(outcomes.get(participantId!)).toBe('refreshed');

      const live = await loadParticipantAggregatesSource(participantId!, client);
      const read = await store.read(participantId!);
      expect(read?.rows).toEqual(live!.rows);
      const keys = (
        await client.query<{ scopeKey: string }>(
          `SELECT scope_key AS "scopeKey" FROM participant_aggregate_snapshot
           WHERE participant_id = $1::bigint ORDER BY scope_key`,
          [participantId],
        )
      ).rows.map((row) => row.scopeKey);
      expect(keys).toEqual(live!.rows.map(participantAggregateScopeKey).sort());
    });
  });

  test('does not recompute or rewrite a participant whose rows are current', async () => {
    await withRolledBackTransaction(async (client) => {
      const [participantId] = await ingestedParticipants(client, 'current');
      const store = createParticipantAggregateSnapshotStore(savepointPool(client));
      let loads = 0;
      const loadSource = (id: string) => {
        loads += 1;
        return loadParticipantAggregatesSource(id, client);
      };

      await refreshParticipantAggregateSnapshots([participantId!], { store, loadSource });
      const before = await storedRows(client, participantId!);
      const outcomes = await refreshParticipantAggregateSnapshots([participantId!], {
        store,
        loadSource,
      });

      expect(outcomes.get(participantId!)).toBe('current');
      expect(loads).toBe(1);
      expect(await storedRows(client, participantId!)).toEqual(before);
    });
  });

  test('writes nothing for an untracked participant or a version that has moved', async () => {
    await withRolledBackTransaction(async (client) => {
      const [participantId] = await ingestedParticipants(client, 'stale');
      const store = createParticipantAggregateSnapshotStore(savepointPool(client));
      const live = await loadParticipantAggregatesSource(participantId!, client);
      const read = await store.read(participantId!);

      expect(await store.write(participantId!, read!.dataVersion! - 1, live!.rows)).toBe('stale');
      expect(await storedRows(client, participantId!)).toEqual({ scopes: [], state: null });

      const untracked = (
        await client.query<{ personId: string }>(
          `INSERT INTO person (source_ref, display_name) VALUES ($1, $1)
           RETURNING person_id::text AS "personId"`,
          [`${sourcePrefix}-untracked`],
        )
      ).rows[0]!.personId;
      const outcomes = await refreshParticipantAggregateSnapshots([untracked], {
        store,
        loadSource: (id) => loadParticipantAggregatesSource(id, client),
      });
      expect(outcomes.get(untracked)).toBe('untracked');
      expect((await store.read(untracked))?.rows).toBeNull();
      expect(await storedRows(client, untracked)).toEqual({ scopes: [], state: null });
    });
  });

  test('writes nothing and does not wait while another session holds the lease', async () => {
    await withRolledBackTransaction(async (client) => {
      const [participantId] = await ingestedParticipants(client, 'lease');
      const store = createParticipantAggregateSnapshotStore(savepointPool(client));
      const live = await loadParticipantAggregatesSource(participantId!, client);
      const read = await store.read(participantId!);
      const holder = await databasePool().connect();

      try {
        await holder.query(
          `SELECT pg_advisory_lock(
             hashtextextended('participant-aggregate-snapshot:' || $1::bigint::text, 0)
           )`,
          [participantId],
        );
        const started = Date.now();
        expect(await store.write(participantId!, read!.dataVersion!, live!.rows)).toBe('busy');
        expect(Date.now() - started).toBeLessThan(1_000);
      } finally {
        await holder.query('SELECT pg_advisory_unlock_all()');
        holder.release();
      }
      expect(await storedRows(client, participantId!)).toEqual({ scopes: [], state: null });
    });
  });
});
