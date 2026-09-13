import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

import { describe, expect, test } from 'vitest';

import type {
  DatasetReleaseArtifactReference,
  DatasetReleaseEventCursor,
  DatasetReleaseRepository,
  DatasetReleaseSnapshot,
} from '../../src/modules/dataset-releases/dataset-release.repository';
import { createDatasetReleaseService } from '../../src/modules/dataset-releases/dataset-release.service';
import { FakeObjectStore } from '../../src/modules/object-storage/fake-object-store';
import type { ObjectStore } from '../../src/modules/object-storage/object-store';

async function content(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

class FakeDatasetReleaseRepository implements DatasetReleaseRepository {
  readonly snapshots = new Map<string, DatasetReleaseSnapshot>();
  readonly artifacts = new Map<string, DatasetReleaseArtifactReference>();
  readonly pageLimits: number[] = [];
  createCount = 0;
  failCreate = false;
  failPageAfter = Number.POSITIVE_INFINITY;
  returnExistingOnCreate: DatasetReleaseSnapshot | null = null;

  constructor(private readonly eventCount: number) {}

  async loadPublishedEventPage(cursor: DatasetReleaseEventCursor | null, limit: number) {
    this.pageLimits.push(limit);
    if (this.pageLimits.length > this.failPageAfter) {
      throw new Error('database cursor interrupted');
    }
    const offset = cursor ? Number(cursor.eventId) : 0;
    const count = Math.min(limit, this.eventCount - offset);
    const events = Array.from({ length: count }, (_, index) => ({
      eventId: String(offset + index + 1),
      runsTotal: (offset + index) % 7,
    }));
    const nextOffset = offset + count;
    return {
      events,
      nextCursor:
        count === 0
          ? null
          : {
              fixtureId: '1',
              inningsOrdinal: 0,
              sequenceNumber: nextOffset,
              eventId: String(nextOffset),
            },
    };
  }

  async createOrFind(input: {
    version: string;
    eventCount: number;
    checksum: string;
    artifactStorageKey: string;
  }) {
    this.createCount += 1;
    if (this.failCreate) {
      throw new Error('metadata persistence failed');
    }
    if (this.returnExistingOnCreate) {
      return { snapshot: this.returnExistingOnCreate, created: false };
    }
    const snapshot: DatasetReleaseSnapshot = {
      releaseId: '01234567-89ab-cdef-0123-456789abcdef',
      version: input.version,
      createdAt: '2026-09-14T10:00:00.000Z',
      eventCount: input.eventCount,
      checksum: input.checksum,
    };
    this.snapshots.set(input.version, snapshot);
    this.artifacts.set(input.version, {
      storageKey: input.artifactStorageKey,
      legacyArtifactText: null,
    });
    return { snapshot, created: true };
  }

  async list() {
    return [...this.snapshots.values()];
  }

  async findByVersion(version: string) {
    return this.snapshots.get(version) ?? null;
  }

  async findArtifactReferenceByVersion(version: string) {
    return this.artifacts.get(version) ?? null;
  }
}

class CountingObjectStore implements ObjectStore {
  byteCount = 0;
  writeCount = 0;
  deletedKeys: string[] = [];

  async write(_storageKey: string, source: Readable) {
    this.writeCount += 1;
    for await (const chunk of source) {
      this.byteCount += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }
    return { versionId: 'immutable-provider-version' };
  }

  async read(): Promise<Readable> {
    throw new Error('Counting store does not retain content.');
  }

  async delete(storageKey: string) {
    this.deletedKeys.push(storageKey);
  }
}

describe('dataset release service', () => {
  test('writes deterministic JSON incrementally and hashes the exact stored bytes', async () => {
    const repository = new FakeDatasetReleaseRepository(3);
    const store = new FakeObjectStore();
    const service = createDatasetReleaseService(repository, store, 2);

    const release = await service.createRelease({ version: '2026.09.1' });
    const artifact = await content((await service.getArtifact('2026.09.1'))!);
    const parsed = JSON.parse(artifact.toString()) as { events: unknown[] };

    expect(parsed.events).toEqual([
      { eventId: '1', runsTotal: 0 },
      { eventId: '2', runsTotal: 1 },
      { eventId: '3', runsTotal: 2 },
    ]);
    expect(release.eventCount).toBe(3);
    expect(release.checksum).toBe(createHash('sha256').update(artifact).digest('hex'));
    expect(repository.pageLimits).toEqual([2, 2]);
  });

  test('reproduces identical artifact bytes and checksums for unchanged event data', async () => {
    const repository = new FakeDatasetReleaseRepository(2);
    const store = new FakeObjectStore();
    const service = createDatasetReleaseService(repository, store, 1);

    const first = await service.createRelease({ version: 'snapshot-a' });
    const second = await service.createRelease({ version: 'snapshot-b' });
    const firstArtifact = await content((await service.getArtifact('snapshot-a'))!);
    const secondArtifact = await content((await service.getArtifact('snapshot-b'))!);

    expect(second.checksum).toBe(first.checksum);
    expect(secondArtifact).toEqual(firstArtifact);
  });

  test('reuses an immutable version without reading events or writing another artifact', async () => {
    const repository = new FakeDatasetReleaseRepository(1);
    const store = new CountingObjectStore();
    const service = createDatasetReleaseService(repository, store);

    const first = await service.createRelease({ version: 'stable' });
    const pageCalls = repository.pageLimits.length;
    const again = await service.createRelease({ version: 'stable' });

    expect(again).toEqual(first);
    expect(repository.pageLimits).toHaveLength(pageCalls);
    expect(store.writeCount).toBe(1);
  });

  test('cleans the partial object when incremental event loading is interrupted', async () => {
    const repository = new FakeDatasetReleaseRepository(3);
    repository.failPageAfter = 1;
    const store = new FakeObjectStore();
    const service = createDatasetReleaseService(repository, store, 1);

    await expect(service.createRelease({ version: 'interrupted' })).rejects.toThrow(
      'database cursor interrupted',
    );

    expect(repository.createCount).toBe(0);
    expect(store.deletedKeys).toHaveLength(1);
    expect(store.has(store.deletedKeys[0] ?? '')).toBe(false);
  });

  test('cleans the generated key when object storage interrupts the streamed write', async () => {
    const repository = new FakeDatasetReleaseRepository(3);
    const store = new FakeObjectStore();
    store.failNextWrite = true;

    await expect(
      createDatasetReleaseService(repository, store, 1).createRelease({
        version: 'storage-interrupted',
      }),
    ).rejects.toThrow('Fake object write failed.');

    expect(repository.createCount).toBe(0);
    expect(store.deletedKeys).toHaveLength(1);
    expect(store.has(store.deletedKeys[0] ?? '')).toBe(false);
  });

  test('cleans uploaded bytes when metadata persistence fails or a version race is reused', async () => {
    const failedRepository = new FakeDatasetReleaseRepository(1);
    failedRepository.failCreate = true;
    const failedStore = new FakeObjectStore();

    await expect(
      createDatasetReleaseService(failedRepository, failedStore).createRelease({ version: 'fail' }),
    ).rejects.toThrow('metadata persistence failed');
    expect(failedStore.deletedKeys).toHaveLength(1);

    const racedRepository = new FakeDatasetReleaseRepository(1);
    racedRepository.returnExistingOnCreate = {
      releaseId: 'fedcba98-7654-3210-fedc-ba9876543210',
      version: 'race',
      createdAt: '2026-09-14T09:00:00.000Z',
      eventCount: 99,
      checksum: 'a'.repeat(64),
    };
    const racedStore = new FakeObjectStore();
    const raced = await createDatasetReleaseService(racedRepository, racedStore).createRelease({
      version: 'race',
    });

    expect(raced).toMatchObject({ releaseId: 'fedcba98-7654-3210-fedc-ba9876543210' });
    expect(racedStore.deletedKeys).toHaveLength(1);
  });

  test('publishes a representative 3.2-million-event corpus with bounded database pages', async () => {
    const repository = new FakeDatasetReleaseRepository(3_200_000);
    const store = new CountingObjectStore();
    const service = createDatasetReleaseService(repository, store);

    const release = await service.createRelease({ version: 'production-scale' });

    expect(release.eventCount).toBe(3_200_000);
    expect(repository.pageLimits.length).toBe(321);
    expect(Math.max(...repository.pageLimits)).toBe(10_000);
    expect(store.byteCount).toBeGreaterThan(1_000_000);
  }, 30_000);
});
