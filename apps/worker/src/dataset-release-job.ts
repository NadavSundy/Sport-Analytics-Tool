import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import {
  DATASET_RELEASE_FIELDS,
  DATASET_RELEASE_FORMAT_VERSION,
  DATASET_RELEASE_SCOPE,
} from '@sport-analytics/contracts';
import type { ObjectStore } from '@sport-analytics/object-storage';
import type { Pool, PoolClient } from 'pg';

import { PermanentJobError, type ReceivedJob } from './delivery-pump';
import type { Logger } from './logger';

const PAGE_SIZE = 10_000;
const SNAPSHOT_PAGE_SIZE = 10_000;

interface Cursor {
  fixtureId: string;
  inningsOrdinal: number;
  sequenceNumber: number;
  eventId: string;
}
interface EventRow extends Cursor {
  event: unknown;
}
interface Claim {
  terminal: boolean;
  attemptCount: number;
  maxAttempts: number;
  previousKey: string | null;
}
interface Command {
  type: 'dataset-release.generate';
  version: 1;
  jobId: string;
  releaseVersion: string;
  deploymentEnvironment: string;
}

class LeaseBusyError extends Error {}

async function transaction<T>(
  database: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function parseCommand(message: ReceivedJob): Command {
  const body = message.body as Partial<Command> | null;
  if (
    !body ||
    body.type !== 'dataset-release.generate' ||
    body.version !== 1 ||
    typeof body.jobId !== 'string' ||
    typeof body.releaseVersion !== 'string' ||
    typeof body.deploymentEnvironment !== 'string'
  ) {
    throw new PermanentJobError('UnsupportedJobContract', 'Dataset release command is invalid.');
  }
  return body as Command;
}

export function createDatasetReleaseJobHandler(
  database: Pool,
  objectStore: ObjectStore,
  logger: Logger,
  options: {
    workerId: string;
    leaseMs: number;
    deploymentEnvironment: string;
    storageProvider: 'azure' | 'filesystem';
    pageSize?: number;
    snapshotPageSize?: number;
  },
) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const snapshotPageSize = options.snapshotPageSize ?? SNAPSHOT_PAGE_SIZE;

  async function claim(command: Command): Promise<Claim> {
    if (command.deploymentEnvironment !== options.deploymentEnvironment) {
      throw new PermanentJobError(
        'DeploymentEnvironmentMismatch',
        'Dataset release command belongs to another deployment environment.',
      );
    }
    return transaction(database, async (client) => {
      const result = await client.query<{
        state: string;
        attemptCount: number;
        maxAttempts: number;
        leaseOwner: string | null;
        leaseExpiresAt: Date | null;
        storageProvider: string;
        attemptStorageKey: string | null;
      }>(
        `
        SELECT j.state::text,j.attempt_count AS "attemptCount",j.max_attempts AS "maxAttempts",
          drj.lease_owner AS "leaseOwner",drj.lease_expires_at AS "leaseExpiresAt",
          drj.storage_provider AS "storageProvider",drj.attempt_storage_key AS "attemptStorageKey"
        FROM background_job j INNER JOIN dataset_release_job drj ON drj.job_id=j.job_id
        WHERE j.job_id=$1::uuid AND j.job_type='dataset-release.generate' AND j.contract_version=1
          AND drj.requested_version=$2 AND drj.deployment_environment=$3
        FOR UPDATE OF j,drj`,
        [command.jobId, command.releaseVersion, command.deploymentEnvironment],
      );
      const row = result.rows[0];
      if (!row) throw new PermanentJobError('JobNotFound', 'Dataset release job does not exist.');
      if (row.storageProvider !== options.storageProvider)
        throw new PermanentJobError(
          'StorageProviderMismatch',
          'Dataset release job storage provider does not match this worker.',
        );
      if (row.state === 'succeeded')
        return {
          terminal: true,
          attemptCount: row.attemptCount,
          maxAttempts: row.maxAttempts,
          previousKey: null,
        };
      if (!['queued', 'running', 'failed'].includes(row.state))
        throw new PermanentJobError('JobNotRunnable', 'Dataset release job is not runnable.');
      if (
        row.leaseOwner &&
        row.leaseOwner !== options.workerId &&
        row.leaseExpiresAt &&
        row.leaseExpiresAt.getTime() > Date.now()
      )
        throw new LeaseBusyError();
      if (row.attemptCount >= row.maxAttempts)
        throw new PermanentJobError(
          'AttemptBudgetExhausted',
          'Dataset release retry budget is exhausted.',
        );
      const attemptCount = row.attemptCount + 1;
      await client.query(
        `UPDATE background_job SET state='running',attempt_count=$2,started_at=COALESCE(started_at,now()),completed_at=NULL,last_error_code=NULL,last_error_message=NULL WHERE job_id=$1::uuid`,
        [command.jobId, attemptCount],
      );
      await client.query(
        `UPDATE dataset_release_job SET events_processed=0,bytes_written=0,page_number=0,last_fixture_id=NULL,last_innings_ordinal=NULL,last_sequence_number=NULL,last_event_id=NULL,lease_owner=$2,lease_expires_at=now()+($3::integer*interval '1 millisecond') WHERE job_id=$1::uuid`,
        [command.jobId, options.workerId, options.leaseMs],
      );
      return {
        terminal: false,
        attemptCount,
        maxAttempts: row.maxAttempts,
        previousKey: row.attemptStorageKey,
      };
    });
  }

  async function materializeSnapshot(jobId: string): Promise<void> {
    await transaction(database, async (client) => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const job = await client.query<{ snapshotId: string | null }>(
        `SELECT snapshot_id::text AS "snapshotId" FROM dataset_release_job WHERE job_id=$1::uuid AND lease_owner=$2 FOR UPDATE`,
        [jobId, options.workerId],
      );
      if (job.rowCount !== 1) throw new LeaseBusyError();
      if (job.rows[0]!.snapshotId) return;
      await client.query(
        `UPDATE dataset_release_job SET snapshot_id=gen_random_uuid(),snapshot_as_of=transaction_timestamp() WHERE job_id=$1::uuid AND lease_owner=$2`,
        [jobId, options.workerId],
      );
      let cursor: Cursor | null = null;
      for (;;) {
        const cursorPredicate: string = cursor
          ? 'WHERE (i.fixture_id,i.ordinal,d.innings_sequence,d.delivery_id)>($2::bigint,$3::integer,$4::integer,$5::bigint)'
          : '';
        const parameters: unknown[] = cursor
          ? [
              jobId,
              cursor.fixtureId,
              cursor.inningsOrdinal,
              cursor.sequenceNumber,
              cursor.eventId,
              snapshotPageSize,
            ]
          : [jobId, snapshotPageSize];
        const limit: string = cursor ? '$6' : '$2';
        const inserted = await client.query<Cursor>(
          `WITH snapshot_candidates AS (
             SELECT d.*,i.fixture_id AS snapshot_fixture_id,i.ordinal AS snapshot_innings_ordinal,
               i.innings_id AS snapshot_innings_id
             FROM delivery_current d INNER JOIN innings i ON i.innings_id=d.innings_id
             INNER JOIN submission s ON s.submission_id=d.submission_id AND s.status='accepted'
             ${cursorPredicate}
             ORDER BY i.fixture_id,i.ordinal,d.innings_sequence,d.delivery_id LIMIT ${limit}
           ), inserted AS (
             INSERT INTO dataset_release_snapshot_event (job_id,fixture_id,innings_ordinal,sequence_number,event_id,event)
             SELECT $1::uuid,d.snapshot_fixture_id,d.snapshot_innings_ordinal,d.innings_sequence,d.delivery_id,jsonb_build_object(
               'eventId',d.source_event_id::text,'fixtureId',d.snapshot_fixture_id::text,'inningsId',d.snapshot_innings_id::text,
               'inningsOrdinal',d.snapshot_innings_ordinal,'sequenceNumber',d.innings_sequence,'overNumber',d.over_number,
               'positionInOver',d.position_in_over,'ballNumber',d.ball_number,'strikerParticipantId',d.striker_id::text,
               'nonStrikerParticipantId',d.non_striker_id::text,'bowlerParticipantId',d.bowler_id::text,
               'runsOffBat',d.runs_off_bat,'runsExtras',d.runs_extras,'runsTotal',d.runs_total,
               'runsNonBoundary',d.non_boundary,
               'extras',jsonb_strip_nulls(jsonb_build_object(
                 'wides',d.extra_wides,'noBalls',d.extra_noballs,'byes',d.extra_byes,
                 'legByes',d.extra_legbyes,'penalty',d.extra_penalty)),
               'wickets',COALESCE((SELECT jsonb_agg(jsonb_build_object(
                 'wicketId',w.wicket_id::text,'kind',w.kind,'sourceKind',w.source_kind,
                 'playerOutParticipantId',w.player_out_id::text,
                 'fielders',COALESCE((SELECT jsonb_agg(jsonb_build_object(
                   'participantId',f.person_id::text,'isSubstitute',f.is_substitute) ORDER BY f.ordinal)
                   FROM delivery_wicket_fielder f WHERE f.wicket_id=w.wicket_id),'[]'::jsonb)) ORDER BY w.ordinal)
                 FROM delivery_wicket w WHERE w.delivery_id=d.delivery_id),'[]'::jsonb))
             FROM snapshot_candidates d ON CONFLICT DO NOTHING
             RETURNING fixture_id::text AS "fixtureId",innings_ordinal AS "inningsOrdinal",
               sequence_number AS "sequenceNumber",event_id::text AS "eventId"
           )
           SELECT * FROM inserted ORDER BY "fixtureId"::bigint,"inningsOrdinal","sequenceNumber","eventId"::bigint`,
          parameters,
        );
        const last: Cursor | undefined = inserted.rows.at(-1);
        if (!last) break;
        cursor = last;
        if (inserted.rows.length < snapshotPageSize) break;
      }
    });
  }

  async function loadPage(
    jobId: string,
    cursor: Cursor | null,
  ): Promise<{ events: unknown[]; next: Cursor | null }> {
    const predicate = cursor
      ? `WHERE se.job_id=$1::uuid AND (se.fixture_id,se.innings_ordinal,se.sequence_number,se.event_id)>($2::bigint,$3::integer,$4::integer,$5::bigint)`
      : 'WHERE se.job_id=$1::uuid';
    const params = cursor
      ? [
          jobId,
          cursor.fixtureId,
          cursor.inningsOrdinal,
          cursor.sequenceNumber,
          cursor.eventId,
          pageSize,
        ]
      : [jobId, pageSize];
    const limit = cursor ? '$6' : '$2';
    const result = await database.query<EventRow>(
      `SELECT se.event,se.fixture_id::text AS "fixtureId",se.innings_ordinal AS "inningsOrdinal",se.sequence_number AS "sequenceNumber",se.event_id::text AS "eventId"
      FROM dataset_release_snapshot_event se ${predicate}
      ORDER BY se.fixture_id,se.innings_ordinal,se.sequence_number,se.event_id LIMIT ${limit}`,
      params,
    );
    const last = result.rows.at(-1);
    return {
      events: result.rows.map((row) => row.event),
      next: last
        ? {
            fixtureId: last.fixtureId,
            inningsOrdinal: last.inningsOrdinal,
            sequenceNumber: last.sequenceNumber,
            eventId: last.eventId,
          }
        : null,
    };
  }

  async function updateProgress(
    jobId: string,
    cursor: Cursor | null,
    events: number,
    bytes: number,
    page: number,
  ) {
    const result = await database.query(
      `UPDATE dataset_release_job SET events_processed=$3,bytes_written=$4,page_number=$5,last_fixture_id=$6::bigint,last_innings_ordinal=$7,last_sequence_number=$8,last_event_id=$9::bigint,lease_expires_at=now()+($10::integer*interval '1 millisecond') WHERE job_id=$1::uuid AND lease_owner=$2`,
      [
        jobId,
        options.workerId,
        events,
        bytes,
        page,
        cursor?.fixtureId ?? null,
        cursor?.inningsOrdinal ?? null,
        cursor?.sequenceNumber ?? null,
        cursor?.eventId ?? null,
        options.leaseMs,
      ],
    );
    if (result.rowCount !== 1) throw new LeaseBusyError();
    await database.query(`UPDATE background_job SET progress_current=$2 WHERE job_id=$1::uuid`, [
      jobId,
      events,
    ]);
  }

  async function markFailed(
    jobId: string,
    attemptCount: number,
    maxAttempts: number,
    error: unknown,
    artifactCleaned = true,
  ) {
    const permanent = attemptCount >= maxAttempts;
    const code =
      error instanceof LeaseBusyError
        ? 'LeaseBusy'
        : error instanceof Error
          ? error.name
          : 'GenerationFailed';
    const message =
      error instanceof LeaseBusyError
        ? 'Another worker owns the active generation lease.'
        : 'Dataset release generation failed; see safe worker progress logs.';
    await database.query(
      `UPDATE background_job SET state=$2::background_job_state,completed_at=CASE WHEN $2='dead_lettered' THEN now() ELSE NULL END,last_error_code=$3,last_error_message=$4 WHERE job_id=$1::uuid AND state<>'succeeded'`,
      [jobId, permanent ? 'dead_lettered' : 'failed', code, message],
    );
    await database.query(
      `UPDATE dataset_release_job SET lease_owner=NULL,lease_expires_at=NULL,attempt_storage_key=CASE WHEN $3 THEN NULL ELSE attempt_storage_key END WHERE job_id=$1::uuid AND lease_owner=$2`,
      [jobId, options.workerId, artifactCleaned],
    );
    if (permanent) throw new PermanentJobError('AttemptBudgetExhausted', message);
  }

  async function handler(message: ReceivedJob, signal: AbortSignal): Promise<void> {
    const command = parseCommand(message);
    const started = Date.now();
    const claimed = await claim(command);
    if (claimed.terminal) return;
    try {
      logger.info('Dataset release snapshot materialization started.', {
        jobId: command.jobId,
        releaseVersion: command.releaseVersion,
      });
      await materializeSnapshot(command.jobId);
      logger.info('Dataset release snapshot materialization completed.', {
        jobId: command.jobId,
        releaseVersion: command.releaseVersion,
        elapsedMs: Date.now() - started,
      });
    } catch (error) {
      logger.error('Dataset release snapshot materialization failed.', {
        jobId: command.jobId,
        releaseVersion: command.releaseVersion,
        elapsedMs: Date.now() - started,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      await markFailed(command.jobId, claimed.attemptCount, claimed.maxAttempts, error);
      throw error;
    }
    if (claimed.previousKey) {
      try {
        await objectStore.delete(claimed.previousKey);
      } catch (error) {
        await markFailed(command.jobId, claimed.attemptCount, claimed.maxAttempts, error, false);
        throw error;
      }
    }
    const storageKey = `${randomUUID()}.json`;
    await database.query(
      `UPDATE dataset_release_job SET attempt_storage_key=$2 WHERE job_id=$1::uuid AND lease_owner=$3`,
      [command.jobId, storageKey, options.workerId],
    );
    let events = 0,
      bytes = 0,
      page = 0;
    const hash = createHash('sha256');
    const emit = (value: string) => {
      const chunk = Buffer.from(value);
      hash.update(chunk);
      bytes += chunk.length;
      return chunk;
    };
    async function* artifact() {
      yield emit(
        `{"formatVersion":${JSON.stringify(DATASET_RELEASE_FORMAT_VERSION)},"scope":${JSON.stringify(DATASET_RELEASE_SCOPE)},"fields":${JSON.stringify(DATASET_RELEASE_FIELDS)},"events":[`,
      );
      let cursor: Cursor | null = null;
      let first = true;
      while (true) {
        if (signal.aborted) throw new Error('Dataset release generation was interrupted.');
        page += 1;
        logger.info('Dataset release database page read started.', {
          jobId: command.jobId,
          releaseVersion: command.releaseVersion,
          pageNumber: page,
          eventsProcessed: events,
          bytesWritten: bytes,
        });
        const loaded = await loadPage(command.jobId, cursor);
        for (const event of loaded.events) {
          const serialized = JSON.stringify(event);
          if (serialized === undefined)
            throw new Error('A published dataset event could not be serialized.');
          yield emit(`${first ? '' : ','}${serialized}`);
          first = false;
          events += 1;
        }
        cursor = loaded.next;
        await updateProgress(command.jobId, cursor, events, bytes, page);
        logger.info('Dataset release database page read completed.', {
          jobId: command.jobId,
          releaseVersion: command.releaseVersion,
          pageNumber: page,
          eventsProcessed: events,
          bytesWritten: bytes,
          lastFixtureId: cursor?.fixtureId,
          lastInningsOrdinal: cursor?.inningsOrdinal,
          lastSequenceNumber: cursor?.sequenceNumber,
          lastEventId: cursor?.eventId,
          elapsedMs: Date.now() - started,
        });
        if (loaded.events.length < pageSize || !cursor) break;
      }
      yield emit(']}');
    }
    const source = Readable.from(artifact());
    try {
      logger.info('Dataset release artifact write started.', {
        jobId: command.jobId,
        releaseVersion: command.releaseVersion,
      });
      const stored = await objectStore.write(storageKey, source);
      const checksum = hash.digest('hex');
      logger.info('Dataset release artifact write completed.', {
        jobId: command.jobId,
        releaseVersion: command.releaseVersion,
        eventsProcessed: events,
        bytesWritten: bytes,
        elapsedMs: Date.now() - started,
      });
      const created = await transaction(database, async (client) => {
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
          `dataset-release:${command.deploymentEnvironment}:${command.releaseVersion}`,
        ]);
        const inserted = await client.query<{ releaseId: string }>(
          `INSERT INTO dataset_release (version,deployment_environment,format_version,scope,event_count,fields,artifact_storage_key,artifact_provider_version_id,artifact_storage_provider,artifact_storage_location,checksum_sha256,snapshot_id,snapshot_as_of)
           SELECT $1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,'release',$10,drj.snapshot_id,drj.snapshot_as_of
           FROM dataset_release_job drj WHERE drj.job_id=$11::uuid
           ON CONFLICT (deployment_environment,version) DO NOTHING RETURNING release_id::text AS "releaseId"`,
          [
            command.releaseVersion,
            command.deploymentEnvironment,
            DATASET_RELEASE_FORMAT_VERSION,
            DATASET_RELEASE_SCOPE,
            events,
            JSON.stringify(DATASET_RELEASE_FIELDS),
            storageKey,
            stored.versionId,
            options.storageProvider,
            checksum,
            command.jobId,
          ],
        );
        let releaseId = inserted.rows[0]?.releaseId;
        if (!releaseId)
          releaseId = (
            await client.query<{ releaseId: string }>(
              `SELECT release_id::text AS "releaseId" FROM dataset_release WHERE deployment_environment=$1 AND version=$2`,
              [command.deploymentEnvironment, command.releaseVersion],
            )
          ).rows[0]!.releaseId;
        await client.query(
          `UPDATE dataset_release_job SET release_id=$2::uuid,events_processed=$3,bytes_written=$4,page_number=$5,lease_owner=NULL,lease_expires_at=NULL,attempt_storage_key=NULL WHERE job_id=$1::uuid`,
          [command.jobId, releaseId, events, bytes, page],
        );
        await client.query(
          `UPDATE background_job SET state='succeeded',progress_current=$2,progress_total=$2,completed_at=now(),last_error_code=NULL,last_error_message=NULL WHERE job_id=$1::uuid`,
          [command.jobId, events],
        );
        return Boolean(inserted.rows[0]);
      });
      if (!created) {
        try {
          await objectStore.delete(storageKey);
        } catch {
          await database.query(
            `UPDATE dataset_release_job SET attempt_storage_key=$2 WHERE job_id=$1::uuid`,
            [command.jobId, storageKey],
          );
          logger.warn('Race-losing dataset release artifact requires reconciliation.', {
            jobId: command.jobId,
            releaseVersion: command.releaseVersion,
          });
        }
      }
      logger.info('Dataset release metadata persisted.', {
        jobId: command.jobId,
        releaseVersion: command.releaseVersion,
        eventsProcessed: events,
        bytesWritten: bytes,
        elapsedMs: Date.now() - started,
      });
    } catch (error) {
      source.destroy();
      let artifactCleaned = true;
      try {
        await objectStore.delete(storageKey);
      } catch {
        artifactCleaned = false;
      }
      logger.error('Dataset release generation failed and cleanup was attempted.', {
        jobId: command.jobId,
        releaseVersion: command.releaseVersion,
        pageNumber: page,
        eventsProcessed: events,
        bytesWritten: bytes,
        elapsedMs: Date.now() - started,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      await markFailed(
        command.jobId,
        claimed.attemptCount,
        claimed.maxAttempts,
        error,
        artifactCleaned,
      );
      throw error;
    }
  }
  return { handler };
}
