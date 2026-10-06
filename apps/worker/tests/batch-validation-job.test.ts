import { Readable } from 'node:stream';

import type { Pool, PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../src/logger';

const packageBoundary = vi.hoisted(() => ({
  candidates: [] as unknown[],
  scanBatchReferences: vi.fn(),
}));

const referenceBoundary = vi.hoisted(() => ({
  resolvePackageReferences: vi.fn(),
}));

vi.mock('../src/batch-package', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/batch-package')>();
  return {
    ...actual,
    scanBatchReferences: packageBoundary.scanBatchReferences,
    normalisedBatchCandidates: async function* (openSource: () => Promise<Readable>) {
      (await openSource()).destroy();
      for (const candidate of packageBoundary.candidates) yield candidate;
    },
  };
});

vi.mock('@sport-analytics/batch-processing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sport-analytics/batch-processing')>();
  return {
    ...actual,
    resolvePackageReferences: referenceBoundary.resolvePackageReferences,
  };
});

import { createBatchValidationJobHandler } from '../src/batch-validation-job';
import { PermanentJobError } from '../src/delivery-pump';

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const message = {
  messageId: 'delivery-1',
  deliveryCount: 1,
  body: {
    type: 'batch.validate',
    version: 1,
    commandId: '11111111-1111-4111-8111-111111111111',
    jobId: '22222222-2222-4222-8222-222222222222',
    batchId: '42',
    batchReference: '33333333-3333-4333-8333-333333333333',
    traceId: 'trace-866',
  },
};

function candidate(ordinal: number) {
  return {
    ordinal,
    filePath: 'season.json',
    rowNumber: ordinal + 1,
    fixtureKey: 'fixture-1',
    inningsKey: 'innings-1',
    packageEnvelope: {
      contractVersion: '1.0',
      packageId: 'test:package:season',
      competition: { context: { name: 'Premier T20' } },
      season: { context: { name: '2026' } },
    },
    fixture: {
      sourceId: 'cricsheet:fixture:100',
      context: {
        date: '2026-03-14',
        teams: [{ context: { name: 'Home' } }, { context: { name: 'Away' } }],
      },
    },
    innings: {
      sourceId: 'app:innings:20',
      context: { ordinal: 1, battingTeam: { context: { name: 'Home' } } },
    },
    event: {
      eventId: `cricsheet:delivery:${String(ordinal + 1)}`,
      occurrenceSequence: ordinal + 1,
      overNumber: 0,
      positionInOver: ordinal,
      ballLabel: `0.${String(ordinal + 1)}`,
      operation: 'upsert' as const,
      striker: { context: { name: 'Striker' } },
      nonStriker: { context: { name: 'Non-striker' } },
      bowler: { context: { name: 'Bowler' } },
      runs: { offBat: 0, extras: 0, total: 0, nonBoundary: false },
      extras: {},
      wickets: [],
    },
  };
}

function resolvedItem(ordinal: number) {
  return {
    referencePath: `fixtures.0.innings.0.events.${String(ordinal)}`,
    inningsId: '20',
    state: 'resolved',
    resolvedReferences: {
      fixture: {
        referencePath: 'fixtures.0',
        entityType: 'fixture',
        state: 'resolved',
        canonicalId: '10',
      },
      participants: {
        striker: { entityType: 'participant', state: 'resolved', canonicalId: '31' },
        nonStriker: { entityType: 'participant', state: 'resolved', canonicalId: '32' },
        bowler: { entityType: 'participant', state: 'resolved', canonicalId: '33' },
      },
    },
  };
}

interface DatabaseScenario {
  acceptedCount?: number;
  attemptCount?: number;
  batchState?: string;
  checkpointLastOrdinal?: number;
  jobState?: string;
  maxAttempts?: number;
  sourceUri?: string | null;
}

