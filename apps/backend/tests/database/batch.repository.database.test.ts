import { readFile } from 'node:fs/promises';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import {
  BatchReviewResolutionError,
  BatchReplacementConflictError,
  BatchReferenceMappingConflictError,
  createBatchRepository,
} from '../../src/modules/batches/batch.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { randomUUID } from 'node:crypto';
import type { QueryExecutor } from '@sport-analytics/batch-processing';

interface TestRecords {
  accountId: string;
  competitionId: string;
  fixtureId: string;
  inningsId: string;
  deliveryId: string;
  submissionId: string;
}

const sourcePrefix = `batch-repository-test-${process.pid}`;
const checksum = 'a'.repeat(64);

async function migrationSections(filename: string): Promise<{ down: string; up: string }> {
  const migration = await readFile(
    new URL(`../../../../database/migrations/${filename}`, import.meta.url),
    'utf8',
  );
  const downMarker = '-- Down Migration';
  const downMarkerIndex = migration.indexOf(downMarker);

  if (downMarkerIndex < 0) {
    throw new Error('The batch migration does not define a down migration.');
  }

  return {
    up: migration.slice(0, downMarkerIndex),
    down: migration.slice(downMarkerIndex + downMarker.length),
  };
}
function countingExecutor(client: PoolClient): {
  executor: QueryExecutor;
  statements: string[];
} {
  const statements: string[] = [];

  return {
    statements,
    executor: {
      query(text, values) {
        statements.push(text);
        return client.query(text, values);
      },
    },
  };
}
function batchMigrationSections(): Promise<{ down: string; up: string }> {
  return migrationSections('20260831100000000_batch-ingestion-models.sql');
}

function extendedBatchMigrationSections(): Promise<{ down: string; up: string }> {
  return migrationSections('20260902120000000_extend-batch-persistence.sql');
}

function reviewWorkflowMigrationSections(): Promise<{ down: string; up: string }> {
  return migrationSections('20260907100000000_batch-review-workflow.sql');
}

function referenceMappingMigrationSections(): Promise<{ down: string; up: string }> {
  return migrationSections('20260907130000000_batch-reference-mapping.sql');
}

function deduplicateValidationResultMigrationSections(): Promise<{ down: string; up: string }> {
  return migrationSections('20260911130000000_deduplicate-batch-validation-result.sql');
}

