export interface FixtureStatisticsInningsSource {
  inningsId: string;
  ordinal: number;
  battingCompetitorId: string;
  penaltyPre: number | null;
  penaltyPost: number | null;
}

export interface FixtureStatisticsEventSource {
  deliveryId: string;
  inningsId: string;
  inningsOrdinal: number;
  inningsSequence: number;
  battingCompetitorId: string;
  bowlingCompetitorId: string | null;
  strikerId: string;
  bowlerId: string;
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
}

export interface FixtureStatisticsSource {
  fixtureId: string;
  ballsPerOver: number;
  missingFields: string[];
  outcome: 'won' | 'tie' | 'draw' | 'no result';
  winnerCompetitorId: string | null;
  eliminatorCompetitorId: string | null;
  outcomeByRuns: number | null;
  outcomeByWickets: number | null;
  outcomeMethod: string | null;
  decidedByBowlOut: boolean;
  innings: FixtureStatisticsInningsSource[];
  events: FixtureStatisticsEventSource[];
}
