import type { ParticipantAggregate } from '@sport-analytics/contracts';

/**
 * The handful of figures a reader asks about, and how to read them.
 *
 * Shared by the single-player answer and the head-to-head so that both name the
 * same metrics in the same order: an answer to "V Kohli in the 2024 IPL" and an
 * answer comparing him with someone else should not disagree about what matters.
 *
 * `lowerIsBetter` exists because a bowling average and an economy rate are better
 * when smaller. Comparing those the same way as runs would quietly praise the
 * worse bowler.
 */

export const figure = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 });

export interface Metric {
  label: string;
  lowerIsBetter?: true;
  value: (statistic: ParticipantAggregate | undefined) => number | null;
}

export const METRICS: Metric[] = [
  { label: 'Innings', value: (statistic) => statistic?.batting?.innings ?? null },
  { label: 'Runs', value: (statistic) => statistic?.batting?.runsScored ?? null },
  { label: 'Batting average', value: (statistic) => statistic?.batting?.battingAverage ?? null },
  { label: 'Strike rate', value: (statistic) => statistic?.batting?.strikeRate ?? null },
  { label: 'Fifties', value: (statistic) => statistic?.batting?.fifties ?? null },
  { label: 'Hundreds', value: (statistic) => statistic?.batting?.hundreds ?? null },
  { label: 'Highest score', value: (statistic) => statistic?.batting?.highestScore ?? null },
  { label: 'Wickets', value: (statistic) => statistic?.bowling?.wicketsTaken ?? null },
  {
    label: 'Bowling average',
    lowerIsBetter: true,
    value: (statistic) => statistic?.bowling?.bowlingAverage ?? null,
  },
  {
    label: 'Economy',
    lowerIsBetter: true,
    value: (statistic) => statistic?.bowling?.economyRate ?? null,
  },
];

/** The row a question's `statisticIds` pointed at, once the aggregate is narrowed. */
export function pointedStatistic(statistics: readonly ParticipantAggregate[]) {
  return statistics[0];
}