function fakeDatabase(scenario: DatabaseScenario = {}) {
  const state = {
    acceptedCount: scenario.acceptedCount ?? 2,
    attemptCount: scenario.attemptCount ?? 0,
    batchState: scenario.batchState ?? 'stored',
    checkpointLastOrdinal: scenario.checkpointLastOrdinal ?? -1,
    jobState: scenario.jobState ?? 'queued',
    maxAttempts: scenario.maxAttempts ?? 3,
    sourceUri:
      scenario.sourceUri === undefined
        ? 'stored-object:44444444-4444-4444-8444-444444444444'
        : scenario.sourceUri,
  };
  const calls: Array<{ text: string; values?: unknown[] }> = [];

  const query = vi.fn(async (text: string, values?: unknown[]) => {
    calls.push({ text, values });
    const sql = text.replace(/\s+/g, ' ').trim().toLowerCase();

    if (sql.includes('from background_job j') && sql.includes('join batch b')) {
      return {
        rows: [
          {
            jobId: message.body.jobId,
            jobState: state.jobState,
            attemptCount: state.attemptCount,
            maxAttempts: state.maxAttempts,
            batchId: message.body.batchId,
            batchReference: message.body.batchReference,
            batchState: state.batchState,
            sourceUri: state.sourceUri,
            competitionId: '5',
          },
        ],
        rowCount: 1,
      };
    }
    if (sql.includes('from batch_checkpoint') && sql.includes('last_ordinal')) {
      return state.checkpointLastOrdinal < 0
        ? { rows: [], rowCount: 0 }
        : {
            rows: [
              {
                lastOrdinal: state.checkpointLastOrdinal,
                leaseOwner: null,
                leaseExpiresAt: null,
              },
            ],
            rowCount: 1,
          };
    }
    if (sql.includes("set state='running'")) {
      state.jobState = 'running';
      state.attemptCount = Number(values?.[1]);
    }
    if (sql.includes('from batch_reference_mapping_decision')) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes('from stored_object')) {
      return {
        rows: [
          {
            storageKey: 'private/season.json',
            mediaType: 'application/json',
            retentionState: 'retained',
          },
        ],
        rowCount: 1,
      };
    }
    if (sql.includes('select code from dismissal_kind')) {
      return { rows: [{ code: 'bowled' }, { code: 'caught' }], rowCount: 2 };
    }
    if (sql.includes('from innings i') && sql.includes('"bowlingteamid"')) {
      return {
        rows: [{ inningsId: '20', battingTeamId: '10', bowlingTeamId: '11' }],
        rowCount: 1,
      };
    }
    if (sql.includes('from innings i') && sql.includes('join fixture_squad')) {
      return {
        rows: [
          { inningsId: '20', participantId: '31', teamId: '10' },
          { inningsId: '20', participantId: '32', teamId: '10' },
          { inningsId: '20', participantId: '33', teamId: '11' },
        ],
        rowCount: 3,
      };
    }
    if (sql.includes('with staged (ordinal, innings_id)')) {
      return {
        rows: packageBoundary.candidates.map((entry) => ({
          ordinal: (entry as { ordinal: number }).ordinal,
          competitionId: '5',
        })),
        rowCount: packageBoundary.candidates.length,
      };
    }
    if (sql.includes('join delivery_current d') || sql.includes('d.source_batch_item_id')) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith('insert into batch_item')) {
      const rows: Array<{ batchItemId: string; ordinal: number }> = [];
      for (let index = 1; index < (values?.length ?? 0); index += 16) {
        rows.push({
          batchItemId: String(900 + Number(values?.[index])),
          ordinal: Number(values?.[index]),
        });
      }
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("count(*) filter (where state='accepted')")) {
      return { rows: [{ accepted: String(state.acceptedCount) }], rowCount: 1 };
    }
    if (sql.includes("resolved_references->'fixture'")) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes('from batch_participant_onboarding_task')) {
      return { rows: [{ outstanding: false }], rowCount: 1 };
    }
    if (sql.includes('from background_job where') && sql.includes('attempt_count')) {
      return {
        rows: [
          {
            attemptCount: state.attemptCount,
            maxAttempts: state.maxAttempts,
            state: state.jobState,
          },
        ],
        rowCount: 1,
      };
    }
    if (sql.includes('select state::text as state from batch')) {
      return { rows: [{ state: state.batchState }], rowCount: 1 };
    }
    if (sql.includes('update background_job set state=$2::background_job_state')) {
      state.jobState = String(values?.[1]);
    }
    if (sql.includes('update batch set state=$2::batch_state')) {
      state.batchState = String(values?.[1]);
    }
    if (sql.includes("update background_job set state='succeeded'")) {
      state.jobState = 'succeeded';
    }
    if (sql.includes('select 1 from batch_checkpoint')) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  });

  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { query, connect: vi.fn(async () => client) } as unknown as Pool;
  return { calls, pool, state };
}

function testHandler(database = fakeDatabase(), chunkSize = 1) {
  const objectStorage = { read: vi.fn(async () => Readable.from('{}')) };
  const job = createBatchValidationJobHandler(database.pool, objectStorage, logger, {
    workerId: 'worker-866',
    chunkSize,
    leaseMs: 120_000,
  });
  return { ...job, database, objectStorage };
}

