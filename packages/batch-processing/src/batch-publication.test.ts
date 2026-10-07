import type { QueryResult, QueryResultRow } from 'pg';
import { describe, expect, test, vi } from 'vitest';

import {
  BatchPublicationLeaseBusyError,
  publishAcceptedBatchChunk,
  type QueryExecutor,
} from './index';

type JsonObject = Record<string, unknown>;

function queryResult<Row extends QueryResultRow>(
  rows: Row[],
  rowCount: number | null = rows.length,
): QueryResult<Row> {
  return { command: 'SELECT', rowCount, oid: 0, fields: [], rows };
}

function item(ordinal = 0, payloadOverrides: JsonObject = {}, itemOverrides: JsonObject = {}) {
  return {
    batchItemId: String(100 + ordinal),
    batchId: '1',
    ordinal,
    inningsId: '10',
    overNumber: 0,
    positionInOver: ordinal,
    payload: {
      eventId: `11111111-1111-4111-8111-${String(ordinal + 1).padStart(12, '0')}`,
      sequenceNumber: ordinal + 1,
      ballNumber: `0.${ordinal + 1}`,
      strikerId: '11',
      nonStrikerId: '12',
      bowlerId: '13',
      runs: { offBat: 1, extras: 0, total: 1, nonBoundary: false },
      extras: {},
      wickets: [],
      ...payloadOverrides,
    },
    sourceIdentity: `source-${ordinal}`,
    sourceLocation: null,
    referenceResolutionState: 'resolved',
    resolvedReferences: null,
    state: 'accepted',
    rejectionCode: null,
    rejectionDetail: null,
    publishedEventId: null,
    operation: 'upsert',
    correctsSourceIdentity: null,
    correctionTargetDeliveryId: null,
    fixtureId: '20',
    ...itemOverrides,
  };
}

function publishedRow(staged: ReturnType<typeof item>, conflict = false) {
  const payload = staged.payload as JsonObject;
  const runs = payload.runs as JsonObject;
  return {
    batchItemId: staged.batchItemId,
    deliveryId: String(500 + staged.ordinal),
    inningsId: staged.inningsId,
    sequenceNumber: payload.sequenceNumber,
    overNumber: staged.overNumber,
    positionInOver: staged.positionInOver,
    ballNumber: payload.ballNumber,
    strikerId: payload.strikerId,
    nonStrikerId: payload.nonStrikerId,
    bowlerId: payload.bowlerId,
    offBat: conflict ? 9 : runs.offBat,
    runsExtras: runs.extras,
    total: conflict ? 9 : runs.total,
    nonBoundary: runs.nonBoundary,
    wides: null,
    noBalls: null,
    byes: null,
    legByes: null,
    penalty: null,
    wickets: payload.wickets,
  };
}

interface PublicationScenario {
  state?: string;
  items?: ReturnType<typeof item>[];
  publishedMatches?: JsonObject[];
  checkpoint?: { lastOrdinal: number; leaseOwner: string | null; leaseExpiresAt: Date | null };
  remaining?: boolean;
  conflictCount?: number;
  publicationCount?: number;
  checkpointAdvanceCount?: number;
  checkpointReleaseCount?: number;
  correctionTarget?: JsonObject | null;
  snapshotStates?: JsonObject[];
  powerplayFixtureIds?: string[];
  reviewerId?: string | null;
  reviewReason?: string | null;
  reviewedAt?: Date | null;
}

