import request from 'supertest';
import { Readable } from 'node:stream';
import { describe, expect, test, vi } from 'vitest';

import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import type { DatasetReleaseService } from '../../src/modules/dataset-releases/dataset-release.service';
import { createTestAccount, createTestApp } from '../test-app';

const release = {
  releaseId: '01234567-89ab-cdef-0123-456789abcdef',
  version: '2026.09.1',
  createdAt: '2026-09-09T10:00:00.000Z',
  formatVersion: '1.0' as const,
  scope: 'published-accepted-deliveries' as const,
  eventCount: 2,
  checksum: 'a'.repeat(64),
  fields: [
    { name: 'eventId', description: 'Stable identifier of the accepted delivery revision.' },
  ],
};

function service(): DatasetReleaseService {
  return {
    createRelease: vi.fn(async () => release),
    listReleases: vi.fn(async () => [release]),
    getRelease: vi.fn(async () => release),
    getArtifact: vi.fn(async () => Readable.from('{"formatVersion":"1.0"}')),
  };
}

const administrator: SynchronizeAccount = async () => createTestAccount({ role: 'admin' });

describe('dataset release API', () => {
  test('creates a named administrator release and exposes stable metadata', async () => {
    const releases = service();
    const app = createTestApp(
      undefined,
      undefined,
      administrator,
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
      releases,
    );

    const created = await request(app)
      .post('/api/v1/admin/dataset-releases')
      .set('Authorization', 'Bearer test')
      .send({ version: '2026.09.1' })
      .expect(201);
    expect(created.body.data).toEqual(release);
    expect(releases.createRelease).toHaveBeenCalledWith({ version: '2026.09.1' });

    await request(app)
      .get('/api/v1/dataset-releases')
      .expect(200, { data: [release] });
    await request(app).get('/api/v1/dataset-releases/2026.09.1').expect(200, { data: release });
    const artifact = await request(app)
      .get('/api/v1/dataset-releases/2026.09.1/artifact.json')
      .expect(200);
    expect(artifact.headers['content-type']).toContain('application/json');
    expect(artifact.headers['content-disposition']).toContain(
      'attachment; filename="dataset-release-2026.09.1.json"',
    );
    expect(artifact.headers['content-length']).toBeUndefined();
    expect(artifact.text).toBe('{"formatVersion":"1.0"}');
  });

  test('rejects invalid versions and requires an administrator to create a release', async () => {
    const releases = service();
    const viewer = createTestApp(
      undefined,
      undefined,
      async () => createTestAccount({ role: 'viewer' }),
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
      releases,
    );
    await request(viewer)
      .post('/api/v1/admin/dataset-releases')
      .set('Authorization', 'Bearer test')
      .send({ version: 'not a version' })
      .expect(403);
    await request(viewer).get('/api/v1/dataset-releases/not%20a%20version').expect(404);
    await request(viewer)
      .get('/api/v1/dataset-releases/not%20a%20version/artifact.json')
      .expect(404, {
        error: { code: 'NOT_FOUND', message: 'Dataset release artifact not found.' },
      });
  });

  test('fails clearly when a release or artifact is unavailable', async () => {
    const releases = service();
    vi.mocked(releases.getRelease).mockResolvedValue(null);
    vi.mocked(releases.getArtifact).mockResolvedValue(null);
    const app = createTestApp(
      undefined,
      undefined,
      administrator,
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
      releases,
    );

    await request(app)
      .get('/api/v1/dataset-releases/missing')
      .expect(404, {
        error: { code: 'NOT_FOUND', message: 'Dataset release not found.' },
      });
    await request(app)
      .get('/api/v1/dataset-releases/missing/artifact.json')
      .expect(404, {
        error: { code: 'NOT_FOUND', message: 'Dataset release artifact not found.' },
      });
  });

  test('returns a safe server error when publication fails without an unhandled rejection', async () => {
    const releases = service();
    vi.mocked(releases.createRelease).mockRejectedValue(new Error('object upload interrupted'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = createTestApp(
      undefined,
      undefined,
      administrator,
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
      releases,
    );

    await request(app)
      .post('/api/v1/admin/dataset-releases')
      .set('Authorization', 'Bearer test')
      .send({ version: '2026.09.2' })
      .expect(500, {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected server error occurred.',
        },
      });

    expect(consoleError).toHaveBeenCalledWith('object upload interrupted');
    consoleError.mockRestore();
  });
});
