import request from 'supertest';
import { Readable } from 'node:stream';
import type { ObjectStore } from '@sport-analytics/object-storage';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery } from '../../src/database';
import { createPublicEventRepository } from '../../src/modules/events/event.repository';
import { createDatasetReleaseRepository } from '../../src/modules/dataset-releases/dataset-release.repository';
import { createDatasetReleaseJobHandler } from '../../../worker/src/dataset-release-job';
import type { Logger } from '../../../worker/src/logger';
import { createPublicReadService } from '../../src/modules/public-read/public-read.service';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { createTestApp } from '../test-app';

interface TestRecords {
  competitionId: string;
  fixtureId: string;
  firstInningsId: string;
  secondInningsId: string;
  firstCompetitorId: string;
  secondCompetitorId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  orderedEventIds: string[];
  submissionIds: string[];
}

const sourcePrefix = `public-events-test-${process.pid}`;

class InterleavingObjectStore implements ObjectStore {
  object: Buffer | undefined;
  private corrected = false;

  constructor(private readonly publishCorrection: () => Promise<void>) {}

  async write(_key: string, source: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of source) {
      chunks.push(Buffer.from(chunk));
      if (!this.corrected) {
        this.corrected = true;
        await this.publishCorrection();
      }
    }
    this.object = Buffer.concat(chunks);
    return { versionId: null };
  }
  async read() {
    return Readable.from(this.object ?? Buffer.alloc(0));
  }
  async delete() {
    this.object = undefined;
  }
}

const workerLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} };

