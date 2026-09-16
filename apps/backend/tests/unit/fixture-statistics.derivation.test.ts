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
    nonStrikerId: '102',
    nonStrikerName: 'Player 102',
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
    wickets: [],
    overNumber: 0,
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
        miscountedOvers: [],
      },
      {
        inningsId: '502',
        battingCompetitorName: 'Team Beta',
        ordinal: 1,
        battingCompetitorId: '20',
        penaltyPre: null,
        penaltyPost: null,
        miscountedOvers: [],
      },
    ],
    events,
    squad: [
      {
        participantId: '101',
        participantName: 'Player 101',
        competitorId: '10',
        competitorName: 'Team Alpha',
      },
      {
        participantId: '102',
        participantName: 'Player 102',
        competitorId: '10',
        competitorName: 'Team Alpha',
      },
      {
        participantId: '103',
        participantName: 'Player 103',
        competitorId: '10',
        competitorName: 'Team Alpha',
      },
      {
        participantId: '201',
        participantName: 'Player 201',
        competitorId: '20',
        competitorName: 'Team Beta',
      },
    ],
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
    expect(result.highestScorers).toEqual([
      {
        participantId: '101',
        participantName: 'Player 101',
        competitorId: '10',
        competitorName: 'Team Alpha',
        inningsId: '501',
        inningsOrdinal: 0,
        runsScored: 10,
        notOut: true,
      },
    ]);

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
        wicketsLost: 0,
        legalBalls: 4,
        overs: '0.4',
        runRate: 34.5,
        extras: {
          total: 9,
          wides: 1,
          noBalls: 1,
          byes: 2,
          legByes: 0,
          penaltyRuns: 5,
        },
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
      battingPosition: 1,
      battingParticipation: 'batted',
      dismissal: { status: 'not_out', kind: null, eventId: null },
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
      battingPosition: 2,
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

  test('returns every tied highest individual innings score in deterministic order', () => {
    const tiedEvents = [
      event({
        deliveryId: '20',
        inningsId: '502',
        inningsOrdinal: 1,
        inningsSequence: 1,
        battingCompetitorId: '20',
        battingCompetitorName: 'Team Beta',
        strikerId: '201',
        strikerName: 'Player 201',
        runsOffBat: 10,
        runsTotal: 10,
      }),
      event({
        deliveryId: '10',
        inningsId: '501',
        inningsOrdinal: 0,
        inningsSequence: 1,
        strikerId: '101',
        strikerName: 'Player 101',
        runsOffBat: 10,
        runsTotal: 10,
      }),
    ];

    const result = deriveFixtureStatistics(goldenSource([...tiedEvents].reverse()));

    expect(
      result.highestScorers.map((scorer) => [scorer.inningsOrdinal, scorer.participantId]),
    ).toEqual([
      [0, '101'],
      [1, '201'],
    ]);
  });

  test('uses a single innings score rather than summing the same batter across innings', () => {
    const result = deriveFixtureStatistics(
      goldenSource([
        event({
          deliveryId: '1',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 1,
          strikerId: '101',
          strikerName: 'Player 101',
          runsOffBat: 7,
          runsTotal: 7,
        }),
        event({
          deliveryId: '2',
          inningsId: '502',
          inningsOrdinal: 1,
          inningsSequence: 1,
          battingCompetitorId: '20',
          battingCompetitorName: 'Team Beta',
          strikerId: '101',
          strikerName: 'Player 101',
          runsOffBat: 7,
          runsTotal: 7,
        }),
        event({
          deliveryId: '3',
          inningsId: '502',
          inningsOrdinal: 1,
          inningsSequence: 2,
          battingCompetitorId: '20',
          battingCompetitorName: 'Team Beta',
          strikerId: '201',
          strikerName: 'Player 201',
          runsOffBat: 10,
          runsTotal: 10,
        }),
      ]),
    );

    expect(result.highestScorers).toEqual([
      expect.objectContaining({ participantId: '201', inningsOrdinal: 1, runsScored: 10 }),
    ]);
  });

  test('marks a highest scorer dismissed when the accepted events contain a terminal wicket', () => {
    const result = deriveFixtureStatistics(
      goldenSource([
        event({
          deliveryId: '1',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 1,
          strikerId: '101',
          strikerName: 'Player 101',
          runsOffBat: 12,
          runsTotal: 12,
          wickets: [
            {
              wicketId: 'w-1',
              eventId: '1',
              playerOutId: '101',
              kind: 'caught',
              isTerminal: true,
            },
          ],
        }),
      ]),
    );

    expect(result.highestScorers).toEqual([
      expect.objectContaining({ participantId: '101', runsScored: 12, notOut: false }),
    ]);
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
      nonStrikerParticipantId: '102',
      nonStrikerParticipantName: 'Player 102',
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
    expect(result.statistics.filter((statistic) => statistic.scope === 'participant')).toHaveLength(
      4,
    );
  });

  test('represents positions, ducks, not outs, dismissals, and selected players who did not bat', () => {
    const result = deriveFixtureStatistics(
      goldenSource([
        event({
          deliveryId: '1',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 1,
          strikerId: '101',
          nonStrikerId: '102',
        }),
        event({
          deliveryId: '2',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 2,
          strikerId: '103',
          nonStrikerId: '102',
          wickets: [
            { wicketId: 'w-2', eventId: '2', playerOutId: '103', kind: 'bowled', isTerminal: true },
          ],
        }),
        event({
          deliveryId: '3',
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: 3,
          strikerId: '102',
          nonStrikerId: '104',
          runsOffBat: 42,
          runsTotal: 42,
          wickets: [
            {
              wicketId: 'w-3',
              eventId: '3',
              playerOutId: '102',
              kind: 'run out',
              isTerminal: true,
            },
          ],
        }),
      ]),
    );
    const player = (participantId: string) =>
      result.statistics.find(
        (statistic) =>
          statistic.scope === 'participant' && statistic.participantId === participantId,
      );

    expect(player('101')).toMatchObject({
      battingPosition: 1,
      battingParticipation: 'batted',
      batting: { runsScored: 0 },
      dismissal: { status: 'not_out' },
    });
    expect(player('102')).toMatchObject({
      battingPosition: 2,
      batting: { runsScored: 42 },
      dismissal: { status: 'dismissed', kind: 'run out', eventId: '3' },
    });
    expect(player('103')).toMatchObject({
      battingPosition: 3,
      batting: { runsScored: 0 },
      dismissal: { status: 'dismissed', kind: 'bowled' },
    });
    expect(player('104')).toMatchObject({
      battingPosition: 4,
      battingParticipation: 'batted',
      batting: { runsScored: 0 },
      dismissal: { status: 'not_out' },
    });
    expect(player('201')).toMatchObject({
      battingPosition: null,
      battingParticipation: 'did_not_bat',
      batting: null,
      dismissal: null,
    });
  });
});