function scenarioExecutor(options: PublicationScenario = {}) {
  const statements: Array<{ text: string; values: unknown[] }> = [];
  const stagedItems = options.items ?? [];
  const snapshots = [...(options.snapshotStates ?? [])];
  const query = vi.fn(
    async <Row extends QueryResultRow>(
      text: string,
      values: unknown[] = [],
    ): Promise<QueryResult<Row>> => {
      statements.push({ text, values });

      if (text.includes('FROM batch\n') && text.includes('LEFT JOIN LATERAL')) {
        return queryResult([
          {
            state: options.state ?? 'publishing',
            submitterId: '7',
            checksum: 'checksum',
            competitionId: '4',
            reviewerId: options.reviewerId === undefined ? '8' : options.reviewerId,
            reviewReason:
              options.reviewReason === undefined ? 'approved after review' : options.reviewReason,
            reviewedAt:
              options.reviewedAt === undefined
                ? new Date('2026-10-05T12:00:00.000Z')
                : options.reviewedAt,
          },
        ] as unknown as Row[]);
      }
      if (text.includes('FROM batch_checkpoint') && text.includes('FOR UPDATE')) {
        return queryResult((options.checkpoint ? [options.checkpoint] : []) as unknown as Row[]);
      }
      if (text.includes('FROM batch_item JOIN innings')) {
        return queryResult(stagedItems as unknown as Row[]);
      }
      if (text.includes('matched_ids AS')) {
        return queryResult((options.publishedMatches ?? []) as Row[]);
      }
      if (text.includes('inserted_submissions AS')) {
        const count = options.publicationCount ?? stagedItems.length;
        return queryResult([{ count: String(count) }] as unknown as Row[]);
      }
      if (text.includes('FROM delivery validated')) {
        return queryResult(
          (options.correctionTarget === undefined
            ? []
            : options.correctionTarget === null
              ? []
              : [options.correctionTarget]) as Row[],
        );
      }
      if (text.includes('SELECT jsonb_build_object(')) {
        const state = snapshots.shift();
        return queryResult((state ? [{ state }] : []) as unknown as Row[]);
      }
      if (text.includes('INSERT INTO delivery (') && text.includes('supersedes_delivery_id')) {
        return queryResult([{ deliveryId: '901' }] as unknown as Row[]);
      }
      if (text.includes('RETURNING wicket_id::text')) {
        return queryResult([{ wicketId: '801' }] as unknown as Row[]);
      }
      if (text.includes('SELECT EXISTS(')) {
        return queryResult([{ exists: options.remaining ?? false }] as unknown as Row[]);
      }
      if (text.includes('SELECT count(*)::text AS count FROM batch_item')) {
        return queryResult([{ count: String(options.conflictCount ?? 0) }] as unknown as Row[]);
      }
      if (text.includes('SELECT DISTINCT innings.fixture_id::text')) {
        return queryResult(
          (options.powerplayFixtureIds ?? ['20']).map((fixtureId) => ({
            fixtureId,
          })) as unknown as Row[],
        );
      }
      if (text.includes('SET last_ordinal=$3::integer')) {
        return queryResult(
          [{ lastOrdinal: stagedItems.at(-1)?.ordinal ?? -1 }] as unknown as Row[],
          options.checkpointAdvanceCount ?? 1,
        );
      }
      if (text.includes('UPDATE batch_checkpoint SET last_ordinal=COALESCE')) {
        return queryResult(
          [{ lastOrdinal: stagedItems.at(-1)?.ordinal ?? -1 }] as unknown as Row[],
          options.checkpointReleaseCount ?? 1,
        );
      }
      return queryResult([] as Row[], 1);
    },
  );

  return { executor: { query } as QueryExecutor, query, statements };
}

function callsContaining(statements: Array<{ text: string; values: unknown[] }>, fragment: string) {
  return statements.filter(({ text }) => text.includes(fragment));
}

