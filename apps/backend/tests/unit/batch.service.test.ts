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
    findBatchByIdempotencyKey: vi.fn().mockResolvedValue(null),
    countNonTerminalBatches: vi.fn().mockResolvedValue(0),
    getBatchProgress: vi
      .fn()
      .mockResolvedValue({ total: 0, processed: 0, accepted: 0, rejected: 0 }),
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
