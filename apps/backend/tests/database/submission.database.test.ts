import request from 'supertest';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import { createSubmissionRepository } from '../../src/modules/submissions/submission.repository';
import { createSubmissionService } from '../../src/modules/submissions/submission.service';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { createTestAccount, createTestApp } from '../test-app';

interface TestRecords {
  accountId: string;
  competitionId: string;
  fixtureId: string;
  inningsId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}

const sourcePrefix = `submission-test-${process.pid}`;

describe.sequential('direct submission database integration', () => {
  let pool: Pool | undefined;
  let records: TestRecords | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }
    return pool;
  }

  function testRecords(): TestRecords {
    if (!records) {
      throw new Error('Submission test records have not been initialised.');
    }
    return records;
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
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          display_name,
          submitter_approval_state
        )
        VALUES ('test', $1, 'Submission Database Test', 'approved')
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
        [`${sourcePrefix}-${role}`, `${role} ${sourcePrefix}`],
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

    await executeQuery(
      pool,
      `
        INSERT INTO submitter_competition_scope (app_user_id, competition_id)
        VALUES ($1, $2)
      `,
      [accountId, competitionId],
    );

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
    await executeQuery(
      pool,
      `
        INSERT INTO fixture_squad (fixture_id, person_id, team_id)
        VALUES ($1, $2, $5), ($1, $3, $5), ($1, $4, $6)
      `,
      [fixtureId, strikerId, nonStrikerId, bowlerId, battingTeamId, bowlingTeamId],
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

    records = {
      accountId,
      competitionId,
      fixtureId,
      inningsId: innings.rows[0].inningsId,
      strikerId,
      nonStrikerId,
      bowlerId,
    };
  });

  afterAll(async () => {
    if (!pool || !records) {
      return;
    }

    await executeQuery(pool, 'DELETE FROM delivery WHERE innings_id = $1', [records.inningsId]);
    await executeQuery(pool, 'DELETE FROM submission WHERE fixture_id = $1', [records.fixtureId]);
    await executeQuery(pool, 'DELETE FROM fixture WHERE fixture_id = $1', [records.fixtureId]);
    await executeQuery(pool, 'DELETE FROM app_user WHERE app_user_id = $1', [records.accountId]);
    await executeQuery(pool, 'DELETE FROM competition WHERE competition_id = $1', [
      records.competitionId,
    ]);
    await executeQuery(pool, 'DELETE FROM team WHERE name LIKE $1', [`${sourcePrefix}-%`]);
    await executeQuery(pool, 'DELETE FROM person WHERE source_ref LIKE $1', [`${sourcePrefix}-%`]);
    await pool.end();
  });

  function payload(
    events: Array<{
      eventId: string;
      sequenceNumber: number;
      positionInOver: number;
    }>,
  ) {
    const current = testRecords();
    return {
      fixtureId: current.fixtureId,
      schemaVersion: '1.0',
      events: events.map((event) => ({
        ...event,
        inningsId: current.inningsId,
        overNumber: 0,
        ballNumber: `0.${event.sequenceNumber}`,
        strikerId: current.strikerId,
        nonStrikerId: current.nonStrikerId,
        bowlerId: current.bowlerId,
        runs: { offBat: 1, extras: 0, total: 1 },
      })),
    };
  }

  function app() {
    const current = testRecords();
    const account = createTestAccount({
      accountId: current.accountId,
      role: 'submitter',
      approvalState: 'approved',
      competitionIds: [current.competitionId],
    });
    const synchronizeAccount: SynchronizeAccount = async () => account;
    const service = createSubmissionService(createSubmissionRepository(databasePool()));

    return createTestApp(undefined, undefined, synchronizeAccount, undefined, service);
  }

  test('stores a valid submission and its ordered event provenance atomically', async () => {
    const eventId = '123e4567-e89b-42d3-a456-426614174010';
    const response = await request(app())
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer database-test-token')
      .send(payload([{ eventId, sequenceNumber: 1, positionInOver: 0 }]))
      .expect(201);

    const provenance = await executeQuery<{
      eventId: string;
      eventOrdinal: number;
      fixtureId: string;
      submissionId: string;
      submitterId: string;
      schemaVersion: string;
      eventCount: number;
      status: string;
    }>(
      databasePool(),
      `
        SELECT
          d.source_event_id::text AS "eventId",
          d.submission_event_ordinal AS "eventOrdinal",
          i.fixture_id::text AS "fixtureId",
          d.submission_id::text AS "submissionId",
          s.submitted_by::text AS "submitterId",
          s.schema_version AS "schemaVersion",
          s.event_count AS "eventCount",
          s.status::text AS status
        FROM delivery d
        JOIN innings i ON i.innings_id = d.innings_id
        JOIN submission s ON s.submission_id = d.submission_id
        WHERE d.source_event_id = $1
      `,
      [eventId],
    );

    expect(provenance.rows).toEqual([
      {
        eventId,
        eventOrdinal: 0,
        fixtureId: testRecords().fixtureId,
        submissionId: response.body.data.submissionId,
        submitterId: testRecords().accountId,
        schemaVersion: '1.0',
        eventCount: 1,
        status: 'accepted',
      },
    ]);
  });

  test('rolls back the submission and earlier events when a later insert conflicts', async () => {
    const before = await executeQuery<{ submissions: number; deliveries: number }>(
      databasePool(),
      `
        SELECT
          (SELECT count(*)::int FROM submission WHERE fixture_id = $1) AS submissions,
          (SELECT count(*)::int FROM delivery WHERE innings_id = $2) AS deliveries
      `,
      [testRecords().fixtureId, testRecords().inningsId],
    );
    const rolledBackEventId = '123e4567-e89b-42d3-a456-426614174011';

    const response = await request(app())
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer database-test-token')
      .send(
        payload([
          { eventId: rolledBackEventId, sequenceNumber: 2, positionInOver: 1 },
          {
            eventId: '123e4567-e89b-42d3-a456-426614174012',
            sequenceNumber: 3,
            positionInOver: 0,
          },
        ]),
      )
      .expect(409);

    expect(response.body.error.code).toBe('EVENT_CONFLICT');

    const after = await executeQuery<{ submissions: number; deliveries: number }>(
      databasePool(),
      `
        SELECT
          (SELECT count(*)::int FROM submission WHERE fixture_id = $1) AS submissions,
          (SELECT count(*)::int FROM delivery WHERE innings_id = $2) AS deliveries
      `,
      [testRecords().fixtureId, testRecords().inningsId],
    );
    const rolledBackEvent = await executeQuery(
      databasePool(),
      'SELECT 1 FROM delivery WHERE source_event_id = $1',
      [rolledBackEventId],
    );

    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(rolledBackEvent.rowCount).toBe(0);
  });

  test('rejects a repeated event identifier without storing a partial submission', async () => {
    const before = await executeQuery<{ count: number }>(
      databasePool(),
      'SELECT count(*)::int AS count FROM submission WHERE fixture_id = $1',
      [testRecords().fixtureId],
    );

    const response = await request(app())
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer database-test-token')
      .send(
        payload([
          {
            eventId: '123e4567-e89b-42d3-a456-426614174010',
            sequenceNumber: 3,
            positionInOver: 3,
          },
        ]),
      )
      .expect(409);

    expect(response.body.error.code).toBe('DUPLICATE_EVENT_ID');

    const after = await executeQuery<{ count: number }>(
      databasePool(),
      'SELECT count(*)::int AS count FROM submission WHERE fixture_id = $1',
      [testRecords().fixtureId],
    );
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });
});
