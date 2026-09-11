import { Readable } from 'node:stream';
import { describe, expect, test, vi } from 'vitest';

import {
  BatchReviewResolutionError,
  type BatchRepository,
} from '../../src/modules/batches/batch.repository';
import {
  BatchConflictError,
  BatchForbiddenError,
  createBatchService,
} from '../../src/modules/batches/batch.service';
import type { BatchPayloadStorageService } from '../../src/modules/object-storage/batch-payload-storage.service';
import { ObjectStorageError } from '../../src/modules/object-storage/object-store';
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
    getBatchResolutionCounts: vi.fn().mockResolvedValue({
      resolved: 0,
      ambiguous: 0,
      unresolved: 0,
      invalid: 0,
      proposed: 0,
    }),
    listBatchFixtureSummaries: vi.fn().mockResolvedValue([]),
    getLatestReviewDecision: vi.fn().mockResolvedValue(null),
    applyReviewDecision: vi.fn(),
    queueReferenceMapping: vi.fn(),
    insertBatchItems: vi.fn(),
    listBatchItems: vi.fn(),
    findCheckpoint: vi.fn(),
    upsertCheckpoint: vi.fn(),
    recordValidationResult: vi.fn(),
    recordReviewDecision: vi.fn(),
    linkPublishedDelivery: vi.fn(),
    publishAcceptedItems: vi.fn(),
    ...overrides,
  } as unknown as BatchRepository;
}

