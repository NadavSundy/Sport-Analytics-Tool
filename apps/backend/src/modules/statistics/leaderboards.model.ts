import type { LeaderboardMetric } from '@sport-analytics/contracts';

export interface LeaderboardScopeSource {
  competitionId: string;
  season: string | null;
}

interface LeaderboardSourceRow {
  rank: number;
  participantId: string;
  participantName: string;
  value: number;
}

export interface LeaderboardSource {
  competitionName: string;
  metric: LeaderboardMetric;
  rows: LeaderboardSourceRow[];
}
