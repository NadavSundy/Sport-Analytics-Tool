import {
  bowlerChargedExtras,
  bowlerWideRuns,
  countsAsBallFaced,
  type FixtureHighestScorer,
  isLegalDelivery,
  type FixtureOutcome,
  type FixtureStatistic,
  type FixtureStatistics,
  type FixtureStatisticsWarning,
  type ParticipantFixtureStatistic,
  type StatisticContributingEvent,
} from '@sport-analytics/contracts';

import type {
  FixtureStatisticsEventSource,
  FixtureStatisticsInningsSource,
  FixtureStatisticsWicketSource,
  FixtureStatisticsSource,
} from './fixture-statistics.model';
import { calculateRate, formatOvers } from './fixture-statistics.metrics';
import { createStatisticId } from './statistic-id';
import { SUPER_OVERS_INCLUDED_IN_STANDARD_STATISTICS } from './super-over-scope';

interface BattingAccumulator {
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
}

interface BowlingAccumulator {
  runsConceded: number;
  wides: number;
  noBalls: number;
  legalBallsBowled: number;
  wicketsTaken: number;
}

interface ParticipantAccumulator {
  participantId: string;
  participantName: string;
  competitorIds: Set<string>;
  competitorNames: Map<string, string>;
  batting: BattingAccumulator | null;
  bowling: BowlingAccumulator | null;
  events: FixtureStatisticsEventSource[];
  eventIds: Set<string>;
  battingPosition: number | null;
  dismissal: FixtureStatisticsWicketSource | null;
}

interface InningsBattingAccumulator {
  participantId: string;
  participantName: string;
  competitorId: string;
  competitorName: string;
  inningsId: string;
  inningsOrdinal: number;
  runsScored: number;
  dismissed: boolean;
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
  return createStatisticId([fixtureId, scope, scopeId]);
}

function inningsOvers(
  events: FixtureStatisticsEventSource[],
  innings: FixtureStatisticsInningsSource,
  ballsPerOver: number,
): string {
  const legalEvents = events.filter((event) =>
    isLegalDelivery({ wides: event.extraWides, noBalls: event.extraNoBalls }),
  );
  if (legalEvents.length === 0) {
    return '0.0';
  }

  const lastOverNumber = Math.max(...legalEvents.map((event) => event.overNumber));
  const legalBallsInLastOver = legalEvents.filter(
    (event) => event.overNumber === lastOverNumber,
  ).length;
  const expectedBalls =
    innings.miscountedOvers.find((over) => over.overNumber === lastOverNumber)?.balls ??
    ballsPerOver;

  return `${lastOverNumber + Math.floor(legalBallsInLastOver / expectedBalls)}.${legalBallsInLastOver % expectedBalls}`;
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
    strikerParticipantName: event.strikerName,
    nonStrikerParticipantId: event.nonStrikerId,
    nonStrikerParticipantName: event.nonStrikerName,
    bowlerParticipantId: event.bowlerId,
    bowlerParticipantName: event.bowlerName,
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
    wicketsLost: event.wickets.filter((wicket) => wicket.isTerminal).length,
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
    winnerCompetitorName: source.winnerCompetitorName,
    eliminatorCompetitorId: source.eliminatorCompetitorId,
    eliminatorCompetitorName: source.eliminatorCompetitorName,
    margin,
    method: source.outcomeMethod,
    decidedByBowlOut: source.decidedByBowlOut,
  };
}