describe.sequential('public events database API', () => {
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
      throw new Error('Public event test records have not been initialised.');
    }

    return records;
  }

  async function insertSubmission(status: 'accepted' | 'pending' | 'rejected'): Promise<string> {
    const result = await executeQuery<{ submissionId: string }>(
      databasePool(),
      `
        INSERT INTO submission (status, rejection_detail)
        VALUES (
          $1::submission_status,
          CASE WHEN $1::text = 'rejected' THEN '{}'::jsonb ELSE NULL END
        )
        RETURNING submission_id::text AS "submissionId"
      `,
      [status],
    );

    return result.rows[0].submissionId;
  }

  async function insertDelivery(options: {
    inningsId: string;
    overNumber: number;
    positionInOver: number;
    sequenceNumber: number;
    submissionId: string;
    strikerId: string;
    nonStrikerId: string;
    bowlerId: string;
  }): Promise<string> {
    const result = await executeQuery<{ eventId: string }>(
      databasePool(),
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 0, 1, $9)
        RETURNING delivery_id::text AS "eventId"
      `,
      [
        options.inningsId,
        options.overNumber,
        options.positionInOver,
        options.sequenceNumber,
        `${options.overNumber}.${options.sequenceNumber}`,
        options.strikerId,
        options.nonStrikerId,
        options.bowlerId,
        options.submissionId,
      ],
    );

    return result.rows[0].eventId;
  }

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });

    const competition = await executeQuery<{ competitionId: string }>(
      pool,
      `
        INSERT INTO competition (name)
        VALUES ($1)
        RETURNING competition_id::text AS "competitionId"
      `,
      [`${sourcePrefix}-competition`],
    );
    const firstCompetitor = await executeQuery<{ competitorId: string }>(
      pool,
      `
        INSERT INTO team (name)
        VALUES ($1)
        RETURNING team_id::text AS "competitorId"
      `,
      [`${sourcePrefix}-first-team`],
    );
    const secondCompetitor = await executeQuery<{ competitorId: string }>(
      pool,
      `
        INSERT INTO team (name)
        VALUES ($1)
        RETURNING team_id::text AS "competitorId"
      `,
      [`${sourcePrefix}-second-team`],
    );

    async function insertPerson(role: string): Promise<string> {
      const result = await executeQuery<{ participantId: string }>(
        databasePool(),
        `
          INSERT INTO person (source_ref, display_name)
          VALUES ($1, $2)
          RETURNING person_id::text AS "participantId"
        `,
        [`${sourcePrefix}-${role}`, `${role} ${sourcePrefix}`],
      );

      return result.rows[0].participantId;
    }

    const strikerId = await insertPerson('striker');
    const nonStrikerId = await insertPerson('non-striker');
    const bowlerId = await insertPerson('bowler');
    const competitionId = competition.rows[0].competitionId;
    const firstCompetitorId = firstCompetitor.rows[0].competitorId;
    const secondCompetitorId = secondCompetitor.rows[0].competitorId;

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
      [fixtureId, firstCompetitorId, secondCompetitorId],
    );
    await executeQuery(
      pool,
      `
        INSERT INTO fixture_squad (fixture_id, person_id, team_id)
        VALUES ($1, $2, $5), ($1, $3, $5), ($1, $4, $6)
      `,
      [fixtureId, strikerId, nonStrikerId, bowlerId, firstCompetitorId, secondCompetitorId],
    );

    const firstInnings = await executeQuery<{ inningsId: string }>(
      pool,
      `
        INSERT INTO innings (fixture_id, ordinal, batting_team_id)
        VALUES ($1, 0, $2)
        RETURNING innings_id::text AS "inningsId"
      `,
      [fixtureId, firstCompetitorId],
    );
    const secondInnings = await executeQuery<{ inningsId: string }>(
      pool,
      `
        INSERT INTO innings (fixture_id, ordinal, batting_team_id)
        VALUES ($1, 1, $2)
        RETURNING innings_id::text AS "inningsId"
      `,
      [fixtureId, secondCompetitorId],
    );
    const firstInningsId = firstInnings.rows[0].inningsId;
    const secondInningsId = secondInnings.rows[0].inningsId;
    const acceptedSubmissionId = await insertSubmission('accepted');
    const pendingSubmissionId = await insertSubmission('pending');
    const rejectedSubmissionId = await insertSubmission('rejected');
    const commonParticipants = {
      strikerId,
      nonStrikerId,
      bowlerId,
    };

    const thirdEventId = await insertDelivery({
      inningsId: secondInningsId,
      overNumber: 0,
      positionInOver: 0,
      sequenceNumber: 1,
      submissionId: acceptedSubmissionId,
      ...commonParticipants,
    });
    const secondEventId = await insertDelivery({
      inningsId: firstInningsId,
      overNumber: 0,
      positionInOver: 1,
      sequenceNumber: 2,
      submissionId: acceptedSubmissionId,
      ...commonParticipants,
    });
    const firstEventId = await insertDelivery({
      inningsId: firstInningsId,
      overNumber: 0,
      positionInOver: 0,
      sequenceNumber: 1,
      submissionId: acceptedSubmissionId,
      ...commonParticipants,
    });

    await insertDelivery({
      inningsId: firstInningsId,
      overNumber: 0,
      positionInOver: 2,
      sequenceNumber: 3,
      submissionId: pendingSubmissionId,
      ...commonParticipants,
    });
    await insertDelivery({
      inningsId: firstInningsId,
      overNumber: 0,
      positionInOver: 3,
      sequenceNumber: 4,
      submissionId: rejectedSubmissionId,
      ...commonParticipants,
    });

    const wicket = await executeQuery<{ wicketId: string }>(
      pool,
      `
        INSERT INTO delivery_wicket (delivery_id, ordinal, kind, source_kind, player_out_id)
        VALUES ($1, 0, 'caught', 'caught', $2)
        RETURNING wicket_id::text AS "wicketId"
      `,
      [secondEventId, strikerId],
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
      competitionId,
      fixtureId,
      firstInningsId,
      secondInningsId,
      firstCompetitorId,
      secondCompetitorId,
      strikerId,
      nonStrikerId,
      bowlerId,
      orderedEventIds: [firstEventId, secondEventId, thirdEventId],
      submissionIds: [acceptedSubmissionId, pendingSubmissionId, rejectedSubmissionId],
    };
  });

  afterAll(async () => {
    if (!pool || !records) {
      return;
    }

    await executeQuery(pool, 'DELETE FROM delivery WHERE innings_id IN ($1, $2)', [
      records.firstInningsId,
      records.secondInningsId,
    ]);
    await executeQuery(pool, 'DELETE FROM submission WHERE submission_id = ANY($1::bigint[])', [
      records.submissionIds,
    ]);
    await executeQuery(pool, 'DELETE FROM fixture WHERE fixture_id = $1', [records.fixtureId]);
    await executeQuery(pool, 'DELETE FROM competition WHERE competition_id = $1', [
      records.competitionId,
    ]);
    await executeQuery(pool, 'DELETE FROM team WHERE team_id IN ($1, $2)', [
      records.firstCompetitorId,
      records.secondCompetitorId,
    ]);
    await executeQuery(pool, 'DELETE FROM person WHERE person_id IN ($1, $2, $3)', [
      records.strikerId,
      records.nonStrikerId,
      records.bowlerId,
    ]);
    await pool.end();
  });

  function app() {
    const repository = createPublicEventRepository(databasePool());
    return createTestApp(undefined, createPublicReadService(repository));
  }

  test('lists only accepted events anonymously in deterministic cursor order', async () => {
    const current = testRecords();
    const firstPage = await request(app())
      .get(`/api/v1/fixtures/${current.fixtureId}/events?limit=2`)
      .expect(200);

    expect(firstPage.body.data.map((event: { eventId: string }) => event.eventId)).toEqual(
      current.orderedEventIds.slice(0, 2),
    );
    expect(firstPage.body.pagination.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(app())
      .get(`/api/v1/fixtures/${current.fixtureId}/events`)
      .query({
        limit: 2,
        cursor: firstPage.body.pagination.nextCursor,
      })
      .expect(200);

    expect(secondPage.body.data.map((event: { eventId: string }) => event.eventId)).toEqual(
      current.orderedEventIds.slice(2),
    );
    expect(secondPage.body.pagination.nextCursor).toBeNull();
  });

  test('filters accepted events and returns privacy-safe stable resources', async () => {
    const current = testRecords();
    const response = await request(app())
      .get(`/api/v1/fixtures/${current.fixtureId}/events`)
      .query({
        inningsId: current.firstInningsId,
        competitorId: current.firstCompetitorId,
        participantId: current.bowlerId,
        overNumber: 0,
        wicketKind: 'caught',
      })
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      eventId: current.orderedEventIds[1],
      fixtureId: current.fixtureId,
      competitionId: current.competitionId,
      competitionName: `${sourcePrefix}-competition`,
      inningsId: current.firstInningsId,
      battingCompetitorId: current.firstCompetitorId,
      battingCompetitorName: `${sourcePrefix}-first-team`,
      bowlingCompetitorId: current.secondCompetitorId,
      bowlingCompetitorName: `${sourcePrefix}-second-team`,
      strikerParticipantId: current.strikerId,
      strikerParticipantName: `striker ${sourcePrefix}`,
      nonStrikerParticipantId: current.nonStrikerId,
      nonStrikerParticipantName: `non-striker ${sourcePrefix}`,
      bowlerParticipantId: current.bowlerId,
      bowlerParticipantName: `bowler ${sourcePrefix}`,
      wickets: [
        {
          kind: 'caught',
          playerOutParticipantId: current.strikerId,
          playerOutParticipantName: `striker ${sourcePrefix}`,
          fielders: [
            {
              participantId: current.bowlerId,
              participantName: `bowler ${sourcePrefix}`,
              isSubstitute: false,
            },
          ],
        },
      ],
    });
    expect(response.body.data[0]).not.toHaveProperty('submissionId');
    expect(response.body.data[0]).not.toHaveProperty('submittedBy');
    expect(response.body.data[0]).not.toHaveProperty('revision');
    expect(response.body.data[0]).not.toHaveProperty('recordedAt');

    const detail = await request(app())
      .get(`/api/v1/fixtures/${current.fixtureId}/events/${current.orderedEventIds[1]}`)
      .expect(200);
    expect(detail.body.data.eventId).toBe(current.orderedEventIds[1]);
  });

  test('uses deterministic keyset pages for the accepted event snapshot', async () => {
    const repository = createDatasetReleaseRepository(databasePool());
    const first = await repository.loadPublishedEventPage(null, 2);
    const second = await repository.loadPublishedEventPage(first.nextCursor, 2);
    expect(first.events).toHaveLength(2);
    expect(second.events.length).toBeGreaterThan(0);
    expect(first.nextCursor).not.toEqual(second.nextCursor);
  });

  test('queues, reuses and retries one durable job for concurrent release requests', async () => {
    const repository = createDatasetReleaseRepository(databasePool());
    const owner = await databasePool().query<{ accountId: string }>(
      `SELECT app_user_id::text AS "accountId" FROM app_user ORDER BY app_user_id LIMIT 1`,
    );
    const version = `${sourcePrefix}-async`;
    const input = {
      version,
      requesterId: owner.rows[0]!.accountId,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem' as const,
    };
    const [first, concurrent] = await Promise.all([
      repository.requestGeneration(input),
      repository.requestGeneration(input),
    ]);
    expect(first.job?.jobId).toBe(concurrent.job?.jobId);
    expect(first.job?.state).toBe('queued');
    const jobId = first.job!.jobId;
    await databasePool().query(
      `UPDATE background_job SET state='failed',last_error_code='TestFailure',last_error_message='Safe test failure.' WHERE job_id=$1::uuid`,
      [jobId],
    );
    const retried = await repository.requestGeneration(input);
    expect(retried.job).toMatchObject({ jobId, state: 'queued', eventsProcessed: 0 });
    const outbox = await databasePool().query<{ count: string }>(
      `SELECT count(*)::text AS count FROM outbox_message WHERE job_id=$1::uuid`,
      [jobId],
    );
    expect(outbox.rows[0]!.count).toBe('2');
  });

  test('keeps a release coherent when a correction is published between streamed pages', async () => {
    const current = testRecords();
    const repository = createDatasetReleaseRepository(databasePool());
    const owner = await databasePool().query<{ accountId: string }>(
      `SELECT app_user_id::text AS "accountId" FROM app_user ORDER BY app_user_id LIMIT 1`,
    );
    const requested = await repository.requestGeneration({
      version: `${sourcePrefix}-snapshot`,
      requesterId: owner.rows[0]!.accountId,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
    });
    const store = new InterleavingObjectStore(async () => {
      const previousId = current.orderedEventIds[2]!;
      await databasePool().query(
        `UPDATE delivery SET superseded_at=now(),superseded_by=delivery_id WHERE delivery_id=$1::bigint`,
        [previousId],
      );
      const replacement = await databasePool().query<{ eventId: string }>(
        `INSERT INTO delivery (
           innings_id,over_number,position_in_over,innings_sequence,ball_number,
           striker_id,non_striker_id,bowler_id,runs_off_bat,runs_extras,runs_total,
           non_boundary,extra_wides,extra_noballs,extra_byes,extra_legbyes,extra_penalty,
           submission_id,source_event_id,submission_event_ordinal,revision,
           supersedes_delivery_id,source_batch_item_id
         ) SELECT
           innings_id,over_number,position_in_over,innings_sequence,ball_number,
           striker_id,non_striker_id,bowler_id,6,runs_extras,6,
           non_boundary,extra_wides,extra_noballs,extra_byes,extra_legbyes,extra_penalty,
           submission_id,source_event_id,submission_event_ordinal,revision+1,
           delivery_id,source_batch_item_id
         FROM delivery WHERE delivery_id=$1::bigint
         RETURNING delivery_id::text AS "eventId"`,
        [previousId],
      );
      await databasePool().query(
        `UPDATE delivery SET superseded_by=$2::bigint WHERE delivery_id=$1::bigint`,
        [previousId, replacement.rows[0]!.eventId],
      );
    });
    const handler = createDatasetReleaseJobHandler(databasePool(), store, workerLogger, {
      workerId: 'snapshot-test-worker',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      pageSize: 1,
    }).handler;

    await handler(
      {
        messageId: 'snapshot-test-message',
        deliveryCount: 1,
        body: {
          type: 'dataset-release.generate',
          version: 1,
          jobId: requested.job!.jobId,
          releaseVersion: `${sourcePrefix}-snapshot`,
          deploymentEnvironment: 'test',
        },
      },
      new AbortController().signal,
    );

    const artifact = JSON.parse(store.object!.toString()) as {
      events: Array<{ eventId: string; runsOffBat: number }>;
    };
    const testEventIds = new Set(current.orderedEventIds);
    const snapshottedTestEvents = artifact.events.filter((event) =>
      testEventIds.has(event.eventId),
    );

    expect(snapshottedTestEvents.map((event) => event.eventId)).toEqual(current.orderedEventIds);

    const correctedSnapshotEvent = snapshottedTestEvents.find(
      (event) => event.eventId === current.orderedEventIds[2],
    );

    expect(correctedSnapshotEvent?.runsOffBat).toBe(1);

    const published = await repository.loadPublishedEventPage(null, 10);
    expect(published.events).toContainEqual(expect.objectContaining({ runsOffBat: 6 }));
  });
});
