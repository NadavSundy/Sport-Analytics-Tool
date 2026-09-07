import { Readable } from 'node:stream';
import { describe, expect, test, vi } from 'vitest';

import type { BatchRepository } from '../../src/modules/batches/batch.repository';
import {
  BatchConflictError,
  BatchForbiddenError,
  createBatchService,
} from '../../src/modules/batches/batch.service';
import type { BatchPayloadStorageService } from '../../src/modules/object-storage/batch-payload-storage.service';
import { createTestAccount } from '../test-app';

const metadata = {
  competitionId: '5',
  idempotencyKey: 'season-2026',
  packageVersion: '1.0' as const,
  fileName: 'season.ndjson',
  mediaType: 'application/x-ndjson' as const,
};

function repository(overrides: Partial<BatchRepository> = {}): BatchRepository {
  return {
    createBatch: vi.fn(),
    createBatchAndQueueValidation: vi.fn().mockResolvedValue({
      batchReference: '123e4567-e89b-42d3-a456-426614174000',
      state: 'stored',
      createdAt: '2026-09-03T10:00:00.000Z',
    }),
    createOrFindBatchAndQueueValidation: vi.fn().mockResolvedValue({
      batch: {
        batchReference: '123e4567-e89b-42d3-a456-426614174000',
        state: 'stored',
        createdAt: '2026-09-03T10:00:00.000Z',
      },
      created: true,
      activeLimitReached: false,
    }),
    findBatchById: vi.fn(),
    findBatchByReference: vi.fn(),
    listBatches: vi.fn(),
    findBatchByIdempotencyKey: vi.fn().mockResolvedValue(null),
    countNonTerminalBatches: vi.fn().mockResolvedValue(0),
    getBatchProgress: vi
      .fn()
      .mockResolvedValue({ total: 0, processed: 0, accepted: 0, rejected: 0 }),
    getBatchCounts: vi
      .fn()
      .mockResolvedValue({ accepted: 0, rejected: 0, unresolved: 0, duplicate: 0, conflicting: 0 }),
    listBatchReportItems: vi.fn().mockResolvedValue([]),
    listBatchRuleGroups: vi.fn().mockResolvedValue([]),
    insertBatchItems: vi.fn(),
    listBatchItems: vi.fn(),
    findCheckpoint: vi.fn(),
    upsertCheckpoint: vi.fn(),
    recordValidationResult: vi.fn(),
    recordReviewDecision: vi.fn(),
    linkPublishedDelivery: vi.fn(),
    ...overrides,
  } as unknown as BatchRepository;
}

