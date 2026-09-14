import { resolve } from 'node:path';

import type { Environment } from '../../config/env';
import {
  createAzureObjectStorageComposition,
  type AzureObjectStorageComposition,
} from './azure-object-storage.composition';
import { BatchPayloadStorageService } from './batch-payload-storage.service';
import { FilesystemObjectStore } from './filesystem-object-store';
import type { ObjectStore } from './object-store';
import { createStoredObjectRepository } from './stored-object.repository';

export interface ObjectStorageComposition {
  objectStore: ObjectStore;
  releaseObjectStore: ObjectStore;
  legacyObjectStore: ObjectStore;
  provider: 'azure' | 'filesystem';
  batchPayloadStorageService?: BatchPayloadStorageService;
}

export interface ObjectStorageCompositionFactories {
  createAzure(environment: Environment): AzureObjectStorageComposition;
  createFilesystem(root: string): ObjectStore;
  createBatchPayloadStorageService(objectStore: ObjectStore): BatchPayloadStorageService;
}

const defaultFactories: ObjectStorageCompositionFactories = {
  createAzure: createAzureObjectStorageComposition,
  createFilesystem: (root) => new FilesystemObjectStore(root),
  createBatchPayloadStorageService: (objectStore) =>
    new BatchPayloadStorageService(
      objectStore,
      createStoredObjectRepository(),
      async (requesterId, object) => requesterId === object.ownerId,
    ),
};

/** Selects an explicit provider without allowing production to fall back to local storage. */
export function createObjectStorageComposition(
  environment: Environment,
  factories: ObjectStorageCompositionFactories = defaultFactories,
): ObjectStorageComposition | undefined {
  if (!environment.OBJECT_STORAGE_PROVIDER) {
    if (environment.NODE_ENV === 'production') {
      throw new Error('Object storage provider is required in production.');
    }
    return undefined;
  }

  if (environment.OBJECT_STORAGE_PROVIDER === 'azure') {
    const azure = factories.createAzure(environment);
    return { ...azure, legacyObjectStore: azure.objectStore, provider: 'azure' };
  }

  if (environment.NODE_ENV === 'production') {
    throw new Error('Filesystem object storage is not permitted in production.');
  }
  if (!environment.OBJECT_STORAGE_FILESYSTEM_ROOT) {
    throw new Error('Filesystem object storage root is required for the filesystem provider.');
  }

  const legacyObjectStore = factories.createFilesystem(environment.OBJECT_STORAGE_FILESYSTEM_ROOT);
  const ingestionObjectStore = factories.createFilesystem(
    resolve(environment.OBJECT_STORAGE_FILESYSTEM_ROOT, 'staged-ingestion'),
  );
  return {
    objectStore: ingestionObjectStore,
    releaseObjectStore: factories.createFilesystem(
      resolve(environment.OBJECT_STORAGE_FILESYSTEM_ROOT, 'dataset-releases'),
    ),
    legacyObjectStore,
    provider: 'filesystem',
    batchPayloadStorageService: factories.createBatchPayloadStorageService(ingestionObjectStore),
  };
}
