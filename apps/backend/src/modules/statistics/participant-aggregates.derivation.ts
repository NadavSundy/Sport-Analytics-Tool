import type {
  ParticipantAggregate,
  ParticipantAggregateBatting,
  ParticipantAggregateBowling,
  ParticipantAggregateScope,
  ParticipantAggregates,
  ParticipantAggregatesWarning,
} from '@sport-analytics/contracts';

import { calculateRate, formatOvers } from './fixture-statistics.metrics';
import type {
  ParticipantAggregateRow,
  ParticipantAggregatesSource,
} from './participant-aggregates.model';
import { createStatisticId } from './statistic-id';
import { SUPER_OVERS_INCLUDED_IN_STANDARD_STATISTICS } from './super-over-scope';

export interface DeriveParticipantAggregatesOptions {
  /** Restricts the response to one level. All three are returned by default. */
  scope?: ParticipantAggregateScope;
  /**
   * Builds the opaque season identifier used elsewhere in the public API. A
   * season has no key of its own; it is a (competition, label) pair, so the
   * encoding lives with the public-read module and is injected here rather than
   * duplicated.
   */
  createSeasonId?: (identity: { competitionId: string; label: string }) => string;
}

function rowScope(row: ParticipantAggregateRow): ParticipantAggregateScope {
  if (row.seasonGrouped) {
    return 'season';
  }

  return row.competitionGrouped ? 'competition' : 'career';
}

function battingOf(row: ParticipantAggregateRow): ParticipantAggregateBatting | null {
  if (row.battingDeliveryCount === 0) {
    return null;
  }

  return {
    runsScored: row.runsScored,
    ballsFaced: row.ballsFaced,
    fours: row.fours,
    sixes: row.sixes,
    strikeRate: calculateRate(row.runsScored, row.ballsFaced, 100),
  };
}

function bowlingOf(row: ParticipantAggregateRow): ParticipantAggregateBowling | null {
  if (row.bowlingDeliveryCount === 0) {
    return null;
  }

  const ballsPerOver = row.ballsPerOver;

  return {
    runsConceded: row.runsConceded,
    legalBallsBowled: row.legalBallsBowled,
    wicketsTaken: row.wicketsTaken,
    ballsPerOver,
    oversBowled: ballsPerOver === null ? null : formatOvers(row.legalBallsBowled, ballsPerOver),
    economyRate:
      ballsPerOver === null
        ? null
        : calculateRate(row.runsConceded, row.legalBallsBowled, ballsPerOver),
  };
}

/**
 * Projects a participant's grouped figures onto the published aggregate shapes.
 *
 * The arithmetic is done in the database; what remains here is naming each
 * level, deriving the two rates, and reporting anything the figures alone would
 * not tell a reader. Rates are computed rather than summed, per §7: a strike
 * rate is runs over balls faced across the whole group, not a mean of per-
 * fixture rates.
 */
export function deriveParticipantAggregates(
  source: ParticipantAggregatesSource,
  options: DeriveParticipantAggregatesOptions = {},
): ParticipantAggregates {
  const warnings: ParticipantAggregatesWarning[] = [];

  // A grouping set of () yields one all-zero row even when the participant has
  // no accepted standard delivery at all. That is an absence, not a figure.
  const contributingRows = source.rows.filter((row) => row.sourceEventCount > 0);

  if (contributingRows.length === 0) {
    warnings.push({
      code: 'NO_ACCEPTED_EVENTS',
      message: 'The participant has no accepted standard delivery events.',
    });
  }

  const statistics: ParticipantAggregate[] = [];

  for (const row of contributingRows) {
    const scope = rowScope(row);
    if (options.scope !== undefined && options.scope !== scope) {
      continue;
    }

    const common = {
      participantId: source.participantId,
      participantName: source.participantName,
      fixtureCount: row.fixtureCount,
      sourceEventCount: row.sourceEventCount,
      batting: battingOf(row),
      bowling: bowlingOf(row),
    };

    if (row.competitionGrouped && row.competitionId === null) {
      warnings.push({
        code: 'COMPETITION_UNKNOWN',
        message: 'These fixtures are published without a competition.',
        ...(row.seasonGrouped && row.season !== null ? { season: row.season } : {}),
      });
    }

    if (row.bowlingDeliveryCount > 0 && row.ballsPerOver === null) {
      warnings.push({
        code: 'MIXED_BALLS_PER_OVER',
        message:
          'These fixtures do not share one balls-per-over value, so overs bowled and economy rate have no single divisor.',
        ...(row.competitionGrouped && row.competitionId !== null
          ? { competitionId: row.competitionId }
          : {}),
        ...(row.seasonGrouped && row.season !== null ? { season: row.season } : {}),
      });
    }

    if (scope === 'season') {
      // fixture.season is NOT NULL, so a season-grouped row always carries one.
      const season = row.season ?? '';
      const seasonId =
        row.competitionId !== null && options.createSeasonId
          ? options.createSeasonId({ competitionId: row.competitionId, label: season })
          : null;

      statistics.push({
        ...common,
        statisticId: createStatisticId([
          source.participantId,
          'season',
          row.competitionId ?? '',
          season,
        ]),
        scope: 'season',
        statisticCode: 'participant_season',
        competitionId: row.competitionId,
        competitionName: row.competitionName,
        seasonId,
        season,
      });
      continue;
    }

    if (scope === 'competition') {
      statistics.push({
        ...common,
        statisticId: createStatisticId([
          source.participantId,
          'competition',
          row.competitionId ?? '',
        ]),
        scope: 'competition',
        statisticCode: 'participant_competition',
        competitionId: row.competitionId,
        competitionName: row.competitionName,
      });
      continue;
    }

    statistics.push({
      ...common,
      statisticId: createStatisticId([source.participantId, 'career']),
      scope: 'career',
      statisticCode: 'participant_career',
    });
  }

  return {
    participantId: source.participantId,
    participantName: source.participantName,
    status: warnings.length === 0 ? 'complete' : 'partial',
    scope: {
      superOversIncluded: SUPER_OVERS_INCLUDED_IN_STANDARD_STATISTICS,
    },
    warnings,
    statistics,
  };
}
