import type { ParticipantAggregates } from '@sport-analytics/contracts';
import { describe, expect, it } from 'vitest';
import { scopedAggregates } from './scopedAggregates';

/**
 * Issue #851 problem 3. The published participant-aggregates endpoint takes no
 * competition or season filter, so a season-scoped question is answered with the
 * player's whole aggregate — 62 season rows for V Kohli — and `statisticIds`
 * names the one row that answers it. Showing all 62 is what made scoped questions
 * look broken.
 */

function row(statisticId: string, season: string, competitionId: string) {
  return {
    statisticId,
    participantId: '8452',
    participantName: 'V Kohli',
    appearances: 15,
    fixtureCount: 15,
    sourceEventCount: 400,
    batting: null,
    bowling: null,
    fielding: { catches: 1, stumpings: 0, runOutInvolvements: 0 },
    scope: 'season' as const,
    statisticCode: 'participant_season' as const,
    competitionId,
    competitionName: 'Indian Premier League',
    season,
  };
}

const AGGREGATES = {
  participantId: '8452',
  participantName: 'V Kohli',
  status: 'complete',
  scope: { superOversIncluded: false },
  warnings: [],
  statistics: [
    row('stat_2023', '2023', '4'),
    row('stat_2024', '2024', '4'),
    row('stat_other', '2024', '326'),
  ],
} as unknown as ParticipantAggregates;

describe('narrowing an aggregate to the rows a question asked for', () => {
  it('keeps only the row the statisticIds name', () => {
    const scoped = scopedAggregates(AGGREGATES, ['stat_2024']);

    expect(scoped.statistics).toHaveLength(1);
    expect(scoped.statistics[0]?.statisticId).toBe('stat_2024');
  });

  it('leaves everything else about the aggregate alone', () => {
    const scoped = scopedAggregates(AGGREGATES, ['stat_2024']);

    expect(scoped.participantId).toBe('8452');
    expect(scoped.participantName).toBe('V Kohli');
    expect(scoped.status).toBe(AGGREGATES.status);
    expect(scoped.warnings).toBe(AGGREGATES.warnings);
  });

  it('keeps the rows in the order the aggregate published them', () => {
    const scoped = scopedAggregates(AGGREGATES, ['stat_other', 'stat_2023']);

    expect(scoped.statistics.map((statistic) => statistic.statisticId)).toEqual([
      'stat_2023',
      'stat_other',
    ]);
  });

  // A leaderboard answer carries no statistic identifier, so an empty list must
  // not be read as "show everything".
  it('keeps nothing when no row is named', () => {
    expect(scopedAggregates(AGGREGATES, []).statistics).toEqual([]);
  });

  it('ignores an identifier the aggregate does not carry', () => {
    const scoped = scopedAggregates(AGGREGATES, ['stat_2024', 'stat_missing']);

    expect(scoped.statistics.map((statistic) => statistic.statisticId)).toEqual(['stat_2024']);
  });

  it('does not mutate the aggregate it was given', () => {
    scopedAggregates(AGGREGATES, ['stat_2024']);

    expect(AGGREGATES.statistics).toHaveLength(3);
  });
});
