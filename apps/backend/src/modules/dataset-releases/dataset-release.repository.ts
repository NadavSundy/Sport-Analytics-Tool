import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

import { executeQuery, getDatabasePool, type QueryExecutor, withTransaction } from '../../database';

export interface DatasetReleaseSnapshot {
  releaseId: string;
  version: string;
  createdAt: string;
  snapshotId: string | null;
  snapshotAsOf: string | null;
  eventCount: number;
  checksum: string;
}

interface DatasetReleaseEventCursor {
  fixtureId: string;
  inningsOrdinal: number;
  sequenceNumber: number;
  eventId: string;
}

interface DatasetReleaseEventPage {
  events: unknown[];
  nextCursor: DatasetReleaseEventCursor | null;
}

interface DatasetReleaseArtifactReference {
  storageKey: string | null;
  legacyArtifactText: string | null;
  storageLocation: 'release' | null;
}

export interface DatasetReleaseJobRecord {
  jobId: string;
  version: string;
  state: 'queued' | 'running' | 'succeeded' | 'failed' | 'dead_lettered' | 'cancelled';
  eventsProcessed: number;
  bytesWritten: number;
  pageNumber: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  release: DatasetReleaseSnapshot | null;
}

interface DatasetReleaseRow extends DatasetReleaseSnapshot {
  artifactStorageKey?: string | null;
  artifactText?: string | null;
  artifactStorageLocation?: 'release' | null;
}

interface DatasetReleaseEventRow extends DatasetReleaseEventCursor {
  event: unknown;
}

interface DatasetReleaseJobRow {
  jobId: string;
  version: string;
  state: DatasetReleaseJobRecord['state'];
  eventsProcessed: string;
  bytesWritten: string;
  pageNumber: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  releaseId: string | null;
  releaseVersion: string | null;
  releaseCreatedAt: string | null;
  releaseSnapshotId: string | null;
  releaseSnapshotAsOf: string | null;
  releaseEventCount: number | null;
  releaseChecksum: string | null;
}

export interface DatasetReleaseRepository {
  loadPublishedEventPage(
    cursor: DatasetReleaseEventCursor | null,
    limit: number,
  ): Promise<DatasetReleaseEventPage>;
  requestGeneration(input: {
    version: string;
    requesterId: string;
    deploymentEnvironment: string;
    storageProvider: 'azure' | 'filesystem';
  }): Promise<{ release: DatasetReleaseSnapshot | null; job: DatasetReleaseJobRecord | null }>;
  findJob(jobId: string, deploymentEnvironment: string): Promise<DatasetReleaseJobRecord | null>;
  list(deploymentEnvironment: string): Promise<DatasetReleaseSnapshot[]>;
  findByVersion(
    version: string,
    deploymentEnvironment: string,
  ): Promise<DatasetReleaseSnapshot | null>;
  findArtifactReferenceByVersion(
    version: string,
    deploymentEnvironment: string,
  ): Promise<DatasetReleaseArtifactReference | null>;
}

const snapshotColumns = `release_id::text AS "releaseId", version, created_at::text AS "createdAt", snapshot_id::text AS "snapshotId", snapshot_as_of::text AS "snapshotAsOf", event_count AS "eventCount", checksum_sha256 AS checksum`;

function mapJob(row: DatasetReleaseJobRow): DatasetReleaseJobRecord {
  return {
    jobId: row.jobId,
    version: row.version,
    state: row.state,
    eventsProcessed: Number(row.eventsProcessed),
    bytesWritten: Number(row.bytesWritten),
    pageNumber: row.pageNumber,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    release:
      row.releaseId &&
      row.releaseVersion &&
      row.releaseCreatedAt &&
      row.releaseEventCount !== null &&
      row.releaseChecksum
        ? {
            releaseId: row.releaseId,
            version: row.releaseVersion,
            createdAt: row.releaseCreatedAt,
            snapshotId: row.releaseSnapshotId,
            snapshotAsOf: row.releaseSnapshotAsOf,
            eventCount: row.releaseEventCount,
            checksum: row.releaseChecksum,
          }
        : null,
  };
}

