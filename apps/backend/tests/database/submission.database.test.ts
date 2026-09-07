import request from 'supertest';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import { createSubmissionRepository } from '../../src/modules/submissions/submission.repository';
import { createSubmissionService } from '../../src/modules/submissions/submission.service';
import { deriveFixtureStatistics } from '../../src/modules/statistics/fixture-statistics.derivation';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';
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
          application_role,
          submitter_approval_state
        )
        VALUES ('test', $1, 'Submission Database Test', 'submitter', 'approved')
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
    if (!pool) {
      return;
    }
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

  function app(overrides: { role?: 'submitter' | 'admin'; competitionIds?: string[] } = {}) {
    const current = testRecords();
    const account = createTestAccount({
      accountId: current.accountId,
      role: overrides.role ?? 'submitter',
      approvalState: 'approved',
      competitionIds: overrides.competitionIds ?? [current.competitionId],
    });
    const synchronizeAccount: SynchronizeAccount = async () => account;
    const service = createSubmissionService(createSubmissionRepository(databasePool()));

    return createTestApp(undefined, undefined, synchronizeAccount, undefined, service);
  }

  test('rejects writes when the persisted role or competition grant is not authorised', async () => {
    const current = testRecords();
    const unauthorizedPayload = payload([
      {
        eventId: '123e4567-e89b-42d3-a456-426614174099',
        sequenceNumber: 99,
        positionInOver: 99,
      },
    ]);

    await executeQuery(
      databasePool(),
      "UPDATE app_user SET application_role = 'viewer' WHERE app_user_id = $1",
      [current.accountId],
    );

    await request(app())
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer database-test-token')
      .send(unauthorizedPayload)
      .expect(403);

    await executeQuery(
      databasePool(),
      "UPDATE app_user SET application_role = 'submitter' WHERE app_user_id = $1",
      [current.accountId],
    );
    await executeQuery(
      databasePool(),
      'DELETE FROM submitter_competition_scope WHERE app_user_id = $1',
      [current.accountId],
    );

    await request(app())
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer database-test-token')
      .send(unauthorizedPayload)
      .expect(403);

    await executeQuery(
      databasePool(),
      `
        INSERT INTO submitter_competition_scope (app_user_id, competition_id)
        VALUES ($1, $2)
      `,
      [current.accountId, current.competitionId],
    );

    const stored = await executeQuery<{ count: number }>(
      databasePool(),
      'SELECT count(*)::int AS count FROM delivery WHERE source_event_id = $1',
      [unauthorizedPayload.events[0]!.eventId],
    );
    expect(stored.rows[0].count).toBe(0);
  });

  test('allows an administrator without a persisted competition scope to submit', async () => {
    const current = testRecords();
    const administratorPayload = payload([
      {
        eventId: '123e4567-e89b-42d3-a456-426614174098',
        sequenceNumber: 2,
        positionInOver: 1,
      },
    ]);

    await executeQuery(
      databasePool(),
      "UPDATE app_user SET application_role = 'admin' WHERE app_user_id = $1",
      [current.accountId],
    );
    await executeQuery(
      databasePool(),
      'DELETE FROM submitter_competition_scope WHERE app_user_id = $1',
      [current.accountId],
    );

    try {
      await request(app({ role: 'admin', competitionIds: [] }))
        .post('/api/v1/submissions')
        .set('Authorization', 'Bearer database-test-token')
        .send(administratorPayload)
        .expect(201);
    } finally {
      await executeQuery(
        databasePool(),
        "UPDATE app_user SET application_role = 'submitter' WHERE app_user_id = $1",
        [current.accountId],
      );
      await executeQuery(
        databasePool(),
        `
          INSERT INTO submitter_competition_scope (app_user_id, competition_id)
          VALUES ($1, $2)
        `,
        [current.accountId, current.competitionId],
      );
      await executeQuery(
        databasePool(),
        `
          WITH removed_deliveries AS (
            DELETE FROM delivery
            WHERE source_event_id = $1::uuid
            RETURNING submission_id
          )
          DELETE FROM submission
          WHERE submission_id IN (SELECT submission_id FROM removed_deliveries)
        `,
        [administratorPayload.events[0].eventId],
      );
    }
  });

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

  test('leaves the accepted source event unchanged when a correction is invalid', async () => {
    const before = await executeQuery<{ count: number; runsTotal: number }>(
      databasePool(),
      `
        SELECT count(*)::int AS count, sum(runs_total)::int AS "runsTotal"
        FROM delivery
        WHERE source_event_id = $1 AND superseded_at IS NULL
      `,
      ['123e4567-e89b-42d3-a456-426614174010'],
    );
    const original = payload([
      { eventId: '123e4567-e89b-42d3-a456-426614174010', sequenceNumber: 1, positionInOver: 0 },
    ]).events[0];
    const { eventId: _eventId, sequenceNumber: _sequenceNumber, ...event } = original;
    void _eventId;
    void _sequenceNumber;
    event.runs = { offBat: 3, extras: 0, total: 4 };

    await request(app())
      .put('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174010')
      .set('Authorization', 'Bearer database-test-token')
      .send({
        fixtureId: testRecords().fixtureId,
        schemaVersion: '1.0',
        reason: 'Invalid correction must roll back.',
        event,
      })
      .expect(422);

    const after = await executeQuery<{ count: number; runsTotal: number }>(
      databasePool(),
      `
        SELECT count(*)::int AS count, sum(runs_total)::int AS "runsTotal"
        FROM delivery
        WHERE source_event_id = $1 AND superseded_at IS NULL
      `,
      ['123e4567-e89b-42d3-a456-426614174010'],
    );
    expect(after.rows).toEqual(before.rows);

    await executeQuery(
      databasePool(),
      "UPDATE app_user SET application_role = 'viewer' WHERE app_user_id = $1",
      [testRecords().accountId],
    );
    try {
      event.runs = { offBat: 2, extras: 0, total: 2 };
      await request(app())
        .put('/api/v1/submissions/events/123e4567-e89b-42d3-a456-426614174010')
        .set('Authorization', 'Bearer database-test-token')
        .send({
          fixtureId: testRecords().fixtureId,
          schemaVersion: '1.0',
          reason: 'This requester must not be able to change the event.',
          event,
        })
        .expect(403);
    } finally {
      await executeQuery(
        databasePool(),
        "UPDATE app_user SET application_role = 'submitter' WHERE app_user_id = $1",
        [testRecords().accountId],
      );
    }

    const afterUnauthorized = await executeQuery<{ count: number; runsTotal: number }>(
      databasePool(),
      `
        SELECT count(*)::int AS count, sum(runs_total)::int AS "runsTotal"
        FROM delivery
        WHERE source_event_id = $1 AND superseded_at IS NULL
      `,
      ['123e4567-e89b-42d3-a456-426614174010'],
    );
    expect(afterUnauthorized.rows).toEqual(before.rows);
  });

  test('atomically supersedes a corrected event and refreshes only its derived statistics', async () => {
    const correctedEventId = '123e4567-e89b-42d3-a456-426614174010';
    const unrelatedEventId = '123e4567-e89b-42d3-a456-426614174013';
    const unrelated = payload([
      { eventId: unrelatedEventId, sequenceNumber: 2, positionInOver: 1 },
    ]);
    unrelated.events[0].runs = { offBat: 2, extras: 0, total: 2 };

    await request(app())
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer database-test-token')
      .send(unrelated)
      .expect(201);
    await executeQuery(
      databasePool(),
      `
        UPDATE fixture
        SET first_seen_in = (
          SELECT submission_id FROM submission WHERE fixture_id = $1 ORDER BY submission_id ASC LIMIT 1
        )
        WHERE fixture_id = $1
      `,
      [testRecords().fixtureId],
    );

    const beforeSource = await loadFixtureStatisticsSource(testRecords().fixtureId, databasePool());
    expect(beforeSource).not.toBeNull();
    const beforeStatistics = deriveFixtureStatistics(beforeSource!, { includeContributors: false });

    const original = payload([{ eventId: correctedEventId, sequenceNumber: 1, positionInOver: 0 }])
      .events[0];
    const { eventId: _eventId, sequenceNumber: _sequenceNumber, ...event } = original;
    void _eventId;
    void _sequenceNumber;
    event.runs = { offBat: 4, extras: 0, total: 4 };
    const response = await request(app())
      .put(`/api/v1/submissions/events/${correctedEventId}`)
      .set('Authorization', 'Bearer database-test-token')
      .send({
        fixtureId: testRecords().fixtureId,
        schemaVersion: '1.0',
        reason: 'Correct scorer transcription.',
        event,
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      eventId: correctedEventId,
      revision: 2,
      refreshedScopes: expect.arrayContaining([
        {
          scope: 'fixture',
          participantId: null,
          competitionId: testRecords().competitionId,
          season: '2026',
        },
        {
          scope: 'season',
          participantId: testRecords().strikerId,
          competitionId: testRecords().competitionId,
          season: '2026',
        },
        {
          scope: 'competition',
          participantId: testRecords().bowlerId,
          competitionId: testRecords().competitionId,
          season: null,
        },
        {
          scope: 'career',
          participantId: testRecords().strikerId,
          competitionId: null,
          season: null,
        },
      ]),
    });
    expect(response.body.data.refreshedScopes).toHaveLength(7);

    const refreshDependencies = await executeQuery<{
      scope: string;
      participantId: string | null;
      competitionId: string | null;
      season: string | null;
    }>(
      databasePool(),
      `
        SELECT
          scope,
          participant_id::text AS "participantId",
          competition_id::text AS "competitionId",
          season
        FROM statistics_refresh_dependency
        WHERE source_event_id = $1::uuid
          AND delivery_revision = 2
        ORDER BY scope, participant_id
      `,
      [correctedEventId],
    );
    expect(refreshDependencies.rows).toHaveLength(7);
    expect(refreshDependencies.rows).not.toContainEqual(
      expect.objectContaining({ participantId: testRecords().nonStrikerId }),
    );
    const revisions = await executeQuery<{
      deliveryId: string;
      sourceEventId: string | null;
      revision: number;
      supersedesDeliveryId: string | null;
      supersededBy: string | null;
      sequenceNumber: number;
      submissionId: string;
      eventOrdinal: number;
      runsTotal: number;
    }>(
      databasePool(),
      `
        SELECT
          delivery_id::text AS "deliveryId",
          source_event_id::text AS "sourceEventId",
          revision,
          supersedes_delivery_id::text AS "supersedesDeliveryId",
          superseded_by::text AS "supersededBy",
          innings_sequence AS "sequenceNumber",
          submission_id::text AS "submissionId",
          submission_event_ordinal AS "eventOrdinal",
          runs_total AS "runsTotal"
        FROM delivery
        WHERE innings_id = $1 AND position_in_over = 0
        ORDER BY revision
      `,
      [testRecords().inningsId],
    );
    const originalRevision = revisions.rows[0]!;
    const correctedRevision = revisions.rows[1]!;
    expect(revisions.rows).toHaveLength(2);
    expect(originalRevision).toMatchObject({
      sourceEventId: correctedEventId,
      revision: 1,
      supersedesDeliveryId: null,
      supersededBy: correctedRevision.deliveryId,
      sequenceNumber: 1,
      eventOrdinal: 0,
      runsTotal: 1,
    });
    expect(correctedRevision).toMatchObject({
      sourceEventId: correctedEventId,
      revision: 2,
      supersedesDeliveryId: originalRevision.deliveryId,
      supersededBy: null,
      sequenceNumber: 1,
      submissionId: originalRevision.submissionId,
      eventOrdinal: 0,
      runsTotal: 4,
    });

    const afterSource = await loadFixtureStatisticsSource(testRecords().fixtureId, databasePool());
    expect(afterSource?.events).toHaveLength(2);
    expect(afterSource?.events.map((delivery) => delivery.runsTotal)).toEqual([4, 2]);
    const afterStatistics = deriveFixtureStatistics(afterSource!, { includeContributors: false });
    const beforeInnings = beforeStatistics.statistics.find(
      (statistic) => statistic.scope === 'innings',
    );
    const afterInnings = afterStatistics.statistics.find(
      (statistic) => statistic.scope === 'innings',
    );
    expect(beforeInnings?.metrics.totalRuns).toBe(3);
    expect(afterInnings?.metrics.totalRuns).toBe(6);

    const history = await request(app())
      .get(`/api/v1/submissions/events/${correctedEventId}/history`)
      .set('Authorization', 'Bearer database-test-token')
      .expect(200);
    expect(history.body.data.corrections).toEqual([
      expect.objectContaining({
        previousDeliveryId: originalRevision.deliveryId,
        replacementDeliveryId: correctedRevision.deliveryId,
        previousRevision: 1,
        resultingRevision: 2,
        requester: {
          accountId: testRecords().accountId,
          displayName: 'Submission Database Test',
        },
        reason: 'Correct scorer transcription.',
        source: {
          submissionId: originalRevision.submissionId,
          submissionEventOrdinal: 0,
          batchItemId: null,
        },
        previousState: expect.objectContaining({
          eventId: correctedEventId,
          sequenceNumber: 1,
          runs: expect.objectContaining({ total: 1 }),
        }),
        resultingState: expect.objectContaining({
          eventId: correctedEventId,
          sequenceNumber: 1,
          runs: expect.objectContaining({ total: 4 }),
        }),
        review: null,
      }),
    ]);

    const currentPublicRevisions = await executeQuery<{ count: number; runsTotal: number }>(
      databasePool(),
      `
        SELECT count(*)::int AS count, sum(runs_total)::int AS "runsTotal"
        FROM delivery_current
        WHERE innings_id = $1
          AND innings_sequence = 1
      `,
      [testRecords().inningsId],
    );
    expect(currentPublicRevisions.rows).toEqual([{ count: 1, runsTotal: 4 }]);
  });

  test('serializes concurrent corrections into monotonic immutable revisions', async () => {
    const eventId = '123e4567-e89b-42d3-a456-426614174015';
    const submitted = payload([{ eventId, sequenceNumber: 3, positionInOver: 2 }]);
    await request(app())
      .post('/api/v1/submissions')
      .set('Authorization', 'Bearer database-test-token')
      .send(submitted)
      .expect(201);

    const { eventId: _eventId, sequenceNumber: _sequenceNumber, ...event } = submitted.events[0]!;
    void _eventId;
    void _sequenceNumber;
    const corrections = [
      { total: 2, reason: 'First concurrent scorer correction.' },
      { total: 3, reason: 'Second concurrent scorer correction.' },
    ];

    const responses = await Promise.all(
      corrections.map(({ total, reason }) =>
        request(app())
          .put(`/api/v1/submissions/events/${eventId}`)
          .set('Authorization', 'Bearer database-test-token')
          .send({
            fixtureId: testRecords().fixtureId,
            schemaVersion: '1.0',
            reason,
            event: { ...event, runs: { offBat: total, extras: 0, total } },
          }),
      ),
    );

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(responses.map((response) => response.body.data.revision).sort()).toEqual([2, 3]);

    const sequentialReason = 'Sequential follow-up correction.';
    const sequentialResponse = await request(app())
      .put(`/api/v1/submissions/events/${eventId}`)
      .set('Authorization', 'Bearer database-test-token')
      .send({
        fixtureId: testRecords().fixtureId,
        schemaVersion: '1.0',
        reason: sequentialReason,
        event: { ...event, runs: { offBat: 4, extras: 0, total: 4 } },
      })
      .expect(200);
    expect(sequentialResponse.body.data.revision).toBe(4);

    const revisions = await executeQuery<{
      deliveryId: string;
      revision: number;
      sequenceNumber: number;
      sourceEventId: string;
      submissionId: string;
      eventOrdinal: number;
      supersedesDeliveryId: string | null;
      supersededBy: string | null;
    }>(
      databasePool(),
      `
        SELECT
          delivery_id::text AS "deliveryId",
          revision,
          innings_sequence AS "sequenceNumber",
          source_event_id::text AS "sourceEventId",
          submission_id::text AS "submissionId",
          submission_event_ordinal AS "eventOrdinal",
          supersedes_delivery_id::text AS "supersedesDeliveryId",
          superseded_by::text AS "supersededBy"
        FROM delivery
        WHERE source_event_id = $1::uuid
        ORDER BY revision
      `,
      [eventId],
    );
    expect(revisions.rows.map((revision) => revision.revision)).toEqual([1, 2, 3, 4]);
    expect(new Set(revisions.rows.map((revision) => revision.sequenceNumber))).toEqual(
      new Set([3]),
    );
    expect(new Set(revisions.rows.map((revision) => revision.sourceEventId))).toEqual(
      new Set([eventId]),
    );
    expect(new Set(revisions.rows.map((revision) => revision.submissionId)).size).toBe(1);
    expect(new Set(revisions.rows.map((revision) => revision.eventOrdinal)).size).toBe(1);
    expect(revisions.rows[1]!.supersedesDeliveryId).toBe(revisions.rows[0]!.deliveryId);
    expect(revisions.rows[0]!.supersededBy).toBe(revisions.rows[1]!.deliveryId);
    expect(revisions.rows[2]!.supersedesDeliveryId).toBe(revisions.rows[1]!.deliveryId);
    expect(revisions.rows[1]!.supersededBy).toBe(revisions.rows[2]!.deliveryId);
    expect(revisions.rows[3]!.supersedesDeliveryId).toBe(revisions.rows[2]!.deliveryId);
    expect(revisions.rows[2]!.supersededBy).toBe(revisions.rows[3]!.deliveryId);
    expect(revisions.rows[3]!.supersededBy).toBeNull();

    const history = await request(app())
      .get(`/api/v1/submissions/events/${eventId}/history`)
      .set('Authorization', 'Bearer database-test-token')
      .expect(200);
    expect(
      history.body.data.corrections.map(
        (entry: { resultingRevision: number }) => entry.resultingRevision,
      ),
    ).toEqual([2, 3, 4]);
    expect(
      new Set(history.body.data.corrections.map((entry: { reason: string }) => entry.reason)),
    ).toEqual(new Set([...corrections.map((correction) => correction.reason), sequentialReason]));

    const correctionId = history.body.data.corrections[0].correctionId as string;
    await expect(
      executeQuery(
        databasePool(),
        'UPDATE delivery_correction_history SET reason = $2 WHERE delivery_correction_history_id = $1',
        [correctionId, 'silently overwritten'],
      ),
    ).rejects.toMatchObject({ code: 'DATABASE_CONSTRAINT_ERROR' });
    await expect(
      executeQuery(
        databasePool(),
        'DELETE FROM delivery_correction_history WHERE delivery_correction_history_id = $1',
        [correctionId],
      ),
    ).rejects.toMatchObject({ code: 'DATABASE_CONSTRAINT_ERROR' });
  });

  test('stores uploaded JSON source-file provenance with the accepted submission', async () => {
    const eventId = '123e4567-e89b-42d3-a456-426614174014';
    const uploadPayload = payload([{ eventId, sequenceNumber: 20, positionInOver: 20 }]);
    const source = Buffer.from(JSON.stringify(uploadPayload));

    const response = await request(app())
      .post('/api/v1/submissions/uploads')
      .set('Authorization', 'Bearer database-test-token')
      .attach('file', source, {
        filename: 'database-submission.json',
        contentType: 'application/json',
      })
      .expect(201);

    expect(response.body.data.sourceFile).toEqual({
      fileName: 'database-submission.json',
      mediaType: 'application/json',
      sizeBytes: source.length,
    });

    const provenance = await executeQuery<{
      fileName: string;
      mediaType: string;
      sizeBytes: number;
      eventId: string;
    }>(
      databasePool(),
      `
        SELECT
          s.source_file_name AS "fileName",
          s.source_file_media_type AS "mediaType",
          s.source_file_size_bytes AS "sizeBytes",
          d.source_event_id::text AS "eventId"
        FROM submission s
        JOIN delivery d ON d.submission_id = s.submission_id
        WHERE s.submission_id = $1
      `,
      [response.body.data.submissionId],
    );

    expect(provenance.rows).toEqual([
      {
        fileName: 'database-submission.json',
        mediaType: 'application/json',
        sizeBytes: source.length,
        eventId,
      },
    ]);
  });
});
