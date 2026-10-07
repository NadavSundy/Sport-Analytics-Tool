import { describe, expect, test, vi } from 'vitest';

import type { Pool, PoolClient } from 'pg';

import type { QueryExecutor } from '../../src/database';
import type { ParticipantAggregateRow } from '../../src/modules/statistics/participant-aggregates.model';
import {
  createParticipantAggregateSnapshotStore,
  invalidateParticipantAggregateSnapshots,
  participantAggregateScopeKey,
  refreshParticipantAggregateSnapshots,
  type ParticipantAggregateSnapshotStore,
} from '../../src/modules/statistics/participant-aggregates.snapshot';

const aggregateRow = (
  overrides: Partial<ParticipantAggregateRow> = {},
): ParticipantAggregateRow => ({
  competitionGrouped: false,
  seasonGrouped: false,
  competitionId: null,
  competitionName: null,
  season: null,
  appearances: 4,
  fixtureCount: 3,
  sourceEventCount: 120,
  battingDeliveryCount: 40,
  runsScored: 52,
  ballsFaced: 36,
  fours: 5,
  sixes: 2,
  battingInnings: 3,
  battingDismissals: 2,
  fifties: 1,
  hundreds: 0,
  highestScore: 52,
  highestScoreNotOut: false,
  bowlingDeliveryCount: 24,
  runsConceded: 22,
  wides: 1,
  noBalls: 0,
  legalBallsBowled: 23,
  wicketsTaken: 2,
  bowlingInnings: 2,
  fourWicketHauls: 0,
  fiveWicketHauls: 0,
  bestBowlingWickets: 2,
  bestBowlingRuns: 12,
  catches: 1,
  stumpings: 0,
  runOutInvolvements: 0,
  ballsPerOver: 6,
  ...overrides,
});

