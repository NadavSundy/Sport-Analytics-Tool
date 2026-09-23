import { randomUUID } from 'node:crypto';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import {
  BatchParticipantOnboardingConflictError,
  createBatchRepository,
} from '../../src/modules/batches/batch.repository';

/**
 * Issue #708, Pull Request 2. A reviewer settles the participant onboarding
 * tasks a canonical fixture could not settle for itself.
 *
 * The whole array is applied in one transaction and the batch is revalidated
 * once, because one revalidation per decision would make a season-scale batch
 * with twenty-two outstanding tasks pay for twenty-two full passes.
 *
 * Nothing here weakens matching. A decision may name a candidate the task
 * itself offered, or supply a durable identifier; a name still buys nothing.
 */

const sourcePrefix = `participant-onboarding-decisions-${process.pid}`;

interface Seed {
  batchId: string;
  accountId: string;
  fixtureId: string;
  battingTeamName: string;
  bowlingTeamName: string;
}

describe.sequential('participant onboarding decisions', () => {
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
    const battingTeamName = `${key}-batting`;
    const bowlingTeamName = `${key}-bowling`;
    const teamIds: string[] = [];
    for (const name of [battingTeamName, bowlingTeamName]) {
      const { teamId } = await one<{ teamId: string }>(
        `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS "teamId"`,
        [name],
      );
      teamIds.push(teamId);
    }
    const { batchId } = await one<{ batchId: string }>(
      `INSERT INTO batch (batch_reference, submitter_id, competition_id, idempotency_key,
                          source_checksum, source_uri, source_size_bytes, state)
       VALUES ($1::uuid, $2::bigint, $3::bigint, $4, $5, $6, 64, 'awaiting_review')
       RETURNING batch_id::text AS "batchId"`,
      [randomUUID(), accountId, competitionId, key, 'a'.repeat(64), `stored-object:${key}`],
    );
    // The revalidation tail resets this batch's validation job, so it must exist.
    await client.query(
      `INSERT INTO background_job (
         job_id, job_type, contract_version, idempotency_key, owner_id, batch_id, state
       ) VALUES ($1::uuid, 'batch.validate', 1, $2, $3::bigint, $4::bigint, 'succeeded')`,
      [randomUUID(), `${key}-validate`, accountId, batchId],
    );
    await client.query(
      `INSERT INTO batch_checkpoint (batch_id, phase, last_ordinal) VALUES ($1::bigint, 'validating', 5)`,
      [batchId],
    );
    const { fixtureId } = await one<{ fixtureId: string }>(
      `INSERT INTO fixture (
         source_ref, competition_id, season, match_type, team_type, gender, balls_per_over,
         start_date, end_date, outcome, source_version, source_revision
       )
       VALUES ($1, $2::bigint, '2026', 'T20', 'club', 'mixed', 6, CURRENT_DATE, CURRENT_DATE,
               'tie', '1.0', 1)
       RETURNING fixture_id::text AS "fixtureId"`,
      [`${key}-fixture`, competitionId],
    );
    await client.query(
      `INSERT INTO fixture_team (fixture_id, team_id, ordinal) VALUES ($1, $2, 1), ($1, $3, 2)`,
      [fixtureId, teamIds[0], teamIds[1]],
    );
    return { batchId, accountId, fixtureId, battingTeamName, bowlingTeamName };
  }

  async function addTask(
    client: PoolClient,
    seeded: Seed,
    options: {
      participantKey: string;
      reason: string;
      teamName?: string | null;
      candidates?: { personId: string; displayName: string }[];
    },
  ): Promise<string> {
    const { rows } = await client.query<{ taskReference: string }>(
      `INSERT INTO batch_participant_onboarding_task (
         batch_id, fixture_id, participant_key, submitted_name, submitted_team_name,
         reason, candidates
       ) VALUES ($1::bigint, $2::bigint, $3, 'A Player', $4, $5, $6::jsonb)
       RETURNING task_reference::text AS "taskReference"`,
      [
        seeded.batchId,
        seeded.fixtureId,
        options.participantKey,
        options.teamName === undefined ? seeded.battingTeamName : options.teamName,
        options.reason,
        JSON.stringify(options.candidates ?? []),
      ],
    );
    return rows[0]!.taskReference;
  }

  async function insertPerson(client: PoolClient, label: string): Promise<string> {
    const { rows } = await client.query<{ personId: string }>(
      `INSERT INTO person (source_ref, display_name) VALUES ($1, $2)
       RETURNING person_id::text AS "personId"`,
      [`${sourcePrefix}-${label}-${randomUUID().slice(0, 8)}`, 'A Player'],
    );
    return rows[0]!.personId;
  }

  async function outboxCount(client: PoolClient, batchId: string): Promise<number> {
    const { rows } = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM outbox_message message
       JOIN background_job job ON job.job_id = message.job_id
       WHERE job.batch_id = $1::bigint`,
      [batchId],
    );
    return Number(rows[0]!.count);
  }

  test('applies a whole array and revalidates exactly once', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seed(client, 'array');
      const repository = createBatchRepository(client);
      const candidate = await insertPerson(client, 'candidate');

      const chooseCandidate = await addTask(client, seeded, {
        participantKey: 'name:A Player::batting',
        reason: 'ambiguous_name',
        candidates: [{ personId: candidate, displayName: 'A Player' }],
      });
      const supplyIdentifier = await addTask(client, seeded, {
        participantKey: 'name:B Player::batting',
        reason: 'no_durable_identifier',
      });
      const nameTheTeam = await addTask(client, seeded, {
        participantKey: 'source:cricsheet:participant:c-player',
        reason: 'team_not_recognised',
        teamName: null,
      });

      const result = await repository.applyParticipantOnboardingDecisions({
        batchId: seeded.batchId,
        actorId: seeded.accountId,
        decisionKey: 'onboard-array',
        decisions: [
          { taskReference: chooseCandidate, personId: candidate },
          { taskReference: supplyIdentifier, sourceId: `cricsheet:participant:${sourcePrefix}-b` },
          {
            taskReference: nameTheTeam,
            teamName: seeded.bowlingTeamName,
            sourceId: `cricsheet:participant:${sourcePrefix}-c`,
          },
        ],
      });

      expect(result).toEqual({ onboarded: 3, alreadyOnboarded: 0, revalidationQueued: true });

      // Three decisions, one revalidation. This is the property the array form
      // exists for.
      expect(await outboxCount(client, seeded.batchId)).toBe(1);
      const transitions = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM batch_state_transition WHERE batch_id=$1::bigint`,
        [seeded.batchId],
      );
      expect(transitions.rows[0]!.count).toBe('1');

      const squad = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM fixture_squad WHERE fixture_id=$1::bigint`,
        [seeded.fixtureId],
      );
      expect(squad.rows[0]!.count).toBe('3');

      const settled = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM batch_participant_onboarding_task
         WHERE batch_id=$1::bigint AND state='onboarded' AND decided_by=$2::bigint
           AND decision_key='onboard-array'`,
        [seeded.batchId, seeded.accountId],
      );
      expect(settled.rows[0]!.count).toBe('3');

      // The team the reviewer named, not the one the submission carried.
      const placed = await client.query<{ teamName: string }>(
        `SELECT team.name AS "teamName" FROM fixture_squad
         JOIN team ON team.team_id = fixture_squad.team_id
         JOIN person ON person.person_id = fixture_squad.person_id
         WHERE fixture_squad.fixture_id=$1::bigint AND person.source_ref=$2`,
        [seeded.fixtureId, `${sourcePrefix}-c`],
      );
      expect(placed.rows[0]!.teamName).toBe(seeded.bowlingTeamName);
    });
  }, 60_000);

  test('replaying a settled decision changes nothing and queues no revalidation', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seed(client, 'replay');
      const repository = createBatchRepository(client);
      const candidate = await insertPerson(client, 'replay-candidate');
      const taskReference = await addTask(client, seeded, {
        participantKey: 'name:A Player::batting',
        reason: 'ambiguous_name',
        candidates: [{ personId: candidate, displayName: 'A Player' }],
      });
      const decisions = [{ taskReference, personId: candidate }];

      const first = await repository.applyParticipantOnboardingDecisions({
        batchId: seeded.batchId,
        actorId: seeded.accountId,
        decisionKey: 'onboard-replay',
        decisions,
      });
      expect(first).toEqual({ onboarded: 1, alreadyOnboarded: 0, revalidationQueued: true });

      await client.query(`UPDATE batch SET state='awaiting_review' WHERE batch_id=$1::bigint`, [
        seeded.batchId,
      ]);
      const second = await repository.applyParticipantOnboardingDecisions({
        batchId: seeded.batchId,
        actorId: seeded.accountId,
        decisionKey: 'onboard-replay',
        decisions,
      });

      // The earlier decision stands and is reported as already settled. A
      // replay must not cost a second full revalidation pass.
      expect(second).toEqual({ onboarded: 0, alreadyOnboarded: 1, revalidationQueued: false });
      expect(await outboxCount(client, seeded.batchId)).toBe(1);
      const squad = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM fixture_squad WHERE fixture_id=$1::bigint`,
        [seeded.fixtureId],
      );
      expect(squad.rows[0]!.count).toBe('1');
    });
  }, 60_000);

  test('refuses the whole array when any decision is invalid', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seed(client, 'refusal');
      const repository = createBatchRepository(client);
      const candidate = await insertPerson(client, 'refusal-candidate');
      const stranger = await insertPerson(client, 'refusal-stranger');

      const valid = await addTask(client, seeded, {
        participantKey: 'name:A Player::batting',
        reason: 'ambiguous_name',
        candidates: [{ personId: candidate, displayName: 'A Player' }],
      });
      const notOffered = await addTask(client, seeded, {
        participantKey: 'name:B Player::batting',
        reason: 'ambiguous_name',
        candidates: [{ personId: candidate, displayName: 'A Player' }],
      });

      const error = await repository
        .applyParticipantOnboardingDecisions({
          batchId: seeded.batchId,
          actorId: seeded.accountId,
          decisionKey: 'onboard-refusal',
          decisions: [
            { taskReference: valid, personId: candidate },
            // A person this task never offered.
            { taskReference: notOffered, personId: stranger },
          ],
        })
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(BatchParticipantOnboardingConflictError);
      expect((error as BatchParticipantOnboardingConflictError).faults).toEqual([
        {
          taskReference: notOffered,
          code: 'CANDIDATE_NOT_OFFERED',
          message: expect.stringContaining('candidates this task offered'),
        },
      ]);

      // All or nothing: the valid decision beside it was not applied either.
      const squad = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM fixture_squad WHERE fixture_id=$1::bigint`,
        [seeded.fixtureId],
      );
      expect(squad.rows[0]!.count).toBe('0');
      expect(await outboxCount(client, seeded.batchId)).toBe(0);
    });
  }, 60_000);

  test('refuses an identifier naming nobody and a team outside the fixture', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seed(client, 'scope');
      const repository = createBatchRepository(client);
      await client.query(`INSERT INTO team (name) VALUES ($1)`, [`${sourcePrefix}-outside`]);

      const missingPerson = await addTask(client, seeded, {
        participantKey: 'name:A Player::batting',
        reason: 'identifier_not_found',
      });
      const foreignTeam = await addTask(client, seeded, {
        participantKey: 'name:B Player::batting',
        reason: 'team_not_recognised',
        teamName: null,
      });

      const error = await repository
        .applyParticipantOnboardingDecisions({
          batchId: seeded.batchId,
          actorId: seeded.accountId,
          decisionKey: 'onboard-scope',
          decisions: [
            { taskReference: missingPerson, sourceId: 'app:participant:9223372036854775806' },
            { taskReference: foreignTeam, teamName: `${sourcePrefix}-outside` },
          ],
        })
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(BatchParticipantOnboardingConflictError);
      expect(
        (error as BatchParticipantOnboardingConflictError).faults.map((value) => value.code).sort(),
      ).toEqual(['PERSON_NOT_FOUND', 'TEAM_NOT_IN_FIXTURE']);
    });
  }, 60_000);

  test('a name still never matches globally, however unique it is', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seed(client, 'no-global-name');
      const repository = createBatchRepository(client);

      // One person on the whole platform carries this name, and the task offers
      // no candidates. A platform that matched on names would find them.
      const { rows } = await client.query<{ personId: string }>(
        `INSERT INTO person (source_ref, display_name) VALUES ($1, $2)
         RETURNING person_id::text AS "personId"`,
        [`${sourcePrefix}-globally-unique`, `${sourcePrefix} Globally Unique`],
      );
      const onlyPersonWithThatName = rows[0]!.personId;

      const taskReference = await addTask(client, seeded, {
        participantKey: `name:${sourcePrefix} Globally Unique::batting`,
        reason: 'no_durable_identifier',
        candidates: [],
      });

      const error = await repository
        .applyParticipantOnboardingDecisions({
          batchId: seeded.batchId,
          actorId: seeded.accountId,
          decisionKey: 'onboard-no-global-name',
          decisions: [{ taskReference, personId: onlyPersonWithThatName }],
        })
        .catch((thrown: unknown) => thrown);

      // Refused. Uniqueness of a name is not evidence of identity, and the
      // reviewer must supply a durable identifier instead.
      expect(error).toBeInstanceOf(BatchParticipantOnboardingConflictError);
      expect((error as BatchParticipantOnboardingConflictError).faults[0]!.code).toBe(
        'CANDIDATE_NOT_OFFERED',
      );

      const squad = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM fixture_squad WHERE fixture_id=$1::bigint`,
        [seeded.fixtureId],
      );
      expect(squad.rows[0]!.count).toBe('0');
    });
  }, 60_000);
});
