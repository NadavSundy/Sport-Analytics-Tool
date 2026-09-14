import {
  BatchPublicationLeaseBusyError,
  publishAcceptedBatchChunk,
  type BatchPublicationChunkResult,
  type QueryExecutor,
} from '@sport-analytics/batch-processing';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';

import { PermanentJobError, type ReceivedJob } from './delivery-pump';
import type { Logger } from './logger';

const batchPublicationJobSchema = z.object({
  type: z.literal('batch.publish'),
  version: z.literal(1),
  commandId: z.string().uuid().optional(),
  jobId: z.string().uuid(),
  batchId: z.string().regex(/^[1-9]\d*$/),
});

interface HandlerOptions {
  workerId: string;
  chunkSize: number;
  leaseMs: number;
}

interface ClaimResult {
  terminal: boolean;
  exhausted: boolean;
  jobId: string;
  batchId: string;
  attemptCount: number;
  maxAttempts: number;
}

type PublishChunk = (
  target: QueryExecutor,
  batchId: string,
  workerId: string,
  options: {
    chunkSize: number;
    leaseMs: number;
  },
) => Promise<BatchPublicationChunkResult>;

class LeaseBusyError extends Error {
  constructor() {
    super('Another worker currently owns the batch publication lease.');
    this.name = 'LeaseBusyError';
  }
}

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
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original processing error.
    }

    throw error;
  } finally {
    client.release();
  }
}