describe('batch validation worker orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    packageBoundary.candidates = [candidate(0), candidate(1)];
    packageBoundary.scanBatchReferences.mockImplementation(
      async (openSource: () => Promise<Readable>) => {
        (await openSource()).destroy();
        return {
          eventCount: 2,
          fatal: false,
          rejectedOrdinals: new Set<number>(),
          sourceFaults: [],
        };
      },
    );
    referenceBoundary.resolvePackageReferences.mockImplementation(
      async (
        _database: unknown,
        batch: { fixtures: Array<{ innings: Array<{ events: unknown[] }> }> },
      ) => ({
        outcomes: [],
        items: batch.fixtures[0]!.innings[0]!.events.map((_event, index) => resolvedItem(index)),
      }),
    );
  });

  it('processes bounded chunks and commits staged items before finalising the batch', async () => {
    const job = testHandler();

    await job.handler(message, new AbortController().signal);

    expect(referenceBoundary.resolvePackageReferences).toHaveBeenCalledTimes(2);
    expect(job.objectStorage.read).toHaveBeenCalledWith('private/season.json');
    expect(job.metrics).toEqual({
      acceptedItems: 2,
      batchesFailed: 0,
      batchesRejected: 0,
      batchesSucceeded: 1,
      chunksCommitted: 2,
      rejectedItems: 0,
    });
    const sql = job.database.calls.map((call) => call.text.replace(/\s+/g, ' ').toLowerCase());
    expect(sql.filter((text) => text.includes('insert into batch_item'))).toHaveLength(2);
    expect(sql.findIndex((text) => text.includes('insert into batch_item'))).toBeLessThan(
      sql.findIndex((text) => text.includes("set state='succeeded'")),
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Batch validation completed.',
      expect.objectContaining({ finalState: 'awaiting_review', itemCount: 2 }),
    );
  });

  it('treats an already-completed delivery as an idempotent replay', async () => {
    const job = testHandler(fakeDatabase({ jobState: 'succeeded', batchState: 'awaiting_review' }));

    await job.handler(message, new AbortController().signal);

    expect(packageBoundary.scanBatchReferences).not.toHaveBeenCalled();
    expect(job.objectStorage.read).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Duplicate batch validation delivery observed after completion.',
      expect.objectContaining({ jobId: message.body.jobId }),
    );
  });

  it('requeues a transient source-processing failure and releases the lease', async () => {
    const job = testHandler(fakeDatabase({ maxAttempts: 3 }));
    packageBoundary.scanBatchReferences.mockRejectedValueOnce(new Error('object stream reset'));

    await expect(job.handler(message, new AbortController().signal)).rejects.toThrow(
      'object stream reset',
    );

    expect(job.database.state.jobState).toBe('queued');
    expect(job.database.calls).toContainEqual(
      expect.objectContaining({
        values: [
          message.body.jobId,
          'queued',
          'TRANSIENT_PROCESSING_FAILURE',
          'Batch validation will be retried.',
        ],
      }),
    );
    expect(job.database.calls.some((call) => call.text.includes('lease_owner=NULL'))).toBe(true);
    expect(job.metrics.batchesFailed).toBe(0);
  });

  it('persists a permanent invalid-source failure and prevents another retry', async () => {
    const job = testHandler(fakeDatabase({ sourceUri: 'public-url:https://example.test/file' }));

    await expect(job.handler(message, new AbortController().signal)).rejects.toMatchObject({
      name: 'PermanentJobError',
      reason: 'INVALID_SOURCE_REFERENCE',
    });

    expect(job.objectStorage.read).not.toHaveBeenCalled();
    expect(job.database.state.jobState).toBe('failed');
    expect(job.metrics.batchesFailed).toBe(1);
  });

  it('records fatal package faults and rejects a batch with no publishable items', async () => {
    const database = fakeDatabase({ acceptedCount: 0 });
    const job = testHandler(database, 2);
    packageBoundary.candidates = [];
    packageBoundary.scanBatchReferences.mockResolvedValueOnce({
      eventCount: 1,
      fatal: true,
      rejectedOrdinals: new Set([0]),
      sourceFaults: [
        {
          sourceOrdinal: 0,
          ruleCode: 'PACKAGE_STRUCTURE_INVALID',
          filePath: 'season.json',
          rowNumber: null,
          fieldPath: null,
          message: 'The package dependency graph is invalid.',
        },
      ],
    });

    await job.handler(message, new AbortController().signal);

    expect(referenceBoundary.resolvePackageReferences).not.toHaveBeenCalled();
    expect(database.state.batchState).toBe('rejected');
    expect(job.metrics).toMatchObject({ batchesRejected: 1, chunksCommitted: 0 });
    const faultWrite = database.calls.find((call) =>
      call.text.includes('INSERT INTO batch_validation_result'),
    );
    expect(faultWrite?.values).toContain('PACKAGE_STRUCTURE_INVALID');
  });

  it('rejects malformed commands and pre-aborted work before database access', async () => {
    const job = testHandler();

    await expect(
      job.handler(
        { ...message, body: { type: 'batch.validate', version: 2 } },
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(PermanentJobError);

    const controller = new AbortController();
    controller.abort();
    await expect(job.handler(message, controller.signal)).rejects.toThrow(
      'Worker shutdown interrupted batch validation.',
    );
    expect(job.database.pool.connect).not.toHaveBeenCalled();
  });
});
