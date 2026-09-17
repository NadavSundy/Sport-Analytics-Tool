import { readFile } from 'node:fs/promises';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

/**
 * The participant aggregate snapshot tables and invalidation function
 * (issue #592). Every test runs inside a transaction that is rolled back.
 */

const MIGRATION = '20260918100000000_participant-aggregate-snapshots.sql';
const DEFINITION = 'a'.repeat(64);

async function migrationSections(): Promise<{ down: string; up: string }> {
  const migration = await readFile(
    new URL(`../../../../database/migrations/${MIGRATION}`, import.meta.url),
    'utf8',
  );
  const downMarker = '-- Down Migration';
  const downMarkerIndex = migration.indexOf(downMarker);

  if (downMarkerIndex < 0) {
    throw new Error(`${MIGRATION} does not define a down migration.`);
  }

  return {
    up: migration.slice(0, downMarkerIndex),
    down: migration.slice(downMarkerIndex + downMarker.length),
  };
}

describe.sequential('participant aggregate snapshot schema', () => {
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

  async function insertPerson(client: PoolClient, role: string): Promise<string> {
    const result = await client.query<{ personId: string }>(
      `INSERT INTO person (source_ref, display_name)
       VALUES ($1, $1)
       RETURNING person_id::text AS "personId"`,
      [`participant-aggregate-snapshot-${process.pid}-${role}`],
    );
    return result.rows[0]!.personId;
  }

  /** Runs a statement inside a savepoint and returns the constraint it violated, if any. */
  async function violatedConstraint(
    client: PoolClient,
    text: string,
    values: unknown[],
  ): Promise<string | null> {
    await client.query('SAVEPOINT snapshot_attempt');
    try {
      await client.query(text, values);
      await client.query('RELEASE SAVEPOINT snapshot_attempt');
      return null;
    } catch (error) {
      await client.query('ROLLBACK TO SAVEPOINT snapshot_attempt');
      return (error as { constraint?: string }).constraint ?? null;
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

  test('keeps a state row either unbuilt or completely built', async () => {
    await withRolledBackTransaction(async (client) => {
      const participantId = await insertPerson(client, 'state');
      const insertState = `
        INSERT INTO participant_aggregate_snapshot_state (
          participant_id, data_version, definition_version, refresh_count, refreshed_at
        )
        VALUES ($1::bigint, $2, $3, $4, $5)`;

      expect(
        await violatedConstraint(client, insertState, [participantId, 1, null, 1, new Date()]),
      ).toBe('participant_aggregate_snapshot_state_built_ck');
      expect(
        await violatedConstraint(client, insertState, [
          participantId,
          1,
          DEFINITION,
          0,
          new Date(),
        ]),
      ).toBe('participant_aggregate_snapshot_state_built_ck');
      expect(
        await violatedConstraint(client, insertState, [participantId, 1, 'v1', 1, new Date()]),
      ).toBe('participant_aggregate_snapshot_state_definition_version_ck');
      // A failed first refresh leaves an unbuilt row that only counts attempts.
      expect(
        await violatedConstraint(
          client,
          `INSERT INTO participant_aggregate_snapshot_state (participant_id, attempt_count, last_error)
           VALUES ($1::bigint, 1, 'failed')`,
          [participantId],
        ),
      ).toBeNull();
      expect(
        await violatedConstraint(
          client,
          `UPDATE participant_aggregate_snapshot_state
           SET data_version = 1, definition_version = $2, refresh_count = 1, refreshed_at = now()
           WHERE participant_id = $1::bigint`,
          [participantId, DEFINITION],
        ),
      ).toBeNull();
    });
  });

  test('requires a state row and a well-formed scope key for every scope row', async () => {
    await withRolledBackTransaction(async (client) => {
      const participantId = await insertPerson(client, 'scope');
      const insertScope = `
        INSERT INTO participant_aggregate_snapshot (
          participant_id, scope_key, payload, data_version, definition_version
        )
        VALUES ($1::bigint, $2, $3::jsonb, 1, $4)`;

      expect(
        await violatedConstraint(client, insertScope, [participantId, 'career', '{}', DEFINITION]),
      ).toBe('participant_aggregate_snapshot_participant_id_fkey');

      await client.query(
        `INSERT INTO participant_aggregate_snapshot_state (
           participant_id, data_version, definition_version, refresh_count, refreshed_at
         )
         VALUES ($1::bigint, 1, $2, 1, now())`,
        [participantId, DEFINITION],
      );
      for (const scopeKey of ['career', 'competition:7', 'competition:none', 'season:7:2026']) {
        expect(
          await violatedConstraint(client, insertScope, [
            participantId,
            scopeKey,
            '{}',
            DEFINITION,
          ]),
        ).toBeNull();
      }
      expect(
        await violatedConstraint(client, insertScope, [participantId, 'season', '{}', DEFINITION]),
      ).toBe('participant_aggregate_snapshot_scope_key_ck');
      expect(
        await violatedConstraint(client, insertScope, [
          participantId,
          'competition:8',
          '[]',
          DEFINITION,
        ]),
      ).toBe('participant_aggregate_snapshot_payload_ck');
    });
  });

  test('invalidation deletes every state row and its scope rows and reports the count', async () => {
    const { up } = await migrationSections();
    // Invalidation deletes every state row. Against the live tables that would
    // lock rows other database test files refresh, so it runs against copies
    // created by the up section in a scratch schema.
    const schema = `issue_592_snapshot_invalidation_${process.pid}`;

    await withRolledBackTransaction(async (client) => {
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}, public`);
      // A stub person table in the scratch schema: a foreign key to the live
      // person table would lock it against inserts by parallel test files
      // until this transaction rolls back.
      await client.query(`CREATE TABLE person (person_id bigint PRIMARY KEY)`);
      await client.query(up);
      const participantIds = ['1', '2'];
      await client.query(`INSERT INTO person (person_id) VALUES (1), (2)`);
      for (const participantId of participantIds) {
        await client.query(
          `INSERT INTO participant_aggregate_snapshot_state (
             participant_id, data_version, definition_version, refresh_count, refreshed_at
           )
           VALUES ($1::bigint, 1, $2, 1, now())`,
          [participantId, DEFINITION],
        );
        await client.query(
          `INSERT INTO participant_aggregate_snapshot (
             participant_id, scope_key, payload, data_version, definition_version
           )
           VALUES ($1::bigint, 'career', '{}', 1, $2)`,
          [participantId, DEFINITION],
        );
      }

      const invalidated = await client.query<{ count: string }>(
        `SELECT invalidate_participant_aggregate_snapshots()::text AS count`,
      );
      expect(invalidated.rows).toEqual([{ count: '2' }]);

      const remaining = await client.query<{ states: string; scopes: string }>(
        `SELECT
           (SELECT count(*) FROM participant_aggregate_snapshot_state)::text AS states,
           (SELECT count(*) FROM participant_aggregate_snapshot)::text AS scopes`,
      );
      expect(remaining.rows).toEqual([{ states: '0', scopes: '0' }]);
    });
  });

  test('applies and reverts through its up and down sections', async () => {
    const { up, down } = await migrationSections();
    // The sections run in a scratch schema placed first on the search path, so
    // the live tables that reads and refreshes use are never dropped.
    const schema = `issue_592_snapshot_migration_${process.pid}`;
    const objects = async (client: PoolClient) =>
      (
        await client.query<{ tables: string; functions: string }>(
          `SELECT
             (SELECT count(*) FROM pg_tables
              WHERE schemaname = $1
                AND tablename IN ('participant_aggregate_snapshot_state',
                                  'participant_aggregate_snapshot'))::text AS tables,
             (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = $1
                AND p.proname = 'invalidate_participant_aggregate_snapshots')::text AS functions`,
          [schema],
        )
      ).rows[0];

    await withRolledBackTransaction(async (client) => {
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}, public`);
      // A stub person table in the scratch schema: a foreign key to the live
      // person table would lock it against inserts by parallel test files
      // until this transaction rolls back.
      await client.query(`CREATE TABLE person (person_id bigint PRIMARY KEY)`);
      expect(await objects(client)).toEqual({ tables: '0', functions: '0' });
      await client.query(up);
      expect(await objects(client)).toEqual({ tables: '2', functions: '1' });
      await client.query(down);
      expect(await objects(client)).toEqual({ tables: '0', functions: '0' });
    });
  });
});
