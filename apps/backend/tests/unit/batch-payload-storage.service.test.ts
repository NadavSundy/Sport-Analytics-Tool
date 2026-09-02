import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { describe, expect, test } from 'vitest';

import {
  BatchPayloadStorageService,
  MAX_BATCH_PAYLOAD_BYTES,
} from '../../src/modules/object-storage/batch-payload-storage.service';
import { FakeObjectStore } from '../../src/modules/object-storage/fake-object-store';
import {
  ObjectSizeLimitError,
  StoredObjectAccessDeniedError,
  StoredObjectUnavailableError,
} from '../../src/modules/object-storage/object-store';
import type {
  CreateStoredObjectInput,
  StoredObjectRecord,
  StoredObjectRepository,
  StoredObjectRetentionState,
} from '../../src/modules/object-storage/stored-object.repository';

class FakeStoredObjectRepository implements StoredObjectRepository {
  readonly records = new Map<string, StoredObjectRecord>();
  failCreate = false;

  async create(input: CreateStoredObjectInput): Promise<StoredObjectRecord> {
    if (this.failCreate) {
      throw new Error('Database unavailable');
    }
    const record: StoredObjectRecord = {
      ...input,
      retentionState: 'retained',
      createdAt: '2026-09-02T12:00:00.000Z',
      deletedAt: null,
    };
    this.records.set(record.objectId, record);
    return record;
  }

  async findById(objectId: string): Promise<StoredObjectRecord | null> {
    return this.records.get(objectId) ?? null;
  }

  async updateRetentionState(
    objectId: string,
    retentionState: StoredObjectRetentionState,
    deletedAt: string | null = null,
  ): Promise<StoredObjectRecord> {
    const current = this.records.get(objectId);
    if (!current) {
      throw new Error('Missing fake stored object');
    }
    const updated = { ...current, retentionState, deletedAt };
    this.records.set(objectId, updated);
    return updated;
  }
}

