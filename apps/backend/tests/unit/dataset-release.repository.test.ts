import { describe, expect, test, vi } from 'vitest';

import type { Pool, PoolClient } from 'pg';

import type { QueryExecutor } from '../../src/database';
import { createDatasetReleaseRepository } from '../../src/modules/dataset-releases/dataset-release.repository';

const queryResult = <Row>(rows: Row[], rowCount = rows.length) => ({
  rows,
  rowCount,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

const release = {
  releaseId: '12',
  version: '2026.09.01',
  createdAt: '2026-09-01T10:00:00.000Z',
  snapshotId: '22',
  snapshotAsOf: '2026-09-01T09:59:00.000Z',
  eventCount: 500,
  checksum: 'abc123',
};

function transactionalPool(query: ReturnType<typeof vi.fn>) {
  const releaseClient = vi.fn();
  const client = { query, release: releaseClient } as unknown as PoolClient;
  return {
    pool: { connect: vi.fn().mockResolvedValue(client), query } as unknown as Pool,
    releaseClient,
  };
}

describe('dataset release event paging', () => {
  test('adds an indexable innings lower bound to non-initial keyset pages', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
    const repository = createDatasetReleaseRepository({ query } as unknown as QueryExecutor);
    await repository.loadPublishedEventPage(
      { fixtureId: '7204', inningsOrdinal: 1, sequenceNumber: 27, eventId: '1647399' },
      10000,
    );
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('(i.fixture_id, i.ordinal) >= ($1::bigint, $2::integer)');
    expect(sql).toContain('(i.fixture_id, i.ordinal, d.innings_sequence, d.delivery_id) >');
    expect(query.mock.calls[0]?.[1]).toEqual(['7204', 1, 27, '1647399', 10000]);
  });

  test('does not add a nullable cursor predicate to the first page', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });
    await createDatasetReleaseRepository({
      query,
    } as unknown as QueryExecutor).loadPublishedEventPage(null, 10000);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).not.toContain('$1::bigint IS NULL');
    expect(query.mock.calls[0]?.[1]).toEqual([10000]);
  });

  test('returns page events and a cursor derived from the deterministic final row', async () => {
    const query = vi.fn().mockResolvedValue(
      queryResult([
        {
          event: { eventId: '101', runsTotal: 4 },
          fixtureId: '91',
          inningsOrdinal: 1,
          sequenceNumber: 1,
          eventId: '101',
        },
        {
          event: { eventId: '102', runsTotal: 1 },
          fixtureId: '91',
          inningsOrdinal: 1,
          sequenceNumber: 2,
          eventId: '102',
        },
      ]),
    );

    await expect(
      createDatasetReleaseRepository({ query } as unknown as QueryExecutor).loadPublishedEventPage(
        null,
        2,
      ),
    ).resolves.toEqual({
      events: [
        { eventId: '101', runsTotal: 4 },
        { eventId: '102', runsTotal: 1 },
      ],
      nextCursor: {
        fixtureId: '91',
        inningsOrdinal: 1,
        sequenceNumber: 2,
        eventId: '102',
      },
    });
    expect(query.mock.calls[0]?.[0]).toContain(
      'ORDER BY i.fixture_id, i.ordinal, d.innings_sequence, d.delivery_id',
    );
  });
});