describe('batch receipt service', () => {
  test('enforces persisted competition scope before it streams source bytes', async () => {
    const storage = { upload: vi.fn() } as unknown as BatchPayloadStorageService;
    const source = Readable.from('payload');
    await expect(
      createBatchService(storage, repository()).receive(
        createTestAccount({ role: 'submitter', competitionIds: ['6'] }),
        metadata,
        source,
      ),
    ).rejects.toBeInstanceOf(BatchForbiddenError);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  test('records a private object checksum and opaque staged reference', async () => {
    const storage = {
      upload: vi.fn().mockResolvedValue({
        objectId: '123e4567-e89b-42d3-a456-426614174001',
        sha256: 'a'.repeat(64),
        byteSize: 20,
      }),
    } as unknown as BatchPayloadStorageService;
    const batches = repository();
    const result = await createBatchService(storage, batches).receive(
      createTestAccount({ role: 'submitter', competitionIds: ['5'] }),
      metadata,
      Readable.from('payload'),
    );
    expect(result.data).toMatchObject({
      status: 'stored',
      statusUrl: '/api/v1/batches/123e4567-e89b-42d3-a456-426614174000',
    });
    expect(batches.createOrFindBatchAndQueueValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'stored',
        source: {
          checksum: 'a'.repeat(64),
          uri: 'stored-object:123e4567-e89b-42d3-a456-426614174001',
          sizeBytes: 20,
        },
      }),
    );
  });

  test('limits a submitter to three non-terminal batches atomically', async () => {
    const storage = {
      upload: vi.fn().mockResolvedValue({
        objectId: '123e4567-e89b-42d3-a456-426614174001',
        sha256: 'a'.repeat(64),
        byteSize: 20,
      }),
    } as unknown as BatchPayloadStorageService;
    await expect(
      createBatchService(
        storage,
        repository({
          createOrFindBatchAndQueueValidation: vi.fn().mockResolvedValue({
            batch: null,
            created: false,
            activeLimitReached: true,
          }),
        }),
      ).receive(
        createTestAccount({ role: 'submitter', competitionIds: ['5'] }),
        metadata,
        Readable.from('payload'),
      ),
    ).rejects.toBeInstanceOf(BatchConflictError);
  });

  test('returns the existing batch only when the idempotency key has the same checksum', async () => {
    const storage = {
      upload: vi.fn().mockResolvedValue({
        objectId: '123e4567-e89b-42d3-a456-426614174001',
        sha256: 'a'.repeat(64),
        byteSize: 20,
      }),
    } as unknown as BatchPayloadStorageService;
    const existing = {
      batchReference: '123e4567-e89b-42d3-a456-426614174000',
      state: 'stored',
      createdAt: '2026-09-03T10:00:00.000Z',
      source: { checksum: 'a'.repeat(64), uri: 'stored-object:existing', sizeBytes: 20 },
    };
    const batches = repository({
      createOrFindBatchAndQueueValidation: vi.fn().mockResolvedValue({
        batch: existing,
        created: false,
        activeLimitReached: false,
      }),
    });
    await expect(
      createBatchService(storage, batches).receive(
        createTestAccount({ role: 'submitter', competitionIds: ['5'] }),
        metadata,
        Readable.from('payload'),
      ),
    ).resolves.toMatchObject({ data: { batchReference: existing.batchReference } });
  });

  test('rejects a reused idempotency key with changed source content', async () => {
    const storage = {
      upload: vi.fn().mockResolvedValue({
        objectId: '123e4567-e89b-42d3-a456-426614174001',
        sha256: 'b'.repeat(64),
        byteSize: 21,
      }),
    } as unknown as BatchPayloadStorageService;
    await expect(
      createBatchService(
        storage,
        repository({
          createOrFindBatchAndQueueValidation: vi.fn().mockResolvedValue({
            batch: {
              batchReference: '123e4567-e89b-42d3-a456-426614174000',
              state: 'stored',
              createdAt: '2026-09-03T10:00:00.000Z',
              source: { checksum: 'a'.repeat(64), uri: 'stored-object:existing', sizeBytes: 20 },
            },
            created: false,
            activeLimitReached: false,
          }),
        }),
      ).receive(
        createTestAccount({ role: 'submitter', competitionIds: ['5'] }),
        metadata,
        Readable.from('changed'),
      ),
    ).rejects.toBeInstanceOf(BatchConflictError);
  });
});

const persistedBatch = {
  batchId: '20',
  batchReference: '123e4567-e89b-42d3-a456-426614174000',
  submitterId: '1',
  competitionId: '5',
  idempotencyKey: 'season-2026',
  packageVersion: '1.0',
  source: null,
  state: 'partially_published' as const,
  itemCount: 3,
  supersededBy: null,
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:05:00.000Z',
};

