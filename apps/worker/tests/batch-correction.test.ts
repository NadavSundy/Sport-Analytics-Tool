import type { PoolClient, QueryResult } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  prepareItem,
  resolveCorrectionTargets,
  type PreparedItem,
} from '../src/batch-validation-job';

function item(): PreparedItem {
  return {
    ordinal: 0,
    inningsId: '20',
    overNumber: 4,
    positionInOver: 2,
    payload: { sequenceNumber: 99 },
    operation: 'correction',
    correctsSourceIdentity: 'cricsheet:delivery:target',
    correctionTargetDeliveryId: null,
    sourceIdentity: 'cricsheet:delivery:replacement',
    sourceLocation: { filePath: 'events.json', rowNumber: 1, ordinal: 0 },
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

describe('batch correction target resolution', () => {
  it('carries parsed correction intent into authoritative staged data', () => {
    const prepared = prepareItem(
      {
        ordinal: 3,
        filePath: 'events.json',
        rowNumber: null,
        fixtureKey: 'fixture',
        inningsKey: 'innings',
        packageEnvelope: {
          contractVersion: '1.0',
          packageId: 'test:package:correction',
          competition: { context: { name: 'Competition' } },
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
          context: { ordinal: 0, battingTeam: { context: { name: 'Home' } } },
        },
        event: {
          eventId: 'cricsheet:delivery:replacement',
          occurrenceSequence: 9,
          overNumber: 2,
          positionInOver: 1,
          ballLabel: '2.2',
          operation: 'correction',
          correctsEventId: 'cricsheet:delivery:target',
          striker: { context: { name: 'Striker' } },
          nonStriker: { context: { name: 'Non-striker' } },
          bowler: { context: { name: 'Bowler' } },
          runs: { offBat: 4, extras: 0, total: 4 },
          extras: {},
          wickets: [],
        },
      },
      {
        inningsId: '20',
        state: 'resolved',
        resolvedReferences: {
          participants: {
            striker: { canonicalId: '31' },
            nonStriker: { canonicalId: '32' },
            bowler: { canonicalId: '33' },
          },
        },
      },
      { overNumber: 2, positionInOver: 1 },
    );

    expect(prepared).toMatchObject({
      operation: 'correction',
      correctsSourceIdentity: 'cricsheet:delivery:target',
      correctionTargetDeliveryId: null,
      state: 'accepted',
    });
  });

  it('accepts explicit canonical coordinates when the display label is omitted', () => {
    const candidate = {
      ordinal: 0,
      filePath: 'events.json',
      rowNumber: null,
      fixtureKey: 'fixture',
      inningsKey: 'innings',
      packageEnvelope: {
        contractVersion: '1.0',
        packageId: 'test:package:no-label',
        competition: { context: { name: 'Competition' } },
        season: { context: { name: '2026' } },
      },
      fixture: {
        context: {
          date: '2026-03-14',
          teams: [{ context: { name: 'Home' } }, { context: { name: 'Away' } }],
        },
      },
      innings: { context: { ordinal: 0, battingTeam: { context: { name: 'Home' } } } },
      event: {
        eventId: 'cricsheet:delivery:no-label',
        occurrenceSequence: 1,
        overNumber: 0,
        positionInOver: 0,
        operation: 'upsert' as const,
        striker: { context: { name: 'Striker' } },
        nonStriker: { context: { name: 'Non-striker' } },
        bowler: { context: { name: 'Bowler' } },
        runs: { offBat: 0, extras: 0, total: 0, nonBoundary: false },
        extras: {},
        wickets: [],
      },
    };

    const prepared = prepareItem(
      candidate,
      {
        inningsId: '20',
        state: 'resolved',
        resolvedReferences: {
          participants: {
            striker: { canonicalId: '31' },
            nonStriker: { canonicalId: '32' },
            bowler: { canonicalId: '33' },
          },
        },
      },
      { overNumber: 0, positionInOver: 0 },
    );

    expect(prepared).toMatchObject({ state: 'accepted', overNumber: 0, positionInOver: 0 });
    expect(prepared?.payload).not.toHaveProperty('ballNumber');
  });

  it('resolves one in-scope target and preserves its occurrence sequence', async () => {
    const correction = item();
    const results = await resolveCorrectionTargets(
      client([
        {
          ordinal: 0,
          deliveryId: '41',
          sequenceNumber: 7,
          fixtureId: '10',
          competitionId: '5',
          declaredFixtureId: '10',
          declaredCompetitionId: '5',
        },
      ]),
      [correction],
      '5',
    );

    expect(results).toEqual(new Map());
    expect(correction).toMatchObject({
      state: 'accepted',
      correctionTargetDeliveryId: '41',
      payload: { sequenceNumber: 7 },
    });
  });

  it('rejects a missing target with an actionable field result', async () => {
    const correction = item();
    const results = await resolveCorrectionTargets(client([]), [correction], '5');

    expect(correction.rejectionCode).toBe('CORRECTION_TARGET_NOT_FOUND');
    expect(results.get(0)?.[0]).toMatchObject({
      fieldPath: 'correctsEventId',
      severity: 'error',
    });
  });

  it('rejects an ambiguous target deterministically', async () => {
    const correction = item();
    await resolveCorrectionTargets(
      client([
        {
          ordinal: 0,
          deliveryId: '41',
          sequenceNumber: 7,
          fixtureId: '10',
          competitionId: '5',
          declaredFixtureId: '10',
          declaredCompetitionId: '5',
        },
        {
          ordinal: 0,
          deliveryId: '42',
          sequenceNumber: 7,
          fixtureId: '10',
          competitionId: '5',
          declaredFixtureId: '10',
          declaredCompetitionId: '5',
        },
      ]),
      [correction],
      '5',
    );

    expect(correction.rejectionCode).toBe('CORRECTION_TARGET_AMBIGUOUS');
    expect(correction.rejectionDetail).toEqual({
      correctsEventId: 'cricsheet:delivery:target',
      candidateDeliveryIds: ['41', '42'],
    });
  });

  it.each([
    ['CORRECTION_TARGET_WRONG_FIXTURE', { declaredFixtureId: '11' }],
    ['CORRECTION_TARGET_WRONG_COMPETITION', { competitionId: '6' }],
  ] as const)('rejects %s scope mismatches', async (code, mismatch) => {
    const correction = item();
    await resolveCorrectionTargets(
      client([
        {
          ordinal: 0,
          deliveryId: '41',
          sequenceNumber: 7,
          fixtureId: '10',
          competitionId: '5',
          declaredFixtureId: '10',
          declaredCompetitionId: '5',
          ...mismatch,
        },
      ]),
      [correction],
      '5',
    );

    expect(correction.rejectionCode).toBe(code);
  });
});
