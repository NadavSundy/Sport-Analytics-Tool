import type { ContainerClient } from '@azure/storage-blob';
import type { Readable } from 'node:stream';

import { ObjectStorageError, type ObjectStore } from './object-store';

const AZURE_UPLOAD_BUFFER_BYTES = 4 * 1024 * 1024;
const AZURE_UPLOAD_CONCURRENCY = 4;

/** Production adapter for an already-provisioned private Azure Blob container. */
export class AzureBlobObjectStore implements ObjectStore {
  private privacyCheck: Promise<void> | undefined;

  constructor(private readonly container: ContainerClient) {}

  private ensurePrivateContainer(): Promise<void> {
    this.privacyCheck ??= this.container.getProperties().then((properties) => {
      if (properties.blobPublicAccess !== undefined) {
        throw new ObjectStorageError('The configured Azure Blob container permits public access.');
      }
    });
    return this.privacyCheck;
  }

  async write(storageKey: string, source: Readable) {
    await this.ensurePrivateContainer();
    const blob = this.container.getBlockBlobClient(storageKey);
    const response = await blob.uploadStream(
      source,
      AZURE_UPLOAD_BUFFER_BYTES,
      AZURE_UPLOAD_CONCURRENCY,
      { conditions: { ifNoneMatch: '*' } },
    );

    return { versionId: response.versionId ?? null };
  }

  async read(storageKey: string): Promise<Readable> {
    await this.ensurePrivateContainer();
    const response = await this.container.getBlockBlobClient(storageKey).download();
    if (!response.readableStreamBody) {
      throw new ObjectStorageError('Azure Blob Storage returned no readable object body.');
    }

    return response.readableStreamBody as Readable;
  }

  async delete(storageKey: string): Promise<void> {
    await this.ensurePrivateContainer();
    await this.container
      .getBlockBlobClient(storageKey)
      .deleteIfExists({ deleteSnapshots: 'include' });
  }
}