describe('batch result reporting service', () => {
  test.each([
    ['all accepted', { accepted: 3, rejected: 0 }],
    ['partially rejected', { accepted: 2, rejected: 1 }],
    ['fully rejected', { accepted: 0, rejected: 3 }],
  ])('reports summary counts for %s batches', async (_name, result) => {
    const batches = repository({
      findBatchByReference: vi.fn().mockResolvedValue(persistedBatch),
      getBatchProgress: vi.fn().mockResolvedValue({ total: 3, processed: 3, ...result }),
      getBatchCounts: vi.fn().mockResolvedValue({
        ...result,
        unresolved: result.rejected,
        duplicate: 0,
        conflicting: 0,
      }),
    });
    const response = await createBatchService({} as BatchPayloadStorageService, batches).getStatus(
      createTestAccount({ role: 'submitter' }),
      persistedBatch.batchReference,
    );
    expect(response.data.progress).toMatchObject(result);
    expect(response.data.counts).toMatchObject(result);
  });

  test('returns every item fault with source location, cricket context and record traceability', async () => {
    const batches = repository({
      findBatchByReference: vi.fn().mockResolvedValue(persistedBatch),
      getBatchProgress: vi
        .fn()
        .mockResolvedValue({ total: 2, processed: 2, accepted: 1, rejected: 1 }),
      getBatchCounts: vi.fn().mockResolvedValue({
        accepted: 1,
        rejected: 1,
        unresolved: 1,
        duplicate: 0,
        conflicting: 0,
      }),
      listBatchRuleGroups: vi
        .fn()
        .mockResolvedValue([{ ruleCode: 'REFERENCE_RESOLUTION_FAILED', count: 2 }]),
      listBatchReportItems: vi.fn().mockResolvedValue([
        {
          batchItemId: '41',
          ordinal: 0,
          inningsId: '8',
          overNumber: 4,
          positionInOver: 2,
          sourceIdentity: 'event-1',
          sourceLocation: { filePath: 'events.json', rowNumber: 12, jsonPath: '$.events[0]' },
          referenceResolutionState: 'resolved',
          state: 'published',
          rejectionCode: null,
          publishedEventId: '91',
          errors: [],
        },
        {
          batchItemId: '42',
          ordinal: 1,
          inningsId: null,
          overNumber: 4,
          positionInOver: 3,
          sourceIdentity: 'event-2',
          sourceLocation: { filePath: 'events.json', rowNumber: 13, jsonPath: '$.events[1]' },
          referenceResolutionState: 'unresolved',
          state: 'rejected',
          rejectionCode: 'REFERENCE_RESOLUTION_FAILED',
          publishedEventId: null,
          errors: [
            {
              ruleCode: 'REFERENCE_RESOLUTION_FAILED',
              message: 'Unknown batting team.',
              filePath: 'events.json',
              rowNumber: 13,
              fieldPath: 'team',
            },
            {
              ruleCode: 'REFERENCE_RESOLUTION_FAILED',
              message: 'Unknown striker.',
              filePath: 'events.json',
              rowNumber: 13,
              fieldPath: 'striker',
            },
          ],
        },
      ]),
    });
    const response = await createBatchService({} as BatchPayloadStorageService, batches).getReport(
      createTestAccount({ role: 'submitter' }),
      persistedBatch.batchReference,
      { limit: 50 },
    );
    expect(response.data.items[0]).toMatchObject({
      outcome: 'accepted',
      stagedRecordId: '41',
      acceptedRecordId: '91',
    });
    expect(response.data.items[1]).toMatchObject({
      outcome: 'unresolved',
      location: { filePath: 'events.json', rowNumber: 13, jsonPath: '$.events[1]' },
    });
    expect(response.data.items[1]!.errors).toHaveLength(2);
    expect(response.data.items[1]!.errors[0]).toMatchObject({
      ruleCode: 'REFERENCE_RESOLUTION_FAILED',
      location: { jsonPath: 'team' },
      context: { overNumber: 4, positionInOver: 3 },
    });
  });

  test('keeps another submitter batch private while allowing an administrator reviewer', async () => {
    const batches = repository({
      findBatchByReference: vi.fn().mockResolvedValue({ ...persistedBatch, submitterId: '9' }),
    });
    const service = createBatchService({} as BatchPayloadStorageService, batches);
    await expect(
      service.getStatus(
        createTestAccount({ accountId: '1', role: 'submitter' }),
        persistedBatch.batchReference,
      ),
    ).rejects.toBeInstanceOf(BatchForbiddenError);
    await expect(
      service.getStatus(
        createTestAccount({ accountId: '1', role: 'admin' }),
        persistedBatch.batchReference,
      ),
    ).resolves.toMatchObject({ data: { batchReference: persistedBatch.batchReference } });
  });

  test('scopes batch lists to submitters and permits reviewer-wide listing', async () => {
    const listBatches = vi.fn().mockResolvedValue([]);
    const service = createBatchService(
      {} as BatchPayloadStorageService,
      repository({ listBatches }),
    );
    await service.list(createTestAccount({ accountId: '7', role: 'submitter' }), { limit: 50 });
    expect(listBatches).toHaveBeenLastCalledWith(expect.objectContaining({ submitterId: '7' }));
    await service.list(createTestAccount({ accountId: '7', role: 'admin' }), { limit: 50 });
    expect(listBatches).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ submitterId: expect.anything() }),
    );
  });
});
