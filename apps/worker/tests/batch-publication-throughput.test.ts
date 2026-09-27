import type { QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it } from 'vitest';

import { publishAcceptedBatchChunk, type QueryExecutor } from '@sport-analytics/batch-processing';

type Scenario = 'duplicate' | 'conflict';

function queryResult<Row extends QueryResultRow>(
  rows: Row[],
  rowCount: number | null = rows.length,
): QueryResult<Row> {
  return {
    command: 'SELECT',
    rowCount,
    oid: 0,
    fields: [],
    rows,
  };
}

function createScenarioExecutor(scenario: Scenario): {
  executor: QueryExecutor;
  statements: string[];
} {
  const statements: string[] = [];

  const items = Array.from({ length: 3 }, (_, ordinal) => ({
    batchItemId: String(100 + ordinal),
    batchId: '1',
    ordinal,
    inningsId: '10',
    overNumber: 0,
    positionInOver: ordinal,
    payload: {
      sequenceNumber: ordinal + 1,
      ballNumber: `0.${ordinal + 1}`,
      strikerId: '11',
      nonStrikerId: '12',
      bowlerId: '13',
      runs: {
        offBat: 0,
        extras: 0,
        total: 0,
        nonBoundary: false,
      },
      extras: {},
      wickets: [],
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
  }));

  const publishedRows = items.map((item, index) => ({
    batchItemId: item.batchItemId,
    deliveryId: String(500 + index),
    inningsId: '10',
    sequenceNumber: index + 1,
    overNumber: 0,
    positionInOver: index,
    ballNumber: `0.${index + 1}`,
    strikerId: '11',
    nonStrikerId: '12',
    bowlerId: '13',
    offBat: scenario === 'conflict' ? 1 : 0,
    runsExtras: 0,
    total: scenario === 'conflict' ? 1 : 0,
    nonBoundary: false,
    wides: null,
    noBalls: null,
    byes: null,
    legByes: null,
    penalty: null,
    wickets: [],
  }));

  const executor: QueryExecutor = {
    async query<Row extends QueryResultRow = QueryResultRow>(
      text: string,
      _values?: unknown[],
    ): Promise<QueryResult<Row>> {
      statements.push(text);

      if (text.includes('FROM batch\n') && text.includes('LEFT JOIN LATERAL')) {
        return queryResult([
          {
            state: 'publishing',
            submitterId: '1',
            checksum: 'checksum',
            competitionId: '4',
            reviewerId: '2',
            reviewReason: 'approved for publication',
            reviewedAt: new Date('2026-09-14T12:00:00.000Z'),
          },
        ] as unknown as Row[]);
      }

      if (
        text.includes('FROM batch_checkpoint') &&
        text.includes("phase='publishing'") &&
        text.includes('FOR UPDATE')
      ) {
        return queryResult([] as Row[]);
      }

      if (text.includes('INSERT INTO batch_checkpoint')) {
        return queryResult([] as Row[], 1);
      }

      if (text.includes('FROM batch_item JOIN innings')) {
        return queryResult(items as unknown as Row[]);
      }

      if (text.includes('matched_ids AS')) {
        return queryResult(publishedRows as unknown as Row[]);
      }

      if (text.includes('SELECT EXISTS(')) {
        return queryResult([{ exists: false }] as unknown as Row[]);
      }

      if (text.includes('SELECT count(*)::text AS count FROM batch_item')) {
        return queryResult([{ count: '0' }] as unknown as Row[]);
      }

      if (text.includes('UPDATE batch_checkpoint SET last_ordinal=COALESCE')) {
        return queryResult([{ lastOrdinal: 2 }] as unknown as Row[], 1);
      }

      return queryResult([] as Row[], 1);
    },
  };

  return { executor, statements };
}

describe('batch publication throughput', () => {
  it('persists all exact duplicates in one set-based statement per chunk', async () => {
    const { executor, statements } = createScenarioExecutor('duplicate');

    const result = await publishAcceptedBatchChunk(executor, '1', 'worker-throughput', {
      chunkSize: 3,
    });

    expect(result).toMatchObject({
      published: 0,
      duplicateSkipped: 3,
      conflicts: 0,
      processed: 3,
      complete: true,
    });

    expect(
      statements.filter((statement) => statement.includes("SET state='duplicate_skipped'")),
    ).toHaveLength(1);
    expect(
      statements.filter((statement) => statement.includes("'EXACT_PUBLISHED_DUPLICATE'")),
    ).toHaveLength(1);
  });

  it('persists all published conflicts in one set-based statement per chunk', async () => {
    const { executor, statements } = createScenarioExecutor('conflict');

    const result = await publishAcceptedBatchChunk(executor, '1', 'worker-throughput', {
      chunkSize: 3,
    });

    expect(result).toMatchObject({
      published: 0,
      duplicateSkipped: 0,
      conflicts: 3,
      processed: 3,
      complete: true,
    });

    expect(
      statements.filter((statement) => statement.includes("SET state='rejected'")),
    ).toHaveLength(1);
    expect(
      statements.filter(
        (statement) =>
          statement.includes('INSERT INTO batch_validation_result') &&
          statement.includes("'PUBLISHED_DELIVERY_CONFLICT'"),
      ),
    ).toHaveLength(1);
  });
});
