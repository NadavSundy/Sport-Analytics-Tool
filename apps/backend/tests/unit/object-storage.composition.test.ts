import { describe, expect, test, vi } from 'vitest';

import type { Environment } from '../../src/config/env';
import { FilesystemObjectStore } from '../../src/modules/object-storage/filesystem-object-store';
import type { ObjectStore } from '../../src/modules/object-storage/object-store';
import {
  createObjectStorageComposition,
  type ObjectStorageCompositionFactories,
} from '../../src/modules/object-storage/object-storage.composition';

const baseEnvironment: Environment = {
  NODE_ENV: 'development',
  PORT: 3000,
  CORS_ORIGINS: 'http://localhost:5173',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  DEPLOYMENT_ENVIRONMENT: 'test',
};

describe('object-storage provider composition', () => {
  test('selects the filesystem adapter with its configured root', () => {
    const composition = createObjectStorageComposition({
      ...baseEnvironment,
      OBJECT_STORAGE_PROVIDER: 'filesystem',
      OBJECT_STORAGE_FILESYSTEM_ROOT: '.local/object-storage',
    });

    expect(composition?.objectStore).toBeInstanceOf(FilesystemObjectStore);
    expect(composition?.releaseObjectStore).toBeInstanceOf(FilesystemObjectStore);
    expect(composition?.releaseObjectStore).not.toBe(composition?.objectStore);
    expect(composition?.provider).toBe('filesystem');
    expect(composition?.batchPayloadStorageService).toBeDefined();
  });

  test('delegates Azure selection to the existing Azure composition', () => {
    const azureStore = {} as ObjectStore;
    const azureComposition = {
      blobEndpoint: 'https://storage.blob.core.windows.net',
      containerName: 'private-container',
      objectStore: azureStore,
      releaseObjectStore: azureStore,
      releaseContainerName: 'dataset-releases',
      batchPayloadStorageService: {} as never,
    };
    const factories: ObjectStorageCompositionFactories = {
      createAzure: vi.fn().mockReturnValue(azureComposition),
      createFilesystem: vi.fn(),
      createBatchPayloadStorageService: vi.fn(),
    };
    const environment: Environment = {
      ...baseEnvironment,
      OBJECT_STORAGE_PROVIDER: 'azure',
      AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
      AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
      AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
    };

    expect(createObjectStorageComposition(environment, factories)).toEqual({
      ...azureComposition,
      legacyObjectStore: azureStore,
      provider: 'azure',
    });
    expect(factories.createAzure).toHaveBeenCalledWith(environment);
    expect(factories.createFilesystem).not.toHaveBeenCalled();
  });

  test('leaves storage unconfigured in non-production unless a provider is explicit', () => {
    expect(createObjectStorageComposition(baseEnvironment)).toBeUndefined();
  });

  test('refuses missing or filesystem providers in production even if schema validation is bypassed', () => {
    expect(() =>
      createObjectStorageComposition({ ...baseEnvironment, NODE_ENV: 'production' }),
    ).toThrow('Object storage provider is required in production.');

    expect(() =>
      createObjectStorageComposition({
        ...baseEnvironment,
        NODE_ENV: 'production',
        OBJECT_STORAGE_PROVIDER: 'filesystem',
        OBJECT_STORAGE_FILESYSTEM_ROOT: '.local/object-storage',
      }),
    ).toThrow('Filesystem object storage is not permitted in production.');
  });
});
