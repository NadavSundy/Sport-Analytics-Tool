import type { ContainerClient } from '@azure/storage-blob';
import type { Readable } from 'node:stream';

import { ObjectStorageError, type ObjectStore } from '@sport-analytics/object-storage';

export class AzureBlobObjectStore implements ObjectStore {
  private privacyCheck: Promise<void> | undefined;
  constructor(private readonly container: ContainerClient) {}
  private ensurePrivate() {
    this.privacyCheck ??= this.container.getProperties().then((properties) => {
      if (properties.blobPublicAccess !== undefined)
        throw new ObjectStorageError('The configured Azure Blob container permits public access.');
    });
    return this.privacyCheck;
  }
  async write(storageKey: string, source: Readable) {
    await this.ensurePrivate();
    const response = await this.container
      .getBlockBlobClient(storageKey)
      .uploadStream(source, 4 * 1024 * 1024, 4, { conditions: { ifNoneMatch: '*' } });
    return { versionId: response.versionId ?? null };
  }
  async read(storageKey: string): Promise<Readable> {
    await this.ensurePrivate();
    const response = await this.container.getBlockBlobClient(storageKey).download();
    if (!response.readableStreamBody)
      throw new ObjectStorageError('Azure Blob Storage returned no readable object body.');
    return response.readableStreamBody as Readable;
  }
  async delete(storageKey: string): Promise<void> {
    await this.ensurePrivate();
    await this.container
      .getBlockBlobClient(storageKey)
      .deleteIfExists({ deleteSnapshots: 'include' });
  }
}