const jobSelection = `
  j.job_id::text AS "jobId", drj.requested_version AS version, j.state,
  drj.events_processed::text AS "eventsProcessed", drj.bytes_written::text AS "bytesWritten", drj.page_number AS "pageNumber",
  j.created_at::text AS "createdAt", j.started_at::text AS "startedAt", j.completed_at::text AS "completedAt",
  j.last_error_code AS "failureCode", j.last_error_message AS "failureMessage",
  r.release_id::text AS "releaseId", r.version AS "releaseVersion", r.created_at::text AS "releaseCreatedAt",
  r.snapshot_id::text AS "releaseSnapshotId", r.snapshot_as_of::text AS "releaseSnapshotAsOf",
  r.event_count AS "releaseEventCount", r.checksum_sha256 AS "releaseChecksum"
`;

export function createDatasetReleaseRepository(executor?: QueryExecutor): DatasetReleaseRepository {
  const database = () => executor ?? getDatabasePool();
  const transactionPool = () =>
    executor && 'connect' in executor ? (executor as Pool) : getDatabasePool();

  async function findByVersion(version: string, deploymentEnvironment: string) {
    const result = await executeQuery<DatasetReleaseRow>(
      database(),
      `SELECT ${snapshotColumns} FROM dataset_release WHERE deployment_environment=$1 AND version=$2`,
      [deploymentEnvironment, version],
    );
    return result.rows[0] ?? null;
  }

  async function findJobOn(target: QueryExecutor, jobId: string, deploymentEnvironment: string) {
    const result = await executeQuery<DatasetReleaseJobRow>(
      target,
      `SELECT ${jobSelection} FROM dataset_release_job drj INNER JOIN background_job j ON j.job_id=drj.job_id LEFT JOIN dataset_release r ON r.release_id=drj.release_id WHERE drj.job_id=$1::uuid AND drj.deployment_environment=$2`,
      [jobId, deploymentEnvironment],
    );
    return result.rows[0] ? mapJob(result.rows[0]) : null;
  }

  return {
    async loadPublishedEventPage(cursor, limit) {
      const cursorPredicate = cursor
        ? `WHERE (i.fixture_id, i.ordinal) >= ($1::bigint, $2::integer)
             AND (i.fixture_id, i.ordinal, d.innings_sequence, d.delivery_id) > ($1::bigint, $2::integer, $3::integer, $4::bigint)`
        : '';
      const parameters = cursor
        ? [cursor.fixtureId, cursor.inningsOrdinal, cursor.sequenceNumber, cursor.eventId, limit]
        : [limit];
      const limitParameter = cursor ? '$5' : '$1';
      const result = await executeQuery<DatasetReleaseEventRow>(
        database(),
        `
        SELECT json_build_object(
          'eventId', d.delivery_id::text, 'fixtureId', i.fixture_id::text, 'inningsId', i.innings_id::text,
          'inningsOrdinal', i.ordinal, 'sequenceNumber', d.innings_sequence, 'overNumber', d.over_number,
          'positionInOver', d.position_in_over, 'ballNumber', d.ball_number,
          'strikerParticipantId', d.striker_id::text, 'nonStrikerParticipantId', d.non_striker_id::text,
          'bowlerParticipantId', d.bowler_id::text, 'runsOffBat', d.runs_off_bat,
          'runsExtras', d.runs_extras, 'runsTotal', d.runs_total
        ) AS event,
        i.fixture_id::text AS "fixtureId", i.ordinal AS "inningsOrdinal",
        d.innings_sequence AS "sequenceNumber", d.delivery_id::text AS "eventId"
        FROM delivery_current d
        INNER JOIN innings i ON i.innings_id=d.innings_id
        INNER JOIN submission s ON s.submission_id=d.submission_id AND s.status='accepted'
        ${cursorPredicate}
        ORDER BY i.fixture_id, i.ordinal, d.innings_sequence, d.delivery_id
        LIMIT ${limitParameter}`,
        parameters,
      );
      const last = result.rows.at(-1);
      return {
        events: result.rows.map((row) => row.event),
        nextCursor: last
          ? {
              fixtureId: last.fixtureId,
              inningsOrdinal: last.inningsOrdinal,
              sequenceNumber: last.sequenceNumber,
              eventId: last.eventId,
            }
          : null,
      };
    },

    async requestGeneration(input) {
      return withTransaction(transactionPool(), async (client) => {
        await executeQuery(client, `SELECT pg_advisory_xact_lock(hashtext($1))`, [
          `dataset-release:${input.deploymentEnvironment}:${input.version}`,
        ]);
        const existingRelease = await executeQuery<DatasetReleaseRow>(
          client,
          `SELECT ${snapshotColumns} FROM dataset_release WHERE deployment_environment=$1 AND version=$2`,
          [input.deploymentEnvironment, input.version],
        );
        if (existingRelease.rows[0]) return { release: existingRelease.rows[0], job: null };

        const existingJob = await executeQuery<{
          jobId: string;
          state: DatasetReleaseJobRecord['state'];
          leaseExpiresAt: Date | null;
        }>(
          client,
          `SELECT j.job_id::text AS "jobId", j.state,drj.lease_expires_at AS "leaseExpiresAt" FROM dataset_release_job drj INNER JOIN background_job j ON j.job_id=drj.job_id WHERE drj.deployment_environment=$1 AND drj.requested_version=$2 FOR UPDATE OF j, drj`,
          [input.deploymentEnvironment, input.version],
        );
        const priorJob = existingJob.rows[0];
        const retryExpiredRunningJob =
          priorJob?.state === 'running' &&
          (!priorJob.leaseExpiresAt || priorJob.leaseExpiresAt.getTime() <= Date.now());
        const retryExistingJob =
          Boolean(priorJob && ['failed', 'dead_lettered'].includes(priorJob.state)) ||
          retryExpiredRunningJob;
        let jobId = priorJob?.jobId;
        if (!jobId) {
          jobId = randomUUID();
          await executeQuery(
            client,
            `INSERT INTO background_job (job_id,job_type,contract_version,idempotency_key,owner_id) VALUES ($1::uuid,'dataset-release.generate',1,$2,$3::bigint)`,
            [
              jobId,
              `dataset-release.generate:${input.deploymentEnvironment}:${input.version}`,
              input.requesterId,
            ],
          );
          await executeQuery(
            client,
            `INSERT INTO dataset_release_job (job_id,requested_version,deployment_environment,storage_provider) VALUES ($1::uuid,$2,$3,$4)`,
            [jobId, input.version, input.deploymentEnvironment, input.storageProvider],
          );
        } else if (retryExistingJob) {
          await executeQuery(
            client,
            `UPDATE background_job SET state='queued',progress_current=0,progress_total=NULL,attempt_count=0,started_at=NULL,completed_at=NULL,last_error_code=NULL,last_error_message=NULL WHERE job_id=$1::uuid`,
            [jobId],
          );
          await executeQuery(
            client,
            `UPDATE dataset_release_job SET events_processed=0,bytes_written=0,page_number=0,last_fixture_id=NULL,last_innings_ordinal=NULL,last_sequence_number=NULL,last_event_id=NULL,lease_owner=NULL,lease_expires_at=NULL,storage_provider=$2 WHERE job_id=$1::uuid`,
            [jobId, input.storageProvider],
          );
        }

        if (!priorJob || retryExistingJob) {
          const messageId = randomUUID();
          await executeQuery(
            client,
            `INSERT INTO outbox_message (outbox_message_id,job_id,message_type,contract_version,body) VALUES ($1::uuid,$2::uuid,'dataset-release.generate',1,jsonb_build_object('type','dataset-release.generate','version',1,'commandId',$1::text,'jobId',$2::text,'releaseVersion',$3::text,'deploymentEnvironment',$4::text))`,
            [messageId, jobId, input.version, input.deploymentEnvironment],
          );
        }
        return { release: null, job: await findJobOn(client, jobId, input.deploymentEnvironment) };
      });
    },

    findJob(jobId, deploymentEnvironment) {
      return findJobOn(database(), jobId, deploymentEnvironment);
    },
    async list(deploymentEnvironment) {
      const result = await executeQuery<DatasetReleaseRow>(
        database(),
        `SELECT ${snapshotColumns} FROM dataset_release WHERE deployment_environment=$1 ORDER BY created_at DESC,version DESC`,
        [deploymentEnvironment],
      );
      return result.rows;
    },
    findByVersion,
    async findArtifactReferenceByVersion(version, deploymentEnvironment) {
      const result = await executeQuery<DatasetReleaseRow>(
        database(),
        `SELECT artifact_storage_key AS "artifactStorageKey",artifact_text AS "artifactText",artifact_storage_location AS "artifactStorageLocation" FROM dataset_release WHERE deployment_environment=$1 AND version=$2`,
        [deploymentEnvironment, version],
      );
      const row = result.rows[0];
      return row
        ? {
            storageKey: row.artifactStorageKey ?? null,
            legacyArtifactText: row.artifactText ?? null,
            storageLocation: row.artifactStorageLocation ?? null,
          }
        : null;
    },
  };
}
