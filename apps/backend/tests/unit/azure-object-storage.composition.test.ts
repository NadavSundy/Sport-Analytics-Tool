import type { ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { describe, expect, test, vi } from 'vitest';

import { createApp } from '../../src/app';
import { AzureBlobObjectStore } from '../../src/modules/object-storage/azure-blob-object-store';
import {
  createAzureObjectStorageComposition,
  createDefaultAzureCredential,
  type AzureObjectStorageCompositionFactories,
} from '../../src/modules/object-storage/azure-object-storage.composition';
import { BatchPayloadStorageService } from '../../src/modules/object-storage/batch-payload-storage.service';

const productionStorageEnvironment = {
  AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
  AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
  AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
};

describe('production Azure object-storage composition', () => {
  test('selects the configured HTTPS endpoint and container and injects the Azure adapter', () => {
    const credential = { getToken: vi.fn().mockResolvedValue(null) };
    const containerClient = {} as ContainerClient;
    const releaseContainerClient = {} as ContainerClient;
    const payloadStorageService = {} as BatchPayloadStorageService;
    const getContainerClient = vi.fn((name: string) =>
      name === 'dataset-releases' ? releaseContainerClient : containerClient,
    );
    const createCredential = vi.fn().mockReturnValue(credential);
    const createBlobServiceClient = vi.fn().mockReturnValue({ getContainerClient });
    const createObjectStore = vi
      .fn()
      .mockImplementation((container) => new AzureBlobObjectStore(container));
    const createBatchPayloadStorageService = vi.fn().mockReturnValue(payloadStorageService);
    const factories: AzureObjectStorageCompositionFactories = {
      createCredential,
      createBlobServiceClient,
      createObjectStore,
      createBatchPayloadStorageService,
    };

    const composition = createAzureObjectStorageComposition(
      productionStorageEnvironment,
      factories,
    );

    expect(createCredential).toHaveBeenCalledOnce();
    expect(createBlobServiceClient).toHaveBeenCalledWith(
      'https://statsthegameblobdev.blob.core.windows.net',
      credential,
    );
    expect(getContainerClient).toHaveBeenCalledWith('staged-ingestion');
    expect(getContainerClient).toHaveBeenCalledWith('dataset-releases');
    expect(createObjectStore).toHaveBeenCalledWith(containerClient);
    expect(composition.objectStore).toBeInstanceOf(AzureBlobObjectStore);
    expect(createBatchPayloadStorageService).toHaveBeenCalledWith(composition.objectStore);
    expect(composition.batchPayloadStorageService).toBe(payloadStorageService);
  });

  test('uses DefaultAzureCredential for the production credential chain without contacting Azure', () => {
    expect(createDefaultAzureCredential()).toBeInstanceOf(DefaultAzureCredential);
  });

  test('installs the composed payload-storage service in the production application', () => {
    const app = createApp({
      environment: {
        NODE_ENV: 'production',
        OBJECT_STORAGE_PROVIDER: 'azure',
        PORT: 3000,
        CORS_ORIGINS: 'https://example.invalid',
        SUPABASE_URL: 'https://test-project.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
        DEPLOYMENT_ENVIRONMENT: 'dev',
        ...productionStorageEnvironment,
      },
    });

    expect(app.locals.batchPayloadStorageService).toBeInstanceOf(BatchPayloadStorageService);
  });

  test('fails safely when the storage account is absent', () => {
    expect(() =>
      createAzureObjectStorageComposition({
        AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
        AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
      }),
    ).toThrow('Azure storage account name is required for production object storage.');
  });

  test('fails safely when the container is absent', () => {
    expect(() =>
      createAzureObjectStorageComposition({
        AZURE_STORAGE_ACCOUNT_NAME: 'statsthegameblobdev',
        AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
      }),
    ).toThrow('Azure storage container name is required for production object storage.');
  });
});
