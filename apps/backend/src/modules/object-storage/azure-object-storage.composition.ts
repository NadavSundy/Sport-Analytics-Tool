import { DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';

import type { Environment } from '../../config/env';
import { AzureBlobObjectStore } from './azure-blob-object-store';
import { BatchPayloadStorageService } from './batch-payload-storage.service';
import type { ObjectStore } from './object-store';
import { createStoredObjectRepository } from './stored-object.repository';

type AzureStorageEnvironment = Pick<
  Environment,
  | 'AZURE_STORAGE_ACCOUNT_NAME'
  | 'AZURE_STORAGE_CONTAINER_NAME'
  | 'AZURE_STORAGE_INGESTION_CONTAINER_NAME'
  | 'AZURE_STORAGE_RELEASE_CONTAINER_NAME'
>;

export interface AzureObjectStorageComposition {
  blobEndpoint: string;
  containerName: string;
  objectStore: ObjectStore;
  releaseObjectStore: ObjectStore;
  releaseContainerName: string;
  batchPayloadStorageService: BatchPayloadStorageService;
}

export interface AzureObjectStorageCompositionFactories {
  createCredential(): TokenCredential;
  createBlobServiceClient(
    endpoint: string,
    credential: TokenCredential,
  ): {
    getContainerClient(containerName: string): ContainerClient;
  };
  createObjectStore(containerClient: ContainerClient): ObjectStore;
  createBatchPayloadStorageService(objectStore: ObjectStore): BatchPayloadStorageService;
}

export function createDefaultAzureCredential(): DefaultAzureCredential {
  return new DefaultAzureCredential();
}

const defaultFactories: AzureObjectStorageCompositionFactories = {
  createCredential: createDefaultAzureCredential,
  createBlobServiceClient: (endpoint, credential) => new BlobServiceClient(endpoint, credential),
  createObjectStore: (containerClient) => new AzureBlobObjectStore(containerClient),
  createBatchPayloadStorageService: (objectStore) =>
    new BatchPayloadStorageService(
      objectStore,
      createStoredObjectRepository(),
      async (requesterId, object) => requesterId === object.ownerId,
    ),
};

/** Production composition for private Azure Blob Storage; performs no Azure I/O at startup. */
export function createAzureObjectStorageComposition(
  environment: AzureStorageEnvironment,
  factories: AzureObjectStorageCompositionFactories = defaultFactories,
): AzureObjectStorageComposition {
  const accountName = environment.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName =
    environment.AZURE_STORAGE_INGESTION_CONTAINER_NAME ?? environment.AZURE_STORAGE_CONTAINER_NAME;
  const releaseContainerName = environment.AZURE_STORAGE_RELEASE_CONTAINER_NAME;

  if (!accountName) {
    throw new Error('Azure storage account name is required for production object storage.');
  }
  if (!containerName) {
    throw new Error('Azure storage container name is required for production object storage.');
  }
  if (!releaseContainerName) throw new Error('Azure release storage container name is required.');

  const blobEndpoint = `https://${accountName}.blob.core.windows.net`;
  const credential = factories.createCredential();
  const blobServiceClient = factories.createBlobServiceClient(blobEndpoint, credential);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const objectStore = factories.createObjectStore(containerClient);
  const releaseObjectStore = factories.createObjectStore(
    blobServiceClient.getContainerClient(releaseContainerName),
  );
  const batchPayloadStorageService = factories.createBatchPayloadStorageService(objectStore);

  return {
    blobEndpoint,
    containerName,
    objectStore,
    releaseObjectStore,
    releaseContainerName,
    batchPayloadStorageService,
  };
}
