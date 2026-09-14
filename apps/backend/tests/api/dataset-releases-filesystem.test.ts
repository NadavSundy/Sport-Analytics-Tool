import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { DatasetReleaseRepository } from '../../src/modules/dataset-releases/dataset-release.repository';
import { createDatasetReleaseService } from '../../src/modules/dataset-releases/dataset-release.service';
import { FilesystemObjectStore } from '../../src/modules/object-storage/filesystem-object-store';
import { createTestApp } from '../test-app';

const roots: string[] = [];
afterEach(async () =>
  Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))),
);

describe('dataset release API with filesystem object storage', () => {
  test('streams a stored artifact without exposing its filesystem path', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'release-api-'));
    roots.push(root);
    const store = new FilesystemObjectStore(root);
    await store.write('opaque.json', Readable.from('{"events":[1,2]}'));
    const repository: DatasetReleaseRepository = {
      loadPublishedEventPage: vi.fn(),
      requestGeneration: vi.fn(),
      findJob: vi.fn(),
      list: vi.fn(async () => []),
      findByVersion: vi.fn(async () => null),
      findArtifactReferenceByVersion: vi.fn(async () => ({
        storageKey: 'opaque.json',
        legacyArtifactText: null,
        storageLocation: 'release',
      })),
    };
    const service = createDatasetReleaseService(repository, {
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      releaseObjectStore: store,
    });
    const response = await request(
      createTestApp(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        service,
      ),
    )
      .get('/api/v1/dataset-releases/local/artifact.json')
      .expect(200);
    expect(response.text).toBe('{"events":[1,2]}');
    expect(JSON.stringify(response.body)).not.toContain(root);
    expect(response.headers['content-length']).toBeUndefined();
  });
});