describe('dataset release generation repository', () => {
  test('returns an immutable existing release without creating a duplicate job', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([release]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool, releaseClient } = transactionalPool(query);

    await expect(
      createDatasetReleaseRepository(pool).requestGeneration({
        version: release.version,
        requesterId: '3',
        deploymentEnvironment: 'development',
        storageProvider: 'azure',
      }),
    ).resolves.toEqual({ release, job: null });
    expect(
      query.mock.calls.some((call) => String(call[0]).includes('INSERT INTO background_job')),
    ).toBe(false);
    expect(String(query.mock.calls.at(-1)?.[0])).toBe('COMMIT');
    expect(releaseClient).toHaveBeenCalledOnce();
  });

  test('creates and queues one generation job then maps its persisted state', async () => {
    const jobRow = {
      jobId: '11111111-1111-4111-8111-111111111111',
      version: '2026.09.02',
      state: 'queued',
      eventsProcessed: '0',
      bytesWritten: '0',
      pageNumber: 0,
      createdAt: '2026-09-02T10:00:00.000Z',
      startedAt: null,
      completedAt: null,
      failureCode: null,
      failureMessage: null,
      releaseId: null,
      releaseVersion: null,
      releaseCreatedAt: null,
      releaseSnapshotId: null,
      releaseSnapshotAsOf: null,
      releaseEventCount: null,
      releaseChecksum: null,
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([jobRow]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    const result = await createDatasetReleaseRepository(pool).requestGeneration({
      version: '2026.09.02',
      requesterId: '3',
      deploymentEnvironment: 'development',
      storageProvider: 'filesystem',
    });

    expect(result).toEqual({
      release: null,
      job: {
        jobId: jobRow.jobId,
        version: jobRow.version,
        state: 'queued',
        eventsProcessed: 0,
        bytesWritten: 0,
        pageNumber: 0,
        createdAt: jobRow.createdAt,
        startedAt: null,
        completedAt: null,
        failureCode: null,
        failureMessage: null,
        release: null,
      },
    });
    expect(query.mock.calls[4]?.[0]).toContain('INSERT INTO background_job');
    expect(query.mock.calls[5]?.[1]?.slice(1)).toEqual(['2026.09.02', 'development', 'filesystem']);
    expect(query.mock.calls[6]?.[0]).toContain('INSERT INTO outbox_message');
  });

  test('requeues a failed job from the beginning rather than creating another job', async () => {
    const failedJob = {
      jobId: '11111111-1111-4111-8111-111111111111',
      state: 'failed',
      leaseExpiresAt: null,
    };
    const mappedJob = {
      jobId: failedJob.jobId,
      version: '2026.09.02',
      state: 'queued',
      eventsProcessed: '0',
      bytesWritten: '0',
      pageNumber: 0,
      createdAt: '2026-09-02T10:00:00.000Z',
      startedAt: null,
      completedAt: null,
      failureCode: null,
      failureMessage: null,
      releaseId: null,
      releaseVersion: null,
      releaseCreatedAt: null,
      releaseSnapshotId: null,
      releaseSnapshotAsOf: null,
      releaseEventCount: null,
      releaseChecksum: null,
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([failedJob]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([mappedJob]))
      .mockResolvedValueOnce(queryResult([]));
    const { pool } = transactionalPool(query);

    await expect(
      createDatasetReleaseRepository(pool).requestGeneration({
        version: '2026.09.02',
        requesterId: '3',
        deploymentEnvironment: 'development',
        storageProvider: 'azure',
      }),
    ).resolves.toMatchObject({ job: { state: 'queued', eventsProcessed: 0 } });
    expect(query.mock.calls[4]?.[0]).toContain("SET state='queued'");
    expect(query.mock.calls[5]?.[0]).toContain('events_processed=0');
    expect(
      query.mock.calls.some((call) => String(call[0]).includes('INSERT INTO background_job')),
    ).toBe(false);
  });

  test('lists, finds, and resolves artifact references within one deployment environment', async () => {
    const jobRow = {
      jobId: 'job-1',
      version: release.version,
      state: 'succeeded',
      eventsProcessed: '500',
      bytesWritten: '4096',
      pageNumber: 3,
      createdAt: release.createdAt,
      startedAt: release.createdAt,
      completedAt: release.createdAt,
      failureCode: null,
      failureMessage: null,
      releaseId: release.releaseId,
      releaseVersion: release.version,
      releaseCreatedAt: release.createdAt,
      releaseSnapshotId: release.snapshotId,
      releaseSnapshotAsOf: release.snapshotAsOf,
      releaseEventCount: release.eventCount,
      releaseChecksum: release.checksum,
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce(queryResult([jobRow]))
      .mockResolvedValueOnce(queryResult([release]))
      .mockResolvedValueOnce(queryResult([release]))
      .mockResolvedValueOnce(
        queryResult([
          {
            artifactStorageKey: 'releases/2026.09.01.json',
            artifactText: null,
            artifactStorageLocation: 'release',
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]));
    const repository = createDatasetReleaseRepository({ query } as unknown as QueryExecutor);

    await expect(repository.findJob('job-1', 'development')).resolves.toMatchObject({
      state: 'succeeded',
      eventsProcessed: 500,
      bytesWritten: 4096,
      release,
    });
    await expect(repository.list('development')).resolves.toEqual([release]);
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY created_at DESC,version DESC');
    await expect(repository.findByVersion(release.version, 'development')).resolves.toEqual(
      release,
    );
    await expect(
      repository.findArtifactReferenceByVersion(release.version, 'development'),
    ).resolves.toEqual({
      storageKey: 'releases/2026.09.01.json',
      legacyArtifactText: null,
      storageLocation: 'release',
    });
    await expect(
      repository.findArtifactReferenceByVersion('missing', 'development'),
    ).resolves.toBeNull();
  });
});
