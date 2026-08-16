import { describe, expect, test } from 'vitest';

import { deriveFixtureStatistics } from '../../src/modules/statistics/fixture-statistics.derivation';
import type {
  FixtureStatisticsEventSource,
  FixtureStatisticsSource,
} from '../../src/modules/statistics/fixture-statistics.model';

function event(
  overrides: Partial<FixtureStatisticsEventSource> &
    Pick<
      FixtureStatisticsEventSource,
      'deliveryId' | 'inningsId' | 'inningsOrdinal' | 'inningsSequence'
    >,
): FixtureStatisticsEventSource {
  return {
    battingCompetitorId: '10',
    bowlingCompetitorId: '20',
    strikerId: '101',
    bowlerId: '201',
    runsOffBat: 0,
    runsExtras: 0,
    runsTotal: 0,
    nonBoundary: false,
    extraWides: null,
    extraNoBalls: null,
    extraByes: null,
    extraLegByes: null,
    extraPenalty: null,
    creditedWickets: 0,
    ...overrides,
  };
}

const goldenEvents: FixtureStatisticsEventSource[] = [
  event({
    deliveryId: '1',
    inningsId: '501',
    inningsOrdinal: 0,
    inningsSequence: 1,
    runsOffBat: 4,
    runsTotal: 4,
  }),
  event({
    deliveryId: '2',
    inningsId: '501',
    inningsOrdinal: 0,
    inningsSequence: 2,
    runsExtras: 1,
    runsTotal: 1,
    extraWides: 1,
  }),
  event({
    deliveryId: '3',
    inningsId: '501',
    inningsOrdinal: 0,
    inningsSequence: 3,
    runsOffBat: 6,
    runsExtras: 1,
    runsTotal: 7,
    extraNoBalls: 1,
  }),
  event({
    deliveryId: '4',
    inningsId: '501',
    inningsOrdinal: 0,
    inningsSequence: 4,
    strikerId: '102',
    runsExtras: 2,
    runsTotal: 2,
    extraByes: 2,
  }),
  event({
    deliveryId: '5',
    inningsId: '501',
    inningsOrdinal: 0,
    inningsSequence: 5,
    strikerId: '102',
    runsOffBat: 4,
    runsTotal: 4,
    nonBoundary: true,
  }),
  event({
    deliveryId: '6',
    inningsId: '501',
    inningsOrdinal: 0,
    inningsSequence: 6,
    strikerId: '102',
    creditedWickets: 1,
  }),
  event({
    deliveryId: '7',
    inningsId: '502',
    inningsOrdinal: 1,
    inningsSequence: 1,
    battingCompetitorId: '20',
    bowlingCompetitorId: '10',
    strikerId: '201',
    bowlerId: '101',
    runsOffBat: 6,
    runsTotal: 6,
  }),
];

function goldenSource(events = goldenEvents): FixtureStatisticsSource {
  return {
    fixtureId: '9001',
    ballsPerOver: 6,
    missingFields: [],
    outcome: 'won',
    winnerCompetitorId: '20',
    eliminatorCompetitorId: null,
    outcomeByRuns: null,
    outcomeByWickets: 8,
    outcomeMethod: null,
    decidedByBowlOut: false,
    innings: [
      {
        inningsId: '501',
        ordinal: 0,
        battingCompetitorId: '10',
        penaltyPre: 5,
        penaltyPost: null,
      },
      {
        inningsId: '502',
        ordinal: 1,
        battingCompetitorId: '20',
        penaltyPre: null,
        penaltyPost: null,
      },
    ],
    events,
  };
}

describe('fixture statistics golden fixture', () => {
  test('derives the manually verified Basic cricket statistics', () => {
    const result = deriveFixtureStatistics(goldenSource());

    expect(result.status).toBe('complete');
    expect(result.outcome).toEqual({
      kind: 'won',
      winnerCompetitorId: '20',
      eliminatorCompetitorId: null,
      margin: { type: 'wickets', value: 8 },
      method: null,
      decidedByBowlOut: false,
    });

    const firstInnings = result.statistics.find(
      (statistic) => statistic.scope === 'innings' && statistic.inningsId === '501',
    );
    expect(firstInnings).toMatchObject({
      competitorId: '10',
      sourceEventCount: 6,
      metrics: {
        deliveryRuns: 18,
        penaltyRuns: 5,
        totalRuns: 23,
      },
    });

    const firstBatter = result.statistics.find(
      (statistic) => statistic.scope === 'participant' && statistic.participantId === '101',
    );
    expect(firstBatter).toMatchObject({
      competitorId: '10',
      batting: {
        runsScored: 10,
        ballsFaced: 2,
        strikeRate: 500,
        fours: 1,
        sixes: 1,
      },
      bowling: {
        runsConceded: 6,
        legalBallsBowled: 1,
        oversBowled: '0.1',
        economyRate: 36,
        wicketsTaken: 0,
      },
    });

    const secondBatter = result.statistics.find(
      (statistic) => statistic.scope === 'participant' && statistic.participantId === '102',
    );
    expect(secondBatter).toMatchObject({
      batting: {
        runsScored: 4,
        ballsFaced: 3,
        strikeRate: 133.33,
        fours: 0,
        sixes: 0,
      },
    });

    const firstBowler = result.statistics.find(
      (statistic) => statistic.scope === 'participant' && statistic.participantId === '201',
    );
    expect(firstBowler).toMatchObject({
      competitorId: '20',
      bowling: {
        runsConceded: 16,
        legalBallsBowled: 4,
        oversBowled: '0.4',
        economyRate: 24,
        wicketsTaken: 1,
      },
      batting: {
        runsScored: 6,
        ballsFaced: 1,
        strikeRate: 600,
        fours: 0,
        sixes: 1,
      },
    });
  });

  test('is deterministic for the same accepted events regardless of input order', () => {
    const forward = deriveFixtureStatistics(goldenSource(goldenEvents));
    const reversed = deriveFixtureStatistics(goldenSource([...goldenEvents].reverse()));

    expect(reversed).toEqual(forward);
  });

  test('returns ordered trace records only when explicitly requested', () => {
    const compact = deriveFixtureStatistics(goldenSource());
    expect(compact.statistics.every((statistic) => !('contributingEvents' in statistic))).toBe(
      true,
    );

    const traced = deriveFixtureStatistics(goldenSource(), { includeContributors: true });
    const firstInnings = traced.statistics.find(
      (statistic) => statistic.scope === 'innings' && statistic.inningsId === '501',
    );

    expect(firstInnings?.contributingEvents?.map((eventRecord) => eventRecord.eventId)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
  });

  test('handles incomplete accepted data predictably', () => {
    const result = deriveFixtureStatistics({
      ...goldenSource([]),
      missingFields: ['players'],
    });

    expect(result.status).toBe('partial');
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'SOURCE_DATA_INCOMPLETE',
      'NO_ACCEPTED_EVENTS',
      'INNINGS_WITHOUT_ACCEPTED_EVENTS',
      'INNINGS_WITHOUT_ACCEPTED_EVENTS',
    ]);
    expect(result.statistics.filter((statistic) => statistic.scope === 'participant')).toEqual([]);
  });
});
