import { describe, expect, test } from 'vitest';

import { deriveParticipantAggregates } from '../../src/modules/statistics/participant-aggregates.derivation';
import type {
  ParticipantAggregateRow,
  ParticipantAggregatesSource,
} from '../../src/modules/statistics/participant-aggregates.model';

function row(overrides: Partial<ParticipantAggregateRow> = {}): ParticipantAggregateRow {
  return {
    competitionGrouped: true,
    seasonGrouped: true,
    competitionId: '10',
    competitionName: 'Test League',
    season: '2016/17',
    appearances: 1,
    fixtureCount: 1,
    sourceEventCount: 0,
    battingDeliveryCount: 0,
    runsScored: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    battingInnings: 0,
    battingDismissals: 0,
    fifties: 0,
    hundreds: 0,
    highestScore: null,
    highestScoreNotOut: null,
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
    catches: 0,
    stumpings: 0,
    runOutInvolvements: 0,
    ballsPerOver: 6,
    ...overrides,
  };
}

function source(rows: ParticipantAggregateRow[]): ParticipantAggregatesSource {
  return {
    participantId: '101',
    participantName: 'BB McCullum',
    rows,
  };
}

const seasonRow = row({
  competitionGrouped: true,
  seasonGrouped: true,
  sourceEventCount: 60,
  battingDeliveryCount: 60,
  runsScored: 116,
  ballsFaced: 56,
  fours: 12,
  sixes: 8,
  battingInnings: 1,
  battingDismissals: 0,
  hundreds: 1,
  highestScore: 116,
  highestScoreNotOut: true,
});

const competitionRow = row({
  competitionGrouped: true,
  seasonGrouped: false,
  season: null,
  fixtureCount: 2,
  sourceEventCount: 90,
  battingDeliveryCount: 90,
  runsScored: 150,
  ballsFaced: 80,
  fours: 15,
  sixes: 9,
});

const careerRow = row({
  competitionGrouped: false,
  seasonGrouped: false,
  competitionId: null,
  competitionName: null,
  season: null,
  fixtureCount: 3,
  sourceEventCount: 120,
  battingDeliveryCount: 120,
  runsScored: 200,
  ballsFaced: 110,
  fours: 20,
  sixes: 11,
});