async function content(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function service(
  store = new FakeObjectStore(),
  repository = new FakeStoredObjectRepository(),
  authorize = async (requesterId: string, object: StoredObjectRecord) =>
    requesterId === object.ownerId,
) {
  return {
    store,
    repository,
    storage: new BatchPayloadStorageService(
      store,
      repository,
      authorize,
      () => new Date('2026-09-02T12:00:00.000Z'),
    ),
  };
}

describe('batch payload storage', () => {
  test('streams upload bytes, hashes them, and persists safe metadata', async () => {
    const current = service();
    const bytes = Buffer.from('{"contractVersion":"1.0"}');
    const object = await current.storage.upload({
      ownerId: '42',
      originalFilename: '../../season.json',
      mediaType: 'application/json',
      source: Readable.from([bytes.subarray(0, 5), bytes.subarray(5)]),
    });

    expect(object).toMatchObject({
      ownerId: '42',
      originalFilename: 'season.json',
      mediaType: 'application/json',
      byteSize: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      retentionState: 'retained',
      retentionExpiresAt: '2026-12-01T12:00:00.000Z',
    });
    expect(object.storageKey).toMatch(/^incoming\/batch-source\/2026\/09\/02\/[0-9a-f-]{36}$/);
    expect(object.storageKey).not.toContain('season.json');
    await expect(content(await current.store.read(object.storageKey))).resolves.toEqual(bytes);
  });

  test('enforces the upload limit during streaming and cleans the incomplete key', async () => {
    const current = service();
    await expect(
      current.storage.upload({
        ownerId: '42',
        originalFilename: 'season.ndjson',
        mediaType: 'application/x-ndjson',
        source: Readable.from([Buffer.alloc(MAX_BATCH_PAYLOAD_BYTES), Buffer.from('x')]),
      }),
    ).rejects.toBeInstanceOf(ObjectSizeLimitError);

    expect(current.repository.records.size).toBe(0);
    expect(current.store.deletedKeys).toHaveLength(1);
    expect(current.store.has(current.store.deletedKeys[0] ?? '')).toBe(false);
  });

  test('cleans the stored bytes if metadata persistence fails', async () => {
    const current = service();
    current.repository.failCreate = true;

    await expect(
      current.storage.upload({
        ownerId: '42',
        originalFilename: 'season.csv',
        mediaType: 'text/csv',
        source: Readable.from('header\nvalue'),
      }),
    ).rejects.toThrow('The object upload failed.');

    expect(current.store.deletedKeys).toHaveLength(1);
    expect(current.repository.records.size).toBe(0);
  });

  test('cleans an interrupted streamed upload without exposing its contents', async () => {
    const current = service();
    let readCount = 0;
    const interrupted = new Readable({
      read() {
        readCount += 1;
        if (readCount === 1) {
          this.push('private partial payload');
          return;
        }
        this.destroy(new Error('connection reset after private partial payload'));
      },
    });

    await expect(
      current.storage.upload({
        ownerId: '42',
        originalFilename: 'season.json',
        mediaType: 'application/json',
        source: interrupted,
      }),
    ).rejects.toThrow('The object upload failed.');

    expect(current.store.deletedKeys).toHaveLength(1);
    expect(current.repository.records.size).toBe(0);
  });

  test('requires authorization before opening a private download', async () => {
    const current = service();
    const object = await current.storage.upload({
      ownerId: '42',
      originalFilename: 'season.csv',
      mediaType: 'text/csv',
      source: Readable.from('header\nvalue'),
    });

    await expect(current.storage.download('7', object.objectId)).rejects.toBeInstanceOf(
      StoredObjectAccessDeniedError,
    );
    await expect(content(await current.storage.download('42', object.objectId))).resolves.toEqual(
      Buffer.from('header\nvalue'),
    );
  });

  test('replaces provider download details with a credential-safe error', async () => {
    const current = service();
    const object = await current.storage.upload({
      ownerId: '42',
      originalFilename: 'season.csv',
      mediaType: 'text/csv',
      source: Readable.from('header\nvalue'),
    });
    current.store.failNextRead = true;

    await expect(current.storage.download('42', object.objectId)).rejects.toMatchObject({
      message: 'The object download failed.',
    });
  });

  test('enforces a download byte limit even when persisted size metadata is wrong', async () => {
    const current = service();
    const key = `incoming/batch-source/2026/09/02/${randomUUID()}`;
    await current.store.write(key, Readable.from('too many bytes'));
    const object = await current.repository.create({
      objectId: randomUUID(),
      ownerId: '42',
      originalFilename: 'season.csv',
      mediaType: 'text/csv',
      byteSize: 2,
      sha256: 'a'.repeat(64),
      storageKey: key,
      providerVersionId: null,
      retentionExpiresAt: '2026-12-01T12:00:00.000Z',
    });

    await expect(
      content(await current.storage.download('42', object.objectId, 4)),
    ).rejects.toBeInstanceOf(ObjectSizeLimitError);
  });

  test('expires bytes but retains provenance metadata', async () => {
    const current = service();
    const object = await current.storage.upload({
      ownerId: '42',
      originalFilename: 'season.json',
      mediaType: 'application/json',
      source: Readable.from('{}'),
    });

    const expired = await current.storage.expire(object.objectId);

    expect(expired).toMatchObject({
      objectId: object.objectId,
      sha256: object.sha256,
      storageKey: object.storageKey,
      retentionState: 'expired',
      deletedAt: '2026-09-02T12:00:00.000Z',
    });
    expect(current.store.has(object.storageKey)).toBe(false);
    await expect(current.storage.download('42', object.objectId)).rejects.toBeInstanceOf(
      StoredObjectUnavailableError,
    );
  });

  test('records a retryable deletion failure without losing provenance', async () => {
    const current = service();
    const object = await current.storage.upload({
      ownerId: '42',
      originalFilename: 'season.json',
      mediaType: 'application/json',
      source: Readable.from('{}'),
    });
    current.store.failNextDelete = true;

    await expect(current.storage.expire(object.objectId)).rejects.toThrow(
      'The retained object could not be expired.',
    );
    await expect(current.repository.findById(object.objectId)).resolves.toMatchObject({
      retentionState: 'deletion_failed',
      sha256: object.sha256,
    });
  });
});
