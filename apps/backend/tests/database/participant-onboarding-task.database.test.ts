import { randomUUID } from 'node:crypto';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

/**
 * Issue #708, Pull Request 2. The task row gains the handle a reviewer decision
 * addresses it by, and the reviewer who settled it.
 *
 * `task_reference` exists because `participant_key` cannot serve: a decision
 * mutates it — an identifier turns `name:…` into `source:…`, a team turns
 * `name:X::` into `name:X::North XI` — and it is not unique within a batch,
 * since two fixtures can each name the same person. The tests below pin both.
 */

const sourcePrefix = `participant-onboarding-task-${process.pid}`;

interface Seed {
  batchId: string;
  accountId: string;
  fixtureIds: [string, string];
}

describe.sequential('participant onboarding task decisions', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) throw new Error('Test database pool has not been initialised.');
    return pool;
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
    await pool?.end();
  });

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

  async function seed(client: PoolClient, label: string): Promise<Seed> {
    const key = `${sourcePrefix}-${label}-${randomUUID().slice(0, 8)}`;
    const one = async <Row extends Record<string, string>>(text: string, values: unknown[]) =>
      (await client.query<Row>(text, values)).rows[0]!;

    const { accountId } = await one<{ accountId: string }>(
      `INSERT INTO app_user (auth_provider, auth_subject, application_role)
       VALUES ('test', $1, 'admin') RETURNING app_user_id::text AS "accountId"`,
      [key],
    );
    const { competitionId } = await one<{ competitionId: string }>(
      `INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text AS "competitionId"`,
      [`${key}-competition`],
    );
    const { batchId } = await one<{ batchId: string }>(
      `INSERT INTO batch (batch_reference, submitter_id, competition_id, idempotency_key,
                          source_checksum, source_uri, source_size_bytes, state)
       VALUES ($1::uuid, $2::bigint, $3::bigint, $4, $5, $6, 64, 'awaiting_review')
       RETURNING batch_id::text AS "batchId"`,
      [randomUUID(), accountId, competitionId, key, 'a'.repeat(64), `stored-object:${key}`],
    );
    const fixtureIds: string[] = [];
    for (const ordinal of [1, 2]) {
      const { fixtureId } = await one<{ fixtureId: string }>(
        `INSERT INTO fixture (
           source_ref, competition_id, season, match_type, team_type, gender, balls_per_over,
           start_date, end_date, outcome, source_version, source_revision
         )
         VALUES ($1, $2::bigint, '2026', 'T20', 'club', 'mixed', 6, CURRENT_DATE, CURRENT_DATE,
                 'tie', '1.0', 1)
         RETURNING fixture_id::text AS "fixtureId"`,
        [`${key}-fixture-${String(ordinal)}`, competitionId],
      );
      fixtureIds.push(fixtureId);
    }
    return { batchId, accountId, fixtureIds: [fixtureIds[0]!, fixtureIds[1]!] };
  }

  async function insertTask(
    client: PoolClient,
    seeded: Seed,
    fixtureIndex: 0 | 1,
    participantKey: string,
  ): Promise<string> {
    const { rows } = await client.query<{ taskReference: string }>(
      `INSERT INTO batch_participant_onboarding_task (
         batch_id, fixture_id, participant_key, submitted_name, reason
       ) VALUES ($1::bigint, $2::bigint, $3, 'A Player', 'no_durable_identifier')
       RETURNING task_reference::text AS "taskReference"`,
      [seeded.batchId, seeded.fixtureIds[fixtureIndex], participantKey],
    );
    return rows[0]!.taskReference;
  }

  test('gives every task a unique reference to be addressed by', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seed(client, 'reference');

      // The same participant key in two fixtures of one batch. This is why a
      // decision cannot address a task by participant_key alone.
      const first = await insertTask(client, seeded, 0, 'name:A Player::North XI');
      const second = await insertTask(client, seeded, 1, 'name:A Player::North XI');

      expect(first).not.toBe(second);
      expect(first).toMatch(/^[0-9a-f-]{36}$/);

      const found = await client.query<{ fixtureId: string }>(
        `SELECT fixture_id::text AS "fixtureId" FROM batch_participant_onboarding_task
         WHERE task_reference = $1::uuid`,
        [second],
      );
      // The reference resolves to exactly one task, which the key could not.
      expect(found.rows).toHaveLength(1);
      expect(found.rows[0]!.fixtureId).toBe(seeded.fixtureIds[1]);
    });
  }, 60_000);

  test('requires an onboarded task to name its decider', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seed(client, 'decider');
      const taskReference = await insertTask(client, seeded, 0, 'name:A Player::North XI');
      const { rows } = await client.query<{ personId: string }>(
        `INSERT INTO person (source_ref, display_name) VALUES ($1, 'A Player')
         RETURNING person_id::text AS "personId"`,
        [`${sourcePrefix}-${randomUUID().slice(0, 8)}`],
      );
      const personId = rows[0]!.personId;

      // Onboarded without a decider: provenance for the squad membership would
      // record that something happened but not who did it.
      await expect(
        client.query(
          `UPDATE batch_participant_onboarding_task
           SET state='onboarded', person_id=$2::bigint, onboarded_at=now()
           WHERE task_reference=$1::uuid`,
          [taskReference, personId],
        ),
      ).rejects.toThrow(/batch_participant_onboarding_task_state_ck/);
    });
  }, 60_000);

  test('accepts an onboarded task that names person, time and decider', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seed(client, 'complete');
      const taskReference = await insertTask(client, seeded, 0, 'name:A Player::North XI');
      const { rows } = await client.query<{ personId: string }>(
        `INSERT INTO person (source_ref, display_name) VALUES ($1, 'A Player')
         RETURNING person_id::text AS "personId"`,
        [`${sourcePrefix}-${randomUUID().slice(0, 8)}`],
      );

      await client.query(
        `UPDATE batch_participant_onboarding_task
         SET state='onboarded', person_id=$2::bigint, onboarded_at=now(),
             decided_by=$3::bigint, decision_key=$4
         WHERE task_reference=$1::uuid`,
        [taskReference, rows[0]!.personId, seeded.accountId, 'onboard-key'],
      );

      const settled = await client.query<{
        state: string;
        decidedBy: string;
        decisionKey: string;
      }>(
        `SELECT state, decided_by::text AS "decidedBy", decision_key AS "decisionKey"
         FROM batch_participant_onboarding_task WHERE task_reference=$1::uuid`,
        [taskReference],
      );
      expect(settled.rows[0]).toEqual({
        state: 'onboarded',
        decidedBy: seeded.accountId,
        decisionKey: 'onboard-key',
      });
    });
  }, 60_000);
});