describe('innings scorecard context', () => {
  function inningsMetrics(source: FixtureStatisticsSource) {
    const statistic = deriveFixtureStatistics(source).statistics.find(
      (candidate) => candidate.scope === 'innings' && candidate.inningsId === '501',
    );
    return statistic?.scope === 'innings' ? statistic.metrics : null;
  }

  test('counts terminal dismissals regardless of bowler credit', () => {
    const source = goldenSource([
      event({
        deliveryId: 'bowled',
        inningsId: '501',
        inningsOrdinal: 0,
        inningsSequence: 1,
        creditedWickets: 1,
        wickets: [
          {
            wicketId: 'w-bowled',
            eventId: 'bowled',
            playerOutId: '101',
            kind: 'bowled',
            isTerminal: true,
          },
        ],
      }),
      event({
        deliveryId: 'run-out',
        inningsId: '501',
        inningsOrdinal: 0,
        inningsSequence: 2,
        wickets: [
          {
            wicketId: 'w-run-out',
            eventId: 'run-out',
            playerOutId: '102',
            kind: 'run out',
            isTerminal: true,
          },
        ],
      }),
      event({
        deliveryId: 'retired-hurt',
        inningsId: '501',
        inningsOrdinal: 0,
        inningsSequence: 3,
        wickets: [
          {
            wicketId: 'w-retired-hurt',
            eventId: 'retired-hurt',
            playerOutId: '103',
            kind: 'retired hurt',
            isTerminal: false,
          },
        ],
      }),
    ]);

    expect(inningsMetrics(source)).toMatchObject({ wicketsLost: 2 });
    const traced = deriveFixtureStatistics(source, { includeContributors: true });
    const innings = traced.statistics.find(
      (statistic) => statistic.scope === 'innings' && statistic.inningsId === '501',
    );
    const bowler = traced.statistics.find(
      (statistic) => statistic.scope === 'participant' && statistic.participantId === '201',
    );
    expect(innings?.contributingEvents?.map((eventRecord) => eventRecord.wicketsLost)).toEqual([
      1, 1, 0,
    ]);
    expect(bowler?.scope === 'participant' ? bowler.bowling?.wicketsTaken : null).toBe(1);
  });

  test('preserves zero extras and uses null for a run rate without legal balls', () => {
    const source = goldenSource([]);
    source.innings = [{ ...source.innings[0]!, penaltyPre: null }];

    expect(inningsMetrics(source)).toMatchObject({
      wicketsLost: 0,
      legalBalls: 0,
      overs: '0.0',
      runRate: null,
      extras: {
        total: 0,
        wides: 0,
        noBalls: 0,
        byes: 0,
        legByes: 0,
        penaltyRuns: 0,
      },
    });
  });

  test('formats progress using fixture and miscounted-over metadata', () => {
    const events = Array.from({ length: 7 }, (_, index) =>
      event({
        deliveryId: `miscount-${index + 1}`,
        inningsId: '501',
        inningsOrdinal: 0,
        inningsSequence: index + 1,
        overNumber: index < 5 ? 0 : 1,
        runsOffBat: 1,
        runsTotal: 1,
      }),
    );
    const source = goldenSource(events);
    source.innings[0]!.miscountedOvers = [{ overNumber: 0, balls: 5 }];
    source.innings[0]!.penaltyPre = null;

    expect(inningsMetrics(source)).toMatchObject({
      legalBalls: 7,
      overs: '1.2',
      runRate: 6,
    });
  });

  test('uses a non-six fixture balls-per-over value for progress and run rate', () => {
    const source = goldenSource(
      Array.from({ length: 7 }, (_, index) =>
        event({
          deliveryId: `eight-ball-${index + 1}`,
          inningsId: '501',
          inningsOrdinal: 0,
          inningsSequence: index + 1,
          runsOffBat: 1,
          runsTotal: 1,
        }),
      ),
    );
    source.ballsPerOver = 8;
    source.innings[0]!.penaltyPre = null;

    expect(inningsMetrics(source)).toMatchObject({ legalBalls: 7, overs: '0.7', runRate: 8 });
  });

  test('recomputes score and wicket state from replacement current events', () => {
    const original = goldenSource([
      event({
        deliveryId: 'original',
        inningsId: '501',
        inningsOrdinal: 0,
        inningsSequence: 1,
        runsOffBat: 1,
        runsTotal: 1,
      }),
    ]);
    const corrected = goldenSource([
      event({
        deliveryId: 'replacement',
        inningsId: '501',
        inningsOrdinal: 0,
        inningsSequence: 1,
        runsOffBat: 4,
        runsTotal: 4,
        wickets: [
          {
            wicketId: 'corrected-wicket',
            eventId: 'replacement',
            playerOutId: '101',
            kind: 'run out',
            isTerminal: true,
          },
        ],
      }),
    ]);

    expect(inningsMetrics(original)).toMatchObject({ totalRuns: 6, wicketsLost: 0 });
    expect(inningsMetrics(corrected)).toMatchObject({ totalRuns: 9, wicketsLost: 1 });
  });
});

