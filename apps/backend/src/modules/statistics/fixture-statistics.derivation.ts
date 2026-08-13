import { createHash } from 'node:crypto';
import type {
  FixtureOutcome,
  FixtureStatistic,
  FixtureStatistics,
  FixtureStatisticsWarning,
  ParticipantFixtureStatistic,
  StatisticContributingEvent,
} from '@sport-analytics/contracts';

import type {
  FixtureStatisticsEventSource,
  FixtureStatisticsSource,
} from './fixture-statistics.model';

interface BattingAccumulator {
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
}

interface BowlingAccumulator {
  runsConceded: number;
  legalBallsBowled: number;
  wicketsTaken: number;
}

interface ParticipantAccumulator {
  participantId: string;
  competitorIds: Set<string>;
  batting: BattingAccumulator | null;
  bowling: BowlingAccumulator | null;
  events: FixtureStatisticsEventSource[];
  eventIds: Set<string>;
}

export interface DeriveFixtureStatisticsOptions {
  includeContributors?: boolean;
}

function compareDatabaseIds(left: string, right: string): number {
  if (left.length !== right.length) {
    return left.length - right.length;
  }

  return left.localeCompare(right);
}

function statisticId(fixtureId: string, scope: string, scopeId: string): string {
  const digest = createHash('sha256')
    .update(`${fixtureId}\u0000${scope}\u0000${scopeId}`)
    .digest('base64url');

  return `stat_${digest}`;
}

function rate(numerator: number, denominator: number, multiplier: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return Number(((numerator / denominator) * multiplier).toFixed(2));
}

function formatOvers(legalBalls: number, ballsPerOver: number): string {
  return `${Math.floor(legalBalls / ballsPerOver)}.${legalBalls % ballsPerOver}`;
}

function mapContributingEvent(
  fixtureId: string,
  event: FixtureStatisticsEventSource,
): StatisticContributingEvent {
  return {
    eventId: event.deliveryId,
    fixtureId,
    inningsId: event.inningsId,
    inningsOrdinal: event.inningsOrdinal,
    sequenceNumber: event.inningsSequence,
    strikerParticipantId: event.strikerId,
    bowlerParticipantId: event.bowlerId,
    runs: {
      offBat: event.runsOffBat,
      extras: event.runsExtras,
      total: event.runsTotal,
    },
    extras: {
      wides: event.extraWides,
      noBalls: event.extraNoBalls,
      byes: event.extraByes,
      legByes: event.extraLegByes,
      penalty: event.extraPenalty,
    },
    nonBoundary: event.nonBoundary,
    bowlerWickets: event.creditedWickets,
  };
}

function mapOutcome(source: FixtureStatisticsSource): FixtureOutcome {
  const margin =
    source.outcomeByRuns !== null
      ? {
          type: 'runs' as const,
          value: source.outcomeByRuns,
        }
      : source.outcomeByWickets !== null
        ? {
            type: 'wickets' as const,
            value: source.outcomeByWickets,
          }
        : null;

  return {
    kind: source.outcome === 'no result' ? 'no_result' : source.outcome,
    winnerCompetitorId: source.winnerCompetitorId,
    eliminatorCompetitorId: source.eliminatorCompetitorId,
    margin,
    method: source.outcomeMethod,
    decidedByBowlOut: source.decidedByBowlOut,
  };
}

function participantAccumulator(
  participants: Map<string, ParticipantAccumulator>,
  participantId: string,
): ParticipantAccumulator {
  const existing = participants.get(participantId);
  if (existing) {
    return existing;
  }

  const created: ParticipantAccumulator = {
    participantId,
    competitorIds: new Set<string>(),
    batting: null,
    bowling: null,
    events: [],
    eventIds: new Set<string>(),
  };
  participants.set(participantId, created);
  return created;
}

function addParticipantEvent(
  participant: ParticipantAccumulator,
  event: FixtureStatisticsEventSource,
): void {
  if (participant.eventIds.has(event.deliveryId)) {
    return;
  }

  participant.eventIds.add(event.deliveryId);
  participant.events.push(event);
}

