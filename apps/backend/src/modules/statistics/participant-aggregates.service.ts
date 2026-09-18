import type {
  ParticipantAggregate,
  ParticipantAggregates,
  ParticipantAggregatesQuery,
} from '@sport-analytics/contracts';

import { createSeasonId } from '../public-read/season-id';
import { deriveParticipantAggregates } from './participant-aggregates.derivation';
import type { ParticipantAggregatesSource } from './participant-aggregates.model';
import { loadParticipantAggregatesSource } from './participant-aggregates.repository';
import {
  createParticipantAggregateSnapshotStore,
  type ParticipantAggregateSnapshotStore,
} from './participant-aggregates.snapshot';

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

/**
 * Stored snapshots are used with the default PostgreSQL loader, or when a
 * store is passed explicitly. A caller that injects its own loader without a
 * store derives every read, as before issue #592.
 */
export function createParticipantAggregatesService(
  loadSource: LoadParticipantAggregatesSource = loadParticipantAggregatesSource,
  snapshots?: ParticipantAggregateSnapshotStore | null,
): ParticipantAggregatesService {
  let resolvedSnapshots = snapshots;

  function snapshotStore(): ParticipantAggregateSnapshotStore | null {
    if (resolvedSnapshots === undefined && loadSource === loadParticipantAggregatesSource) {
      resolvedSnapshots = createParticipantAggregateSnapshotStore();
    }
    return resolvedSnapshots ?? null;
  }

  // Delivery rows are authoritative and snapshots are disposable, so no
  // snapshot operation may fail a response live derivation can still produce.
  async function loadSourceFor(participantId: string): Promise<ParticipantAggregatesSource | null> {
    const store = snapshotStore();
    if (!store) {
      return loadSource(participantId);
    }

    let snapshot;
    try {
      snapshot = await store.read(participantId);
    } catch {
      console.warn('Participant aggregate snapshot read failed; deriving from PostgreSQL instead.');
      return loadSource(participantId);
    }

    if (snapshot === null) {
      return null;
    }
    if (snapshot.rows !== null) {
      return {
        participantId: snapshot.participantId,
        participantName: snapshot.participantName,
        rows: snapshot.rows,
      };
    }

    // A read miss derives live, exactly as without snapshots, then refreshes
    // the stored rows in the same request from the rows it just derived. The
    // version was read before the derivation, so rows that include a later
    // write are stored against the earlier version and never served. The write
    // never waits for a lock, and its failure only costs the next read a
    // repeated derivation.
    const source = await loadSource(participantId);
    if (source && snapshot.dataVersion !== null) {
      try {
        await store.write(participantId, snapshot.dataVersion, source.rows);
      } catch (error) {
        console.warn(
          'Participant aggregate snapshot refresh failed; the derived response is unaffected.',
        );
        await store.recordFailure(participantId, error);
      }
    }
    return source;
  }

  async function derive(
    participantId: string,
    query: ParticipantAggregatesQuery,
  ): Promise<ParticipantAggregates | null> {
    if (!databaseIdPattern.test(participantId)) {
      return null;
    }

    const source = await loadSourceFor(participantId);
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