describe('batch receipt service', () => {
  test('keeps read-only batch workflows available when payload storage is not configured', async () => {
    const source = Readable.from('payload');

    await expect(
      createBatchService(undefined, repository()).receive(
        createTestAccount({ role: 'submitter', competitionIds: ['5'] }),
        metadata,
        source,
      ),
    ).rejects.toBeInstanceOf(ObjectStorageError);
    expect(source.destroyed).toBe(true);
  });

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

  test('keeps another submitter batch private from submitters even when competition-scoped, while allowing administrators', async () => {
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
        createTestAccount({ accountId: '1', role: 'submitter', competitionIds: ['5'] }),
        persistedBatch.batchReference,
      ),
    ).rejects.toBeInstanceOf(BatchForbiddenError);

    await expect(
      service.getStatus(
        createTestAccount({ accountId: '1', role: 'admin', competitionIds: [] }),
        persistedBatch.batchReference,
      ),
    ).resolves.toMatchObject({ data: { batchReference: persistedBatch.batchReference } });
  });

  test('lists personal history by owner while keeping administrator review queues global', async () => {
    const listBatches = vi.fn().mockResolvedValue([]);
    const service = createBatchService(
      {} as BatchPayloadStorageService,
      repository({ listBatches }),
    );

    await service.list(createTestAccount({ accountId: '7', role: 'submitter' }), { limit: 50 });
    expect(listBatches).toHaveBeenLastCalledWith(expect.objectContaining({ submitterId: '7' }));

    await service.list(createTestAccount({ accountId: '7', role: 'admin' }), { limit: 50 });
    expect(listBatches).toHaveBeenLastCalledWith(expect.objectContaining({ submitterId: '7' }));

    await service.list(
      createTestAccount({ accountId: '7', role: 'submitter', competitionIds: ['5', '6'] }),
      { limit: 50, status: 'awaiting_review' },
    );
    expect(listBatches).toHaveBeenLastCalledWith(
      expect.objectContaining({
        submitterId: '7',
        status: 'awaiting_review',
      }),
    );
    expect(listBatches.mock.calls.at(-1)![0]).not.toHaveProperty('competitionIds');

    for (const competitionIds of [[], ['5']]) {
      await service.list(createTestAccount({ accountId: '7', role: 'admin', competitionIds }), {
        limit: 50,
        status: 'awaiting_review',
      });

      expect(listBatches).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'awaiting_review', limit: 51 }),
      );
      expect(listBatches.mock.calls.at(-1)![0]).not.toHaveProperty('submitterId');
      expect(listBatches.mock.calls.at(-1)![0]).not.toHaveProperty('competitionIds');
    }
  });

  test('exposes opaque candidate labels and queues a currently valid mapping', async () => {
    const unresolvedItem = {
      batchItemId: '42',
      batchId: persistedBatch.batchId,
      ordinal: 1,
      inningsId: null,
      overNumber: 4,
      positionInOver: 3,
      payload: {},
      sourceIdentity: 'event-2',
      sourceLocation: { filePath: 'events.json', rowNumber: 13 },
      referenceResolutionState: 'ambiguous' as const,
      resolvedReferences: {
        participants: {
          striker: {
            referencePath: 'fixtures.0.innings.0.events.1.striker',
            entityType: 'participant',
            state: 'ambiguous',
            submittedReference: { context: { name: 'A. Smith' } },
            canonicalId: null,
            matchedBy: null,
            candidates: [
              { canonicalId: '71', label: 'A. Smith (Wits)' },
              { canonicalId: '72', label: 'A. Smith (UCT)', outOfScope: true },
            ],
            reason: 'Two people share this name.',
          },
        },
      },
      state: 'rejected' as const,
      rejectionCode: 'REFERENCE_RESOLUTION_FAILED',
      rejectionDetail: null,
      publishedEventId: null,
      errors: [],
    };
    const queueReferenceMapping = vi.fn().mockResolvedValue({
      decisionReference: '688a0bf0-e168-4b67-bf6f-f5857dbb1f87',
      itemOrdinal: 1,
      referencePath: 'fixtures.0.innings.0.events.1.striker',
      entityType: 'participant',
      candidateId: '71',
      candidateLabel: 'A. Smith (Wits)',
      decisionKey: 'map-smith-1',
      state: 'queued',
      decidedAt: '2026-09-07T12:00:00.000Z',
    });
    const batches = repository({
      findBatchByReference: vi.fn().mockResolvedValue({ ...persistedBatch, state: 'rejected' }),
      listBatchReportItems: vi.fn().mockResolvedValue([unresolvedItem]),
      listBatchItems: vi.fn().mockResolvedValue([unresolvedItem]),
      queueReferenceMapping,
    });
    const service = createBatchService({} as BatchPayloadStorageService, batches);
    const account = createTestAccount({ role: 'submitter' });
    const report = await service.getReport(account, persistedBatch.batchReference, { limit: 50 });
    const resolution = report.data.items[0]!.referenceResolutions[0]!;
    expect(resolution).toMatchObject({
      entityType: 'participant',
      requiredAction: 'select_candidate',
      candidates: [{ label: 'A. Smith (Wits)' }],
    });
    expect(JSON.stringify(resolution)).not.toContain('71');
    expect(JSON.stringify(resolution)).not.toContain('72');

    const response = await service.mapReference(account, persistedBatch.batchReference, {
      itemOrdinal: 1,
      referencePath: resolution.referencePath,
      candidateReference: resolution.candidates[0]!.candidateReference,
      decisionKey: 'map-smith-1',
    });
    expect(response.data).toMatchObject({ status: 'queued' });
    expect(queueReferenceMapping).toHaveBeenCalledWith(
      expect.objectContaining({ candidateId: '71', candidateLabel: 'A. Smith (Wits)' }),
    );
  });

  test('rejects stale opaque candidate selections before persistence', async () => {
    const batches = repository({
      findBatchByReference: vi.fn().mockResolvedValue({ ...persistedBatch, state: 'rejected' }),
      listBatchItems: vi.fn().mockResolvedValue([]),
    });
    await expect(
      createBatchService({} as BatchPayloadStorageService, batches).mapReference(
        createTestAccount({ role: 'submitter' }),
        persistedBatch.batchReference,
        {
          itemOrdinal: 0,
          referencePath: 'fixtures.0.striker',
          candidateReference: 'e7b5945d-d738-5fc8-9278-8b15f50ab7c5',
          decisionKey: 'stale',
        },
      ),
    ).rejects.toBeInstanceOf(BatchConflictError);
  });
});

