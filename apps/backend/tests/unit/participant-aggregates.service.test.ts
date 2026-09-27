import { afterEach, describe, expect, test, vi } from 'vitest';

import type {
  ParticipantAggregateRow,
  ParticipantAggregatesSource,
} from '../../src/modules/statistics/participant-aggregates.model';
import { createParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import type { ParticipantAggregateSnapshotStore } from '../../src/modules/statistics/participant-aggregates.snapshot';

/**
 * The participant aggregates read path over stored snapshots (issue #592).
 * PostgreSQL behaviour is covered by the database tests; these pin the order
 * of operations and that no snapshot failure fails a read.
 */

function careerRow(runsScored: number): ParticipantAggregateRow {
  return {
    competitionGrouped: false,
    seasonGrouped: false,
    competitionId: null,
    competitionName: null,
    season: null,
    appearances: 1,
    fixtureCount: 1,
    sourceEventCount: 1,
    battingDeliveryCount: 1,
    runsScored,
    ballsFaced: 1,
    fours: 0,
    sixes: 0,
    battingInnings: 1,
    battingDismissals: 0,
    fifties: 0,
    hundreds: 0,
    highestScore: runsScored,
    highestScoreNotOut: true,
    bowlingDeliveryCount: 0,
    runsConceded: 0,
    wides: 0,
    noBalls: 0,
    legalBallsBowled: 0,
    wicketsTaken: 0,
    bowlingInnings: 0,
    fourWicketHauls: 0,
    fiveWicketHauls: 0,
    bestBowlingWickets: null,
    bestBowlingRuns: null,
    ballsPerOver: null,
    catches: 0,
    stumpings: 0,
    runOutInvolvements: 0,
  };
}

const liveSource: ParticipantAggregatesSource = {
  participantId: '7',
  participantName: 'Live Player',
  rows: [careerRow(4)],
};

function store(overrides: Partial<ParticipantAggregateSnapshotStore>) {
  const calls: string[] = [];
  const fake: ParticipantAggregateSnapshotStore = {
    read: vi.fn(async () => {
      calls.push('read');
      return { participantId: '7', participantName: 'Live Player', dataVersion: 3, rows: null };
    }),
    write: vi.fn(async () => {
      calls.push('write');
      return 'refreshed' as const;
    }),
    recordFailure: vi.fn(async () => {
      calls.push('recordFailure');
    }),
    ...overrides,
  };
  return { fake, calls };
}

describe('participant aggregates service with stored snapshots', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('serves current stored rows without deriving', async () => {
    const loadSource = vi.fn(async () => liveSource);
    const { fake } = store({
      read: async () => ({
        participantId: '7',
        participantName: 'Stored Player',
        dataVersion: 3,
        rows: [careerRow(9)],
      }),
    });

    const aggregates = await createParticipantAggregatesService(
      loadSource,
      fake,
    ).getParticipantAggregates('7', {});

    expect(loadSource).not.toHaveBeenCalled();
    expect(fake.write).not.toHaveBeenCalled();
    expect(aggregates?.participantName).toBe('Stored Player');
    expect(aggregates?.statistics[0]?.batting?.runsScored).toBe(9);
  });

  test('on a read miss derives live, then stores the derived rows against the version read first', async () => {
    const calls: string[] = [];
    const loadSource = vi.fn(async () => {
      calls.push('loadSource');
      return liveSource;
    });
    const { fake, calls: storeCalls } = store({});
    const service = createParticipantAggregatesService(loadSource, fake);

    const aggregates = await service.getParticipantAggregates('7', {});

    expect(aggregates?.statistics[0]?.batting?.runsScored).toBe(4);
    expect(fake.write).toHaveBeenCalledWith('7', 3, liveSource.rows);
    expect(storeCalls).toEqual(['read', 'write']);
    expect(calls).toEqual(['loadSource']);
    expect(vi.mocked(fake.read).mock.invocationCallOrder[0]).toBeLessThan(
      loadSource.mock.invocationCallOrder[0]!,
    );
  });

  test('never stores rows for a participant without a statistics version', async () => {
    const loadSource = vi.fn(async () => liveSource);
    const { fake } = store({
      read: async () => ({
        participantId: '7',
        participantName: 'Live Player',
        dataVersion: null,
        rows: null,
      }),
    });

    const aggregates = await createParticipantAggregatesService(
      loadSource,
      fake,
    ).getParticipantAggregates('7', {});

    expect(aggregates?.statistics[0]?.batting?.runsScored).toBe(4);
    expect(fake.write).not.toHaveBeenCalled();
  });

  test('returns the live result when the refresh write fails, and records the attempt', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failure = new Error('write failed');
    const { fake } = store({
      write: async () => {
        throw failure;
      },
    });

    const aggregates = await createParticipantAggregatesService(
      async () => liveSource,
      fake,
    ).getParticipantAggregates('7', {});

    expect(aggregates?.statistics[0]?.batting?.runsScored).toBe(4);
    expect(fake.recordFailure).toHaveBeenCalledWith('7', failure);
  });

  test('derives live when the snapshot read fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fake } = store({
      read: async () => {
        throw new Error('read failed');
      },
    });

    const aggregates = await createParticipantAggregatesService(
      async () => liveSource,
      fake,
    ).getParticipantAggregates('7', {});

    expect(aggregates?.statistics[0]?.batting?.runsScored).toBe(4);
    expect(fake.write).not.toHaveBeenCalled();
  });

  test('reports an absent participant without deriving', async () => {
    const loadSource = vi.fn(async () => liveSource);
    const { fake } = store({ read: async () => null });

    await expect(
      createParticipantAggregatesService(loadSource, fake).getParticipantAggregates('7', {}),
    ).resolves.toBeNull();
    expect(loadSource).not.toHaveBeenCalled();
  });

  test('uses no snapshots when a loader is injected without a store', async () => {
    const loadSource = vi.fn(async () => liveSource);

    const aggregates = await createParticipantAggregatesService(
      loadSource,
    ).getParticipantAggregates('7', {});

    expect(aggregates?.statistics[0]?.batting?.runsScored).toBe(4);
    expect(loadSource).toHaveBeenCalledTimes(1);
  });
});
