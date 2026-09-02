import { Readable } from 'node:stream';

import { ObjectStorageError, type ObjectStore } from './object-store';

/** Test fake with deterministic failure hooks; never use it for production payloads. */
export class FakeObjectStore implements ObjectStore {
  private readonly objects = new Map<string, Buffer>();
  readonly deletedKeys: string[] = [];
  failNextWrite = false;
  failNextRead = false;
  failNextDelete = false;

  async write(storageKey: string, source: Readable) {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new ObjectStorageError('Fake object write failed.');
    }

    if (this.objects.has(storageKey)) {
      throw new ObjectStorageError('The fake object key already exists.');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of source) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    this.objects.set(storageKey, Buffer.concat(chunks));
    return { versionId: null };
  }

  async read(storageKey: string): Promise<Readable> {
    if (this.failNextRead) {
      this.failNextRead = false;
      throw new ObjectStorageError('Fake object read failed.');
    }

    const object = this.objects.get(storageKey);
    if (!object) {
      throw new ObjectStorageError('The fake object does not exist.');
    }

    return Readable.from(object);
  }

  async delete(storageKey: string): Promise<void> {
    this.deletedKeys.push(storageKey);
    if (this.failNextDelete) {
      this.failNextDelete = false;
      throw new ObjectStorageError('Fake object deletion failed.');
    }
    this.objects.delete(storageKey);
  }

  has(storageKey: string): boolean {
    return this.objects.has(storageKey);
  }
}