describe('publishAcceptedBatchChunk', () => {
  test('publishes multiple deliveries, wickets, fielders, powerplays, and statistics versions', async () => {
    const wicket = {
      kind: 'caught',
      playerOutId: '12',
      fielders: [{ participantId: '14', substitute: true }],
    };
    const items = [
      item(
        0,
        { wickets: [wicket] },
        { resolvedReferences: { innings: { submittedReference: { powerplays: [] } } } },
      ),
      item(1, { extras: { wides: 1 }, runs: { offBat: 0, extras: 1, total: 1 } }),
    ];
    const { executor, statements } = scenarioExecutor({ items, powerplayFixtureIds: ['20'] });

    const result = await publishAcceptedBatchChunk(executor, '1', 'worker-a', { chunkSize: 2 });

    expect(result).toEqual({
      published: 2,
      duplicateSkipped: 0,
      conflicts: 0,
      processed: 2,
      complete: true,
    });
    const publication = callsContaining(statements, 'inserted_submissions AS');
    expect(publication).toHaveLength(1);
    const publicationRows = JSON.parse(publication[0]!.values[2] as string) as JsonObject[];
    expect(publicationRows).toMatchObject([
      { batchItemId: '100', fixtureId: '20', strikerId: '11', total: 1 },
      { batchItemId: '101', wides: 1, runsExtras: 1 },
    ]);
    expect(callsContaining(statements, 'INSERT INTO delivery_wicket (')).toHaveLength(1);
    expect(callsContaining(statements, 'INSERT INTO delivery_wicket_fielder')).toHaveLength(1);
    expect(callsContaining(statements, 'fixture_statistics_cache_version')).toHaveLength(2);
    expect(callsContaining(statements, 'participant_statistics_version')).toHaveLength(1);
    expect(callsContaining(statements, 'DELETE FROM innings_powerplay')).toHaveLength(1);
    expect(callsContaining(statements, 'INSERT INTO innings_powerplay')).toHaveLength(1);
    expect(callsContaining(statements, 'INSERT INTO batch_state_transition')).toHaveLength(1);
  });

  test.each([
    ['exact duplicates', false, 0, 3, 0, "SET state='duplicate_skipped'"],
    ['conflicting published deliveries', true, 0, 0, 3, "state='rejected'"],
  ])(
    'handles %s set-wise without duplicate publication side effects',
    async (_name, conflict, published, duplicateSkipped, conflicts, updateFragment) => {
      const items = [item(0), item(1), item(2)];
      const { executor, statements } = scenarioExecutor({
        items,
        publishedMatches: items.map((value) => publishedRow(value, conflict)),
        conflictCount: conflicts,
      });

      const result = await publishAcceptedBatchChunk(executor, '1', 'worker-replay', {
        chunkSize: 3,
      });

      expect(result).toMatchObject({ published, duplicateSkipped, conflicts, processed: 3 });
      expect(callsContaining(statements, 'inserted_submissions AS')).toHaveLength(0);
      expect(callsContaining(statements, updateFragment)).toHaveLength(1);
      expect(callsContaining(statements, 'participant_statistics_version')).toHaveLength(0);
    },
  );

  test('treats an already finalised batch as an idempotent no-op', async () => {
    const { executor, statements } = scenarioExecutor({ state: 'published', items: [item()] });

    await expect(publishAcceptedBatchChunk(executor, '1', 'worker-replay')).resolves.toEqual({
      published: 0,
      duplicateSkipped: 0,
      conflicts: 0,
      processed: 0,
      complete: true,
    });
    expect(statements).toHaveLength(1);
  });

  test('completes an empty accepted chunk without creating submissions', async () => {
    const { executor, statements } = scenarioExecutor({ items: [], powerplayFixtureIds: [] });

    const result = await publishAcceptedBatchChunk(executor, '1', 'worker-empty');

    expect(result).toMatchObject({ published: 0, processed: 0, complete: true });
    expect(callsContaining(statements, 'inserted_submissions AS')).toHaveLength(0);
    expect(callsContaining(statements, 'UPDATE batch SET state=')).toHaveLength(1);
  });

  test('advances the checkpoint and retains the lease when more items remain', async () => {
    const { executor, statements } = scenarioExecutor({ items: [item(4)], remaining: true });

    const result = await publishAcceptedBatchChunk(executor, '1', 'worker-partial', {
      leaseMs: 1_000,
    });

    expect(result).toMatchObject({ published: 1, processed: 1, complete: false });
    expect(callsContaining(statements, 'SET last_ordinal=$3::integer')[0]?.values).toEqual([
      '1',
      'worker-partial',
      4,
      1_000,
    ]);
    expect(callsContaining(statements, 'UPDATE batch SET state=')).toHaveLength(0);
  });

  test('rejects an active lease owned by another worker', async () => {
    const { executor, statements } = scenarioExecutor({
      checkpoint: {
        lastOrdinal: 4,
        leaseOwner: 'other-worker',
        leaseExpiresAt: new Date(Date.now() + 60_000),
      },
    });

    await expect(publishAcceptedBatchChunk(executor, '1', 'worker-b')).rejects.toBeInstanceOf(
      BatchPublicationLeaseBusyError,
    );
    expect(callsContaining(statements, 'INSERT INTO batch_checkpoint')).toHaveLength(0);
  });

  test('publishes a reviewed correction with replacement wickets and refresh dependencies', async () => {
    const previous = {
      eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      inningsId: '10',
      sequenceNumber: 1,
      overNumber: 0,
      positionInOver: 0,
      ballNumber: '0.1',
      strikerId: '11',
      nonStrikerId: '12',
      bowlerId: '13',
      runs: { offBat: 0, extras: 0, total: 0, nonBoundary: false },
      extras: {},
      wickets: [],
    };
    const correction = item(
      0,
      {
        wickets: [
          {
            kind: 'run out',
            playerOutId: '12',
            fielders: [{ participantId: '14', substitute: false }],
          },
        ],
      },
      {
        operation: 'correction',
        correctsSourceIdentity: 'original-source',
        correctionTargetDeliveryId: '700',
      },
    );
    const { executor, statements } = scenarioExecutor({
      items: [correction],
      correctionTarget: {
        deliveryId: '700',
        fixtureId: '20',
        competitionId: '4',
        season: '2026',
        sourceEventId: previous.eventId,
        submissionId: '600',
        eventOrdinal: 0,
        revision: 2,
        sequenceNumber: 1,
        sourceBatchItemId: '99',
      },
      snapshotStates: [previous, { ...previous, runs: correction.payload.runs }],
    });

    const result = await publishAcceptedBatchChunk(executor, '1', 'worker-correction');

    expect(result).toMatchObject({ published: 1, processed: 1, complete: true });
    expect(callsContaining(statements, 'pg_advisory_xact_lock')).toHaveLength(1);
    expect(callsContaining(statements, 'supersedes_delivery_id')).toHaveLength(1);
    expect(callsContaining(statements, 'INSERT INTO delivery_correction_history')).toHaveLength(1);
    expect(
      callsContaining(statements, 'INSERT INTO statistics_refresh_dependency').length,
    ).toBeGreaterThan(1);
    expect(callsContaining(statements, "UPDATE batch_item SET state='published'")).toHaveLength(1);
  });

  test('stops a correction when reviewer provenance or its validated target is absent', async () => {
    const correction = item(
      0,
      {},
      {
        operation: 'correction',
        correctsSourceIdentity: 'original-source',
        correctionTargetDeliveryId: '700',
      },
    );
    const noReview = scenarioExecutor({ items: [correction], reviewerId: null });
    await expect(
      publishAcceptedBatchChunk(noReview.executor, '1', 'worker-correction'),
    ).rejects.toThrow('no reviewer provenance');
    expect(callsContaining(noReview.statements, 'pg_advisory_xact_lock')).toHaveLength(0);

    const noTarget = scenarioExecutor({ items: [correction], correctionTarget: null });
    await expect(
      publishAcceptedBatchChunk(noTarget.executor, '1', 'worker-correction'),
    ).rejects.toThrow('no longer available in scope');
    expect(callsContaining(noTarget.statements, 'INSERT INTO delivery (')).toHaveLength(0);
  });

  test.each([
    [0, 1, 'Publication chunk size must be positive'],
    [1, 0, 'Publication lease duration must be positive'],
  ])(
    'validates chunk and lease bounds before database access',
    async (chunkSize, leaseMs, message) => {
      const { executor, query } = scenarioExecutor();
      await expect(
        publishAcceptedBatchChunk(executor, '1', 'worker', { chunkSize, leaseMs }),
      ).rejects.toThrow(message);
      expect(query).not.toHaveBeenCalled();
    },
  );

  test('rejects malformed staged payloads before any publication write', async () => {
    const malformed = item(0, { sequenceNumber: 'not-an-integer' });
    const { executor, statements } = scenarioExecutor({ items: [malformed] });

    await expect(publishAcceptedBatchChunk(executor, '1', 'worker')).rejects.toThrow(
      'no integer sequenceNumber',
    );
    expect(callsContaining(statements, 'inserted_submissions AS')).toHaveLength(0);
  });

  test('requires the selected batch state and exact publication cardinality', async () => {
    const wrongState = scenarioExecutor({ state: 'awaiting_review' });
    await expect(publishAcceptedBatchChunk(wrongState.executor, '1', 'worker')).rejects.toThrow(
      'Only an approved batch',
    );

    const concurrent = scenarioExecutor({ items: [item()], publicationCount: 0 });
    await expect(publishAcceptedBatchChunk(concurrent.executor, '1', 'worker')).rejects.toThrow(
      'Concurrent delivery publication requires a retry',
    );
    expect(callsContaining(concurrent.statements, 'UPDATE batch SET state=')).toHaveLength(0);
  });
});
