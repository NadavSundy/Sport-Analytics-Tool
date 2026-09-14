import { randomUUID } from 'node:crypto';

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
  wicketId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}

const sourcePrefix = `batch-publication-dismissal-test-${process.pid}`;
const checksum = 'a'.repeat(64);

describe.sequential('batch publication over a recorded dismissal', () => {
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
      throw new Error('Dismissal test records have not been initialized.');
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
    // Every column matches the staged template row below except the dismissal, so a
    // wicket difference is the only difference publication can observe.
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
        VALUES ($1, 0, 0, 1, '0.1', $2, $3, $4, 0, 0, 0, $5)
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
    const wicket = await executeQuery<{ wicketId: string }>(
      pool,
      `
        INSERT INTO delivery_wicket (delivery_id, ordinal, kind, source_kind, player_out_id)
        VALUES ($1, 0, 'caught', 'caught', $2)
        RETURNING wicket_id::text AS "wicketId"
      `,
      [delivery.rows[0].deliveryId, strikerId],
    );
    await executeQuery(
      pool,
      `
        INSERT INTO delivery_wicket_fielder (wicket_id, ordinal, person_id)
        VALUES ($1, 0, $2)
      `,
      [wicket.rows[0].wicketId, bowlerId],
    );

    records = {
      accountId,
      competitionId,
      fixtureId,
      inningsId: innings.rows[0].inningsId,
      deliveryId: delivery.rows[0].deliveryId,
      submissionId: submission.rows[0].submissionId,
      wicketId: wicket.rows[0].wicketId,
      strikerId,
      nonStrikerId,
      bowlerId,
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

  test('publishing a template-shaped delivery without wickets over a current delivery that records a dismissal', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);

      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-template-row`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'publishing',
      });

      // The canonical payload the worker stages for the example row of
      // season-upload-template.csv: occurrenceSequence 1, over 0, position 0, ball 0.1,
      // no runs, blank extras columns, and blank dismissal columns, so wickets is empty.
      await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: 0,
          positionInOver: 0,
          sourceIdentity: 'my-club:delivery:innings-0-ball-1',
          state: 'accepted',
          payload: {
            sequenceNumber: 1,
            ballNumber: '0.1',
            strikerId: current.strikerId,
            nonStrikerId: current.nonStrikerId,
            bowlerId: current.bowlerId,
            runs: {
              offBat: 0,
              extras: 0,
              total: 0,
              nonBoundary: false,
            },
            extras: {},
            wickets: [],
          },
        },
      ]);

      await expect(
        repository.publishAcceptedItems(batch.batchId, 'worker-template-row'),
      ).resolves.toEqual({
        published: 0,
        duplicateSkipped: 0,
        conflicts: 1,
      });

      const recordedDismissal = [{ kind: 'caught', playerOutId: current.strikerId }];

      const live = await client.query<{
        deliveryId: string;
        wickets: Array<{ kind: string; playerOutId: string }>;
      }>(
        `
          SELECT
            live.delivery_id::text AS "deliveryId",
            COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object('kind', w.kind, 'playerOutId', w.player_out_id::text)
                ORDER BY w.ordinal
              )
              FROM delivery_wicket w
              WHERE w.delivery_id = live.delivery_id
            ), '[]'::jsonb) AS wickets
          FROM delivery_current live
          WHERE live.innings_id=$1::bigint
            AND live.over_number=0
            AND live.position_in_over=0
        `,
        [current.inningsId],
      );

      expect(live.rows).toEqual([{ deliveryId: current.deliveryId, wickets: recordedDismissal }]);

      const originalWicket = await client.query<{
        deliveryId: string;
        kind: string;
        playerOutId: string;
        fielderId: string | null;
      }>(
        `
          SELECT
            w.delivery_id::text AS "deliveryId",
            w.kind,
            w.player_out_id::text AS "playerOutId",
            f.person_id::text AS "fielderId"
          FROM delivery_wicket w
          LEFT JOIN delivery_wicket_fielder f ON f.wicket_id = w.wicket_id
          WHERE w.wicket_id=$1::bigint
        `,
        [current.wicketId],
      );

      expect(originalWicket.rows).toEqual([
        {
          deliveryId: current.deliveryId,
          kind: 'caught',
          playerOutId: current.strikerId,
          fielderId: current.bowlerId,
        },
      ]);

      const revisions = await client.query<{
        deliveryId: string;
        revision: number;
        superseded: boolean;
        sourceBatchItemId: string | null;
        wickets: Array<{ kind: string; playerOutId: string }>;
      }>(
        `
          SELECT
            d.delivery_id::text AS "deliveryId",
            d.revision,
            d.superseded_at IS NOT NULL AS superseded,
            d.source_batch_item_id::text AS "sourceBatchItemId",
            COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object('kind', w.kind, 'playerOutId', w.player_out_id::text)
                ORDER BY w.ordinal
              )
              FROM delivery_wicket w
              WHERE w.delivery_id = d.delivery_id
            ), '[]'::jsonb) AS wickets
          FROM delivery d
          WHERE d.innings_id=$1::bigint
            AND d.over_number=0
            AND d.position_in_over=0
          ORDER BY d.delivery_id
        `,
        [current.inningsId],
      );

      expect(revisions.rows).toEqual([
        {
          deliveryId: current.deliveryId,
          revision: 1,
          superseded: false,
          sourceBatchItemId: null,
          wickets: recordedDismissal,
        },
      ]);

      const staged = await client.query<{
        state: string;
        rejectionCode: string | null;
        publishedEventId: string | null;
        differences: unknown;
        batchState: string;
      }>(
        `
          SELECT
            item.state::text AS state,
            item.rejection_code AS "rejectionCode",
            item.published_event_id::text AS "publishedEventId",
            item.rejection_detail->'differences' AS differences,
            batch.state::text AS "batchState"
          FROM batch_item item
          JOIN batch ON batch.batch_id = item.batch_id
          WHERE item.batch_id=$1::bigint
        `,
        [batch.batchId],
      );

      expect(staged.rows).toEqual([
        {
          state: 'rejected',
          rejectionCode: 'PUBLISHED_DELIVERY_CONFLICT',
          publishedEventId: null,
          differences: [
            {
              fieldPath: 'wickets',
              submittedValue: [],
              publishedValue: [
                {
                  kind: 'caught',
                  playerOutId: current.strikerId,
                  fielders: [{ participantId: current.bowlerId, substitute: false }],
                },
              ],
            },
          ],
          batchState: 'partially_published',
        },
      ]);
    });
  });
});
