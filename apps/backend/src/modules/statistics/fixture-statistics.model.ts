export interface FixtureStatisticsInningsSource {
  inningsId: string;
  ordinal: number;
  battingCompetitorId: string;
  battingCompetitorName: string;
  penaltyPre: number | null;
  penaltyPost: number | null;
  miscountedOvers: FixtureStatisticsMiscountedOverSource[];
  powerplays: FixtureStatisticsPowerplaySource[];
}

export interface FixtureStatisticsPowerplaySource {
  fromBall: number;
  toBall: number;
  type: string;
}

export interface FixtureStatisticsMiscountedOverSource {
  overNumber: number;
  balls: number;
}

export interface FixtureStatisticsEventSource {
  deliveryId: string;
  inningsId: string;
  inningsOrdinal: number;
  inningsSequence: number;
  overNumber: number;
  ballNumber: string;
  battingCompetitorId: string;
  battingCompetitorName: string;
  bowlingCompetitorId: string | null;
  bowlingCompetitorName: string | null;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
  runsOffBat: number;
  runsExtras: number;
  runsTotal: number;
  nonBoundary: boolean;
  extraWides: number | null;
  extraNoBalls: number | null;
  extraByes: number | null;
  extraLegByes: number | null;
  extraPenalty: number | null;
  creditedWickets: number;
  wickets: FixtureStatisticsWicketSource[];
}

export interface FixtureStatisticsWicketSource {
  wicketId: string;
  eventId: string;
  playerOutId: string;
  kind: string;
  isTerminal: boolean;
}

export interface FixtureStatisticsSquadMemberSource {
  participantId: string;
  participantName: string;
  competitorId: string;
  competitorName: string;
}

export interface FixtureStatisticsSource {
  fixtureId: string;
  ballsPerOver: number;
  missingFields: string[];
  outcome: 'won' | 'tie' | 'draw' | 'no result';
  winnerCompetitorId: string | null;
  winnerCompetitorName: string | null;
  eliminatorCompetitorId: string | null;
  eliminatorCompetitorName: string | null;
  outcomeByRuns: number | null;
  outcomeByWickets: number | null;
  outcomeMethod: string | null;
  decidedByBowlOut: boolean;
  innings: FixtureStatisticsInningsSource[];
  events: FixtureStatisticsEventSource[];
  squad?: FixtureStatisticsSquadMemberSource[];
}
