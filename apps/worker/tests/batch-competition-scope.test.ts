import type { PoolClient, QueryResult } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { enforceResolvedCompetitionScope, type PreparedItem } from '../src/batch-validation-job';

function item(ordinal: number, sourceLocation = 'package.json'): PreparedItem {
  return {
    ordinal,
    inningsId: String(20 + ordinal),
    overNumber: 4,
    positionInOver: 2,
    payload: { sequenceNumber: ordinal },
    operation: 'upsert',
    correctsSourceIdentity: null,
    correctionTargetDeliveryId: null,
    sourceIdentity: `cricsheet:delivery:${String(ordinal)}`,
    sourceLocation: { filePath: sourceLocation, rowNumber: ordinal + 1, ordinal },
    referenceResolutionState: 'resolved',
    resolvedReferences: {},
    state: 'accepted',
    rejectionCode: null,
    rejectionMessage: null,
    rejectionDetail: null,
  };
}

function client(rows: unknown[]) {
  return {
    query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length } as QueryResult),
  } as unknown as Pick<PoolClient, 'query'>;
}

describe('resolved batch competition scope', () => {
  it('keeps an event whose resolved fixture belongs to the authorised batch competition', async () => {
    const staged = item(0);

    const results = await enforceResolvedCompetitionScope(
      client([{ ordinal: 0, competitionId: '5' }]),
      [staged],
      '5',
    );

    expect(results).toEqual(new Map());
    expect(staged.state).toBe('accepted');
  });

  it('rejects metadata competition A when the resolved fixture belongs to competition B', async () => {
    const staged = item(0);

    const results = await enforceResolvedCompetitionScope(
      client([{ ordinal: 0, competitionId: '6' }]),
      [staged],
      '5',
    );

    expect(staged).toMatchObject({
      state: 'rejected',
      rejectionCode: 'RESOLVED_COMPETITION_OUT_OF_SCOPE',
      rejectionMessage: 'Resolved fixture is outside the batch competition scope.',
      rejectionDetail: { batchCompetitionId: '5' },
    });
    expect(staged.rejectionMessage).not.toContain('6');
    expect(results.get(0)?.[0]).toMatchObject({
      code: 'RESOLVED_COMPETITION_OUT_OF_SCOPE',
      fieldPath: 'fixture',
      severity: 'error',
    });
  });

  it('applies the same boundary to a reviewer-created fixture resolved for a staged event', async () => {
    const staged = item(7, 'reviewer-created-fixture.json');

    await enforceResolvedCompetitionScope(
      client([{ ordinal: 7, competitionId: '9' }]),
      [staged],
      '5',
    );

    expect(staged.rejectionCode).toBe('RESOLVED_COMPETITION_OUT_OF_SCOPE');
  });
});
