import type { ParticipantAggregates } from '@sport-analytics/contracts';

/**
 * Narrows a published aggregate to the rows that answer the question.
 *
 * The published participant-aggregates endpoint accepts no competition or season
 * filter, so a season-scoped question is answered with the player's entire
 * aggregate and `sources[].statisticIds` names the row that answers it. V Kohli's
 * season aggregate carries 62 rows across 27 competitions; showing all of them is
 * not an answer to "the 2024 IPL season".
 *
 * The order the aggregate published its rows in is kept, rather than the order the
 * identifiers happen to arrive in, so two answers over the same rows read the same
 * way.
 */
export function scopedAggregates(
  aggregates: ParticipantAggregates,
  statisticIds: readonly string[],
): ParticipantAggregates {
  const wanted = new Set(statisticIds);

  return {
    ...aggregates,
    statistics: aggregates.statistics.filter((statistic) => wanted.has(statistic.statisticId)),
  };
}