describe('fixture statistics with zero-valued extras (issue #590)', () => {
  const extraFields = [
    'extraWides',
    'extraNoBalls',
    'extraByes',
    'extraLegByes',
    'extraPenalty',
  ] as const;

  function withExplicitZeros(
    events: FixtureStatisticsEventSource[],
    fields: readonly (typeof extraFields)[number][] = extraFields,
  ): FixtureStatisticsEventSource[] {
    return events.map((source) => {
      const copy = { ...source };
      for (const field of fields) {
        copy[field] ??= 0;
      }
      return copy;
    });
  }

  function overEvent(
    inningsSequence: number,
    overrides: Partial<FixtureStatisticsEventSource>,
  ): FixtureStatisticsEventSource {
    return event({
      deliveryId: `over-${inningsSequence}`,
      inningsId: '501',
      inningsOrdinal: 0,
      inningsSequence,
      ...overrides,
    });
  }

  // One over from bowler 201 holding nine deliveries, six of them legal.
  const overWithWideAndNoBalls: FixtureStatisticsEventSource[] = [
    overEvent(1, { runsOffBat: 1, runsTotal: 1 }),
    overEvent(2, { strikerId: '102', runsExtras: 1, runsTotal: 1, extraWides: 1 }),
    overEvent(3, {
      strikerId: '102',
      runsOffBat: 4,
      runsExtras: 1,
      runsTotal: 5,
      extraNoBalls: 1,
    }),
    overEvent(4, { strikerId: '102' }),
    overEvent(5, { strikerId: '102', runsExtras: 1, runsTotal: 1, extraLegByes: 1 }),
    overEvent(6, { runsExtras: 2, runsTotal: 2, extraByes: 2 }),
    overEvent(7, { runsExtras: 3, runsTotal: 3, extraNoBalls: 1, extraByes: 2 }),
    overEvent(8, { runsExtras: 5, runsTotal: 5, extraPenalty: 5 }),
    overEvent(9, { runsOffBat: 6, runsTotal: 6 }),
  ];

  function participant(result: ReturnType<typeof deriveFixtureStatistics>, participantId: string) {
    const statistic = result.statistics.find(
      (candidate) => candidate.scope === 'participant' && candidate.participantId === participantId,
    );
    return statistic?.scope === 'participant' ? statistic : undefined;
  }

  test('derives identical statistics whether zero extras are omitted or explicit', () => {
    for (const events of [goldenEvents, overWithWideAndNoBalls]) {
      const omitted = deriveFixtureStatistics(goldenSource(events));

      expect(deriveFixtureStatistics(goldenSource(withExplicitZeros(events)))).toEqual(omitted);
      expect(
        deriveFixtureStatistics(
          goldenSource(withExplicitZeros(events, ['extraWides', 'extraNoBalls'])),
        ),
      ).toEqual(omitted);
    }
  });

  test.each([
    ['omitted', overWithWideAndNoBalls],
    ['explicitly zero', withExplicitZeros(overWithWideAndNoBalls)],
  ])(
    'derives an over containing a wide and no-balls when other extras are %s',
    (_label, events) => {
      const result = deriveFixtureStatistics(goldenSource(events), { includeContributors: true });

      expect(participant(result, '201')?.bowling).toEqual({
        // 11 off the bat + 1 wide + 2 no-balls. The byes, leg bye and penalty
        // runs are team extras and are not charged to the bowler.
        runsConceded: 14,
        wides: 1,
        noBalls: 2,
        legalBallsBowled: 6,
        oversBowled: '1.0',
        economyRate: 14,
        wicketsTaken: 0,
      });

      // The no-ball at sequence 7 is faced; the wide at sequence 2 is not.
      expect(participant(result, '101')?.batting).toEqual({
        runsScored: 7,
        ballsFaced: 5,
        strikeRate: 140,
        fours: 0,
        sixes: 1,
      });
      expect(participant(result, '102')?.batting).toEqual({
        runsScored: 4,
        ballsFaced: 3,
        strikeRate: 133.33,
        fours: 1,
        sixes: 0,
      });

      const innings = result.statistics.find(
        (statistic) => statistic.scope === 'innings' && statistic.inningsId === '501',
      );
      expect(innings?.scope === 'innings' ? innings.metrics : null).toMatchObject({
        deliveryRuns: 24,
        penaltyRuns: 5,
        totalRuns: 29,
      });

      const teamExtras =
        innings?.scope === 'innings'
          ? innings.contributingEvents?.reduce(
              (total, contributingEvent) => total + contributingEvent.runs.extras,
              0,
            )
          : null;
      expect(teamExtras).toBe(13);
    },
  );
});