describe('participant aggregate derivation', () => {
  test('names each grouping set as a season, competition or career level', () => {
    const result = deriveParticipantAggregates(source([seasonRow, competitionRow, careerRow]), {});

    expect(result.status).toBe('complete');
    expect(result.scope).toEqual({ superOversIncluded: false });
    expect(
      result.statistics.map((statistic) => ({
        scope: statistic.scope,
        statisticCode: statistic.statisticCode,
      })),
    ).toEqual([
      { scope: 'season', statisticCode: 'participant_season' },
      { scope: 'competition', statisticCode: 'participant_competition' },
      { scope: 'career', statisticCode: 'participant_career' },
    ]);
  });

  test('recomputes strike rate across the group rather than averaging fixtures', () => {
    const result = deriveParticipantAggregates(source([seasonRow]), {});
    const [statistic] = result.statistics;

    // 116 / 56 * 100, not the mean of the per-fixture rates that produced it.
    expect(statistic?.batting).toEqual({
      innings: 1,
      runsScored: 116,
      ballsFaced: 56,
      dismissals: 0,
      notOuts: 1,
      battingAverage: null,
      fours: 12,
      sixes: 8,
      fifties: 0,
      hundreds: 1,
      highestScore: 116,
      highestScoreNotOut: true,
      strikeRate: 207.14,
    });
  });

  test('derives batting records from aggregate numerators and innings facts', () => {
    const result = deriveParticipantAggregates(
      source([
        row({
          sourceEventCount: 90,
          battingDeliveryCount: 90,
          battingInnings: 3,
          runsScored: 180,
          ballsFaced: 120,
          battingDismissals: 2,
          fifties: 2,
          hundreds: 1,
          highestScore: 100,
          highestScoreNotOut: true,
        }),
      ]),
      {},
    );

    expect(result.statistics[0]?.batting).toMatchObject({
      innings: 3,
      dismissals: 2,
      notOuts: 1,
      battingAverage: 90,
      strikeRate: 150,
      highestScore: 100,
      highestScoreNotOut: true,
      fifties: 2,
      hundreds: 1,
    });
  });

  test('derives overs and economy from counted legal balls and the fixture divisor', () => {
    const result = deriveParticipantAggregates(
      source([
        row({
          sourceEventCount: 26,
          bowlingDeliveryCount: 26,
          runsConceded: 44,
          wides: 3,
          noBalls: 2,
          legalBallsBowled: 23,
          wicketsTaken: 2,
          bowlingInnings: 2,
          fourWicketHauls: 1,
          fiveWicketHauls: 1,
          bestBowlingWickets: 5,
          bestBowlingRuns: 18,
          ballsPerOver: 6,
        }),
      ]),
      {},
    );

    // Twenty-three legal balls is three overs and five balls, whatever the
    // number of deliveries bowled to produce them.
    expect(result.statistics[0]?.bowling).toEqual({
      innings: 2,
      runsConceded: 44,
      wides: 3,
      noBalls: 2,
      legalBallsBowled: 23,
      wicketsTaken: 2,
      bowlingAverage: 22,
      bowlingStrikeRate: 11.5,
      bestBowling: { wicketsTaken: 5, runsConceded: 18 },
      fourWicketHauls: 1,
      fiveWicketHauls: 1,
      ballsPerOver: 6,
      oversBowled: '3.5',
      economyRate: 11.48,
    });
  });

  test('returns undefined bowling rates when no wicket has been credited', () => {
    const result = deriveParticipantAggregates(
      source([
        row({
          sourceEventCount: 12,
          bowlingDeliveryCount: 12,
          bowlingInnings: 1,
          runsConceded: 20,
          legalBallsBowled: 12,
          bestBowlingWickets: 0,
          bestBowlingRuns: 20,
        }),
      ]),
      {},
    );

    expect(result.statistics[0]?.bowling).toMatchObject({
      bowlingAverage: null,
      bowlingStrikeRate: null,
      bestBowling: { wicketsTaken: 0, runsConceded: 20 },
    });
  });

  test('publishes squad appearances independently of delivery activity and zero fielding totals', () => {
    const result = deriveParticipantAggregates(
      source([
        row({
          appearances: 3,
          fixtureCount: 0,
          sourceEventCount: 0,
        }),
      ]),
      {},
    );

    expect(result.statistics[0]).toMatchObject({
      appearances: 3,
      fixtureCount: 0,
      batting: null,
      bowling: null,
      fielding: { catches: 0, stumpings: 0, runOutInvolvements: 0 },
    });
    expect(result.warnings).toEqual([]);
  });

  test('exposes catches, stumpings, and every credited run-out involvement', () => {
    const result = deriveParticipantAggregates(
      source([
        row({
          sourceEventCount: 5,
          catches: 2,
          stumpings: 1,
          runOutInvolvements: 3,
        }),
      ]),
      {},
    );

    expect(result.statistics[0]?.fielding).toEqual({
      catches: 2,
      stumpings: 1,
      runOutInvolvements: 3,
    });
  });

  test('reports no rate where the group has no single balls-per-over divisor', () => {
    const result = deriveParticipantAggregates(
      source([
        row({
          competitionGrouped: false,
          seasonGrouped: false,
          competitionId: null,
          competitionName: null,
          season: null,
          sourceEventCount: 30,
          bowlingDeliveryCount: 30,
          runsConceded: 40,
          legalBallsBowled: 28,
          ballsPerOver: null,
        }),
      ]),
      {},
    );

    expect(result.status).toBe('partial');
    expect(result.warnings.map((warning) => warning.code)).toEqual(['MIXED_BALLS_PER_OVER']);
    expect(result.statistics[0]?.bowling).toMatchObject({
      legalBallsBowled: 28,
      ballsPerOver: null,
      oversBowled: null,
      economyRate: null,
    });
  });

  test('distinguishes a participant who did not bat from one who scored nothing', () => {
    const bowledOnly = deriveParticipantAggregates(
      source([row({ sourceEventCount: 6, bowlingDeliveryCount: 6, legalBallsBowled: 6 })]),
      {},
    );
    const scoredNothing = deriveParticipantAggregates(
      source([
        row({
          sourceEventCount: 3,
          battingDeliveryCount: 3,
          battingInnings: 1,
          ballsFaced: 3,
          highestScore: 0,
          highestScoreNotOut: true,
        }),
      ]),
      {},
    );

    expect(bowledOnly.statistics[0]?.batting).toBeNull();
    expect(scoredNothing.statistics[0]?.batting).toMatchObject({
      runsScored: 0,
      ballsFaced: 3,
      strikeRate: 0,
    });
    expect(scoredNothing.statistics[0]?.bowling).toBeNull();
  });

  test('leaves a rate undefined rather than reporting zero when nothing was faced', () => {
    const result = deriveParticipantAggregates(
      source([
        row({
          sourceEventCount: 2,
          battingDeliveryCount: 2,
          battingInnings: 1,
          ballsFaced: 0,
          highestScore: 0,
          highestScoreNotOut: true,
        }),
      ]),
      {},
    );

    expect(result.statistics[0]?.batting?.strikeRate).toBeNull();
  });

  test('carries the season identifier only where the competition is known', () => {
    const result = deriveParticipantAggregates(
      source([
        seasonRow,
        row({
          seasonGrouped: true,
          competitionId: null,
          competitionName: null,
          season: '2018',
          sourceEventCount: 4,
          battingDeliveryCount: 4,
        }),
      ]),
      { createSeasonId: (identity) => `season_${identity.competitionId}_${identity.label}` },
    );

    const [known, unknown] = result.statistics;
    expect(known).toMatchObject({
      scope: 'season',
      competitionId: '10',
      competitionName: 'Test League',
      seasonId: 'season_10_2016/17',
      season: '2016/17',
    });
    expect(unknown).toMatchObject({
      scope: 'season',
      competitionId: null,
      seasonId: null,
      season: '2018',
    });
    expect(result.warnings).toEqual([
      {
        code: 'COMPETITION_UNKNOWN',
        message: 'These fixtures are published without a competition.',
        season: '2018',
      },
    ]);
  });

  test('filters to one level when a scope is requested', () => {
    const result = deriveParticipantAggregates(source([seasonRow, competitionRow, careerRow]), {
      scope: 'career',
    });

    expect(result.statistics).toHaveLength(1);
    expect(result.statistics[0]?.scope).toBe('career');
  });

  test('warns rather than publishing an all-zero career for a participant with no events', () => {
    // The empty grouping set still yields one row when nothing matched.
    const result = deriveParticipantAggregates(
      source([
        row({
          competitionGrouped: false,
          seasonGrouped: false,
          competitionId: null,
          competitionName: null,
          season: null,
          appearances: 0,
          fixtureCount: 0,
          sourceEventCount: 0,
        }),
      ]),
      {},
    );

    expect(result.statistics).toEqual([]);
    expect(result.status).toBe('partial');
    expect(result.warnings.map((warning) => warning.code)).toEqual(['NO_ACCEPTED_EVENTS']);
  });

  test('gives each level a distinct, stable statistic identifier', () => {
    const first = deriveParticipantAggregates(source([seasonRow, competitionRow, careerRow]), {});
    const second = deriveParticipantAggregates(source([seasonRow, competitionRow, careerRow]), {});

    const identifiers = first.statistics.map((statistic) => statistic.statisticId);
    expect(new Set(identifiers).size).toBe(3);
    expect(identifiers.every((identifier) => identifier.startsWith('stat_'))).toBe(true);
    expect(second.statistics.map((statistic) => statistic.statisticId)).toEqual(identifiers);
  });

  test('separates participants sharing a display name by identifier', () => {
    const rows = [careerRow];
    const first = deriveParticipantAggregates({ ...source(rows), participantId: '101' }, {});
    const second = deriveParticipantAggregates({ ...source(rows), participantId: '202' }, {});

    expect(first.statistics[0]?.participantName).toBe(second.statistics[0]?.participantName);
    expect(first.statistics[0]?.statisticId).not.toBe(second.statistics[0]?.statisticId);
  });
});
