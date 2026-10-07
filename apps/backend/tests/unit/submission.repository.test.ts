import type {
  CorrectionRequest,
  SubmissionEvent,
  SubmissionRequest,
} from '@sport-analytics/contracts';
import { describe, expect, test, vi } from 'vitest';

import type { Pool, PoolClient } from 'pg';

import {
  SubmissionForbiddenError,
  SubmissionValidationError,
} from '../../src/modules/submissions/submission.errors';
import { createSubmissionRepository } from '../../src/modules/submissions/submission.repository';

const queryResult = <Row>(rows: Row[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

const event: SubmissionEvent = {
  eventId: '123e4567-e89b-42d3-a456-426614174000',
  inningsId: '10',
  sequenceNumber: 1,
  overNumber: 0,
  positionInOver: 0,
  ballNumber: '0.1',
  strikerId: '20',
  nonStrikerId: '21',
  bowlerId: '22',
  runs: { offBat: 4, extras: 0, total: 4, nonBoundary: false },
  extras: {},
  wickets: [],
};

const submission: SubmissionRequest = {
  fixtureId: '7',
  schemaVersion: '1.0',
  events: [event],
};

function poolWithClient(query: ReturnType<typeof vi.fn>) {
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  const pool = { connect: vi.fn().mockResolvedValue(client), query } as unknown as Pool;
  return { pool, release };
}

describe('submission repository', () => {
  test('finds fixture and correction scope while preserving nullable competition data', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([{ fixtureId: '7', competitionId: null }]))
      .mockResolvedValueOnce(
        queryResult([
          {
            fixtureId: '7',
            competitionId: '2',
            season: '2026',
            sequenceNumber: 9,
            deliveryId: '101',
            submissionId: '51',
            eventOrdinal: 0,
            revision: 2,
            sourceBatchItemId: null,
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]));
    const repository = createSubmissionRepository({ query } as unknown as Pool);

    await expect(repository.findFixtureScope('7')).resolves.toEqual({
      fixtureId: '7',
      competitionId: null,
    });
    await expect(repository.findCorrectionTarget(event.eventId)).resolves.toEqual({
      fixtureId: '7',
      competitionId: '2',
      season: '2026',
      sequenceNumber: 9,
    });
    await expect(
      repository.findCorrectionTarget('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    ).resolves.toBeNull();
    expect(query.mock.calls[1]?.[0]).not.toContain('FOR UPDATE OF d');
  });

  test('stores an authorised, reference-valid submission and advances statistics versions atomically', async () => {
    const query = vi.fn(async (sqlValue: unknown) => {
      const sql = String(sqlValue);
      if (sql.includes('AS authorized')) return queryResult([{ authorized: true }]);
      if (sql.includes('AS "inningsIds"')) {
        return queryResult([
          { inningsIds: ['10'], participantIds: ['20', '21', '22'], duplicateEventIds: [] },
        ]);
      }
      if (sql.includes('i.batting_team_id::text')) {
        return queryResult([{ inningsId: '10', battingTeamId: '4', bowlingTeamId: '5' }]);
      }
      if (sql.includes('FROM fixture_squad')) {
        return queryResult([
          { participantId: '20', teamId: '4' },
          { participantId: '21', teamId: '4' },
          { participantId: '22', teamId: '5' },
        ]);
      }
      if (sql.includes('FROM dismissal_kind')) return queryResult([]);
      if (sql.includes('INSERT INTO submission')) {
        return queryResult([
          { submissionId: '51', receivedAt: new Date('2026-09-01T10:00:00.000Z') },
        ]);
      }
      if (sql.includes('INSERT INTO delivery')) return queryResult([{ deliveryId: '101' }]);
      return queryResult([]);
    });
    const { pool, release } = poolWithClient(query);

    const accepted = await createSubmissionRepository(pool).storeAcceptedSubmission(
      submission,
      '7',
      { fileName: 'match.json', mediaType: 'application/json', sizeBytes: 2048 },
      'abc123',
    );

    expect(accepted).toEqual({
      submissionId: '51',
      fixtureId: '7',
      submitterId: '7',
      status: 'accepted',
      receivedAt: '2026-09-01T10:00:00.000Z',
      schemaVersion: '1.0',
      eventCount: 1,
      checksum: 'abc123',
      sourceFile: { fileName: 'match.json', mediaType: 'application/json', sizeBytes: 2048 },
    });
    expect(String(query.mock.calls[0]?.[0])).toBe('BEGIN');
    expect(query.mock.calls.some((call) => String(call[0]).includes('INSERT INTO delivery'))).toBe(
      true,
    );
    expect(
      query.mock.calls.some((call) => String(call[0]).includes('fixture_statistics_cache_version')),
    ).toBe(true);
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  test('rolls back without reference or insert queries when submitter scope is revoked', async () => {
    const query = vi.fn(async (sqlValue: unknown) => {
      const sql = String(sqlValue);
      if (sql.includes('AS authorized')) return queryResult([{ authorized: false }]);
      return queryResult([]);
    });
    const { pool, release } = poolWithClient(query);

    await expect(
      createSubmissionRepository(pool).storeAcceptedSubmission(
        submission,
        '7',
        undefined,
        'abc123',
      ),
    ).rejects.toBeInstanceOf(SubmissionForbiddenError);
    expect(query.mock.calls.map((call) => String(call[0]))).toEqual([
      'BEGIN',
      expect.stringContaining('AS authorized'),
      'ROLLBACK',
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  test('rejects duplicate event identities and performs no submission insert', async () => {
    const query = vi.fn(async (sqlValue: unknown) => {
      const sql = String(sqlValue);
      if (sql.includes('AS authorized')) return queryResult([{ authorized: true }]);
      if (sql.includes('AS "inningsIds"')) {
        return queryResult([
          {
            inningsIds: ['10'],
            participantIds: ['20', '21', '22'],
            duplicateEventIds: [event.eventId],
          },
        ]);
      }
      return queryResult([]);
    });
    const { pool } = poolWithClient(query);

    await expect(
      createSubmissionRepository(pool).storeAcceptedSubmission(
        submission,
        '7',
        undefined,
        'abc123',
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE_EVENT_ID' });
    expect(
      query.mock.calls.some((call) => String(call[0]).includes('INSERT INTO submission')),
    ).toBe(false);
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('ROLLBACK');
  });

  test('stores an immutable correction revision and records all affected statistics scopes', async () => {
    const correction: CorrectionRequest = {
      fixtureId: '7',
      schemaVersion: '1.0',
      reason: 'Correct the scorer transcription.',
      event: {
        inningsId: '10',
        overNumber: 0,
        positionInOver: 0,
        ballNumber: '0.1',
        strikerId: '20',
        nonStrikerId: '21',
        bowlerId: '22',
        runs: { offBat: 6, extras: 0, total: 6, nonBoundary: false },
        extras: {},
        wickets: [],
      },
    };
    const resultingEvent: SubmissionEvent = {
      ...event,
      runs: { ...event.runs, offBat: 6, total: 6 },
    };
    let snapshotReads = 0;
    const query = vi.fn(async (sqlValue: unknown) => {
      const sql = String(sqlValue);
      if (sql.includes('FROM delivery d') && sql.includes('FOR UPDATE OF d')) {
        return queryResult([
          {
            fixtureId: '7',
            competitionId: '2',
            season: '2026',
            sequenceNumber: 1,
            deliveryId: '101',
            submissionId: '51',
            eventOrdinal: 0,
            revision: 1,
            sourceBatchItemId: '88',
          },
        ]);
      }
      if (sql.includes('AS authorized')) return queryResult([{ authorized: true }]);
      if (sql.includes('AS "inningsIds"')) {
        return queryResult([
          { inningsIds: ['10'], participantIds: ['20', '21', '22'], duplicateEventIds: [] },
        ]);
      }
      if (sql.includes('i.batting_team_id::text')) {
        return queryResult([{ inningsId: '10', battingTeamId: '4', bowlingTeamId: '5' }]);
      }
      if (sql.includes('FROM fixture_squad')) {
        return queryResult([
          { participantId: '20', teamId: '4' },
          { participantId: '21', teamId: '4' },
          { participantId: '22', teamId: '5' },
        ]);
      }
      if (sql.includes('FROM dismissal_kind')) return queryResult([]);
      if (sql.includes('SELECT jsonb_build_object')) {
        snapshotReads += 1;
        return queryResult([{ state: snapshotReads === 1 ? event : resultingEvent }]);
      }
      if (sql.includes('INSERT INTO delivery (')) return queryResult([{ deliveryId: '102' }]);
      return queryResult([]);
    });
    const { pool, release } = poolWithClient(query);

    const accepted = await createSubmissionRepository(pool).storeAcceptedCorrection(
      event.eventId,
      correction,
      '7',
    );

    expect(accepted).toMatchObject({
      eventId: event.eventId,
      fixtureId: '7',
      revision: 2,
    });
    expect(accepted.refreshedScopes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scope: 'fixture', participantId: null }),
        expect.objectContaining({ scope: 'career', participantId: '20' }),
      ]),
    );
    expect(query.mock.calls.some((call) => String(call[0]).includes('pg_advisory_xact_lock'))).toBe(
      true,
    );
    expect(
      query.mock.calls.some((call) => String(call[0]).includes('SET superseded_by = $2')),
    ).toBe(true);
    const historyInsert = query.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO delivery_correction_history'),
    );
    expect(historyInsert?.[1]?.slice(0, 5)).toEqual([
      event.eventId,
      '101',
      '102',
      '7',
      'Correct the scorer transcription.',
    ]);
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  test('maps immutable correction history including reviewed and unreviewed revisions', async () => {
    const previousState = event;
    const resultingState = { ...event, runs: { ...event.runs, offBat: 6, total: 6 } };
    const query = vi
      .fn()
      .mockResolvedValueOnce(
        queryResult([
          {
            fixtureId: '7',
            competitionId: '2',
            season: '2026',
            sequenceNumber: 1,
            deliveryId: '102',
            submissionId: '51',
            eventOrdinal: 0,
            revision: 2,
            sourceBatchItemId: '88',
          },
        ]),
      )
      .mockResolvedValueOnce(
        queryResult([
          {
            correctionId: '5',
            previousDeliveryId: '101',
            replacementDeliveryId: '102',
            previousRevision: 1,
            resultingRevision: 2,
            requesterId: '7',
            requesterDisplayName: 'Nadia',
            correctedAt: new Date('2026-09-01T11:00:00.000Z'),
            reason: 'Corrected score.',
            submissionId: '51',
            submissionEventOrdinal: 0,
            batchItemId: '88',
            previousState,
            resultingState,
            reviewerId: '3',
            reviewerDisplayName: 'Reviewer',
            reviewDecision: 'approved',
            reviewedAt: new Date('2026-09-01T11:05:00.000Z'),
            reviewReason: 'Confirmed.',
          },
          {
            correctionId: '6',
            previousDeliveryId: '102',
            replacementDeliveryId: '103',
            previousRevision: 2,
            resultingRevision: 3,
            requesterId: '7',
            requesterDisplayName: null,
            correctedAt: new Date('2026-09-02T11:00:00.000Z'),
            reason: 'Corrected bowler.',
            submissionId: '51',
            submissionEventOrdinal: 0,
            batchItemId: null,
            previousState: resultingState,
            resultingState,
            reviewerId: null,
            reviewerDisplayName: null,
            reviewDecision: null,
            reviewedAt: null,
            reviewReason: null,
          },
        ]),
      );
    const repository = createSubmissionRepository({ query } as unknown as Pool);

    const history = await repository.listCorrectionHistory(event.eventId);
    expect(history).toMatchObject({
      eventId: event.eventId,
      fixtureId: '7',
      corrections: [
        {
          correctionId: '5',
          source: { submissionId: '51', submissionEventOrdinal: 0, batchItemId: '88' },
          review: { decision: 'approved', reviewer: { accountId: '3' } },
        },
        { correctionId: '6', review: null },
      ],
    });
    expect(query.mock.calls[1]?.[0]).toContain(
      'ORDER BY replacement.revision, history.delivery_correction_history_id',
    );
  });

  test('returns a typed not-found error before querying correction history', async () => {
    const query = vi.fn().mockResolvedValue(queryResult([]));
    const repository = createSubmissionRepository({ query } as unknown as Pool);

    await expect(repository.listCorrectionHistory(event.eventId)).rejects.toBeInstanceOf(
      SubmissionValidationError,
    );
    expect(query).toHaveBeenCalledOnce();
  });
});
