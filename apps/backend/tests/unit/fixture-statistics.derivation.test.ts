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
    battingCompetitorName: 'Team Alpha',
    bowlingCompetitorId: '20',
    bowlingCompetitorName: 'Team Beta',
    strikerId: '101',
    strikerName: 'Player 101',
    bowlerId: '201',
    bowlerName: 'Player 201',
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
    battingCompetitorName: 'Team Beta',
    bowlingCompetitorId: '10',
    bowlingCompetitorName: 'Team Alpha',
    strikerId: '201',
    strikerName: 'Player 201',
    bowlerId: '101',
    bowlerName: 'Player 101',
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
    winnerCompetitorName: 'Team Beta',
    eliminatorCompetitorId: null,
    eliminatorCompetitorName: null,
    outcomeByRuns: null,
    outcomeByWickets: 8,
    outcomeMethod: null,
    decidedByBowlOut: false,
    innings: [
      {
        inningsId: '501',
        battingCompetitorName: 'Team Alpha',
        ordinal: 0,
        battingCompetitorId: '10',
        penaltyPre: 5,
        penaltyPost: null,
      },
      {
        inningsId: '502',
        battingCompetitorName: 'Team Beta',
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
      winnerCompetitorName: 'Team Beta',
      eliminatorCompetitorId: null,
      eliminatorCompetitorName: null,
      margin: { type: 'wickets', value: 8 },
      method: null,
      decidedByBowlOut: false,
    });

    const firstInnings = result.statistics.find(
      (statistic) => statistic.scope === 'innings' && statistic.inningsId === '501',
    );
    expect(firstInnings).toMatchObject({
      competitorId: '10',
      competitorName: 'Team Alpha',
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
      participantName: 'Player 101',
      competitorName: 'Team Alpha',
      batting: {
        runsScored: 10,
        ballsFaced: 2,
        strikeRate: 500,
        fours: 1,
        sixes: 1,
      },
      bowling: {
        runsConceded: 6,
        wides: 0,
        noBalls: 0,
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
      participantName: 'Player 201',
      competitorName: 'Team Beta',
      bowling: {
        runsConceded: 16,
        wides: 1,
        noBalls: 1,
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

  test('keeps team extras out of a bowler extras breakdown', () => {
    const result = deriveFixtureStatistics(
      goldenSource([
        event({
          deliveryId: 'team-extras',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 1,
          runsExtras: 6,
          runsTotal: 6,
          extraByes: 2,
          extraLegByes: 3,
          extraPenalty: 1,
        }),
      ]),
    );
    const bowler = result.statistics.find(
      (statistic) => statistic.scope === 'participant' && statistic.participantId === '201',
    );

    expect(bowler?.scope === 'participant' ? bowler.bowling : null).toMatchObject({
      runsConceded: 0,
      wides: 0,
      noBalls: 0,
    });
  });

  test('attributes mixed delivery extras to their bowlers and preserves their trace', () => {
    const result = deriveFixtureStatistics(
      goldenSource([
        event({
          deliveryId: 'ordinary',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 1,
          runsOffBat: 2,
          runsTotal: 2,
        }),
        event({
          deliveryId: 'wide-one',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 2,
          runsExtras: 1,
          runsTotal: 1,
          extraWides: 1,
        }),
        event({
          deliveryId: 'wide-two',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 3,
          runsExtras: 2,
          runsTotal: 2,
          extraWides: 2,
        }),
        event({
          deliveryId: 'no-ball-with-bat-runs',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 4,
          runsOffBat: 4,
          runsExtras: 1,
          runsTotal: 5,
          extraNoBalls: 1,
        }),
        event({
          deliveryId: 'bye',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 5,
          runsExtras: 2,
          runsTotal: 2,
          extraByes: 2,
        }),
        event({
          deliveryId: 'leg-bye',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 6,
          runsExtras: 3,
          runsTotal: 3,
          extraLegByes: 3,
        }),
        event({
          deliveryId: 'other-bowler-wide',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 7,
          bowlerId: '202',
          bowlerName: 'Player 202',
          runsExtras: 2,
          runsTotal: 2,
          extraWides: 2,
        }),
      ]),
      { includeContributors: true },
    );

    const firstBowler = result.statistics.find(
      (statistic) => statistic.scope === 'participant' && statistic.participantId === '201',
    );
    const otherBowler = result.statistics.find(
      (statistic) => statistic.scope === 'participant' && statistic.participantId === '202',
    );
    const innings = result.statistics.find(
      (statistic) => statistic.scope === 'innings' && statistic.inningsId === '501',
    );

    expect(firstBowler?.scope === 'participant' ? firstBowler.bowling : null).toMatchObject({
      // 2 off the bat + 3 wides + 4 off the bat + 1 no-ball. Byes and leg-byes
      // remain innings/team extras and are not charged to this bowler.
      runsConceded: 10,
      wides: 3,
      noBalls: 1,
      legalBallsBowled: 3,
    });
    expect(otherBowler?.scope === 'participant' ? otherBowler.bowling : null).toMatchObject({
      runsConceded: 2,
      wides: 2,
      noBalls: 0,
      legalBallsBowled: 0,
    });
    expect(innings?.scope === 'innings' ? innings.metrics : null).toMatchObject({
      deliveryRuns: 17,
      penaltyRuns: 5,
      totalRuns: 22,
    });
    expect(
      firstBowler?.scope === 'participant'
        ? firstBowler.contributingEvents?.map((contributingEvent) => contributingEvent.eventId)
        : null,
    ).toEqual(['ordinary', 'wide-one', 'wide-two', 'no-ball-with-bat-runs', 'bye', 'leg-bye']);
    expect(
      firstBowler?.scope === 'participant'
        ? firstBowler.contributingEvents?.find(
            (contributingEvent) => contributingEvent.eventId === 'leg-bye',
          )?.extras
        : null,
    ).toEqual({ wides: null, noBalls: null, byes: null, legByes: 3, penalty: null });
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

    expect(firstInnings?.contributingEvents?.[0]).toMatchObject({
      strikerParticipantId: '101',
      strikerParticipantName: 'Player 101',
      bowlerParticipantId: '201',
      bowlerParticipantName: 'Player 201',
    });
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
