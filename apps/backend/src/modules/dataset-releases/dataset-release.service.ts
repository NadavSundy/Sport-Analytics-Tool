import { createHash } from 'node:crypto';

import {
  DATASET_RELEASE_FORMAT_VERSION,
  type CreateDatasetRelease,
  type DatasetRelease,
} from '@sport-analytics/contracts';

import {
  createDatasetReleaseRepository,
  type DatasetReleaseRepository,
  type DatasetReleaseSnapshot,
} from './dataset-release.repository';

const fields = [
  { name: 'eventId', description: 'Stable identifier of the accepted delivery revision.' },
  { name: 'fixtureId', description: 'Fixture containing the delivery.' },
  { name: 'inningsId', description: 'Innings containing the delivery.' },
  { name: 'inningsOrdinal', description: 'Zero-based source innings order.' },
  { name: 'sequenceNumber', description: 'Stable delivery order within the innings.' },
  { name: 'overNumber', description: 'Zero-based cricket over number.' },
  { name: 'positionInOver', description: 'Zero-based source position within the over.' },
  { name: 'ballNumber', description: 'Display ball label; not an identity field.' },
  { name: 'strikerParticipantId', description: 'Stable striker participant identifier.' },
  { name: 'nonStrikerParticipantId', description: 'Stable non-striker participant identifier.' },
  { name: 'bowlerParticipantId', description: 'Stable bowler participant identifier.' },
  { name: 'runsOffBat', description: 'Runs credited to the striker.' },
  { name: 'runsExtras', description: 'Extra runs on the delivery.' },
  { name: 'runsTotal', description: 'Total runs on the delivery.' },
] as const;

export interface DatasetReleaseService {
  createRelease(input: CreateDatasetRelease): Promise<DatasetRelease>;
  listReleases(): Promise<DatasetRelease[]>;
  getRelease(version: string): Promise<DatasetRelease | null>;
  getArtifact(version: string): Promise<string | null>;
}

function mapSnapshot(snapshot: DatasetReleaseSnapshot): DatasetRelease {
  return {
    releaseId: snapshot.releaseId,
    version: snapshot.version,
    createdAt: snapshot.createdAt,
    formatVersion: DATASET_RELEASE_FORMAT_VERSION,
    scope: 'published-accepted-deliveries',
    eventCount: snapshot.eventCount,
    checksum: snapshot.checksum,
    fields: [...fields],
  };
}

export function createDatasetReleaseService(
  repository: DatasetReleaseRepository = createDatasetReleaseRepository(),
): DatasetReleaseService {
  return {
    async createRelease(input) {
      const existing = await repository.findByVersion(input.version);
      if (existing) {
        return mapSnapshot(existing);
      }

      const events = await repository.loadPublishedEvents();
      const artifact = JSON.stringify({
        formatVersion: DATASET_RELEASE_FORMAT_VERSION,
        scope: 'published-accepted-deliveries',
        fields,
        events,
      });
      const created = await repository.createOrFind({
        version: input.version,
        formatVersion: DATASET_RELEASE_FORMAT_VERSION,
        scope: 'published-accepted-deliveries',
        eventCount: events.length,
        fields,
        artifact,
        checksum: createHash('sha256').update(artifact).digest('hex'),
      });

      return mapSnapshot(created);
    },

    async listReleases() {
      const releases = await repository.list();
      return releases.map(mapSnapshot);
    },

    async getRelease(version) {
      const release = await repository.findByVersion(version);
      return release ? mapSnapshot(release) : null;
    },

    getArtifact(version) {
      return repository.findArtifactByVersion(version);
    },
  };
}
