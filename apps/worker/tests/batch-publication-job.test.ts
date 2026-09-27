import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { createBatchPublicationJobHandler } from '../src/batch-publication-job';
import type { Logger } from '../src/logger';

function fakeDatabase() {
  const calls: Array<{ text: string; values?: unknown[] }> = [];

  const query = vi.fn(async (text: string, values?: unknown[]) => {
    calls.push({ text, values });

    const sql = text.replace(/\s+/g, ' ').toLowerCase();

    if (sql.includes('from background_job j') && sql.includes('join batch b')) {
      return {
        rows: [
          {
            jobId: '11111111-1111-4111-8111-111111111111',
            jobState: 'queued',
            attemptCount: 0,
            maxAttempts: 5,
            batchId: '42',
            batchState: 'publishing',
            progressCurrent: 0,
            progressTotal: 3,
          },
        ],
        rowCount: 1,
      };
    }

    return {
      rows: [],
      rowCount: 1,
    };
  });

  const client = {
    query,
    release: vi.fn(),
  } as unknown as PoolClient;

  return {
    pool: {
      query,
      connect: vi.fn(async () => client),
    } as unknown as Pool,
    calls,
  };
}

function fakeRetryDatabase() {
  let jobState = 'queued';
  let attemptCount = 0;
  let leaseReleased = false;

  const calls: Array<{ text: string; values?: unknown[] }> = [];

  const query = vi.fn(async (text: string, values?: unknown[]) => {
    calls.push({ text, values });

    const sql = text.replace(/\s+/g, ' ').toLowerCase();

    if (sql.includes('from background_job j') && sql.includes('join batch b')) {
      return {
        rows: [
          {
            jobId: '11111111-1111-4111-8111-111111111111',
            jobState,
            attemptCount,
            maxAttempts: 5,
            batchId: '42',
            batchState: 'publishing',
            progressCurrent: 0,
            progressTotal: 3,
          },
        ],
        rowCount: 1,
      };
    }

    if (
      sql.includes('from batch_checkpoint') &&
      sql.includes("phase='publishing'") &&
      sql.includes('for update')
    ) {
      return {
        rows: [
          {
            leaseOwner: null,
            leaseExpiresAt: null,
          },
        ],
        rowCount: 1,
      };
    }

    if (
      sql.includes('select') &&
      sql.includes('attempt_count as "attemptcount"') &&
      sql.includes('from background_job')
    ) {
      return {
        rows: [
          {
            attemptCount,
            maxAttempts: 5,
            state: jobState,
          },
        ],
        rowCount: 1,
      };
    }

    if (sql.includes("set state='running'")) {
      jobState = 'running';
      attemptCount = Number(values?.[1] ?? attemptCount + 1);

      return {
        rows: [],
        rowCount: 1,
      };
    }

    if (sql.includes('set state=$2::background_job_state')) {
      jobState = String(values?.[1]);

      return {
        rows: [],
        rowCount: 1,
      };
    }

    if (sql.includes("set state='succeeded'")) {
      jobState = 'succeeded';

      return {
        rows: [],
        rowCount: 1,
      };
    }

    if (sql.includes('update batch_checkpoint') && sql.includes('lease_owner=null')) {
      leaseReleased = true;

      return {
        rows: [],
        rowCount: 1,
      };
    }

    return {
      rows: [],
      rowCount: 1,
    };
  });

  const client = {
    query,
    release: vi.fn(),
  } as unknown as PoolClient;

  return {
    pool: {
      query,
      connect: vi.fn(async () => client),
    } as unknown as Pool,
    calls,
    state: () => ({
      jobState,
      attemptCount,
      leaseReleased,
    }),
  };
}

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const message = {
  messageId: 'message-1',
  deliveryCount: 1,
  body: {
    type: 'batch.publish',
    version: 1,
    jobId: '11111111-1111-4111-8111-111111111111',
    batchId: '42',
  },
};

describe('batch publication worker job', () => {
  it('claims the durable job, publishes chunks until complete, and marks the job succeeded', async () => {
    const database = fakeDatabase();

    const publishChunk = vi
      .fn()
      .mockResolvedValueOnce({
        published: 2,
        duplicateSkipped: 0,
        conflicts: 0,
        processed: 2,
        complete: false,
      })
      .mockResolvedValueOnce({
        published: 1,
        duplicateSkipped: 0,
        conflicts: 0,
        processed: 1,
        complete: true,
      });

    const handler = createBatchPublicationJobHandler(
      database.pool,
      logger,
      {
        workerId: 'worker-1',
        chunkSize: 100,
        leaseMs: 300_000,
      },
      publishChunk,
    ).handler;

    await handler(message, new AbortController().signal);

    expect(publishChunk).toHaveBeenCalledTimes(2);

    expect(publishChunk).toHaveBeenNthCalledWith(1, expect.anything(), '42', 'worker-1', {
      chunkSize: 100,
      leaseMs: 300_000,
    });

    expect(
      database.calls.some(
        (call) => call.text.includes("state='running'") && call.text.includes('attempt_count'),
      ),
    ).toBe(true);

    expect(
      database.calls.some(
        (call) => call.text.includes("state='succeeded'") && call.text.includes('progress_current'),
      ),
    ).toBe(true);
  });

  it('requeues a transient publication failure and resumes successfully on redelivery', async () => {
    const database = fakeRetryDatabase();

    const publishChunk = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary publication failure.'))
      .mockResolvedValueOnce({
        published: 3,
        duplicateSkipped: 0,
        conflicts: 0,
        processed: 3,
        complete: true,
      });

    const handler = createBatchPublicationJobHandler(
      database.pool,
      logger,
      {
        workerId: 'worker-1',
        chunkSize: 100,
        leaseMs: 300_000,
      },
      publishChunk,
    ).handler;

    await expect(handler(message, new AbortController().signal)).rejects.toThrow(
      'Temporary publication failure.',
    );

    expect(database.state()).toEqual({
      jobState: 'queued',
      attemptCount: 1,
      leaseReleased: true,
    });

    await handler(message, new AbortController().signal);

    expect(publishChunk).toHaveBeenCalledTimes(2);

    expect(database.state()).toEqual({
      jobState: 'succeeded',
      attemptCount: 2,
      leaseReleased: true,
    });
  });
});
