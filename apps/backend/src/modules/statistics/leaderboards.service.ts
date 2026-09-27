import type {
  Leaderboard,
  LeaderboardMetric,
  LeaderboardQualification,
  LeaderboardQuery,
} from '@sport-analytics/contracts';

import { PublicReadInputError } from '../public-read/public-read.errors';
import { parseSeasonId } from '../public-read/season-id';
import type { LeaderboardScopeSource, LeaderboardSource } from './leaderboards.model';
import { loadLeaderboardSource } from './leaderboards.repository';

export const LEADERBOARD_QUALIFICATIONS: Record<LeaderboardMetric, LeaderboardQualification> = {
  most_runs: null,
  most_wickets: null,
  most_fours: null,
  most_sixes: null,
  highest_batting_average: {
    field: 'dismissals',
    minimum: 5,
    rationale: 'A minimum of five dismissals prevents one short not-out sample leading the table.',
  },
  highest_strike_rate: {
    field: 'ballsFaced',
    minimum: 100,
    rationale: 'A minimum of 100 balls faced excludes short cameo innings.',
  },
  best_bowling_average: {
    field: 'wicketsTaken',
    minimum: 5,
    rationale: 'A minimum of five credited wickets excludes one-off wicket samples.',
  },
  best_economy_rate: {
    field: 'legalBallsBowled',
    minimum: 60,
    rationale:
      "A fixed 60-legal-ball sample avoids depending on the competition's balls-per-over rule.",
  },
  best_bowling_strike_rate: {
    field: 'wicketsTaken',
    minimum: 5,
    rationale: 'A minimum of five credited wickets excludes one-off wicket samples.',
  },
};

export type LoadLeaderboardSource = (
  scope: LeaderboardScopeSource,
  metric: LeaderboardMetric,
  limit: number,
) => Promise<LeaderboardSource | null>;

export interface LeaderboardsService {
  getLeaderboard(query: LeaderboardQuery): Promise<Leaderboard | null>;
}

const databaseIdPattern = /^\d+$/;

export function createLeaderboardsService(
  loadSource: LoadLeaderboardSource = loadLeaderboardSource,
): LeaderboardsService {
  return {
    async getLeaderboard(query) {
      let sourceScope: LeaderboardScopeSource;
      let season: string | undefined;

      if (query.scope === 'season') {
        const identity = parseSeasonId(query.seasonId);
        if (!identity || !databaseIdPattern.test(identity.competitionId)) {
          throw new PublicReadInputError('INVALID_FILTER', 'seasonId is invalid.');
        }
        sourceScope = { competitionId: identity.competitionId, season: identity.label };
        season = identity.label;
      } else {
        if (!databaseIdPattern.test(query.competitionId)) {
          throw new PublicReadInputError('INVALID_FILTER', 'competitionId is invalid.');
        }
        sourceScope = { competitionId: query.competitionId, season: null };
      }

      const source = await loadSource(sourceScope, query.metric, query.limit);
      if (!source) {
        return null;
      }

      const common = {
        metric: query.metric,
        limit: query.limit,
        competitionId: sourceScope.competitionId,
        competitionName: source.competitionName,
        qualification: LEADERBOARD_QUALIFICATIONS[query.metric],
        tieBreakers: ['metricValue', 'participantName', 'participantId'] as [
          'metricValue',
          'participantName',
          'participantId',
        ],
        entries: source.rows,
      };

      return query.scope === 'season'
        ? {
            ...common,
            scope: 'season',
            seasonId: query.seasonId,
            season: season ?? '',
          }
        : {
            ...common,
            scope: 'competition',
          };
    },
  };
}
