import { describe, expect, it } from 'vitest';

import {
  DATASET_RELEASE_FIELDS,
  datasetReleaseCollectionResponseSchema,
  datasetReleaseJobResponseSchema,
} from '../dataset-releases';

const release = {
  releaseId: 'ba756ad4-4b1e-4b80-81f2-09a66ed6c854',
  version: '2026.09.14v1',
  createdAt: '2026-09-14T10:18:37.161Z',
  snapshotId: '1e3af729-8ced-4f49-ae61-7f0d74eab8f8',
  snapshotAsOf: '2026-09-14T10:18:36.000Z',
  formatVersion: '1.0',
  scope: 'published-accepted-deliveries',
  eventCount: 3_207_110,
  checksum: '46af530f0320361aec114769cb54cefd6bf4acd3fc8610c1567c3b7656d1fe25',
  fields: [...DATASET_RELEASE_FIELDS],
};

describe('dataset release contracts', () => {
  it('accepts the completed production-scale release response with an RFC 3339 timestamp', () => {
    expect(datasetReleaseCollectionResponseSchema.parse({ data: [release] })).toEqual({
      data: [release],
    });
  });

  it('accepts a pending asynchronous job whose release is null', () => {
    const job = {
      jobId: '340824be-b274-47d4-b624-97e874f3ee50',
      version: release.version,
      status: 'pending',
      eventsProcessed: 0,
      bytesWritten: 0,
      pageNumber: 0,
      createdAt: '2026-09-14T10:05:26.034Z',
      startedAt: null,
      completedAt: null,
      failureCode: null,
      failureMessage: null,
      release: null,
    };

    expect(datasetReleaseJobResponseSchema.parse({ data: job })).toEqual({ data: job });
  });

  it('rejects PostgreSQL display timestamps because the API contract requires RFC 3339', () => {
    const result = datasetReleaseCollectionResponseSchema.safeParse({
      data: [{ ...release, createdAt: '2026-09-14 10:18:37.161956+00' }],
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['data', 0, 'createdAt']);
  });
});