function participantAccumulator(
  participants: Map<string, ParticipantAccumulator>,
  participantId: string,
  participantName: string,
): ParticipantAccumulator {
  const existing = participants.get(participantId);
  if (existing) {
    return existing;
  }

  const created: ParticipantAccumulator = {
    participantId,
    participantName,
    competitorIds: new Set<string>(),
    competitorNames: new Map<string, string>(),
    batting: null,
    bowling: null,
    events: [],
    eventIds: new Set<string>(),
    battingPosition: null,
    dismissal: null,
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

function deriveHighestScorers(
  orderedEvents: FixtureStatisticsEventSource[],
): FixtureHighestScorer[] {
  const batters = new Map<string, InningsBattingAccumulator>();

  const batter = (
    event: FixtureStatisticsEventSource,
    participantId: string,
    participantName: string,
  ): InningsBattingAccumulator => {
    const key = `${event.inningsId}:${participantId}`;
    const existing = batters.get(key);
    if (existing) {
      return existing;
    }

    const created: InningsBattingAccumulator = {
      participantId,
      participantName,
      competitorId: event.battingCompetitorId,
      competitorName: event.battingCompetitorName,
      inningsId: event.inningsId,
      inningsOrdinal: event.inningsOrdinal,
      runsScored: 0,
      dismissed: false,
    };
    batters.set(key, created);
    return created;
  };

  for (const event of orderedEvents) {
    batter(event, event.strikerId, event.strikerName).runsScored += event.runsOffBat;
    batter(event, event.nonStrikerId, event.nonStrikerName);

    for (const wicket of event.wickets) {
      if (!wicket.isTerminal) {
        continue;
      }

      const dismissed = batters.get(`${event.inningsId}:${wicket.playerOutId}`);
      if (dismissed) {
        dismissed.dismissed = true;
      }
    }
  }

  const scores = [...batters.values()];
  if (scores.length === 0) {
    return [];
  }

  const highestRuns = Math.max(...scores.map((score) => score.runsScored));
  return scores
    .filter((score) => score.runsScored === highestRuns)
    .sort(
      (left, right) =>
        left.inningsOrdinal - right.inningsOrdinal ||
        compareDatabaseIds(left.participantId, right.participantId),
    )
    .map((score) => ({
      participantId: score.participantId,
      participantName: score.participantName,
      competitorId: score.competitorId,
      competitorName: score.competitorName,
      inningsId: score.inningsId,
      inningsOrdinal: score.inningsOrdinal,
      runsScored: score.runsScored,
      notOut: !score.dismissed,
    }));
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

  for (const squadMember of source.squad ?? []) {
    const participant = participantAccumulator(
      participants,
      squadMember.participantId,
      squadMember.participantName,
    );
    participant.competitorIds.add(squadMember.competitorId);
    participant.competitorNames.set(squadMember.competitorId, squadMember.competitorName);
  }

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
    const totalRuns = deliveryRuns + penaltyRuns;
    const legalBalls = events.filter((event) =>
      isLegalDelivery({ wides: event.extraWides, noBalls: event.extraNoBalls }),
    ).length;
    const wicketsLost = events.reduce(
      (total, event) => total + event.wickets.filter((wicket) => wicket.isTerminal).length,
      0,
    );
    const deliveryExtras = events.reduce((total, event) => total + event.runsExtras, 0);
    const wides = events.reduce(
      (total, event) =>
        total +
        bowlerWideRuns({
          wides: event.extraWides,
          noBalls: event.extraNoBalls,
          byes: event.extraByes,
          legByes: event.extraLegByes,
        }),
      0,
    );
    const noBalls = events.reduce((total, event) => total + (event.extraNoBalls ?? 0), 0);
    const byes = events.reduce(
      (total, event) => total + ((event.extraWides ?? 0) > 0 ? 0 : (event.extraByes ?? 0)),
      0,
    );
    const legByes = events.reduce(
      (total, event) => total + ((event.extraWides ?? 0) > 0 ? 0 : (event.extraLegByes ?? 0)),
      0,
    );
    const deliveryPenaltyRuns = events.reduce(
      (total, event) => total + (event.extraPenalty ?? 0),
      0,
    );

    statistics.push({
      statisticId: statisticId(source.fixtureId, 'innings', innings.inningsId),
      fixtureId: source.fixtureId,
      scope: 'innings',
      statisticCode: 'team_total',
      inningsId: innings.inningsId,
      inningsOrdinal: innings.ordinal,
      competitorId: innings.battingCompetitorId,
      competitorName: innings.battingCompetitorName,
      sourceEventCount: events.length,
      metrics: {
        deliveryRuns,
        penaltyRuns,
        totalRuns,
        wicketsLost,
        legalBalls,
        overs: inningsOvers(events, innings, source.ballsPerOver),
        runRate: calculateRate(totalRuns, legalBalls, source.ballsPerOver),
        extras: {
          total: deliveryExtras + penaltyRuns,
          wides,
          noBalls,
          byes,
          legByes,
          penaltyRuns: deliveryPenaltyRuns + penaltyRuns,
        },
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

  const nextBattingPositionByInnings = new Map<string, number>();
  for (const event of orderedEvents) {
    const batter = participantAccumulator(participants, event.strikerId, event.strikerName);
    batter.competitorIds.add(event.battingCompetitorId);
    batter.competitorNames.set(event.battingCompetitorId, event.battingCompetitorName);
    batter.batting ??= {
      runsScored: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
    };
    if (batter.battingPosition === null) {
      const nextPosition = nextBattingPositionByInnings.get(event.inningsId) ?? 1;
      batter.battingPosition = nextPosition;
      nextBattingPositionByInnings.set(event.inningsId, nextPosition + 1);
    }
    const extras = {
      wides: event.extraWides,
      noBalls: event.extraNoBalls,
      byes: event.extraByes,
      legByes: event.extraLegByes,
    };
    batter.batting.runsScored += event.runsOffBat;
    if (countsAsBallFaced(extras)) {
      batter.batting.ballsFaced += 1;
    }
    if (!event.nonBoundary && event.runsOffBat === 4) {
      batter.batting.fours += 1;
    }
    if (!event.nonBoundary && event.runsOffBat === 6) {
      batter.batting.sixes += 1;
    }
    addParticipantEvent(batter, event);

    const nonStriker = participantAccumulator(
      participants,
      event.nonStrikerId,
      event.nonStrikerName,
    );
    nonStriker.competitorIds.add(event.battingCompetitorId);
    nonStriker.competitorNames.set(event.battingCompetitorId, event.battingCompetitorName);
    nonStriker.batting ??= { runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0 };
    if (nonStriker.battingPosition === null) {
      const nextPosition = nextBattingPositionByInnings.get(event.inningsId) ?? 1;
      nonStriker.battingPosition = nextPosition;
      nextBattingPositionByInnings.set(event.inningsId, nextPosition + 1);
    }
    addParticipantEvent(nonStriker, event);

    for (const wicket of event.wickets) {
      if (!wicket.isTerminal) {
        continue;
      }
      const dismissed = participantAccumulator(
        participants,
        wicket.playerOutId,
        wicket.playerOutId,
      );
      dismissed.competitorIds.add(event.battingCompetitorId);
      dismissed.competitorNames.set(event.battingCompetitorId, event.battingCompetitorName);
      dismissed.dismissal ??= wicket;
      addParticipantEvent(dismissed, event);
    }

    const bowler = participantAccumulator(participants, event.bowlerId, event.bowlerName);
    if (event.bowlingCompetitorId !== null) {
      bowler.competitorIds.add(event.bowlingCompetitorId);

      if (event.bowlingCompetitorName !== null) {
        bowler.competitorNames.set(event.bowlingCompetitorId, event.bowlingCompetitorName);
      }
    }
    bowler.bowling ??= {
      runsConceded: 0,
      wides: 0,
      noBalls: 0,
      legalBallsBowled: 0,
      wicketsTaken: 0,
    };
    bowler.bowling.runsConceded += event.runsOffBat + bowlerChargedExtras(extras);
    bowler.bowling.wides += bowlerWideRuns(extras);
    bowler.bowling.noBalls += event.extraNoBalls ?? 0;
    if (isLegalDelivery(extras)) {
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
      const competitorName =
        competitorId === null ? null : (participant.competitorNames.get(competitorId) ?? null);

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
        participantName: participant.participantName,
        competitorId,
        competitorName,
        sourceEventCount: participant.events.length,
        battingPosition: participant.battingPosition,
        battingParticipation: participant.batting ? 'batted' : 'did_not_bat',
        dismissal: participant.batting
          ? participant.dismissal
            ? {
                status: 'dismissed',
                kind: participant.dismissal.kind,
                eventId: participant.dismissal.eventId,
              }
            : { status: 'not_out', kind: null, eventId: null }
          : null,
        batting: participant.batting
          ? {
              ...participant.batting,
              strikeRate: calculateRate(
                participant.batting.runsScored,
                participant.batting.ballsFaced,
                100,
              ),
            }
          : null,
        bowling: participant.bowling
          ? {
              ...participant.bowling,
              oversBowled: formatOvers(participant.bowling.legalBallsBowled, source.ballsPerOver),
              economyRate: calculateRate(
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
      superOversIncluded: SUPER_OVERS_INCLUDED_IN_STANDARD_STATISTICS,
    },
    outcome: mapOutcome(source),
    highestScorers: deriveHighestScorers(orderedEvents),
    warnings,
    statistics,
  };
}