const queryResult = <Row>(rows: Row[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

describe('participant aggregate snapshot store', () => {
  test('builds stable keys for career, competition, and season scopes', () => {
    expect(participantAggregateScopeKey(aggregateRow())).toBe('career');
    expect(
      participantAggregateScopeKey(aggregateRow({ competitionGrouped: true, competitionId: '2' })),
    ).toBe('competition:2');
    expect(
      participantAggregateScopeKey(
        aggregateRow({
          competitionGrouped: true,
          seasonGrouped: true,
          competitionId: '2',
          season: '2026',
        }),
      ),
    ).toBe('season:2:2026');
  });

  test('reads current rows, maps data versions, and distinguishes absent and untracked participants', async () => {
    const currentRows = [aggregateRow()];
    const query = vi
      .fn()
      .mockResolvedValueOnce(
        queryResult([
          {
            participantId: '11',
            participantName: 'Asha Patel',
            dataVersion: '7',
            rows: currentRows,
          },
        ]),
      )
      .mockResolvedValueOnce(
        queryResult([
          {
            participantId: '12',
            participantName: 'Bina Singh',
            dataVersion: null,
            rows: [],
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]));
    const store = createParticipantAggregateSnapshotStore({ query } as unknown as Pool);

    await expect(store.read('11')).resolves.toEqual({
      participantId: '11',
      participantName: 'Asha Patel',
      dataVersion: 7,
      rows: currentRows,
    });
    await expect(store.read('12')).resolves.toMatchObject({ dataVersion: null, rows: null });
    await expect(store.read('404')).resolves.toBeNull();
    expect(query.mock.calls[0]?.[0]).toContain('state.definition_version = $2');
  });

  test('writes changed scope rows transactionally and preserves unchanged scopes in SQL', async () => {
    const query = vi.fn(async (sqlValue: unknown) => {
      const sql = String(sqlValue);
      if (sql.includes('pg_try_advisory_xact_lock')) return queryResult([{ acquired: true }]);
      if (sql.includes('FROM participant_statistics_version')) {
        return queryResult([{ dataVersion: '7' }]);
      }
      if (sql.includes('FROM participant_aggregate_snapshot_state')) {
        return queryResult([{ current: false }]);
      }
      return queryResult([]);
    });
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;
    const rows = [aggregateRow(), aggregateRow({ competitionGrouped: true, competitionId: '2' })];

    await expect(createParticipantAggregateSnapshotStore(pool).write('11', 7, rows)).resolves.toBe(
      'refreshed',
    );

    expect(String(query.mock.calls[0]?.[0])).toBe('BEGIN');
    expect(query.mock.calls.some((call) => String(call[0]).includes("lock_timeout = '1ms'"))).toBe(
      true,
    );
    const deleteCall = query.mock.calls.find((call) => String(call[0]).includes('DELETE FROM'));
    expect(deleteCall?.[1]).toEqual(['11', ['career', 'competition:2']]);
    const upsertCall = query.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO participant_aggregate_snapshot AS snapshot'),
    );
    expect(upsertCall?.[0]).toContain('WHERE snapshot.payload IS DISTINCT FROM EXCLUDED.payload');
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  test('returns busy, untracked, stale, and current outcomes without writing snapshots', async () => {
    async function outcome(options: {
      acquired?: boolean;
      version?: string;
      current?: boolean;
      lockError?: boolean;
    }) {
      const query = vi.fn(async (sqlValue: unknown) => {
        const sql = String(sqlValue);
        if (sql.includes('pg_try_advisory_xact_lock')) {
          return queryResult([{ acquired: options.acquired ?? true }]);
        }
        if (sql.includes('FROM participant_statistics_version')) {
          if (options.lockError) throw { code: '55P03' };
          return queryResult(
            options.version === undefined ? [] : [{ dataVersion: options.version }],
          );
        }
        if (sql.includes('FROM participant_aggregate_snapshot_state')) {
          return queryResult([{ current: options.current ?? false }]);
        }
        return queryResult([]);
      });
      const client = { query, release: vi.fn() } as unknown as PoolClient;
      const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;
      return createParticipantAggregateSnapshotStore(pool).write('11', 7, [aggregateRow()]);
    }

    await expect(outcome({ acquired: false })).resolves.toBe('busy');
    await expect(outcome({})).resolves.toBe('untracked');
    await expect(outcome({ version: '6' })).resolves.toBe('stale');
    await expect(outcome({ version: '7', current: true })).resolves.toBe('current');
    await expect(outcome({ lockError: true })).resolves.toBe('busy');
  });

  test('records bounded failure details best-effort and never replaces the original failure', async () => {
    const query = vi.fn(async (sqlValue: unknown) => {
      const sql = String(sqlValue);
      if (sql.includes('pg_try_advisory_xact_lock')) return queryResult([{ acquired: true }]);
      return queryResult([]);
    });
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;
    const store = createParticipantAggregateSnapshotStore(pool);

    await expect(store.recordFailure('11', new Error('x'.repeat(700)))).resolves.toBeUndefined();
    const insert = query.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO participant_aggregate_snapshot_state'),
    );
    expect(String(insert?.[1]?.[1])).toHaveLength(500);

    const failingClient = {
      query: vi.fn().mockRejectedValue(new Error('database unavailable')),
      release: vi.fn(),
    } as unknown as PoolClient;
    const failingPool = {
      connect: vi.fn().mockResolvedValue(failingClient),
    } as unknown as Pool;
    await expect(
      createParticipantAggregateSnapshotStore(failingPool).recordFailure('11', 'original'),
    ).resolves.toBeUndefined();
  });
});

describe('participant aggregate snapshot refresh', () => {
  test('handles absent, untracked, current, refreshed, and failed participants independently', async () => {
    const read = vi.fn<ParticipantAggregateSnapshotStore['read']>(async (participantId) => {
      if (participantId === 'absent') return null;
      if (participantId === 'untracked') {
        return { participantId, participantName: 'Untracked', dataVersion: null, rows: null };
      }
      if (participantId === 'current') {
        return {
          participantId,
          participantName: 'Current',
          dataVersion: 4,
          rows: [aggregateRow()],
        };
      }
      if (participantId === 'failed') throw new Error('derive failed');
      return { participantId, participantName: 'Stale', dataVersion: 7, rows: null };
    });
    const write = vi
      .fn<ParticipantAggregateSnapshotStore['write']>()
      .mockResolvedValue('refreshed');
    const recordFailure = vi.fn<ParticipantAggregateSnapshotStore['recordFailure']>();
    const store = { read, write, recordFailure };
    const loadSource = vi.fn(async (participantId: string) => ({
      participantId,
      participantName: 'Stale',
      rows: [aggregateRow()],
    }));

    const outcomes = await refreshParticipantAggregateSnapshots(
      ['absent', 'untracked', 'current', 'stale', 'failed'],
      { store, loadSource },
    );

    expect(Object.fromEntries(outcomes)).toEqual({
      absent: 'absent',
      untracked: 'untracked',
      current: 'current',
      stale: 'refreshed',
      failed: 'failed',
    });
    expect(loadSource).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith('stale', 7, [aggregateRow()]);
    expect(recordFailure).toHaveBeenCalledWith('failed', expect.any(Error));
  });

  test('reports an absent source and maps invalidation counts', async () => {
    const store: ParticipantAggregateSnapshotStore = {
      read: vi.fn().mockResolvedValue({
        participantId: '11',
        participantName: 'Asha',
        dataVersion: 7,
        rows: null,
      }),
      write: vi.fn(),
      recordFailure: vi.fn(),
    };
    const outcomes = await refreshParticipantAggregateSnapshots(['11'], {
      store,
      loadSource: vi.fn().mockResolvedValue(null),
    });
    expect(outcomes.get('11')).toBe('absent');
    expect(store.write).not.toHaveBeenCalled();

    const query = vi.fn().mockResolvedValue(queryResult([{ invalidated: '12' }]));
    await expect(
      invalidateParticipantAggregateSnapshots({ query } as unknown as QueryExecutor),
    ).resolves.toBe(12);
    expect(query.mock.calls[0]?.[0]).toBe(
      'SELECT invalidate_participant_aggregate_snapshots()::text AS invalidated',
    );
  });
});
