import { createHash, randomUUID } from 'node:crypto';
import { basename } from 'node:path/posix';
import { Transform, type Readable, type TransformCallback } from 'node:stream';

import {
  ObjectSizeLimitError,
  ObjectStorageError,
  StoredObjectAccessDeniedError,
  StoredObjectUnavailableError,
  type ObjectStore,
} from './object-store';
import type { StoredObjectRecord, StoredObjectRepository } from './stored-object.repository';

export const MAX_BATCH_PAYLOAD_BYTES = 50 * 1024 * 1024;
const BATCH_PAYLOAD_RETENTION_DAYS = 90;
const BATCH_PAYLOAD_MEDIA_TYPES = ['application/json', 'text/csv', 'application/x-ndjson'] as const;

type BatchPayloadMediaType = (typeof BATCH_PAYLOAD_MEDIA_TYPES)[number];

export interface UploadBatchPayloadInput {
  ownerId: string;
  originalFilename: string;
  mediaType: BatchPayloadMediaType;
  source: Readable;
}

export type AuthorizeStoredObjectRead = (
  requesterId: string,
  object: StoredObjectRecord,
) => Promise<boolean>;

class MeasuringTransform extends Transform {
  private readonly hash = createHash('sha256');
  byteSize = 0;

  constructor(private readonly limitBytes: number) {
    super();
  }

  override _transform(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    this.byteSize += bytes.length;
    if (this.byteSize > this.limitBytes) {
      callback(new ObjectSizeLimitError(this.limitBytes));
      return;
    }
    this.hash.update(bytes);
    callback(null, bytes);
  }

  checksum(): string {
    return this.hash.digest('hex');
  }
}

function safeFilename(submittedFilename: string): string {
  const filename = basename(submittedFilename.replaceAll('\\', '/')).trim();
  const hasControlCharacter = [...filename].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
  if (!filename || filename.length > 255 || hasControlCharacter) {
    throw new ObjectStorageError('The original filename is invalid.');
  }
  return filename;
}

function storageKey(objectId: string, now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `incoming/batch-source/${year}/${month}/${day}/${objectId}`;
}

function limitedDownload(source: Readable, limitBytes: number): Readable {
  const limiter = new MeasuringTransform(limitBytes);
  source.once('error', () =>
    limiter.destroy(new ObjectStorageError('The object download failed.')),
  );
  return source.pipe(limiter);
}

export class BatchPayloadStorageService {
  constructor(
    private readonly objectStore: ObjectStore,
    private readonly repository: StoredObjectRepository,
    private readonly authorizeRead: AuthorizeStoredObjectRead,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async upload(input: UploadBatchPayloadInput): Promise<StoredObjectRecord> {
    const objectId = randomUUID();
    const originalFilename = safeFilename(input.originalFilename);
    const createdAt = this.now();
    const key = storageKey(objectId, createdAt);
    const measuringStream = new MeasuringTransform(MAX_BATCH_PAYLOAD_BYTES);
    input.source.once('error', (error) => measuringStream.destroy(error));
    input.source.pipe(measuringStream);

    try {
      const storedVersion = await this.objectStore.write(key, measuringStream);
      if (measuringStream.byteSize === 0) {
        throw new ObjectStorageError('The uploaded object is empty.');
      }

      const retentionExpiresAt = new Date(createdAt);
      retentionExpiresAt.setUTCDate(retentionExpiresAt.getUTCDate() + BATCH_PAYLOAD_RETENTION_DAYS);

      return await this.repository.create({
        objectId,
        ownerId: input.ownerId,
        originalFilename,
        mediaType: input.mediaType,
        byteSize: measuringStream.byteSize,
        sha256: measuringStream.checksum(),
        storageKey: key,
        providerVersionId: storedVersion.versionId,
        retentionExpiresAt: retentionExpiresAt.toISOString(),
      });
    } catch (error) {
      input.source.destroy();
      measuringStream.destroy();
      try {
        await this.objectStore.delete(key);
      } catch {
        // The caller receives a safe failure. Reconciliation can retry an orphan cleanup.
      }

      if (error instanceof ObjectSizeLimitError || error instanceof ObjectStorageError) {
        throw error;
      }
      throw new ObjectStorageError('The object upload failed.');
    }
  }

  async download(
    requesterId: string,
    objectId: string,
    limitBytes = MAX_BATCH_PAYLOAD_BYTES,
  ): Promise<Readable> {
    const object = await this.repository.findById(objectId);
    if (!object || !(await this.authorizeRead(requesterId, object))) {
      throw new StoredObjectAccessDeniedError();
    }
    if (object.retentionState !== 'retained') {
      throw new StoredObjectUnavailableError();
    }
    if (object.byteSize > limitBytes) {
      throw new ObjectSizeLimitError(limitBytes);
    }

    try {
      return limitedDownload(await this.objectStore.read(object.storageKey), limitBytes);
    } catch {
      throw new ObjectStorageError('The object download failed.');
    }
  }

  async expire(objectId: string): Promise<StoredObjectRecord> {
    const object = await this.repository.findById(objectId);
    if (!object) {
      throw new StoredObjectUnavailableError();
    }
    if (object.retentionState === 'expired') {
      return object;
    }

    await this.repository.updateRetentionState(objectId, 'deletion_pending');
    try {
      await this.objectStore.delete(object.storageKey);
      return await this.repository.updateRetentionState(
        objectId,
        'expired',
        this.now().toISOString(),
      );
    } catch {
      await this.repository.updateRetentionState(objectId, 'deletion_failed');
      throw new ObjectStorageError('The retained object could not be expired.');
    }
  }
}
