import { readFile } from 'node:fs/promises';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import { createBatchRepository } from '../../src/modules/batches/batch.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

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

function batchMigrationSections(): Promise<{ down: string; up: string }> {
  return migrationSections('20260831100000000_batch-ingestion-models.sql');
}

function extendedBatchMigrationSections(): Promise<{ down: string; up: string }> {
  return migrationSections('20260902120000000_extend-batch-persistence.sql');
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

      const created = await client.query<{ relationName: string | null }>(
        `SELECT to_regclass('batch_checkpoint')::text AS "relationName"`,
      );
      expect(created.rows[0].relationName).toBe('batch_checkpoint');

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

  test('creates and reads a batch, ordered items and a durable checkpoint', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);
      const created = await repository.createBatch({
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
});