describe.sequential('batch repository database integration', () => {
  let pool: Pool | undefined;
  let records: TestRecords | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialized.');
    }

    return pool;
  }

  function testRecords(): TestRecords {
    if (!records) {
      throw new Error('Batch test records have not been initialized.');
    }

    return records;
  }

  async function withRolledBackTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await databasePool().connect();

    try {
      await client.query('BEGIN');
      return await operation(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });

    const account = await executeQuery<{ accountId: string }>(
      pool,
      `
        INSERT INTO app_user (auth_provider, auth_subject, application_role)
        VALUES ('test', $1, 'submitter')
        RETURNING app_user_id::text AS "accountId"
      `,
      [sourcePrefix],
    );
    const competition = await executeQuery<{ competitionId: string }>(
      pool,
      `
        INSERT INTO competition (name)
        VALUES ($1)
        RETURNING competition_id::text AS "competitionId"
      `,
      [`${sourcePrefix}-competition`],
    );
    const battingTeam = await executeQuery<{ teamId: string }>(
      pool,
      `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS "teamId"`,
      [`${sourcePrefix}-batting`],
    );
    const bowlingTeam = await executeQuery<{ teamId: string }>(
      pool,
      `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS "teamId"`,
      [`${sourcePrefix}-bowling`],
    );

    async function insertPerson(role: string): Promise<string> {
      const result = await executeQuery<{ personId: string }>(
        databasePool(),
        `
          INSERT INTO person (source_ref, display_name)
          VALUES ($1, $2)
          RETURNING person_id::text AS "personId"
        `,
        [`${sourcePrefix}-${role}`, `${sourcePrefix} ${role}`],
      );
      return result.rows[0].personId;
    }

    const strikerId = await insertPerson('striker');
    const nonStrikerId = await insertPerson('non-striker');
    const bowlerId = await insertPerson('bowler');
    const accountId = account.rows[0].accountId;
    const competitionId = competition.rows[0].competitionId;
    const battingTeamId = battingTeam.rows[0].teamId;
    const bowlingTeamId = bowlingTeam.rows[0].teamId;

    const fixture = await executeQuery<{ fixtureId: string }>(
      pool,
      `
        INSERT INTO fixture (
          source_ref,
          competition_id,
          season,
          match_type,
          team_type,
          gender,
          balls_per_over,
          start_date,
          end_date,
          outcome,
          source_version,
          source_revision
        )
        VALUES ($1, $2, '2026', 'T20', 'club', 'mixed', 6, CURRENT_DATE,
                CURRENT_DATE, 'tie', '1.0', 1)
        RETURNING fixture_id::text AS "fixtureId"
      `,
      [`${sourcePrefix}-fixture`, competitionId],
    );
    const fixtureId = fixture.rows[0].fixtureId;

    await executeQuery(
      pool,
      `
        INSERT INTO fixture_team (fixture_id, team_id, ordinal)
        VALUES ($1, $2, 1), ($1, $3, 2)
      `,
      [fixtureId, battingTeamId, bowlingTeamId],
    );
    const innings = await executeQuery<{ inningsId: string }>(
      pool,
      `
        INSERT INTO innings (fixture_id, ordinal, batting_team_id)
        VALUES ($1, 0, $2)
        RETURNING innings_id::text AS "inningsId"
      `,
      [fixtureId, battingTeamId],
    );
    const submission = await executeQuery<{ submissionId: string }>(
      pool,
      `
        INSERT INTO submission (submitted_by, fixture_id, schema_version, event_count, status)
        VALUES ($1, $2, '1.0', 1, 'accepted')
        RETURNING submission_id::text AS "submissionId"
      `,
      [accountId, fixtureId],
    );
    const delivery = await executeQuery<{ deliveryId: string }>(
      pool,
      `
        INSERT INTO delivery (
          innings_id,
          over_number,
          position_in_over,
          innings_sequence,
          ball_number,
          striker_id,
          non_striker_id,
          bowler_id,
          runs_off_bat,
          runs_extras,
          runs_total,
          submission_id
        )
        VALUES ($1, 0, 0, 0, 0.1, $2, $3, $4, 0, 0, 0, $5)
        RETURNING delivery_id::text AS "deliveryId"
      `,
      [
        innings.rows[0].inningsId,
        strikerId,
        nonStrikerId,
        bowlerId,
        submission.rows[0].submissionId,
      ],
    );

    records = {
      accountId,
      competitionId,
      fixtureId,
      inningsId: innings.rows[0].inningsId,
      deliveryId: delivery.rows[0].deliveryId,
      submissionId: submission.rows[0].submissionId,
    };
  });

  afterAll(async () => {
    if (!pool || !records) {
      return;
    }

    await executeQuery(pool, 'DELETE FROM delivery WHERE delivery_id = $1', [records.deliveryId]);
    await executeQuery(pool, 'DELETE FROM submission WHERE submission_id = $1', [
      records.submissionId,
    ]);
    await executeQuery(pool, 'DELETE FROM fixture WHERE fixture_id = $1', [records.fixtureId]);
    await executeQuery(pool, 'DELETE FROM app_user WHERE app_user_id = $1', [records.accountId]);
    await executeQuery(pool, 'DELETE FROM competition WHERE competition_id = $1', [
      records.competitionId,
    ]);
    await executeQuery(pool, 'DELETE FROM team WHERE name LIKE $1', [`${sourcePrefix}-%`]);
    await executeQuery(pool, 'DELETE FROM person WHERE source_ref LIKE $1', [`${sourcePrefix}-%`]);
    await pool.end();
  });

  test('round-trips the batch persistence migrations in an isolated PostgreSQL schema', async () => {
    const client = await databasePool().connect();
    const schemaName = `issue359_roundtrip_${process.pid}`;
    const quotedSchemaName = `"${schemaName}"`;
    const batchMigration = await batchMigrationSections();
    const extensionMigration = await extendedBatchMigrationSections();
    const reviewMigration = await reviewWorkflowMigrationSections();
    const mappingMigration = await referenceMappingMigrationSections();
    const dedupeMigration = await deduplicateValidationResultMigrationSections();

    try {
      await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
      await client.query(`SET search_path TO ${quotedSchemaName}`);
      await client.query(`
        CREATE TABLE app_user (app_user_id bigint PRIMARY KEY);
        CREATE TABLE competition (competition_id bigint PRIMARY KEY);
        CREATE TABLE innings (innings_id bigint PRIMARY KEY);
        CREATE TABLE delivery (delivery_id bigint PRIMARY KEY);
      `);
      await client.query(batchMigration.up);
      await client.query(extensionMigration.up);
      await client.query(reviewMigration.up);
      await client.query(mappingMigration.up);
      await client.query(dedupeMigration.up);

      const created = await client.query<{ relationName: string | null }>(
        `SELECT to_regclass('batch_checkpoint')::text AS "relationName"`,
      );
      expect(created.rows[0].relationName).toBe('batch_checkpoint');

      const indexColumns = await client.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes
         WHERE schemaname = $1 AND indexname = 'batch_validation_result_deterministic_key'`,
        [schemaName],
      );
      expect(indexColumns.rows[0]?.indexdef).not.toContain('row_number');
      expect(indexColumns.rows[0]?.indexdef).not.toContain('file_path');

      await client.query(dedupeMigration.down);
      await client.query(mappingMigration.down);
      await client.query(reviewMigration.down);
      await client.query(extensionMigration.down);
      await client.query(batchMigration.down);
      const removed = await client.query<{ relationName: string | null }>(
        `SELECT to_regclass('batch')::text AS "relationName"`,
      );
      expect(removed.rows[0].relationName).toBeNull();
    } finally {
      await client.query('RESET search_path');
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
      client.release();
    }
  });

  test('creates a batch, validation job and outbox command atomically', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const created = await repository.createBatchAndQueueValidation({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-queued-validation`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 2048,
        },
        state: 'stored',
      });

      const job = await client.query<{
        state: string;
        jobType: string;
        batchId: string;
      }>(
        `SELECT state::text AS state, job_type AS "jobType", batch_id::text AS "batchId"
         FROM background_job WHERE batch_id=$1::bigint`,
        [created.batchId],
      );
      const outbox = await client.query<{
        messageType: string;
        body: { type: string; version: number; batchId: string };
        publishedAt: Date | null;
      }>(
        `SELECT message_type AS "messageType", body, published_at AS "publishedAt"
         FROM outbox_message WHERE job_id=(SELECT job_id FROM background_job WHERE batch_id=$1::bigint)`,
        [created.batchId],
      );

      expect(job.rows[0]).toMatchObject({
        state: 'queued',
        jobType: 'batch.validate',
        batchId: created.batchId,
      });
      expect(outbox.rows[0]).toMatchObject({
        messageType: 'batch.validate',
        publishedAt: null,
        body: { type: 'batch.validate', version: 1, batchId: created.batchId },
      });
    });
  });

  test('queues an idempotent mapping decision and retains superseded validation evidence', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatchAndQueueValidation({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-mapping`,
        source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 100 },
        state: 'stored',
      });
      const [item] = await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          overNumber: 0,
          positionInOver: 0,
          payload: { source: 'ambiguous' },
          sourceIdentity: `${sourcePrefix}:delivery:ambiguous`,
          referenceResolutionState: 'ambiguous',
          resolvedReferences: {},
          state: 'rejected',
          rejectionCode: 'REFERENCE_RESOLUTION_FAILED',
        },
      ]);
      await repository.recordValidationResult({
        batchId: batch.batchId,
        batchItemId: item.batchItemId,
        sourceOrdinal: 0,
        ruleCode: 'REFERENCE_RESOLUTION_FAILED',
        ruleVersion: '1.0',
        severity: 'error',
        message: 'Choose one candidate.',
      });
      await client.query(`UPDATE batch SET state='rejected' WHERE batch_id=$1::bigint`, [
        batch.batchId,
      ]);
      await client.query(
        `UPDATE background_job SET state='succeeded',completed_at=now()
         WHERE batch_id=$1::bigint`,
        [batch.batchId],
      );

      const input = {
        decisionReference: randomUUID(),
        batchId: batch.batchId,
        actorId: current.accountId,
        itemOrdinal: 0,
        referencePath: 'fixtures.0.innings.0.events.0.striker',
        entityType: 'participant',
        candidateId: current.accountId,
        candidateLabel: 'Readable candidate',
        decisionKey: `${sourcePrefix}-mapping-decision`,
      };
      const decision = await repository.queueReferenceMapping(input);
      const repeated = await repository.queueReferenceMapping(input);
      expect(repeated).toEqual(decision);

      const state = await client.query<{
        batchState: string;
        itemState: string;
        active: boolean;
        jobState: string;
        outboxCount: string;
      }>(
        `SELECT
           (SELECT state::text FROM batch WHERE batch_id=$1::bigint) AS "batchState",
           (SELECT state::text FROM batch_item WHERE batch_id=$1::bigint) AS "itemState",
           (SELECT active FROM batch_validation_result WHERE batch_id=$1::bigint) AS active,
           (SELECT state::text FROM background_job WHERE batch_id=$1::bigint) AS "jobState",
           (SELECT count(*)::text FROM outbox_message o JOIN background_job j USING (job_id)
             WHERE j.batch_id=$1::bigint) AS "outboxCount"`,
        [batch.batchId],
      );
      expect(state.rows[0]).toEqual({
        batchState: 'stored',
        itemState: 'pending',
        active: false,
        jobState: 'queued',
        outboxCount: '2',
      });
      await expect(
        repository.queueReferenceMapping({
          ...input,
          candidateId: String(Number(current.accountId) + 1),
        }),
      ).rejects.toBeInstanceOf(BatchReferenceMappingConflictError);
    });
  });

  test('creates and reads a batch, ordered items and a durable checkpoint', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const created = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-valid`,
        source: {
          checksum,
          uri: `private/batches/${sourcePrefix}.json`,
          sizeBytes: 2048,
        },
        state: 'stored',
      });

      expect(created).toMatchObject({
        submitterId: current.accountId,
        competitionId: current.competitionId,
        state: 'stored',
        itemCount: 0,
        source: { checksum, sizeBytes: 2048 },
      });
      await expect(repository.findBatchById(created.batchId)).resolves.toEqual(created);
      await expect(
        repository.findBatchByIdempotencyKey(current.accountId, `${sourcePrefix}-valid`),
      ).resolves.toEqual(created);

      const items = await repository.insertBatchItems(created.batchId, [
        {
          ordinal: 1,
          inningsId: current.inningsId,
          overNumber: 0,
          positionInOver: 2,
          payload: { ballNumber: '0.2' },
          state: 'rejected',
          rejectionCode: 'INVALID_FIELD',
          rejectionDetail: { message: 'Example rejection detail.' },
        },
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 0,
          positionInOver: 0,
          payload: { ballNumber: '0.1' },
          state: 'published',
          publishedEventId: current.deliveryId,
        },
      ]);

      expect(items.map((item) => item.ordinal)).toEqual([0, 1]);
      await expect(
        repository.listBatchItems(created.batchId, { afterOrdinal: 0, limit: 10 }),
      ).resolves.toMatchObject([
        {
          ordinal: 1,
          rejectionCode: 'INVALID_FIELD',
          rejectionDetail: { message: 'Example rejection detail.' },
        },
      ]);

      const firstCheckpoint = await repository.upsertCheckpoint({
        batchId: created.batchId,
        phase: 'validating',
        lastOrdinal: 0,
        leaseOwner: 'worker-1',
        leaseExpiresAt: '2026-08-31T12:00:00.000Z',
        attemptCount: 1,
      });
      expect(firstCheckpoint).toMatchObject({
        phase: 'validating',
        lastOrdinal: 0,
        leaseOwner: 'worker-1',
        attemptCount: 1,
      });

      const updatedCheckpoint = await repository.upsertCheckpoint({
        batchId: created.batchId,
        phase: 'publishing',
        lastOrdinal: 1,
        attemptCount: 2,
      });
      expect(updatedCheckpoint).toMatchObject({
        phase: 'publishing',
        lastOrdinal: 1,
        leaseOwner: null,
        leaseExpiresAt: null,
        attemptCount: 2,
      });
      await expect(repository.findCheckpoint(created.batchId, 'validating')).resolves.toEqual(
        firstCheckpoint,
      );
      await expect(repository.findCheckpoint(created.batchId, 'publishing')).resolves.toEqual(
        updatedCheckpoint,
      );
    });
  });

  test('retains package, resolution, validation, review and publication provenance', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-extended-provenance`,
        packageVersion: '1.0',
      });
      expect(batch.packageVersion).toBe('1.0');

      const [unresolvedItem, resolvedItem] = await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          overNumber: 0,
          positionInOver: 0,
          payload: { source: 'ambiguous' },
          sourceIdentity: 'cricsheet:delivery:ambiguous-0',
          sourceLocation: { file: 'fixtures.json', row: 2, field: 'deliveries[0]' },
          referenceResolutionState: 'ambiguous',
          resolvedReferences: { participantCandidates: ['player:1', 'player:2'] },
        },
        {
          ordinal: 1,
          inningsId: current.inningsId,
          overNumber: 0,
          positionInOver: 1,
          payload: { source: 'resolved' },
          sourceIdentity: 'cricsheet:delivery:resolved-1',
          sourceLocation: { file: 'fixtures.json', row: 3, field: 'deliveries[1]' },
          referenceResolutionState: 'resolved',
          resolvedReferences: { innings: current.inningsId },
        },
      ]);

      expect(unresolvedItem).toMatchObject({
        inningsId: null,
        sourceIdentity: 'cricsheet:delivery:ambiguous-0',
        referenceResolutionState: 'ambiguous',
        sourceLocation: { file: 'fixtures.json', row: 2, field: 'deliveries[0]' },
      });
      expect(resolvedItem).toMatchObject({
        inningsId: current.inningsId,
        referenceResolutionState: 'resolved',
      });

      const validation = {
        batchId: batch.batchId,
        batchItemId: unresolvedItem.batchItemId,
        ruleCode: 'AMBIGUOUS_PARTICIPANT',
        ruleVersion: '1.0',
        severity: 'error' as const,
        filePath: 'fixtures.json',
        rowNumber: 2,
        fieldPath: 'deliveries[0].striker',
        message: 'Participant reference requires review.',
      };
      await repository.recordValidationResult(validation);
      await repository.recordValidationResult(validation);
      await repository.recordReviewDecision({
        batchId: batch.batchId,
        actorId: current.accountId,
        decision: 'rejected',
        reason: 'The participant cannot be resolved safely.',
      });
      await repository.linkPublishedDelivery(resolvedItem.batchItemId, current.deliveryId);

      const provenance = await client.query<{
        decision: string;
        linkedItemId: string;
        resultCount: string;
        ruleCode: string;
      }>(
        `
          SELECT
            (SELECT count(*)::text FROM batch_validation_result WHERE batch_id = $1) AS "resultCount",
            (SELECT rule_code FROM batch_validation_result WHERE batch_id = $1) AS "ruleCode",
            (SELECT decision::text FROM batch_review_decision WHERE batch_id = $1) AS decision,
            (SELECT source_batch_item_id::text FROM delivery WHERE delivery_id = $2) AS "linkedItemId"
        `,
        [batch.batchId, current.deliveryId],
      );
      expect(provenance.rows).toEqual([
        {
          resultCount: '1',
          ruleCode: 'AMBIGUOUS_PARTICIPANT',
          decision: 'rejected',
          linkedItemId: resolvedItem.batchItemId,
        },
      ]);

      await expect(
        repository.insertBatchItems(batch.batchId, [
          {
            ordinal: 2,
            overNumber: 0,
            positionInOver: 2,
            payload: {},
            sourceIdentity: 'cricsheet:delivery:ambiguous-0',
          },
        ]),
      ).rejects.toMatchObject({ code: 'DATABASE_CONFLICT' });
    });
  });

  test.each([
    [
      'batch',
      "INSERT INTO batch (submitter_id, competition_id, idempotency_key, state) VALUES ($1, $2, 'invalid-batch-state', 'unknown')",
      ['accountId', 'competitionId'],
    ],
    [
      'item',
      "INSERT INTO batch_item (batch_id, ordinal, innings_id, over_number, position_in_over, payload, state) VALUES ($1, 0, $2, 0, 0, '{}', 'unknown')",
      ['batchId', 'inningsId'],
    ],
    [
      'checkpoint',
      "INSERT INTO batch_checkpoint (batch_id, phase, last_ordinal) VALUES ($1, 'unknown', 0)",
      ['batchId'],
    ],
  ])('rejects an invalid %s lifecycle state', async (_name, statement, parameterNames) => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-invalid-${_name}`,
      });
      const parameters: Record<string, string> = { ...current, batchId: batch.batchId };

      await expect(
        client.query(
          statement,
          parameterNames.map((name) => parameters[name]),
        ),
      ).rejects.toMatchObject({ code: '22P02' });
    });
  });

  test('enforces one idempotency key per submitter', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const input = {
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-duplicate-idempotency`,
      };

      await repository.createBatch(input);
      await expect(repository.createBatch(input)).rejects.toMatchObject({
        code: 'DATABASE_CONFLICT',
      });
    });
  });

  test('atomically returns the original receipt for a concurrent equivalent key', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const input = {
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-atomic-equivalent-key`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'stored' as const,
      };

      const first = await repository.createOrFindBatchAndQueueValidation(input);
      const replay = await repository.createOrFindBatchAndQueueValidation({
        ...input,
        batchReference: randomUUID(),
      });

      expect(first).toMatchObject({ created: true, activeLimitReached: false });
      expect(replay).toMatchObject({ created: false, activeLimitReached: false });
      expect(replay.batch).toEqual(first.batch);
      const jobs = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM background_job WHERE batch_id = $1::bigint',
        [first.batch?.batchId],
      );
      expect(jobs.rows[0]).toEqual({ count: '1' });
    });
  });

  test('publishes only the accepted subset of a mixed batch and makes replay a no-op', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const source = await client.query<{
        strikerId: string;
        nonStrikerId: string;
        bowlerId: string;
      }>(
        `SELECT striker_id::text AS "strikerId", non_striker_id::text AS "nonStrikerId",
                bowler_id::text AS "bowlerId" FROM delivery WHERE delivery_id=$1::bigint`,
        [current.deliveryId],
      );
      const players = source.rows[0]!;
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-publication-replay`,
        source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
        state: 'awaiting_review',
      });
      const items = await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 0,
          positionInOver: 1,
          sourceIdentity: 'test:delivery:publication-replay',
          referenceResolutionState: 'resolved',
          state: 'accepted',
          payload: {
            sequenceNumber: 2,
            ballNumber: '0.2',
            strikerId: players.strikerId,
            nonStrikerId: players.nonStrikerId,
            bowlerId: players.bowlerId,
            runs: { offBat: 1, extras: 0, total: 1, nonBoundary: false },
            extras: {},
          },
        },
        {
          ordinal: 1,
          inningsId: current.inningsId,
          overNumber: 0,
          positionInOver: 2,
          sourceIdentity: 'test:delivery:publication-rejected',
          referenceResolutionState: 'resolved',
          state: 'rejected',
          rejectionCode: 'CRICKET_BUSINESS_RULE_FAILED',
          payload: {},
        },
      ]);
      await repository.recordValidationResult({
        batchId: batch.batchId,
        batchItemId: items[1]!.batchItemId,
        sourceOrdinal: 1,
        ruleCode: 'CRICKET_BUSINESS_RULE_FAILED',
        ruleVersion: '1.0',
        severity: 'error',
        message: 'The rejected event failed a deterministic cricket rule.',
      });

      await expect(repository.countBlockingValidationErrors(batch.batchId)).resolves.toBe(0);

      const staged = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM delivery
         WHERE innings_id=$1::bigint AND over_number=0 AND position_in_over=1`,
        [current.inningsId],
      );
      expect(staged.rows[0]).toEqual({ count: '0' });
      await expect(
        repository.publishAcceptedItems(batch.batchId, 'worker-before-review'),
      ).rejects.toThrow('Only an approved batch awaiting publication may be published.');

      await expect(
        repository.applyReviewDecision({
          batchId: batch.batchId,
          actorId: current.accountId,
          decision: 'approved',
          reason: 'Validated source and resolved references.',
        }),
      ).resolves.toMatchObject({
        resumePublication: true,
        review: {
          decision: 'approved',
          actorId: current.accountId,
          reason: 'Validated source and resolved references.',
        },
      });

      await expect(repository.publishAcceptedItems(batch.batchId, 'worker-a')).resolves.toEqual({
        published: 1,
        duplicateSkipped: 0,
        conflicts: 0,
      });
      await expect(repository.publishAcceptedItems(batch.batchId, 'worker-b')).resolves.toEqual({
        published: 0,
        duplicateSkipped: 0,
        conflicts: 0,
      });
      const published = await client.query<{ count: string; state: string }>(
        `SELECT count(*)::text AS count, (SELECT state::text FROM batch WHERE batch_id=$1)::text AS state
         FROM delivery WHERE innings_id=$2::bigint AND over_number=0 AND position_in_over=1
         GROUP BY (SELECT state FROM batch WHERE batch_id=$1)`,
        [batch.batchId, current.inningsId],
      );
      expect(published.rows).toEqual([{ count: '1', state: 'published' }]);
      const finalItems = await repository.listBatchItems(batch.batchId, { limit: 10 });
      expect(finalItems).toEqual([
        expect.objectContaining({ state: 'published', publishedEventId: expect.any(String) }),
        expect.objectContaining({
          state: 'rejected',
          rejectionCode: 'CRICKET_BUSINESS_RULE_FAILED',
          publishedEventId: null,
        }),
      ]);
      await expect(repository.listBatchRuleGroups(batch.batchId)).resolves.toEqual([
        { ruleCode: 'CRICKET_BUSINESS_RULE_FAILED', count: 1 },
      ]);
      const decisions = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM batch_review_decision WHERE batch_id=$1::bigint',
        [batch.batchId],
      );
      expect(decisions.rows[0]).toEqual({ count: '1' });
    });
  });
  test('checks existing published deliveries once per chunk rather than once per accepted item', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();

      const source = await client.query<{
        strikerId: string;
        nonStrikerId: string;
        bowlerId: string;
      }>(
        `SELECT
         striker_id::text AS "strikerId",
         non_striker_id::text AS "nonStrikerId",
         bowler_id::text AS "bowlerId"
       FROM delivery
       WHERE delivery_id=$1::bigint`,
        [current.deliveryId],
      );

      const players = source.rows[0]!;
      const { executor, statements } = countingExecutor(client);
      const repository = createBatchRepository(executor);

      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-publication-query-bound`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'awaiting_review',
      });

      await repository.insertBatchItems(
        batch.batchId,
        [0, 1, 2].map((ordinal) => ({
          ordinal,
          inningsId: current.inningsId,
          overNumber: 99,
          positionInOver: ordinal + 1,
          sourceIdentity: `test:delivery:query-bound:${ordinal}`,
          referenceResolutionState: 'resolved' as const,
          state: 'accepted' as const,
          payload: {
            sequenceNumber: 10_000 + ordinal,
            ballNumber: `99.${ordinal + 1}`,
            strikerId: players.strikerId,
            nonStrikerId: players.nonStrikerId,
            bowlerId: players.bowlerId,
            runs: {
              offBat: 1,
              extras: 0,
              total: 1,
              nonBoundary: false,
            },
            extras: {},
          },
        })),
      );

      await repository.applyReviewDecision({
        batchId: batch.batchId,
        actorId: current.accountId,
        decision: 'approved',
        reason: 'Performance regression coverage.',
      });

      statements.length = 0;

      await repository.publishAcceptedItems(batch.batchId, 'worker-query-bound');

      const publishedLookupStatements = statements.filter(
        (statement) =>
          statement.includes('jsonb_to_recordset($1::jsonb)') &&
          statement.includes('matched_ids AS') &&
          statement.includes('JOIN delivery_current d'),
      );

      expect(publishedLookupStatements).toHaveLength(1);
    });
  });
  test('publishes an approved batch correction as one immutable, retry-safe revision', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const players = (
        await client.query<{
          strikerId: string;
          nonStrikerId: string;
          bowlerId: string;
        }>(
          `SELECT striker_id::text AS "strikerId",
                  non_striker_id::text AS "nonStrikerId",
                  bowler_id::text AS "bowlerId"
           FROM delivery WHERE delivery_id=$1::bigint`,
          [current.deliveryId],
        )
      ).rows[0]!;
      const sourceIdentity = 'cricsheet:delivery:batch-correction-target';
      const basePayload = {
        eventId: randomUUID(),
        sequenceNumber: 700001,
        ballNumber: '125.1',
        strikerId: players.strikerId,
        nonStrikerId: players.nonStrikerId,
        bowlerId: players.bowlerId,
        runs: { offBat: 1, extras: 0, total: 1, nonBoundary: false },
        extras: {},
        wickets: [],
      };
      const original = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-correction-original`,
        source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
        state: 'publishing',
      });
      const [originalItem] = await repository.insertBatchItems(original.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 125,
          positionInOver: 0,
          sourceIdentity,
          state: 'accepted',
          payload: basePayload,
        },
      ]);
      await expect(
        repository.publishAcceptedItems(original.batchId, 'worker-original'),
      ).resolves.toMatchObject({
        published: 1,
      });
      const originalDeliveryId = (
        await repository.listBatchItems(original.batchId, { limit: 1 })
      )[0]!.publishedEventId!;

      const correction = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-correction-replacement`,
        source: { checksum: 'b'.repeat(64), uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
        state: 'awaiting_review',
      });
      await repository.insertBatchItems(correction.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 125,
          positionInOver: 0,
          sourceIdentity: 'cricsheet:delivery:batch-correction-replacement',
          operation: 'correction',
          correctsSourceIdentity: sourceIdentity,
          correctionTargetDeliveryId: originalDeliveryId,
          state: 'accepted',
          payload: {
            ...basePayload,
            eventId: randomUUID(),
            runs: { offBat: 4, extras: 0, total: 4, nonBoundary: false },
          },
        },
      ]);
      await repository.applyReviewDecision({
        batchId: correction.batchId,
        actorId: current.accountId,
        decision: 'approved',
        reason: 'Verified the corrected score against the source.',
      });

      await expect(
        repository.publishAcceptedItems(correction.batchId, 'worker-correction'),
      ).resolves.toEqual({
        published: 1,
        duplicateSkipped: 0,
        conflicts: 0,
      });
      await expect(
        repository.publishAcceptedItems(correction.batchId, 'worker-retry'),
      ).resolves.toEqual({
        published: 0,
        duplicateSkipped: 0,
        conflicts: 0,
      });

      const revisions = await client.query<{
        deliveryId: string;
        revision: number;
        offBat: number;
        supersededAt: Date | null;
        supersedesDeliveryId: string | null;
      }>(
        `SELECT delivery_id::text AS "deliveryId", revision,
                runs_off_bat AS "offBat", superseded_at AS "supersededAt",
                supersedes_delivery_id::text AS "supersedesDeliveryId"
         FROM delivery WHERE source_event_id=(
           SELECT source_event_id FROM delivery WHERE delivery_id=$1::bigint
         ) ORDER BY revision`,
        [originalDeliveryId],
      );
      expect(revisions.rows).toEqual([
        expect.objectContaining({
          deliveryId: originalDeliveryId,
          revision: 1,
          offBat: 1,
          supersededAt: expect.any(Date),
          supersedesDeliveryId: null,
        }),
        expect.objectContaining({
          revision: 2,
          offBat: 4,
          supersededAt: null,
          supersedesDeliveryId: originalDeliveryId,
        }),
      ]);
      const audit = await client.query<{
        count: string;
        requesterId: string;
        reviewerId: string;
        originalBatchItemId: string;
      }>(
        `SELECT count(*)::text AS count,
                min(requester_id)::text AS "requesterId",
                min(reviewer_id)::text AS "reviewerId",
                min(original_batch_item_id)::text AS "originalBatchItemId"
         FROM delivery_correction_history
         WHERE previous_delivery_id=$1::bigint`,
        [originalDeliveryId],
      );
      expect(audit.rows[0]).toEqual({
        count: '1',
        requesterId: current.accountId,
        reviewerId: current.accountId,
        originalBatchItemId: originalItem!.batchItemId,
      });
      const currentAndDependencies = await client.query<{
        currentOffBat: number;
        dependencyCount: string;
      }>(
        `SELECT current.runs_off_bat AS "currentOffBat",
                (SELECT count(*)::text
                 FROM statistics_refresh_dependency dependency
                 WHERE dependency.source_event_id=current.source_event_id
                   AND dependency.delivery_revision=current.revision) AS "dependencyCount"
         FROM delivery current
         WHERE current.delivery_id=$1::bigint`,
        [revisions.rows[1]!.deliveryId],
      );
      expect(currentAndDependencies.rows[0]).toEqual({
        currentOffBat: 4,
        dependencyCount: '7',
      });
      const publishedItem = await repository.listBatchItems(correction.batchId, { limit: 1 });
      expect(publishedItem[0]).toMatchObject({
        state: 'published',
        operation: 'correction',
        correctsSourceIdentity: sourceIdentity,
        correctionTargetDeliveryId: originalDeliveryId,
        publishedEventId: revisions.rows[1]!.deliveryId,
      });
    });
  });

  /**
   * Issue #529. The reported failure was a reviewer resolving a conflict with a
   * delivery published before immutable lineage existed: an accepted submission,
   * no source_event_id and no submission_event_ordinal, differing from the staged
   * item only in its display ball number, as delivery 2342246 does. Nothing here
   * mocks the repository, so the lineage function, the revision triggers and the
   * refreshed delivery_current view all run as they do in a migrated database.
   */
  async function deliveryRow(client: PoolClient, deliveryId: string) {
    const result = await client.query<{ row: Record<string, unknown> }>(
      `SELECT to_jsonb(delivery) AS row FROM delivery WHERE delivery_id=$1::bigint`,
      [deliveryId],
    );
    return result.rows[0]!.row;
  }

  function withoutKeys(row: Record<string, unknown>, keys: string[]) {
    return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
  }

  async function seedLegacyPublishedConflict(client: PoolClient, key: string) {
    const current = testRecords();
    const repository = createBatchRepository(client);
    const players = (
      await client.query<{ strikerId: string; nonStrikerId: string; bowlerId: string }>(
        `SELECT striker_id::text AS "strikerId",
                non_striker_id::text AS "nonStrikerId",
                bowler_id::text AS "bowlerId"
         FROM delivery WHERE delivery_id=$1::bigint`,
        [current.deliveryId],
      )
    ).rows[0]!;
    const legacyDeliveryId = (
      await client.query<{ deliveryId: string }>(
        `INSERT INTO delivery (
           innings_id, over_number, position_in_over, innings_sequence, ball_number,
           striker_id, non_striker_id, bowler_id, runs_off_bat, runs_extras, runs_total,
           submission_id
         ) VALUES ($1::bigint, 126, 1, 760001, '126.1', $2::bigint, $3::bigint, $4::bigint,
                   1, 0, 1, $5::bigint)
         RETURNING delivery_id::text AS "deliveryId"`,
        [
          current.inningsId,
          players.strikerId,
          players.nonStrikerId,
          players.bowlerId,
          current.submissionId,
        ],
      )
    ).rows[0]!.deliveryId;
    const legacyBefore = await deliveryRow(client, legacyDeliveryId);
    expect(legacyBefore).toMatchObject({ source_event_id: null, submission_event_ordinal: null });

    const batch = await repository.createBatch({
      batchReference: randomUUID(),
      submitterId: current.accountId,
      competitionId: current.competitionId,
      idempotencyKey: `${sourcePrefix}-529-${key}`,
      source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
      state: 'awaiting_review',
    });
    const [item] = await repository.insertBatchItems(batch.batchId, [
      {
        ordinal: 0,
        inningsId: current.inningsId,
        overNumber: 126,
        positionInOver: 1,
        sourceIdentity: 'cricsheet:delivery:fixture-0-innings-0-delivery-32',
        referenceResolutionState: 'resolved',
        state: 'rejected',
        rejectionCode: 'PUBLISHED_DELIVERY_CONFLICT',
        rejectionDetail: {
          existingDeliveryId: legacyDeliveryId,
          differences: [
            { fieldPath: 'ballNumber', submittedValue: '126.2', publishedValue: '126.1' },
          ],
        },
        payload: {
          eventId: randomUUID(),
          sequenceNumber: 32,
          ballNumber: '126.2',
          strikerId: players.strikerId,
          nonStrikerId: players.nonStrikerId,
          bowlerId: players.bowlerId,
          runs: { offBat: 1, extras: 0, total: 1, nonBoundary: false },
          extras: {},
          wickets: [],
        },
      },
    ]);
    // The same active blocking result the publication path records for a conflict.
    await client.query(
      `INSERT INTO batch_validation_result (
         batch_id, batch_item_id, source_ordinal, rule_code, rule_version, severity, field_path, message
       ) VALUES ($1::bigint, $2::bigint, 0, 'PUBLISHED_DELIVERY_CONFLICT', '1.0', 'error', 'delivery',
                 'A published delivery or published source identity exists with different cricket content.')`,
      [batch.batchId, item!.batchItemId],
    );
    return { current, repository, batch, legacyDeliveryId, legacyBefore };
  }

  async function revisionsAtLegacyPosition(client: PoolClient) {
    return (
      await client.query<{
        deliveryId: string;
        revision: number;
        ballNumber: string;
        superseded: boolean;
        supersedesDeliveryId: string | null;
      }>(
        `SELECT delivery_id::text AS "deliveryId", revision, ball_number AS "ballNumber",
                superseded_at IS NOT NULL AS superseded,
                supersedes_delivery_id::text AS "supersedesDeliveryId"
         FROM delivery
         WHERE innings_id=$1::bigint AND over_number=126 AND position_in_over=1
         ORDER BY revision`,
        [testRecords().inningsId],
      )
    ).rows;
  }

  test('resolves a legacy published conflict with use_existing without touching the delivery', async () => {
    await withRolledBackTransaction(async (client) => {
      const { current, repository, batch, legacyDeliveryId, legacyBefore } =
        await seedLegacyPublishedConflict(client, 'use-existing');

      await expect(
        repository.resolvePublishedConflict({
          batchId: batch.batchId,
          actorId: current.accountId,
          itemOrdinal: 0,
          existingDeliveryId: legacyDeliveryId,
          decision: 'use_existing',
          reason: 'The published delivery is the verified record.',
        }),
      ).resolves.toMatchObject({
        state: 'duplicate_skipped',
        rejectionCode: null,
        publishedEventId: legacyDeliveryId,
        operation: 'upsert',
      });
      // use_existing must not initialise lineage or modify the published row at all.
      expect(await deliveryRow(client, legacyDeliveryId)).toEqual(legacyBefore);

      await repository.applyReviewDecision({
        batchId: batch.batchId,
        actorId: current.accountId,
        decision: 'approved',
        reason: 'Kept the verified published delivery.',
      });
      await expect(
        repository.publishAcceptedItems(batch.batchId, 'worker-529-use-existing'),
      ).resolves.toMatchObject({ published: 0, conflicts: 0 });

      expect(await deliveryRow(client, legacyDeliveryId)).toEqual(legacyBefore);
      expect(await revisionsAtLegacyPosition(client)).toEqual([
        {
          deliveryId: legacyDeliveryId,
          revision: 1,
          ballNumber: '126.1',
          superseded: false,
          supersedesDeliveryId: null,
        },
      ]);
      const audit = await client.query<{ history: string; decisions: string[] }>(
        `SELECT
           (SELECT count(*)::text FROM delivery_correction_history
            WHERE previous_delivery_id=$1::bigint) AS history,
           ARRAY(SELECT decision::text FROM batch_published_conflict_resolution
                 WHERE batch_id=$2::bigint) AS decisions`,
        [legacyDeliveryId, batch.batchId],
      );
      expect(audit.rows[0]).toEqual({ history: '0', decisions: ['use_existing'] });
    });
  });

  test('resolves a legacy published conflict with replace_published as a new revision', async () => {
    await withRolledBackTransaction(async (client) => {
      const { current, repository, batch, legacyDeliveryId, legacyBefore } =
        await seedLegacyPublishedConflict(client, 'replace-published');

      await expect(
        repository.resolvePublishedConflict({
          batchId: batch.batchId,
          actorId: current.accountId,
          itemOrdinal: 0,
          existingDeliveryId: legacyDeliveryId,
          decision: 'replace_published',
          reason: 'The submitted scorecard corrects the published delivery.',
        }),
      ).resolves.toMatchObject({
        state: 'accepted',
        rejectionCode: null,
        operation: 'correction',
        correctionTargetDeliveryId: legacyDeliveryId,
      });

      // Lazy lineage may initialise exactly the two provenance fields, once.
      const lineageFields = ['source_event_id', 'submission_event_ordinal'];
      const afterResolution = await deliveryRow(client, legacyDeliveryId);
      expect(afterResolution.source_event_id).toEqual(expect.any(String));
      expect(afterResolution.submission_event_ordinal).toEqual(expect.any(Number));
      expect(withoutKeys(afterResolution, lineageFields)).toEqual(
        withoutKeys(legacyBefore, lineageFields),
      );

      await repository.applyReviewDecision({
        batchId: batch.batchId,
        actorId: current.accountId,
        decision: 'approved',
        reason: 'Approved the verified correction.',
      });
      await expect(
        repository.publishAcceptedItems(batch.batchId, 'worker-529-replace-published'),
      ).resolves.toMatchObject({ published: 1, conflicts: 0 });

      const revisions = await revisionsAtLegacyPosition(client);
      expect(revisions).toEqual([
        {
          deliveryId: legacyDeliveryId,
          revision: 1,
          ballNumber: '126.1',
          superseded: true,
          supersedesDeliveryId: null,
        },
        {
          deliveryId: expect.any(String),
          revision: 2,
          ballNumber: '126.2',
          superseded: false,
          supersedesDeliveryId: legacyDeliveryId,
        },
      ]);
      // The published revision was superseded, never overwritten.
      const supersessionFields = [...lineageFields, 'superseded_at', 'superseded_by'];
      expect(withoutKeys(await deliveryRow(client, legacyDeliveryId), supersessionFields)).toEqual(
        withoutKeys(legacyBefore, supersessionFields),
      );
      const audit = await client.query<{ history: string; decisions: string[] }>(
        `SELECT
           (SELECT count(*)::text FROM delivery_correction_history
            WHERE previous_delivery_id=$1::bigint AND replacement_delivery_id=$2::bigint) AS history,
           ARRAY(SELECT decision::text FROM batch_published_conflict_resolution
                 WHERE batch_id=$3::bigint) AS decisions`,
        [legacyDeliveryId, revisions[1]!.deliveryId, batch.batchId],
      );
      expect(audit.rows[0]).toEqual({ history: '1', decisions: ['replace_published'] });
    });
  });

  test('exposes every delivery column through delivery_current', async () => {
    // #529: delivery_current was created with SELECT * before the lineage columns
    // existed, so it lacked source_event_id until 20260913170000000 refreshed it.
    // A view that silently drops a column fails here rather than as a 500 in review.
    const result = await executeQuery<{ tableColumns: string[]; viewColumns: string[] }>(
      databasePool(),
      `SELECT
         ARRAY(SELECT column_name::text FROM information_schema.columns
               WHERE table_schema=current_schema() AND table_name='delivery'
               ORDER BY ordinal_position) AS "tableColumns",
         ARRAY(SELECT column_name::text FROM information_schema.columns
               WHERE table_schema=current_schema() AND table_name='delivery_current'
               ORDER BY ordinal_position) AS "viewColumns"`,
    );
    expect(result.rows[0]!.viewColumns).toEqual(result.rows[0]!.tableColumns);
  });

  test('blocks approval for unresolved items without persisting a decision', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-unresolved-review`,
        state: 'awaiting_review',
      });
      await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          overNumber: 0,
          positionInOver: 1,
          payload: {},
          referenceResolutionState: 'ambiguous',
          state: 'rejected',
        },
      ]);

      await expect(
        repository.applyReviewDecision({
          batchId: batch.batchId,
          actorId: current.accountId,
          decision: 'approved',
          reason: 'Unsafe approval attempt.',
        }),
      ).rejects.toBeInstanceOf(BatchReviewResolutionError);
      await expect(repository.findBatchById(batch.batchId)).resolves.toMatchObject({
        state: 'awaiting_review',
      });
      await expect(repository.getLatestReviewDecision(batch.batchId)).resolves.toBeNull();
    });
  });

  test.each(['active validation error', 'published-delivery conflict'])(
    'blocks approval for an %s without persisting a decision',
    async (blocker) => {
      await withRolledBackTransaction(async (client) => {
        const current = testRecords();
        const repository = createBatchRepository(client);
        const batch = await repository.createBatch({
          batchReference: randomUUID(),
          submitterId: current.accountId,
          competitionId: current.competitionId,
          idempotencyKey: `${sourcePrefix}-blocked-review-${blocker}`,
          state: 'awaiting_review',
        });
        const [item] = await repository.insertBatchItems(batch.batchId, [
          {
            ordinal: 0,
            inningsId: current.inningsId,
            overNumber: 0,
            positionInOver: 1,
            payload: {},
            referenceResolutionState: 'resolved',
            state: blocker === 'active validation error' ? 'accepted' : 'rejected',
            rejectionCode:
              blocker === 'published-delivery conflict' ? 'PUBLISHED_DELIVERY_CONFLICT' : null,
          },
        ]);
        if (blocker === 'active validation error') {
          await repository.recordValidationResult({
            batchId: batch.batchId,
            batchItemId: item.batchItemId,
            ruleCode: 'EVENT_SCHEMA_INVALID',
            ruleVersion: '1.0',
            severity: 'error',
            message: 'Runs total is inconsistent.',
          });
        }

        await expect(
          repository.applyReviewDecision({
            batchId: batch.batchId,
            actorId: current.accountId,
            decision: 'approved',
            reason: 'Unsafe approval attempt.',
          }),
        ).rejects.toBeInstanceOf(BatchReviewResolutionError);
        await expect(repository.getLatestReviewDecision(batch.batchId)).resolves.toBeNull();
      });
    },
  );

  test('links a changed-content resubmission to its returned batch and preserves the correction chain', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const original = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-correction-original`,
        state: 'awaiting_review',
      });
      await repository.applyReviewDecision({
        batchId: original.batchId,
        actorId: current.accountId,
        decision: 'returned_for_correction',
        reason: 'Correct the submitted season package.',
      });

      const firstInput = {
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-correction-replacement-1`,
        packageVersion: '1.0',
        source: { checksum: 'b'.repeat(64), uri: 'stored-object:replacement-1', sizeBytes: 20 },
        state: 'stored' as const,
        replacesBatchReference: original.batchReference,
      };
      const first = await repository.createOrFindBatchAndQueueValidation(firstInput);
      expect(first).toMatchObject({ created: true, activeLimitReached: false });
      expect(first.batch).not.toBeNull();
      await expect(repository.findBatchById(original.batchId)).resolves.toMatchObject({
        state: 'superseded',
        supersededBy: first.batch!.batchId,
      });
      await expect(repository.getBatchLineage(original.batchId)).resolves.toEqual({
        replacesBatchReference: null,
        supersededByBatchReference: first.batch!.batchReference,
      });
      await expect(repository.getBatchLineage(first.batch!.batchId)).resolves.toEqual({
        replacesBatchReference: original.batchReference,
        supersededByBatchReference: null,
      });
      const transition = await client.query<{ fromState: string; toState: string; reason: string }>(
        `SELECT from_state::text AS "fromState", to_state::text AS "toState", reason
         FROM batch_state_transition
         WHERE batch_id = $1::bigint AND to_state = 'superseded'`,
        [original.batchId],
      );
      expect(transition.rows).toEqual([
        {
          fromState: 'correction_requested',
          toState: 'superseded',
          reason: `Corrected replacement batch ${first.batch!.batchReference} submitted.`,
        },
      ]);

      await expect(
        repository.createOrFindBatchAndQueueValidation({
          ...firstInput,
          batchReference: randomUUID(),
        }),
      ).resolves.toMatchObject({
        batch: { batchReference: first.batch!.batchReference },
        created: false,
        activeLimitReached: false,
      });

      await executeQuery(client, `UPDATE batch SET state = 'awaiting_review' WHERE batch_id = $1`, [
        first.batch!.batchId,
      ]);
      await repository.applyReviewDecision({
        batchId: first.batch!.batchId,
        actorId: current.accountId,
        decision: 'returned_for_correction',
        reason: 'A second correction is required.',
      });
      const second = await repository.createOrFindBatchAndQueueValidation({
        ...firstInput,
        batchReference: randomUUID(),
        idempotencyKey: `${sourcePrefix}-correction-replacement-2`,
        source: { checksum: 'c'.repeat(64), uri: 'stored-object:replacement-2', sizeBytes: 21 },
        replacesBatchReference: first.batch!.batchReference,
      });
      expect(second.batch).not.toBeNull();
      await expect(repository.getBatchLineage(first.batch!.batchId)).resolves.toEqual({
        replacesBatchReference: original.batchReference,
        supersededByBatchReference: second.batch!.batchReference,
      });
      await expect(repository.getBatchLineage(second.batch!.batchId)).resolves.toEqual({
        replacesBatchReference: first.batch!.batchReference,
        supersededByBatchReference: null,
      });

      await expect(
        repository.createOrFindBatchAndQueueValidation({
          ...firstInput,
          batchReference: randomUUID(),
          idempotencyKey: `${sourcePrefix}-competing-replacement`,
          source: { checksum: 'd'.repeat(64), uri: 'stored-object:competing', sizeBytes: 22 },
        }),
      ).rejects.toBeInstanceOf(BatchReplacementConflictError);
    });
  });

  test.each([
    ['rejected', 'rejected'],
    ['returned_for_correction', 'correction_requested'],
  ] as const)(
    'persists %s decisions without publishing canonical data',
    async (decision, state) => {
      await withRolledBackTransaction(async (client) => {
        const current = testRecords();
        const repository = createBatchRepository(client);
        const batch = await repository.createBatch({
          batchReference: randomUUID(),
          submitterId: current.accountId,
          competitionId: current.competitionId,
          idempotencyKey: `${sourcePrefix}-${decision}`,
          state: 'awaiting_review',
        });
        const before = await client.query<{ count: string }>(
          'SELECT count(*)::text AS count FROM delivery WHERE source_batch_item_id IS NOT NULL',
        );
        await repository.applyReviewDecision({
          batchId: batch.batchId,
          actorId: current.accountId,
          decision,
          reason: 'Reviewer disposition.',
        });
        await expect(repository.findBatchById(batch.batchId)).resolves.toMatchObject({ state });
        await expect(repository.getLatestReviewDecision(batch.batchId)).resolves.toMatchObject({
          decision,
          actorId: current.accountId,
          reason: 'Reviewer disposition.',
          decidedAt: expect.any(String),
        });
        const after = await client.query<{ count: string }>(
          'SELECT count(*)::text AS count FROM delivery WHERE source_batch_item_id IS NOT NULL',
        );
        expect(after.rows[0]).toEqual(before.rows[0]);
      });
    },
  );

  test('queues one durable publication job and outbox command when approval is recorded', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);

      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-queued-publication`,
        state: 'awaiting_review',
      });

      const input = {
        batchId: batch.batchId,
        actorId: current.accountId,
        decision: 'approved' as const,
        reason: 'Ready for durable background publication.',
      };

      await repository.applyReviewDecision(input);

      const jobs = await client.query<{
        jobId: string;
        state: string;
        jobType: string;
        batchId: string;
      }>(
        `SELECT
         job_id::text AS "jobId",
         state::text AS state,
         job_type AS "jobType",
         batch_id::text AS "batchId"
       FROM background_job
       WHERE batch_id=$1::bigint
         AND job_type='batch.publish'`,
        [batch.batchId],
      );

      expect(jobs.rows).toHaveLength(1);
      expect(jobs.rows[0]).toMatchObject({
        state: 'queued',
        jobType: 'batch.publish',
        batchId: batch.batchId,
      });

      const outbox = await client.query<{
        messageType: string;
        contractVersion: number;
        body: {
          type: string;
          version: number;
          jobId: string;
          batchId: string;
        };
        publishedAt: Date | null;
      }>(
        `SELECT
         message_type AS "messageType",
         contract_version AS "contractVersion",
         body,
         published_at AS "publishedAt"
       FROM outbox_message
       WHERE job_id=$1::uuid`,
        [jobs.rows[0]!.jobId],
      );

      expect(outbox.rows).toHaveLength(1);
      expect(outbox.rows[0]).toMatchObject({
        messageType: 'batch.publish',
        contractVersion: 1,
        publishedAt: null,
        body: {
          type: 'batch.publish',
          version: 1,
          jobId: jobs.rows[0]!.jobId,
          batchId: batch.batchId,
        },
      });

      // A retry of the same approval must not queue a second publication.
      await repository.applyReviewDecision(input);

      const replay = await client.query<{ jobs: string; messages: string }>(
        `SELECT
         (
           SELECT count(*)::text
           FROM background_job
           WHERE batch_id=$1::bigint
             AND job_type='batch.publish'
         ) AS jobs,
         (
           SELECT count(*)::text
           FROM outbox_message o
           JOIN background_job j ON j.job_id=o.job_id
           WHERE j.batch_id=$1::bigint
             AND j.job_type='batch.publish'
         ) AS messages`,
        [batch.batchId],
      );

      expect(replay.rows[0]).toEqual({
        jobs: '1',
        messages: '1',
      });
    });
  });

  test('distinguishes exact published duplicates from conflicting published content', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);

      const source = await client.query<{
        strikerId: string;
        nonStrikerId: string;
        bowlerId: string;
      }>(
        `
          SELECT
            striker_id::text AS "strikerId",
            non_striker_id::text AS "nonStrikerId",
            bowler_id::text AS "bowlerId"
          FROM delivery
          WHERE delivery_id=$1::bigint
        `,
        [current.deliveryId],
      );

      const players = source.rows[0]!;

      const basePayload = {
        sequenceNumber: 900001,
        ballNumber: '123.1',
        strikerId: players.strikerId,
        nonStrikerId: players.nonStrikerId,
        bowlerId: players.bowlerId,
        runs: {
          offBat: 1,
          extras: 0,
          total: 1,
          nonBoundary: false,
        },
        extras: {},
        wickets: [],
      };

      const first = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-published-comparison-first`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'publishing',
      });
      await repository.insertBatchItems(first.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 123,
          positionInOver: 0,
          sourceIdentity: 'test:published-comparison:source',
          state: 'accepted',
          payload: basePayload,
        },
      ]);

      await expect(
        repository.publishAcceptedItems(first.batchId, 'worker-first'),
      ).resolves.toMatchObject({
        published: 1,
        duplicateSkipped: 0,
        conflicts: 0,
      });

      const exact = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-published-comparison-exact`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'publishing',
      });

      await repository.insertBatchItems(exact.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 123,
          positionInOver: 0,
          sourceIdentity: 'test:published-comparison:retry',
          state: 'accepted',
          payload: basePayload,
        },
      ]);

      await expect(
        repository.publishAcceptedItems(exact.batchId, 'worker-exact'),
      ).resolves.toMatchObject({
        published: 0,
        duplicateSkipped: 1,
        conflicts: 0,
      });

      const exactResult = await client.query<{
        code: string;
        severity: string;
      }>(
        `
          SELECT
            rule_code AS code,
            severity::text AS severity
          FROM batch_validation_result
          WHERE batch_id=$1::bigint
        `,
        [exact.batchId],
      );

      expect(exactResult.rows).toEqual([
        {
          code: 'EXACT_PUBLISHED_DUPLICATE',
          severity: 'warning',
        },
      ]);

      const conflict = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-published-comparison-conflict`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'publishing',
      });

      await repository.insertBatchItems(conflict.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 123,
          positionInOver: 0,
          sourceIdentity: 'test:published-comparison:conflict',
          state: 'accepted',
          payload: {
            ...basePayload,
            runs: {
              ...basePayload.runs,
              nonBoundary: true,
            },
          },
        },
      ]);

      await expect(
        repository.publishAcceptedItems(conflict.batchId, 'worker-conflict'),
      ).resolves.toMatchObject({
        published: 0,
        duplicateSkipped: 0,
        conflicts: 1,
      });

      const conflictResult = await client.query<{
        state: string;
        rejectionCode: string | null;
        ruleCode: string;
        severity: string;
      }>(
        `
            SELECT
              bi.state::text AS state,
              bi.rejection_code AS "rejectionCode",
              vr.rule_code AS "ruleCode",
              vr.severity::text AS severity
            FROM batch_item bi
            JOIN batch_validation_result vr
              ON vr.batch_item_id =
                 bi.batch_item_id
            WHERE bi.batch_id=$1::bigint
          `,
        [conflict.batchId],
      );

      expect(conflictResult.rows).toEqual([
        {
          state: 'rejected',
          rejectionCode: 'PUBLISHED_DELIVERY_CONFLICT',
          ruleCode: 'PUBLISHED_DELIVERY_CONFLICT',
          severity: 'error',
        },
      ]);

      const reusedSource = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-published-comparison-source-conflict`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'publishing',
      });

      await repository.insertBatchItems(reusedSource.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 124,
          positionInOver: 0,
          sourceIdentity: 'test:published-comparison:source',
          state: 'accepted',
          payload: {
            ...basePayload,
            sequenceNumber: 900002,
            ballNumber: '124.1',
          },
        },
      ]);

      await expect(
        repository.publishAcceptedItems(reusedSource.batchId, 'worker-source-conflict'),
      ).resolves.toMatchObject({
        published: 0,
        duplicateSkipped: 0,
        conflicts: 1,
      });
    });
  });

  // Issue #486: the worker persists an EXACT_PUBLISHED_DUPLICATE row (with
  // real file_path/row_number from the item's source location) during
  // validation. Publication re-detects the same duplicate and used to insert
  // a second active row because that insert never populated file_path/
  // row_number, so the two rows had different deterministic keys.
  test('does not persist a second active row when publication re-detects a duplicate already recorded during validation', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);

      const first = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-issue-486-baseline`,
        source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
        state: 'publishing',
      });

      const basePayload = {
        sequenceNumber: 900101,
        ballNumber: '210.1',
        strikerId: current.accountId,
        nonStrikerId: current.accountId,
        bowlerId: current.accountId,
        runs: { offBat: 1, extras: 0, total: 1, nonBoundary: false },
        extras: {},
        wickets: [],
      };

      // Reuse the striker/non-striker/bowler ids from the fixture already
      // published in this suite so the delivery comparison logic runs
      // against real participant rows.
      const players = await client.query<{
        strikerId: string;
        nonStrikerId: string;
        bowlerId: string;
      }>(
        `
          SELECT
            striker_id::text AS "strikerId",
            non_striker_id::text AS "nonStrikerId",
            bowler_id::text AS "bowlerId"
          FROM delivery
          WHERE delivery_id=$1::bigint
        `,
        [current.deliveryId],
      );
      const { strikerId, nonStrikerId, bowlerId } = players.rows[0]!;
      const payload = { ...basePayload, strikerId, nonStrikerId, bowlerId };

      await repository.insertBatchItems(first.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 210,
          positionInOver: 0,
          sourceIdentity: 'test:issue-486:baseline',
          state: 'accepted',
          payload,
        },
      ]);

      await expect(
        repository.publishAcceptedItems(first.batchId, 'worker-issue-486-baseline'),
      ).resolves.toMatchObject({ published: 1, duplicateSkipped: 0, conflicts: 0 });

      const duplicateBatch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-issue-486-duplicate`,
        source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
        state: 'publishing',
      });

      const inserted = await repository.insertBatchItems(duplicateBatch.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 210,
          positionInOver: 0,
          sourceIdentity: 'test:issue-486:duplicate',
          state: 'accepted',
          payload,
        },
      ]);
      const batchItemId = inserted[0]!.batchItemId;

      // Simulate the worker's validation-time write for this item (see
      // batch-validation-job.ts insertValidationResults), which populates
      // file_path/row_number from the item's source location.
      await client.query(
        `
          INSERT INTO batch_validation_result (
            batch_id, batch_item_id, source_ordinal, rule_code, rule_version,
            severity, file_path, row_number, field_path, message
          )
          VALUES (
            $1::bigint, $2::bigint, 0, 'EXACT_PUBLISHED_DUPLICATE', '1.0',
            'warning', 'staged-batch.json', 42, 'delivery',
            'The staged event exactly matches an already-published delivery.'
          )
        `,
        [duplicateBatch.batchId, batchItemId],
      );

      // Publication re-detects the same duplicate independently and, before
      // the fix, inserted a second active row lacking file_path/row_number.
      await expect(
        repository.publishAcceptedItems(duplicateBatch.batchId, 'worker-issue-486-duplicate'),
      ).resolves.toMatchObject({ published: 0, duplicateSkipped: 1, conflicts: 0 });

      const rows = await client.query<{ active: boolean }>(
        `
          SELECT active
          FROM batch_validation_result
          WHERE batch_id=$1::bigint AND rule_code='EXACT_PUBLISHED_DUPLICATE'
        `,
        [duplicateBatch.batchId],
      );

      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]?.active).toBe(true);
    });
  });

  test('publishes canonical batch wickets and fielders with their delivery', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);

      const source = await client.query<{
        strikerId: string;
        nonStrikerId: string;
        bowlerId: string;
      }>(
        `
          SELECT
            striker_id::text AS "strikerId",
            non_striker_id::text AS "nonStrikerId",
            bowler_id::text AS "bowlerId"
          FROM delivery
          WHERE delivery_id=$1::bigint
        `,
        [current.deliveryId],
      );

      const players = source.rows[0]!;

      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-wicket-publication`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'publishing',
      });

      await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 125,
          positionInOver: 0,
          sourceIdentity: 'test:wicket-publication',
          state: 'accepted',
          payload: {
            sequenceNumber: 900003,
            ballNumber: '125.1',
            strikerId: players.strikerId,
            nonStrikerId: players.nonStrikerId,
            bowlerId: players.bowlerId,
            runs: {
              offBat: 0,
              extras: 0,
              total: 0,
              nonBoundary: false,
            },
            extras: {},
            wickets: [
              {
                kind: 'run out',
                playerOutId: players.strikerId,
                fielders: [
                  {
                    participantId: players.bowlerId,
                    substitute: false,
                  },
                ],
              },
            ],
          },
        },
      ]);

      await expect(
        repository.publishAcceptedItems(batch.batchId, 'worker-wicket'),
      ).resolves.toMatchObject({
        published: 1,
        conflicts: 0,
      });

      const wicket = await client.query<{
        kind: string;
        playerOutId: string;
        fielderId: string | null;
        substitute: boolean;
      }>(
        `
          SELECT
            dw.kind,
            dw.player_out_id::text AS "playerOutId",
            dwf.person_id::text AS "fielderId",
            dwf.is_substitute AS substitute
          FROM batch_item bi
          JOIN delivery_wicket dw
            ON dw.delivery_id =
               bi.published_event_id
          JOIN delivery_wicket_fielder dwf
            ON dwf.wicket_id =
               dw.wicket_id
          WHERE bi.batch_id=$1::bigint
        `,
        [batch.batchId],
      );

      expect(wicket.rows).toEqual([
        {
          kind: 'run out',
          playerOutId: players.strikerId,
          fielderId: players.bowlerId,
          substitute: false,
        },
      ]);
    });
  });

  test('refuses a live publication lease and safely reclaims an expired lease', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const source = await client.query<{
        strikerId: string;
        nonStrikerId: string;
        bowlerId: string;
      }>(
        `SELECT striker_id::text AS "strikerId", non_striker_id::text AS "nonStrikerId",
                bowler_id::text AS "bowlerId" FROM delivery WHERE delivery_id=$1::bigint`,
        [current.deliveryId],
      );
      const players = source.rows[0]!;
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-publication-lease-reclaim`,
        source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
        state: 'publishing',
      });
      await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 0,
          positionInOver: 2,
          sourceIdentity: 'test:delivery:publication-lease-reclaim',
          state: 'accepted',
          payload: {
            sequenceNumber: 3,
            ballNumber: '0.3',
            strikerId: players.strikerId,
            nonStrikerId: players.nonStrikerId,
            bowlerId: players.bowlerId,
            runs: { offBat: 1, extras: 0, total: 1, nonBoundary: false },
            extras: {},
          },
        },
      ]);
      await repository.upsertCheckpoint({
        batchId: batch.batchId,
        phase: 'publishing',
        lastOrdinal: -1,
        leaseOwner: 'worker-a',
        leaseExpiresAt: '2999-01-01T00:00:00.000Z',
        attemptCount: 1,
      });

      await expect(repository.publishAcceptedItems(batch.batchId, 'worker-b')).rejects.toThrow(
        'Another worker currently owns the publication lease.',
      );

      await client.query(
        `UPDATE batch_checkpoint SET lease_expires_at=now()-interval '1 second'
         WHERE batch_id=$1::bigint AND phase='publishing'`,
        [batch.batchId],
      );
      await expect(repository.publishAcceptedItems(batch.batchId, 'worker-b')).resolves.toEqual({
        published: 1,
        duplicateSkipped: 0,
        conflicts: 0,
      });
      await expect(repository.findCheckpoint(batch.batchId, 'publishing')).resolves.toMatchObject({
        lastOrdinal: 0,
        leaseOwner: null,
        leaseExpiresAt: null,
        attemptCount: 2,
      });
    });
  });

  test('requires source checksum, URI and size to be recorded together', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();

      await expect(
        executeQuery(
          client,
          `
            INSERT INTO batch (
              submitter_id,
              competition_id,
              idempotency_key,
              source_checksum
            )
            VALUES ($1, $2, $3, $4)
          `,
          [current.accountId, current.competitionId, `${sourcePrefix}-partial-source`, checksum],
        ),
      ).rejects.toMatchObject({ code: 'DATABASE_CONSTRAINT_ERROR' });
    });
  });

  test('rejects invalid extended batch-persistence values', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-invalid-extended-values`,
      });

      await expect(
        client.query(
          `
            INSERT INTO batch_item (
              batch_id, ordinal, over_number, position_in_over, payload, source_location
            ) VALUES ($1, 0, 0, 0, '{}', '[]')
          `,
          [batch.batchId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });

  test.each([
    ['ordinal', { ordinal: 0, overNumber: 0, positionInOver: 1 }],
    ['natural key', { ordinal: 1, overNumber: 0, positionInOver: 0 }],
  ])('rejects a duplicate item %s', async (_name, duplicate) => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-duplicate-${_name}`,
      });
      const baseItem = {
        ordinal: 0,
        inningsId: current.inningsId,
        overNumber: 0,
        positionInOver: 0,
        payload: { event: 'base' },
      } as const;

      await repository.insertBatchItems(batch.batchId, [baseItem]);
      await expect(
        repository.insertBatchItems(batch.batchId, [{ ...baseItem, ...duplicate }]),
      ).rejects.toMatchObject({ code: 'DATABASE_CONFLICT' });
    });
  });

  test('requires a published item to reference a published delivery', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-published-invariant`,
      });

      await expect(
        repository.insertBatchItems(batch.batchId, [
          {
            ordinal: 0,
            inningsId: current.inningsId,
            overNumber: 0,
            positionInOver: 0,
            payload: {},
            state: 'published',
          },
        ]),
      ).rejects.toMatchObject({ code: 'DATABASE_CONSTRAINT_ERROR' });
    });
  });

  test('keeps one independent checkpoint row for each processing phase', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-checkpoint-primary-key`,
      });

      await client.query(
        "INSERT INTO batch_checkpoint (batch_id, phase, last_ordinal) VALUES ($1, 'validating', 0)",
        [batch.batchId],
      );
      await client.query(
        "INSERT INTO batch_checkpoint (batch_id, phase, last_ordinal) VALUES ($1, 'publishing', 1)",
        [batch.batchId],
      );
      await expect(
        client.query(
          "INSERT INTO batch_checkpoint (batch_id, phase, last_ordinal) VALUES ($1, 'publishing', 2)",
          [batch.batchId],
        ),
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  test.each([
    [
      'submitter',
      'INSERT INTO batch (submitter_id, competition_id, idempotency_key) VALUES (9223372036854775806, $1, $2)',
    ],
    [
      'competition',
      'INSERT INTO batch (submitter_id, competition_id, idempotency_key) VALUES ($1, 9223372036854775806, $2)',
    ],
    [
      'innings',
      "INSERT INTO batch_item (batch_id, ordinal, innings_id, over_number, position_in_over, payload) VALUES ($1, 0, 9223372036854775806, 0, 0, '{}')",
    ],
    [
      'published event',
      "INSERT INTO batch_item (batch_id, ordinal, innings_id, over_number, position_in_over, payload, state, published_event_id) VALUES ($1, 0, $2, 0, 0, '{}', 'published', 9223372036854775806)",
    ],
  ])('rejects an unavailable %s provenance reference', async (name, statement) => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-foreign-key-${name}`,
      });
      const values =
        name === 'published event'
          ? [batch.batchId, current.inningsId]
          : name === 'innings'
            ? [batch.batchId]
            : [
                name === 'submitter' ? current.competitionId : current.accountId,
                `${sourcePrefix}-${name}`,
              ];

      await expect(client.query(statement, values)).rejects.toMatchObject({ code: '23503' });
    });
  });

  test.each(['batch', 'batch item', 'validation result', 'review decision'])(
    'prevents deletion of %s provenance records',
    async (target) => {
      await withRolledBackTransaction(async (client) => {
        const current = testRecords();
        const repository = createBatchRepository(client);
        const batch = await repository.createBatch({
          batchReference: randomUUID(),
          submitterId: current.accountId,
          competitionId: current.competitionId,
          idempotencyKey: `${sourcePrefix}-no-delete`,
        });

        if (target !== 'batch') {
          const [item] = await repository.insertBatchItems(batch.batchId, [
            {
              ordinal: 0,
              inningsId: current.inningsId,
              overNumber: 0,
              positionInOver: 0,
              payload: {},
            },
          ]);

          if (target === 'validation result') {
            await repository.recordValidationResult({
              batchId: batch.batchId,
              batchItemId: item.batchItemId,
              ruleCode: 'INVALID_VALUE',
              ruleVersion: '1.0',
              severity: 'error',
              message: 'Example validation result.',
            });
          }
          if (target === 'review decision') {
            await repository.recordReviewDecision({
              batchId: batch.batchId,
              actorId: current.accountId,
              decision: 'approved',
            });
          }
        }

        await expect(
          client.query(
            target === 'batch'
              ? 'DELETE FROM batch WHERE batch_id = $1'
              : target === 'batch item'
                ? 'DELETE FROM batch_item WHERE batch_id = $1'
                : target === 'validation result'
                  ? 'DELETE FROM batch_validation_result WHERE batch_id = $1'
                  : 'DELETE FROM batch_review_decision WHERE batch_id = $1',
            [batch.batchId],
          ),
        ).rejects.toMatchObject({
          code: '23514',
        });
      });
    },
  );

  test('retains referenced submitter, competition, innings and delivery provenance', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-retain-parents`,
      });
      await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 0,
          positionInOver: 0,
          payload: {},
          state: 'published',
          publishedEventId: current.deliveryId,
        },
      ]);

      const provenance = await client.query<{
        competitionId: string;
        deliveryId: string;
        inningsId: string;
        submitterId: string;
        submissionId: string;
      }>(
        `
          SELECT
            b.submitter_id::text AS "submitterId",
            b.competition_id::text AS "competitionId",
            bi.innings_id::text AS "inningsId",
            bi.published_event_id::text AS "deliveryId",
            d.submission_id::text AS "submissionId"
          FROM batch b
          JOIN batch_item bi ON bi.batch_id = b.batch_id
          JOIN delivery d ON d.delivery_id = bi.published_event_id
          WHERE b.batch_id = $1
        `,
        [batch.batchId],
      );
      expect(provenance.rows).toEqual([
        {
          submitterId: current.accountId,
          competitionId: current.competitionId,
          inningsId: current.inningsId,
          deliveryId: current.deliveryId,
          submissionId: current.submissionId,
        },
      ]);

      await expect(
        client.query('DELETE FROM delivery WHERE delivery_id = $1', [current.deliveryId]),
      ).rejects.toMatchObject({ code: '23503' });
    });
  });

  test('queries summary counts, grouped faults and paginated report traceability', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-report`,
        state: 'partially_published',
      });
      const items = await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 1,
          positionInOver: 1,
          payload: {},
          sourceIdentity: `${sourcePrefix}-accepted`,
          sourceLocation: { filePath: 'events.csv', rowNumber: 2 },
          state: 'published',
          publishedEventId: current.deliveryId,
        },
        {
          ordinal: 1,
          inningsId: null,
          overNumber: 1,
          positionInOver: 2,
          payload: {},
          sourceIdentity: `${sourcePrefix}-rejected`,
          sourceLocation: { filePath: 'events.csv', rowNumber: 3 },
          referenceResolutionState: 'unresolved',
          state: 'rejected',
          rejectionCode: 'REFERENCE_RESOLUTION_FAILED',
        },
        {
          ordinal: 2,
          inningsId: current.inningsId,
          overNumber: 1,
          positionInOver: 3,
          payload: {},
          sourceIdentity: `${sourcePrefix}-conflict`,
          sourceLocation: { filePath: 'events.csv', rowNumber: 4 },
          referenceResolutionState: 'resolved',
          state: 'rejected',
          rejectionCode: 'PUBLISHED_DELIVERY_CONFLICT',
          rejectionDetail: {
            existingDeliveryId: current.deliveryId,
            differences: [{ fieldPath: 'runs.batter', submittedValue: 4, publishedValue: 1 }],
          },
        },
      ]);
      await repository.recordValidationResult({
        batchId: batch.batchId,
        batchItemId: items[1]!.batchItemId,
        sourceOrdinal: 1,
        ruleCode: 'REFERENCE_RESOLUTION_FAILED',
        ruleVersion: '1.0',
        severity: 'error',
        filePath: 'events.csv',
        rowNumber: 3,
        fieldPath: 'striker',
        message: 'The striker reference is unknown.',
      });

      await expect(repository.getBatchCounts(batch.batchId)).resolves.toEqual({
        accepted: 1,
        rejected: 2,
        unresolved: 1,
        duplicate: 0,
        conflicting: 1,
      });
      await expect(repository.listBatchRuleGroups(batch.batchId)).resolves.toEqual([
        { ruleCode: 'REFERENCE_RESOLUTION_FAILED', count: 1 },
      ]);
      await expect(repository.getBatchResolutionCounts(batch.batchId)).resolves.toEqual({
        resolved: 1,
        ambiguous: 0,
        unresolved: 1,
        invalid: 0,
        proposed: 0,
      });
      const fixtureSummaries = await repository.listBatchFixtureSummaries(batch.batchId);
      expect(fixtureSummaries).toHaveLength(2);
      expect(fixtureSummaries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fixtureId: current.fixtureId,
            total: 2,
            accepted: 1,
            rejected: 1,
          }),
          expect.objectContaining({
            fixtureId: null,
            label: 'Fixture unresolved',
            total: 1,
            rejected: 1,
            unresolved: 1,
          }),
        ]),
      );
      const firstPage = await repository.listBatchReportItems(batch.batchId, {
        limit: 1,
      });
      expect(firstPage).toHaveLength(1);
      expect(firstPage[0]).toMatchObject({ ordinal: 0, publishedEventId: current.deliveryId });
      await expect(
        repository.listBatchReportItems(batch.batchId, { blockingOnly: true, limit: 50_001 }),
      ).resolves.toEqual([
        expect.objectContaining({ ordinal: 1, referenceResolutionState: 'unresolved' }),
        expect.objectContaining({
          ordinal: 2,
          rejectionCode: 'PUBLISHED_DELIVERY_CONFLICT',
        }),
      ]);
      await expect(
        repository.listBatchReportItems(batch.batchId, { acceptedOnly: true, limit: 15 }),
      ).resolves.toEqual([
        expect.objectContaining({
          ordinal: 0,
          fixtureId: current.fixtureId,
          fixtureLabel: expect.stringContaining(' · '),
        }),
      ]);
      await expect(
        repository.listBatchReportItems(batch.batchId, { afterOrdinal: 0, limit: 1 }),
      ).resolves.toEqual([
        expect.objectContaining({
          ordinal: 1,
          errors: [
            expect.objectContaining({
              ruleCode: 'REFERENCE_RESOLUTION_FAILED',
              fieldPath: 'striker',
            }),
          ],
        }),
      ]);
    });
  });

  test('retains the existing live-delivery natural-key constraint', async () => {
    const indexes = await executeQuery<{ definition: string; indexName: string }>(
      databasePool(),
      `
        SELECT indexname AS "indexName", indexdef AS definition
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'delivery'
          AND indexname = 'delivery_natural_key_live'
      `,
    );

    expect(indexes.rows).toEqual([
      expect.objectContaining({
        indexName: 'delivery_natural_key_live',
        definition: expect.stringContaining(
          '(innings_id, over_number, position_in_over) WHERE (superseded_at IS NULL)',
        ),
      }),
    ]);
  });

  test('reuses a concurrently visible canonical fixture, audits it, and only requeues validation', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const batch = await repository.createBatchAndQueueValidation({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-canonical`,
        source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 1 },
      });
      await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          overNumber: 0,
          positionInOver: 0,
          payload: {},
          referenceResolutionState: 'unresolved',
          state: 'rejected',
          rejectionCode: 'REFERENCE_RESOLUTION_FAILED',
        },
      ]);
      await client.query(`UPDATE batch SET state='rejected' WHERE batch_id=$1`, [batch.batchId]);
      await client.query(
        `UPDATE background_job SET state='succeeded', completed_at=now() WHERE batch_id=$1`,
        [batch.batchId],
      );
      const initialOutbox = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM outbox_message WHERE body->>'batchId'=$1::text`,
        [batch.batchId],
      );
      const input = {
        batchId: batch.batchId,
        batchReference: batch.batchReference,
        competitionId: current.competitionId,
        actorId: current.accountId,
        itemOrdinal: 0,
        referencePath: 'fixtures.0',
        decisionKey: 'create',
        sourceRef: `${sourcePrefix}-created`,
        season: '2026',
        startDate: '2026-01-01',
        teamNames: [`${sourcePrefix}-batting`, `${sourcePrefix}-bowling`],
        proposal: {
          endDate: '2026-01-01',
          matchType: 'T20',
          teamType: 'club',
          gender: 'mixed',
          ballsPerOver: 6,
          outcome: 'tie' as const,
          sourceVersion: '1.1',
          sourceRevision: 1,
        },
      };
      await repository.createCanonicalFixtureAndQueueMapping(input);
      await repository.createCanonicalFixtureAndQueueMapping(input);
      const result = await client.query<{
        fixtures: string;
        batchId: string;
        referencePath: string;
        fixtureId: string;
        actorId: string;
        decidedAt: string;
        state: string;
        published: string;
        validationJob: string;
        outbox: string;
        checkpoint: number | null;
      }>(
        `SELECT (SELECT count(*)::text FROM fixture WHERE source_ref=$1) AS fixtures, (SELECT batch_id::text FROM batch_canonical_fixture_decision WHERE batch_id=$2) AS "batchId", (SELECT reference_path FROM batch_canonical_fixture_decision WHERE batch_id=$2) AS "referencePath", (SELECT fixture_id::text FROM batch_canonical_fixture_decision WHERE batch_id=$2) AS "fixtureId", (SELECT actor_id::text FROM batch_canonical_fixture_decision WHERE batch_id=$2) AS "actorId", (SELECT decided_at::text FROM batch_canonical_fixture_decision WHERE batch_id=$2) AS "decidedAt", (SELECT state::text FROM batch WHERE batch_id=$2) AS state, (SELECT count(*)::text FROM batch_item WHERE batch_id=$2 AND published_event_id IS NOT NULL) AS published, (SELECT state::text FROM background_job WHERE batch_id=$2 AND job_type='batch.validate') AS "validationJob", (SELECT count(*)::text FROM outbox_message WHERE body->>'batchId'=$2::text) AS outbox, (SELECT last_ordinal FROM batch_checkpoint WHERE batch_id=$2 AND phase='validating') AS checkpoint`,
        [input.sourceRef, batch.batchId],
      );
      expect(result.rows[0]).toEqual({
        fixtures: '1',
        batchId: batch.batchId,
        referencePath: 'fixtures.0',
        fixtureId: expect.any(String),
        actorId: current.accountId,
        decidedAt: expect.any(String),
        state: 'stored',
        published: '0',
        validationJob: 'queued',
        outbox: String(Number(initialOutbox.rows[0]!.count) + 1),
        checkpoint: null,
      });

      const otherCompetition = await client.query<{ competitionId: string }>(
        `INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text AS "competitionId"`,
        [`${sourcePrefix}-other-competition`],
      );
      const crossCompetitionSourceRef = `${sourcePrefix}-other-competition-fixture`;
      await client.query(
        `INSERT INTO fixture (source_ref,competition_id,season,match_type,team_type,gender,balls_per_over,start_date,end_date,outcome,source_version,source_revision)
         VALUES ($1,$2::bigint,'2026','T20','club','mixed',6,'2026-01-01','2026-01-01','tie','1.1',1)`,
        [crossCompetitionSourceRef, otherCompetition.rows[0]!.competitionId],
      );
      await expect(
        repository.createCanonicalFixtureAndQueueMapping({
          ...input,
          sourceRef: crossCompetitionSourceRef,
          referencePath: 'fixtures.1',
          decisionKey: 'cross-competition',
        }),
      ).rejects.toBeInstanceOf(BatchReferenceMappingConflictError);
    });
  });
});
