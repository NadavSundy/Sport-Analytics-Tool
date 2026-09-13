import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import {
  DATASET_RELEASE_FORMAT_VERSION,
  type CreateDatasetRelease,
  type DatasetRelease,
} from '@sport-analytics/contracts';

import { ObjectStorageError, type ObjectStore } from '../object-storage/object-store';
import {
  createDatasetReleaseRepository,
  type DatasetReleaseEventCursor,
  type DatasetReleaseRepository,
  type DatasetReleaseSnapshot,
} from './dataset-release.repository';

const DATASET_RELEASE_EVENT_PAGE_SIZE = 10_000;
const DATASET_RELEASE_SCOPE = 'published-accepted-deliveries';

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
  getArtifact(version: string): Promise<Readable | null>;
}

interface ArtifactGenerationState {
  eventCount: number;
}

function mapSnapshot(snapshot: DatasetReleaseSnapshot): DatasetRelease {
  return {
    releaseId: snapshot.releaseId,
    version: snapshot.version,
    createdAt: snapshot.createdAt,
    formatVersion: DATASET_RELEASE_FORMAT_VERSION,
    scope: DATASET_RELEASE_SCOPE,
    eventCount: snapshot.eventCount,
    checksum: snapshot.checksum,
    fields: [...fields],
  };
}

function artifactHeader(): Buffer {
  return Buffer.from(
    `{"formatVersion":${JSON.stringify(DATASET_RELEASE_FORMAT_VERSION)},` +
      `"scope":${JSON.stringify(DATASET_RELEASE_SCOPE)},` +
      `"fields":${JSON.stringify(fields)},"events":[`,
  );
}

async function* generateArtifact(
  repository: DatasetReleaseRepository,
  pageSize: number,
  hash: ReturnType<typeof createHash>,
  state: ArtifactGenerationState,
): AsyncGenerator<Buffer> {
  const emit = (bytes: Buffer) => {
    hash.update(bytes);
    return bytes;
  };

  yield emit(artifactHeader());
  let cursor: DatasetReleaseEventCursor | null = null;
  let firstEvent = true;

  while (true) {
    const page = await repository.loadPublishedEventPage(cursor, pageSize);
    for (const event of page.events) {
      const serialized = JSON.stringify(event);
      if (serialized === undefined) {
        throw new Error('A published dataset event could not be serialized.');
      }
      yield emit(Buffer.from(`${firstEvent ? '' : ','}${serialized}`));
      firstEvent = false;
      state.eventCount += 1;
    }

    if (page.events.length < pageSize || !page.nextCursor) {
      break;
    }
    cursor = page.nextCursor;
  }

  yield emit(Buffer.from(']}'));
}

function artifactStorageKey(): string {
  return `dataset-releases/${randomUUID()}.json`;
}

export function createDatasetReleaseService(
  repository: DatasetReleaseRepository = createDatasetReleaseRepository(),
  objectStore?: ObjectStore,
  pageSize = DATASET_RELEASE_EVENT_PAGE_SIZE,
): DatasetReleaseService {
  return {
    async createRelease(input) {
      const existing = await repository.findByVersion(input.version);
      if (existing) {
        return mapSnapshot(existing);
      }
      if (!objectStore) {
        throw new ObjectStorageError('Dataset release object storage is not configured.');
      }

      const key = artifactStorageKey();
      const hash = createHash('sha256');
      const state: ArtifactGenerationState = { eventCount: 0 };
      const source = Readable.from(generateArtifact(repository, pageSize, hash, state));

      try {
        const stored = await objectStore.write(key, source);
        const result = await repository.createOrFind({
          version: input.version,
          formatVersion: DATASET_RELEASE_FORMAT_VERSION,
          scope: DATASET_RELEASE_SCOPE,
          eventCount: state.eventCount,
          fields,
          artifactStorageKey: key,
          artifactProviderVersionId: stored.versionId,
          checksum: hash.digest('hex'),
        });

        if (!result.created) {
          try {
            await objectStore.delete(key);
          } catch {
            // Reconciliation can retry deletion of an unreferenced race-losing object.
          }
        }

        return mapSnapshot(result.snapshot);
      } catch (error) {
        source.destroy();
        try {
          await objectStore.delete(key);
        } catch {
          // Reconciliation can retry deletion if object storage is temporarily unavailable.
        }
        throw error;
      }
    },

    async listReleases() {
      const releases = await repository.list();
      return releases.map(mapSnapshot);
    },

    async getRelease(version) {
      const release = await repository.findByVersion(version);
      return release ? mapSnapshot(release) : null;
    },

    async getArtifact(version) {
      const reference = await repository.findArtifactReferenceByVersion(version);
      if (!reference) {
        return null;
      }
      if (reference.storageKey) {
        if (!objectStore) {
          throw new ObjectStorageError('Dataset release object storage is not configured.');
        }
        return objectStore.read(reference.storageKey);
      }
      return reference.legacyArtifactText === null
        ? null
        : Readable.from(Buffer.from(reference.legacyArtifactText));
    },
  };
}
