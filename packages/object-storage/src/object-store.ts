import type { Readable } from 'node:stream';

export interface StoredObjectVersion {
  versionId: string | null;
}

/** Provider boundary. It deliberately exposes neither URLs nor credentials. */
export interface ObjectStore {
  write(storageKey: string, source: Readable): Promise<StoredObjectVersion>;
  read(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<void>;
}

export class ObjectStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ObjectStorageError';
  }
}

export class ObjectSizeLimitError extends ObjectStorageError {
  readonly limitBytes: number;

  constructor(limitBytes: number) {
    super(`Object exceeds the ${limitBytes}-byte limit.`);
    this.name = 'ObjectSizeLimitError';
    this.limitBytes = limitBytes;
  }
}

export class StoredObjectAccessDeniedError extends ObjectStorageError {
  constructor() {
    super('Access to the stored object is denied.');
    this.name = 'StoredObjectAccessDeniedError';
  }
}

export class StoredObjectUnavailableError extends ObjectStorageError {
  constructor() {
    super('The stored object bytes are unavailable.');
    this.name = 'StoredObjectUnavailableError';
  }
}
