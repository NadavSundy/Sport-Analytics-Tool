import type {
  ParticipantAggregate,
  ParticipantAggregates,
  ParticipantAggregatesQuery,
} from '@sport-analytics/contracts';

import { createSeasonId } from '../public-read/season-id';
import { deriveParticipantAggregates } from './participant-aggregates.derivation';
import type { ParticipantAggregatesSource } from './participant-aggregates.model';
import { loadParticipantAggregatesSource } from './participant-aggregates.repository';

export type LoadParticipantAggregatesSource = (
  participantId: string,
) => Promise<ParticipantAggregatesSource | null>;

export interface ParticipantAggregatesService {
  getParticipantAggregates(
    participantId: string,
    query: ParticipantAggregatesQuery,
  ): Promise<ParticipantAggregates | null>;
  getParticipantAggregate(
    participantId: string,
    statisticId: string,
  ): Promise<ParticipantAggregate | null>;
}

const databaseIdPattern = /^\d+$/;

export function createParticipantAggregatesService(
  loadSource: LoadParticipantAggregatesSource = loadParticipantAggregatesSource,
): ParticipantAggregatesService {
  async function derive(
    participantId: string,
    query: ParticipantAggregatesQuery,
  ): Promise<ParticipantAggregates | null> {
    if (!databaseIdPattern.test(participantId)) {
      return null;
    }

    const source = await loadSource(participantId);
    if (!source) {
      return null;
    }

    return deriveParticipantAggregates(source, {
      ...(query.scope !== undefined ? { scope: query.scope } : {}),
      createSeasonId,
    });
  }

  return {
    getParticipantAggregates: derive,

    async getParticipantAggregate(participantId, statisticId) {
      // Resolved from the unfiltered derivation: a client holding a season
      // statistic identifier should not have to know which scope filter would
      // have produced it.
      const aggregates = await derive(participantId, {});
      if (!aggregates) {
        return null;
      }

      return (
        aggregates.statistics.find((statistic) => statistic.statisticId === statisticId) ?? null
      );
    },
  };
}
