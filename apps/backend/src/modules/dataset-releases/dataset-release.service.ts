import { Readable } from 'node:stream';

import {
  DATASET_RELEASE_FORMAT_VERSION,
  DATASET_RELEASE_FIELDS,
  DATASET_RELEASE_SCOPE,
  type CreateDatasetRelease,
  type DatasetRelease,
  type DatasetReleaseJob,
} from '@sport-analytics/contracts';

import { ObjectStorageError, type ObjectStore } from '../object-storage/object-store';
import {
  createDatasetReleaseRepository,
  type DatasetReleaseJobRecord,
  type DatasetReleaseRepository,
  type DatasetReleaseSnapshot,
} from './dataset-release.repository';

interface DatasetReleaseRequestResult {
  release: DatasetRelease | null;
  job: DatasetReleaseJob | null;
}

function toApiDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Dataset release timestamp is invalid.');
  }
  return date.toISOString();
}

function toNullableApiDateTime(value: string | null): string | null {
  return value === null ? null : toApiDateTime(value);
}

export interface DatasetReleaseService {
  requestRelease(
    input: CreateDatasetRelease,
    requesterId: string,
  ): Promise<DatasetReleaseRequestResult>;
  getJob(jobId: string): Promise<DatasetReleaseJob | null>;
  listReleases(): Promise<DatasetRelease[]>;
  getRelease(version: string): Promise<DatasetRelease | null>;
  getArtifact(version: string): Promise<Readable | null>;
}

export interface DatasetReleaseServiceOptions {
  deploymentEnvironment: string;
  storageProvider?: 'azure' | 'filesystem' | undefined;
  releaseObjectStore?: ObjectStore | undefined;
  legacyObjectStore?: ObjectStore | undefined;
}

function mapSnapshot(snapshot: DatasetReleaseSnapshot): DatasetRelease {
  return {
    releaseId: snapshot.releaseId,
    version: snapshot.version,
    createdAt: toApiDateTime(snapshot.createdAt),
    snapshotId: snapshot.snapshotId,
    snapshotAsOf: toNullableApiDateTime(snapshot.snapshotAsOf),
    formatVersion: DATASET_RELEASE_FORMAT_VERSION,
    scope: DATASET_RELEASE_SCOPE,
    eventCount: snapshot.eventCount,
    checksum: snapshot.checksum,
    fields: [...DATASET_RELEASE_FIELDS],
  };
}

function mapJob(job: DatasetReleaseJobRecord): DatasetReleaseJob {
  const status =
    job.state === 'queued'
      ? 'pending'
      : job.state === 'running'
        ? 'generating'
        : job.state === 'succeeded'
          ? 'completed'
          : 'failed';
  return {
    jobId: job.jobId,
    version: job.version,
    status,
    eventsProcessed: job.eventsProcessed,
    bytesWritten: job.bytesWritten,
    pageNumber: job.pageNumber,
    createdAt: toApiDateTime(job.createdAt),
    startedAt: toNullableApiDateTime(job.startedAt),
    completedAt: toNullableApiDateTime(job.completedAt),
    failureCode: job.failureCode,
    failureMessage: job.failureMessage,
    release: job.release ? mapSnapshot(job.release) : null,
  };
}

export function createDatasetReleaseService(
  repository: DatasetReleaseRepository = createDatasetReleaseRepository(),
  options: DatasetReleaseServiceOptions,
): DatasetReleaseService {
  return {
    async requestRelease(input, requesterId) {
      if (!options.storageProvider || !options.releaseObjectStore) {
        throw new ObjectStorageError('Dataset release object storage is not configured.');
      }
      const result = await repository.requestGeneration({
        version: input.version,
        requesterId,
        deploymentEnvironment: options.deploymentEnvironment,
        storageProvider: options.storageProvider,
      });
      return {
        release: result.release ? mapSnapshot(result.release) : null,
        job: result.job ? mapJob(result.job) : null,
      };
    },
    async getJob(jobId) {
      const job = await repository.findJob(jobId, options.deploymentEnvironment);
      return job ? mapJob(job) : null;
    },
    async listReleases() {
      return (await repository.list(options.deploymentEnvironment)).map(mapSnapshot);
    },
    async getRelease(version) {
      const release = await repository.findByVersion(version, options.deploymentEnvironment);
      return release ? mapSnapshot(release) : null;
    },
    async getArtifact(version) {
      const reference = await repository.findArtifactReferenceByVersion(
        version,
        options.deploymentEnvironment,
      );
      if (!reference) return null;
      if (reference.storageKey) {
        const store =
          reference.storageLocation === 'release'
            ? options.releaseObjectStore
            : options.legacyObjectStore;
        if (!store)
          throw new ObjectStorageError('Dataset release object storage is not configured.');
        return store.read(reference.storageKey);
      }
      return reference.legacyArtifactText === null
        ? null
        : Readable.from(Buffer.from(reference.legacyArtifactText));
    },
  };
}