export function createBatchPublicationJobHandler(
  database: Pool,
  logger: Logger,
  options: HandlerOptions,
  publishChunk: PublishChunk = publishAcceptedBatchChunk,
) {
  async function claim(jobId: string, batchId: string): Promise<ClaimResult> {
    return transaction(database, async (client) => {
      const jobResult = await client.query<{
        jobId: string;
        jobState: string;
        attemptCount: number;
        maxAttempts: number;
        batchId: string;
        batchState: string;
        progressCurrent: number;
        progressTotal: number | null;
      }>(
        `
          SELECT
            j.job_id::text AS "jobId",
            j.state::text AS "jobState",
            j.attempt_count AS "attemptCount",
            j.max_attempts AS "maxAttempts",
            j.batch_id::text AS "batchId",
            b.state::text AS "batchState",
            j.progress_current AS "progressCurrent",
            j.progress_total AS "progressTotal"
          FROM background_job j
          JOIN batch b ON b.batch_id = j.batch_id
          WHERE j.job_id = $1::uuid
            AND j.batch_id = $2::bigint
            AND j.job_type = 'batch.publish'
            AND j.contract_version = 1
          FOR UPDATE OF j, b
        `,
        [jobId, batchId],
      );

      const row = jobResult.rows[0];

      if (!row) {
        throw new PermanentJobError(
          'PublicationJobNotFound',
          'Batch publication job does not exist.',
        );
      }

      /*
       * At-least-once delivery means the same command may arrive again after
       * publication has already completed. Treat the durable batch state as
       * authoritative and repair the job state if necessary.
       */
      if (
        row.jobState === 'succeeded' ||
        row.batchState === 'published' ||
        row.batchState === 'partially_published'
      ) {
        if (row.jobState !== 'succeeded') {
          await client.query(
            `
              UPDATE background_job
              SET state='succeeded',
                  progress_current=COALESCE(progress_total, progress_current),
                  completed_at=COALESCE(completed_at, now()),
                  last_error_code=NULL,
                  last_error_message=NULL
              WHERE job_id=$1::uuid
            `,
            [jobId],
          );
        }

        return {
          terminal: true,
          exhausted: false,
          jobId: row.jobId,
          batchId: row.batchId,
          attemptCount: row.attemptCount,
          maxAttempts: row.maxAttempts,
        };
      }

      if (!['queued', 'running', 'failed'].includes(row.jobState)) {
        throw new PermanentJobError(
          'PublicationJobNotRunnable',
          'Batch publication job is not runnable.',
        );
      }

      if (row.batchState !== 'publishing') {
        throw new PermanentJobError('BatchNotPublishing', 'Batch is not in the publishing state.');
      }

      /*
       * Do not let a duplicate Service Bus delivery consume another retry while
       * a different worker still owns a live publication checkpoint lease.
       */
      const checkpoint = await client.query<{
        leaseOwner: string | null;
        leaseExpiresAt: Date | null;
      }>(
        `
          SELECT
            lease_owner AS "leaseOwner",
            lease_expires_at AS "leaseExpiresAt"
          FROM batch_checkpoint
          WHERE batch_id=$1::bigint
            AND phase='publishing'
          FOR UPDATE
        `,
        [batchId],
      );

      const currentLease = checkpoint.rows[0];

      if (
        currentLease?.leaseOwner &&
        currentLease.leaseOwner !== options.workerId &&
        currentLease.leaseExpiresAt &&
        currentLease.leaseExpiresAt.getTime() > Date.now()
      ) {
        throw new LeaseBusyError();
      }

      /*
       * A worker/process can disappear without getting a chance to record a
       * failure. The background job therefore also owns the retry budget.
       *
       * If that budget has already been consumed, make the stranded
       * `publishing` state explicit instead of leaving it there forever.
       */
      if (row.attemptCount >= row.maxAttempts) {
        await client.query(
          `
            UPDATE background_job
            SET state='failed',
                completed_at=now(),
                last_error_code='PUBLICATION_ATTEMPT_BUDGET_EXHAUSTED',
                last_error_message='Batch publication retry budget is exhausted.'
            WHERE job_id=$1::uuid
          `,
          [jobId],
        );

        await client.query(
          `
            UPDATE batch
            SET state='failed'
            WHERE batch_id=$1::bigint
              AND state='publishing'
          `,
          [batchId],
        );

        await client.query(
          `
            UPDATE batch_checkpoint
            SET lease_owner=NULL,
                lease_expires_at=NULL
            WHERE batch_id=$1::bigint
              AND phase='publishing'
          `,
          [batchId],
        );

        await client.query(
          `
            INSERT INTO batch_state_transition (
              batch_id,
              from_state,
              to_state,
              actor_kind,
              actor_identifier,
              reason
            )
            SELECT
              $1::bigint,
              'publishing',
              'failed',
              'worker',
              $2,
              'Publication retry budget exhausted.'
            WHERE EXISTS (
              SELECT 1
              FROM batch
              WHERE batch_id=$1::bigint
                AND state='failed'
            )
              AND NOT EXISTS (
                SELECT 1
                FROM batch_state_transition
                WHERE batch_id=$1::bigint
                  AND from_state='publishing'
                  AND to_state='failed'
                  AND reason='Publication retry budget exhausted.'
              )
          `,
          [batchId, options.workerId],
        );

        return {
          terminal: false,
          exhausted: true,
          jobId: row.jobId,
          batchId: row.batchId,
          attemptCount: row.attemptCount,
          maxAttempts: row.maxAttempts,
        };
      }

      const attemptCount = row.attemptCount + 1;

      await client.query(
        `
          UPDATE background_job
          SET state='running',
              attempt_count=$2::integer,
              started_at=COALESCE(started_at, now()),
              completed_at=NULL,
              last_error_code=NULL,
              last_error_message=NULL
          WHERE job_id=$1::uuid
        `,
        [jobId, attemptCount],
      );

      return {
        terminal: false,
        exhausted: false,
        jobId: row.jobId,
        batchId: row.batchId,
        attemptCount,
        maxAttempts: row.maxAttempts,
      };
    });
  }

  async function recordProgress(jobId: string, processed: number): Promise<void> {
    if (processed <= 0) return;

    await database.query(
      `
        UPDATE background_job
        SET progress_current =
          CASE
            WHEN progress_total IS NULL
              THEN progress_current + $2::integer
            ELSE LEAST(
              progress_total,
              progress_current + $2::integer
            )
          END
        WHERE job_id=$1::uuid
          AND state='running'
      `,
      [jobId, processed],
    );
  }

  async function succeed(jobId: string): Promise<void> {
    await database.query(
      `
        UPDATE background_job
        SET state='succeeded',
            progress_current=COALESCE(progress_total, progress_current),
            completed_at=now(),
            last_error_code=NULL,
            last_error_message=NULL
        WHERE job_id=$1::uuid
      `,
      [jobId],
    );
  }

  async function fail(claimResult: ClaimResult, error: unknown): Promise<boolean> {
    return transaction(database, async (client) => {
      const jobResult = await client.query<{
        attemptCount: number;
        maxAttempts: number;
        state: string;
      }>(
        `
          SELECT
            attempt_count AS "attemptCount",
            max_attempts AS "maxAttempts",
            state::text AS state
          FROM background_job
          WHERE job_id=$1::uuid
          FOR UPDATE
        `,
        [claimResult.jobId],
      );

      const job = jobResult.rows[0];

      if (!job || job.state === 'succeeded') {
        return false;
      }

      const exhausted = job.attemptCount >= job.maxAttempts;

      await client.query(
        `
          UPDATE background_job
          SET state=$2::background_job_state,
              completed_at=CASE
                WHEN $2='failed' THEN now()
                ELSE NULL
              END,
              last_error_code=$3,
              last_error_message=$4
          WHERE job_id=$1::uuid
        `,
        [
          claimResult.jobId,
          exhausted ? 'failed' : 'queued',
          exhausted ? 'PUBLICATION_RETRY_EXHAUSTED' : 'TRANSIENT_PUBLICATION_FAILURE',
          exhausted
            ? 'Batch publication could not complete after its retry budget was exhausted.'
            : 'Batch publication will be retried.',
        ],
      );

      /*
       * Always release our checkpoint lease after a handled failure so a
       * redelivery or replacement worker can resume from the persisted
       * last_ordinal immediately.
       */
      await client.query(
        `
          UPDATE batch_checkpoint
          SET lease_owner=NULL,
              lease_expires_at=NULL
          WHERE batch_id=$1::bigint
            AND phase='publishing'
            AND lease_owner=$2
        `,
        [claimResult.batchId, options.workerId],
      );

      if (exhausted) {
        const batchResult = await client.query<{ state: string }>(
          `
            SELECT state::text AS state
            FROM batch
            WHERE batch_id=$1::bigint
            FOR UPDATE
          `,
          [claimResult.batchId],
        );

        if (batchResult.rows[0]?.state === 'publishing') {
          await client.query(
            `
              UPDATE batch
              SET state='failed'
              WHERE batch_id=$1::bigint
            `,
            [claimResult.batchId],
          );

          await client.query(
            `
              INSERT INTO batch_state_transition (
                batch_id,
                from_state,
                to_state,
                actor_kind,
                actor_identifier,
                reason
              )
              VALUES (
                $1::bigint,
                'publishing',
                'failed',
                'worker',
                $2,
                'Publication retry budget exhausted.'
              )
            `,
            [claimResult.batchId, options.workerId],
          );
        }
      }

      logger.warn('Batch publication attempt failed.', {
        batchId: claimResult.batchId,
        jobId: claimResult.jobId,
        attemptCount: job.attemptCount,
        exhausted,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });

      return exhausted;
    });
  }

  const handler = async (message: ReceivedJob, signal: AbortSignal): Promise<void> => {
    const parsed = batchPublicationJobSchema.safeParse(message.body);

    if (!parsed.success) {
      throw new PermanentJobError(
        'UnsupportedBatchPublicationContract',
        'Invalid batch.publish version 1 command envelope.',
      );
    }

    if (signal.aborted) {
      throw new Error('Worker shutdown interrupted batch publication before it started.');
    }

    let claimResult: ClaimResult;

    try {
      claimResult = await claim(parsed.data.jobId, parsed.data.batchId);
    } catch (error) {
      /*
       * A live checkpoint lease means another delivery/worker is already doing
       * the work. This is retryable, not a poisoned command.
       */
      if (error instanceof LeaseBusyError || error instanceof BatchPublicationLeaseBusyError) {
        throw error;
      }

      throw error;
    }

    if (claimResult.exhausted) {
      throw new PermanentJobError(
        'PublicationAttemptBudgetExhausted',
        'Batch publication retry budget is exhausted.',
      );
    }

    if (claimResult.terminal) {
      logger.info('Duplicate batch publication delivery observed after completion.', {
        batchId: claimResult.batchId,
        jobId: claimResult.jobId,
      });

      return;
    }

    logger.info('Batch publication job started.', {
      batchId: claimResult.batchId,
      jobId: claimResult.jobId,
      attemptCount: claimResult.attemptCount,
    });

    try {
      for (;;) {
        if (signal.aborted) {
          throw new Error('Worker shutdown interrupted batch publication.');
        }

        /*
         * One publication chunk is one database transaction.
         *
         * publishAcceptedBatchChunk() owns the batch checkpoint and advances it
         * only after the chunk has committed successfully. A process restart
         * therefore resumes from the previous committed ordinal.
         */
        const result = await transaction(database, (client) =>
          publishChunk(client, claimResult.batchId, options.workerId, {
            chunkSize: options.chunkSize,
            leaseMs: options.leaseMs,
          }),
        );

        await recordProgress(claimResult.jobId, result.processed);

        logger.debug('Batch publication chunk completed.', {
          batchId: claimResult.batchId,
          jobId: claimResult.jobId,
          processed: result.processed,
          published: result.published,
          duplicateSkipped: result.duplicateSkipped,
          conflicts: result.conflicts,
          complete: result.complete,
        });

        if (result.complete) {
          await succeed(claimResult.jobId);

          logger.info('Batch publication job completed.', {
            batchId: claimResult.batchId,
            jobId: claimResult.jobId,
          });

          return;
        }

        /*
         * Defensive guard: a non-terminal chunk must always advance some work.
         * Otherwise a malformed publication implementation could spin forever.
         */
        if (result.processed <= 0) {
          throw new Error('Batch publication made no progress before reporting incomplete.');
        }
      }
    } catch (error) {
      /*
       * A different worker owning a still-live publication lease is ordinary
       * at-least-once-delivery behaviour. Do not record it as a publication
       * failure; abandoning the message lets the active owner finish.
       */
      if (error instanceof BatchPublicationLeaseBusyError) {
        throw error;
      }

      const exhausted = await fail(claimResult, error);

      if (exhausted) {
        throw new PermanentJobError(
          'PublicationRetryExhausted',
          'Batch publication could not complete after exhausting its retry budget.',
        );
      }

      throw error;
    }
  };

  return {
    handler,
  };
}