describe('batch review service', () => {
  const awaitingReview = { ...persistedBatch, state: 'awaiting_review' as const };
  const published = { ...persistedBatch, state: 'published' as const };
  const decision = {
    decision: 'approved' as const,
    actorId: '1',
    actorDisplayName: 'Test User',
    decidedAt: '2026-09-07T11:00:00.000Z',
    reason: 'Validation report is acceptable.',
  };

  test('allows a global administrator approval and resumes publication before responding', async () => {
    const applyReviewDecision = vi.fn().mockResolvedValue({
      batch: { ...awaitingReview, state: 'publishing' },
      review: decision,
      resumePublication: true,
    });
    const publishAcceptedItems = vi.fn().mockResolvedValue({
      published: 3,
      duplicateSkipped: 0,
      conflicts: 0,
    });
    const batches = repository({
      findBatchByReference: vi.fn().mockResolvedValue(awaitingReview),
      findBatchById: vi.fn().mockResolvedValue(published),
      applyReviewDecision,
      publishAcceptedItems,
      getLatestReviewDecision: vi.fn().mockResolvedValue(decision),
    });

    const response = await createBatchService({} as BatchPayloadStorageService, batches).review(
      createTestAccount({ role: 'admin', competitionIds: [] }),
      awaitingReview.batchReference,
      { decision: 'approved', reason: decision.reason },
    );

    expect(applyReviewDecision).toHaveBeenCalledWith({
      batchId: awaitingReview.batchId,
      actorId: '1',
      decision: 'approved',
      reason: decision.reason,
    });
    expect(publishAcceptedItems).toHaveBeenCalledWith(awaitingReview.batchId, 'reviewer:1');
    expect(response.data).toMatchObject({ status: 'published', review: { decision: 'approved' } });
  });

  test.each(['rejected', 'returned_for_correction'] as const)(
    'persists %s without publishing staged data',
    async (reviewDecision) => {
      const applyReviewDecision = vi.fn().mockResolvedValue({
        batch: awaitingReview,
        review: { ...decision, decision: reviewDecision },
        resumePublication: false,
      });
      const publishAcceptedItems = vi.fn();
      const batches = repository({
        findBatchByReference: vi.fn().mockResolvedValue(awaitingReview),
        findBatchById: vi.fn().mockResolvedValue({
          ...awaitingReview,
          state: reviewDecision === 'rejected' ? 'rejected' : 'correction_requested',
        }),
        applyReviewDecision,
        publishAcceptedItems,
        getLatestReviewDecision: vi
          .fn()
          .mockResolvedValue({ ...decision, decision: reviewDecision }),
      });
      await createBatchService({} as BatchPayloadStorageService, batches).review(
        createTestAccount({ role: 'admin', competitionIds: [] }),
        awaitingReview.batchReference,
        { decision: reviewDecision, reason: 'Needs reviewer action.' },
      );
      expect(publishAcceptedItems).not.toHaveBeenCalled();
    },
  );

  test.each([
    createTestAccount(),
    createTestAccount({ accountId: '1', role: 'submitter', competitionIds: ['5'] }),
    createTestAccount({ accountId: '7', role: 'submitter', competitionIds: ['5'] }),
    createTestAccount({ accountId: '7', role: 'submitter', competitionIds: ['6'] }),
  ])('prevents an unauthorized account from deciding a batch', async (account) => {
    const applyReviewDecision = vi.fn();
    const service = createBatchService(
      {} as BatchPayloadStorageService,
      repository({
        findBatchByReference: vi.fn().mockResolvedValue(awaitingReview),
        applyReviewDecision,
      }),
    );
    await expect(
      service.review(account, awaitingReview.batchReference, {
        decision: 'approved',
        reason: 'Attempted approval.',
      }),
    ).rejects.toBeInstanceOf(BatchForbiddenError);
    expect(applyReviewDecision).not.toHaveBeenCalled();
  });

  test('reports unresolved-reference approval and retry races as conflicts', async () => {
    const service = createBatchService(
      {} as BatchPayloadStorageService,
      repository({
        findBatchByReference: vi.fn().mockResolvedValue(awaitingReview),
        applyReviewDecision: vi
          .fn()
          .mockRejectedValue(new BatchReviewResolutionError('Unresolved references remain.')),
      }),
    );
    await expect(
      service.review(
        createTestAccount({ role: 'admin', competitionIds: ['5'] }),
        awaitingReview.batchReference,
        { decision: 'approved', reason: 'Approve.' },
      ),
    ).rejects.toThrow('Unresolved references remain.');
  });
});