export function deriveFixtureStatistics(
  source: FixtureStatisticsSource,
  options: DeriveFixtureStatisticsOptions = {},
): FixtureStatistics {
  const includeContributors = options.includeContributors ?? false;
  const warnings: FixtureStatisticsWarning[] = [];
  const orderedInnings = [...source.innings].sort((left, right) => left.ordinal - right.ordinal);
  const orderedEvents = [...source.events].sort(
    (left, right) =>
      left.inningsOrdinal - right.inningsOrdinal ||
      left.inningsSequence - right.inningsSequence ||
      compareDatabaseIds(left.deliveryId, right.deliveryId),
  );

  if (source.missingFields.length > 0) {
    warnings.push({
      code: 'SOURCE_DATA_INCOMPLETE',
      message: 'The accepted source identifies fields that were unavailable.',
      fields: [...source.missingFields].sort(),
    });
  }

  if (orderedInnings.length === 0) {
    warnings.push({
      code: 'NO_STANDARD_INNINGS',
      message: 'No non-super-over innings are available for derivation.',
    });
  }

  if (orderedEvents.length === 0) {
    warnings.push({
      code: 'NO_ACCEPTED_EVENTS',
      message: 'No accepted delivery events are available for derivation.',
    });
  }

  const statistics: FixtureStatistic[] = [];
  const participants = new Map<string, ParticipantAccumulator>();

  for (const innings of orderedInnings) {
    const events = orderedEvents.filter((event) => event.inningsId === innings.inningsId);
    if (events.length === 0) {
      warnings.push({
        code: 'INNINGS_WITHOUT_ACCEPTED_EVENTS',
        message: 'This innings has no accepted delivery events.',
        inningsId: innings.inningsId,
      });
    }

    const deliveryRuns = events.reduce((total, event) => total + event.runsTotal, 0);
    const penaltyRuns = (innings.penaltyPre ?? 0) + (innings.penaltyPost ?? 0);

    statistics.push({
      statisticId: statisticId(source.fixtureId, 'innings', innings.inningsId),
      fixtureId: source.fixtureId,
      scope: 'innings',
      statisticCode: 'team_total',
      inningsId: innings.inningsId,
      inningsOrdinal: innings.ordinal,
      competitorId: innings.battingCompetitorId,
      sourceEventCount: events.length,
      metrics: {
        deliveryRuns,
        penaltyRuns,
        totalRuns: deliveryRuns + penaltyRuns,
      },
      ...(includeContributors
        ? {
            contributingEvents: events.map((event) =>
              mapContributingEvent(source.fixtureId, event),
            ),
          }
        : {}),
    });
  }

  for (const event of orderedEvents) {
    const batter = participantAccumulator(participants, event.strikerId);
    batter.competitorIds.add(event.battingCompetitorId);
    batter.batting ??= {
      runsScored: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
    };
    batter.batting.runsScored += event.runsOffBat;
    if (event.extraWides === null) {
      batter.batting.ballsFaced += 1;
    }
    if (!event.nonBoundary && event.runsOffBat === 4) {
      batter.batting.fours += 1;
    }
    if (!event.nonBoundary && event.runsOffBat === 6) {
      batter.batting.sixes += 1;
    }
    addParticipantEvent(batter, event);

    const bowler = participantAccumulator(participants, event.bowlerId);
    if (event.bowlingCompetitorId !== null) {
      bowler.competitorIds.add(event.bowlingCompetitorId);
    }
    bowler.bowling ??= {
      runsConceded: 0,
      legalBallsBowled: 0,
      wicketsTaken: 0,
    };
    bowler.bowling.runsConceded +=
      event.runsOffBat + (event.extraWides ?? 0) + (event.extraNoBalls ?? 0);
    if (event.extraWides === null && event.extraNoBalls === null) {
      bowler.bowling.legalBallsBowled += 1;
    }
    bowler.bowling.wicketsTaken += event.creditedWickets;
    addParticipantEvent(bowler, event);
  }

  const participantStatistics = [...participants.values()]
    .sort((left, right) => compareDatabaseIds(left.participantId, right.participantId))
    .map((participant): ParticipantFixtureStatistic => {
      const competitorIds = [...participant.competitorIds].sort(compareDatabaseIds);
      const competitorId = competitorIds[0] ?? null;

      if (competitorId === null) {
        warnings.push({
          code: 'PARTICIPANT_COMPETITOR_UNKNOWN',
          message: 'The participant could not be associated with a fixture competitor.',
          participantId: participant.participantId,
        });
      }

      return {
        statisticId: statisticId(source.fixtureId, 'participant', participant.participantId),
        fixtureId: source.fixtureId,
        scope: 'participant',
        statisticCode: 'participant_fixture',
        participantId: participant.participantId,
        competitorId,
        sourceEventCount: participant.events.length,
        batting: participant.batting
          ? {
              ...participant.batting,
              strikeRate: rate(participant.batting.runsScored, participant.batting.ballsFaced, 100),
            }
          : null,
        bowling: participant.bowling
          ? {
              ...participant.bowling,
              oversBowled: formatOvers(participant.bowling.legalBallsBowled, source.ballsPerOver),
              economyRate: rate(
                participant.bowling.runsConceded,
                participant.bowling.legalBallsBowled,
                source.ballsPerOver,
              ),
            }
          : null,
        ...(includeContributors
          ? {
              contributingEvents: participant.events.map((event) =>
                mapContributingEvent(source.fixtureId, event),
              ),
            }
          : {}),
      };
    });

  statistics.push(...participantStatistics);

  return {
    fixtureId: source.fixtureId,
    status: warnings.length === 0 ? 'complete' : 'partial',
    scope: {
      superOversIncluded: false,
    },
    outcome: mapOutcome(source),
    warnings,
    statistics,
  };
}
