import { Readable } from 'node:stream';

import { describe, expect, test, vi } from 'vitest';

import type { DatasetReleaseRepository } from '../../src/modules/dataset-releases/dataset-release.repository';
import { createDatasetReleaseService } from '../../src/modules/dataset-releases/dataset-release.service';
import { FakeObjectStore } from '../../src/modules/object-storage/fake-object-store';

const snapshot = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.1',
  createdAt: '2026-09-14T10:00:00.000Z',
  eventCount: 3,
  checksum: 'a'.repeat(64),
};
const job = {
  jobId: '11111111-1111-4111-8111-111111111111',
  version: snapshot.version,
  state: 'queued' as const,
  eventsProcessed: 0,
  bytesWritten: 0,
  pageNumber: 0,
  createdAt: snapshot.createdAt,
  startedAt: null,
  completedAt: null,
  failureCode: null,
  failureMessage: null,
  release: null,
};

function repository(): DatasetReleaseRepository {
  return {
    loadPublishedEventPage: vi.fn(),
    requestGeneration: vi.fn(async () => ({ release: null, job })),
    findJob: vi.fn(async () => job),
    list: vi.fn(async () => [snapshot]),
    findByVersion: vi.fn(async () => snapshot),
    findArtifactReferenceByVersion: vi.fn(async () => ({
      storageKey: 'artifact.json',
      legacyArtifactText: null,
      storageLocation: 'release',
    })),
  };
}

describe('dataset release service', () => {
  test('queues generation without reading events or writing the artifact in the request', async () => {
    const releases = repository();
    const store = new FakeObjectStore();
    const service = createDatasetReleaseService(releases, {
      deploymentEnvironment: 'local',
      storageProvider: 'filesystem',
      releaseObjectStore: store,
    });
    const result = await service.requestRelease({ version: snapshot.version }, '7');
    expect(result.job).toMatchObject({ status: 'pending', version: snapshot.version });
    expect(releases.requestGeneration).toHaveBeenCalledWith({
      version: snapshot.version,
      requesterId: '7',
      deploymentEnvironment: 'local',
      storageProvider: 'filesystem',
    });
    expect(releases.loadPublishedEventPage).not.toHaveBeenCalled();
    expect(store.has('artifact.json')).toBe(false);
  });

  test('returns an existing immutable release instead of a job', async () => {
    const releases = repository();
    vi.mocked(releases.requestGeneration).mockResolvedValue({ release: snapshot, job: null });
    const result = await createDatasetReleaseService(releases, {
      deploymentEnvironment: 'dev',
      storageProvider: 'azure',
      releaseObjectStore: new FakeObjectStore(),
    }).requestRelease({ version: snapshot.version }, '7');
    expect(result.release).toMatchObject(snapshot);
    expect(result.job).toBeNull();
  });

  test('normalizes PostgreSQL timestamps to the shared RFC 3339 API contract', async () => {
    const releases = repository();
    const databaseTimestamp = '2026-09-14 10:18:37.161956+00';
    const startedTimestamp = '2026-09-14 10:05:26.034349+00';
    vi.mocked(releases.list).mockResolvedValue([{ ...snapshot, createdAt: databaseTimestamp }]);
    vi.mocked(releases.findJob).mockResolvedValue({
      ...job,
      state: 'running',
      createdAt: startedTimestamp,
      startedAt: startedTimestamp,
    });
    const service = createDatasetReleaseService(releases, {
      deploymentEnvironment: 'dev',
    });

    await expect(service.listReleases()).resolves.toEqual([
      expect.objectContaining({ createdAt: '2026-09-14T10:18:37.161Z' }),
    ]);
    await expect(service.getJob(job.jobId)).resolves.toEqual(
      expect.objectContaining({
        status: 'generating',
        createdAt: '2026-09-14T10:05:26.034Z',
        startedAt: '2026-09-14T10:05:26.034Z',
        completedAt: null,
      }),
    );
  });

  test('reads new release artifacts from the release store and legacy object artifacts from the ingestion store', async () => {
    const releases = repository();
    const releaseStore = new FakeObjectStore();
    const legacyStore = new FakeObjectStore();
    await releaseStore.write('artifact.json', Readable.from('new'));
    await legacyStore.write('legacy.json', Readable.from('legacy'));
    const service = createDatasetReleaseService(releases, {
      deploymentEnvironment: 'local',
      storageProvider: 'filesystem',
      releaseObjectStore: releaseStore,
      legacyObjectStore: legacyStore,
    });
    const chunks: Buffer[] = [];
    for await (const chunk of (await service.getArtifact(snapshot.version))!)
      chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString()).toBe('new');
    vi.mocked(releases.findArtifactReferenceByVersion).mockResolvedValue({
      storageKey: 'legacy.json',
      legacyArtifactText: null,
      storageLocation: null,
    });
    const legacyChunks: Buffer[] = [];
    for await (const chunk of (await service.getArtifact(snapshot.version))!)
      legacyChunks.push(Buffer.from(chunk));
    expect(Buffer.concat(legacyChunks).toString()).toBe('legacy');
  });

  test('fails safely when release storage is not configured', async () => {
    await expect(
      createDatasetReleaseService(repository(), { deploymentEnvironment: 'local' }).requestRelease(
        { version: snapshot.version },
        '7',
      ),
    ).rejects.toThrow('Dataset release object storage is not configured.');
  });

  test('keeps legacy database-backed artifacts readable', async () => {
    const releases = repository();
    vi.mocked(releases.findArtifactReferenceByVersion).mockResolvedValue({
      storageKey: null,
      legacyArtifactText: '{"legacy":true}',
      storageLocation: null,
    });
    const stream = await createDatasetReleaseService(releases, {
      deploymentEnvironment: 'dev',
    }).getArtifact(snapshot.version);
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString()).toBe('{"legacy":true}');
  });
});