describe('fixture statistics with byes or leg byes recorded on a wide (ADR-014, issue #623)', () => {
  function overEvent(
    inningsSequence: number,
    overrides: Partial<FixtureStatisticsEventSource>,
  ): FixtureStatisticsEventSource {
    return event({
      deliveryId: `wide-over-${inningsSequence}`,
      inningsId: '501',
      inningsOrdinal: 0,
      inningsSequence,
      ...overrides,
    });
  }

  // One over from bowler 201 to batter 101: nine deliveries, six of them legal.
  function over(
    firstWide: Partial<FixtureStatisticsEventSource>,
    secondWide: Partial<FixtureStatisticsEventSource>,
  ): FixtureStatisticsEventSource[] {
    return [
      overEvent(1, { runsOffBat: 1, runsTotal: 1 }),
      overEvent(2, { runsExtras: 5, runsTotal: 5, ...firstWide }),
      overEvent(3, { runsExtras: 3, runsTotal: 3, ...secondWide }),
      // Byes off a no-ball remain byes (Law 21), so they are not the bowler's.
      overEvent(4, { runsExtras: 3, runsTotal: 3, extraNoBalls: 1, extraByes: 2 }),
      overEvent(5, {}),
      overEvent(6, { runsOffBat: 4, runsTotal: 4 }),
      overEvent(7, {}),
      overEvent(8, {}),
      overEvent(9, {}),
    ];
  }

  const recordedWithByes = over(
    { extraWides: 1, extraByes: 4 },
    { extraWides: 2, extraLegByes: 1 },
  );
  const recordedAsWides = over({ extraWides: 5 }, { extraWides: 3 });

  function participant(events: FixtureStatisticsEventSource[], participantId: string) {
    const statistic = deriveFixtureStatistics(goldenSource(events)).statistics.find(
      (candidate) => candidate.scope === 'participant' && candidate.participantId === participantId,
    );
    return statistic?.scope === 'participant' ? statistic : undefined;
  }

  test('derives identical statistics whether runs off a wide are recorded as byes or as wides', () => {
    expect(deriveFixtureStatistics(goldenSource(recordedWithByes))).toEqual(
      deriveFixtureStatistics(goldenSource(recordedAsWides)),
    );
  });

  test('charges byes and leg byes run off a wide to the bowler as wide runs', () => {
    expect(participant(recordedWithByes, '201')?.bowling).toEqual({
      // 5 off the bat + 8 wide runs + 1 no-ball. The 2 byes off the no-ball
      // are team extras.
      runsConceded: 14,
      wides: 8,
      noBalls: 1,
      legalBallsBowled: 6,
      oversBowled: '1.0',
      economyRate: 14,
      wicketsTaken: 0,
    });

    // Neither wide is a ball faced, and byes are never the batter's runs.
    expect(participant(recordedWithByes, '101')?.batting).toEqual({
      runsScored: 5,
      ballsFaced: 7,
      strikeRate: 71.43,
      fours: 1,
      sixes: 0,
    });

    const innings = deriveFixtureStatistics(goldenSource(recordedWithByes)).statistics.find(
      (statistic) => statistic.scope === 'innings' && statistic.inningsId === '501',
    );
    expect(innings?.scope === 'innings' ? innings.metrics : null).toMatchObject({
      deliveryRuns: 16,
      penaltyRuns: 5,
      totalRuns: 21,
    });
  });
});
