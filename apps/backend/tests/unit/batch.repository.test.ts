import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import { createBatchRepository } from '../../src/modules/batches/batch.repository';

const queryResult = <Row>(rows: Row[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

const batchRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  batchId: '41',
  batchReference: '11111111-1111-4111-8111-111111111111',
  submitterId: '7',
  competitionId: '9',
  idempotencyKey: 'season-2026',
  packageVersion: '1.0',
  sourceFileName: 'season.json',
  submitterDisplayName: 'Nadia',
  sourceChecksum: 'abc123',
  sourceUri: 'stored-object:12',
  sourceSizeBytes: '2048',
  state: 'received',
  itemCount: 4,
  supersededBy: null,
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-01T10:01:00.000Z'),
  ...overrides,
});

function repositoryWithQuery() {
  const query = vi.fn();
  return {
    query,
    repository: createBatchRepository({ query } as unknown as QueryExecutor),
  };
}

describe('batch repository', () => {
  test('creates a batch with source metadata and maps database dates and sizes', async () => {
    const { query, repository } = repositoryWithQuery();
    query.mockResolvedValue(queryResult([batchRow()]));

    const created = await repository.createBatch({
      batchReference: '11111111-1111-4111-8111-111111111111',
      submitterId: '7',
      competitionId: '9',
      idempotencyKey: 'season-2026',
      source: { checksum: 'abc123', uri: 'stored-object:12', sizeBytes: 2048 },
    });

    expect(query.mock.calls[0]?.[0]).toContain('INSERT INTO batch');
    expect(query.mock.calls[0]?.[1]).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '7',
      '9',
      'season-2026',
      '1.0',
      'abc123',
      'stored-object:12',
      2048,
      'received',
    ]);
    expect(created).toEqual({
      batchId: '41',
      batchReference: '11111111-1111-4111-8111-111111111111',
      submitterId: '7',
      competitionId: '9',
      idempotencyKey: 'season-2026',
      packageVersion: '1.0',
      sourceFileName: 'season.json',
      submitterDisplayName: 'Nadia',
      source: { checksum: 'abc123', uri: 'stored-object:12', sizeBytes: 2048 },
      state: 'received',
      itemCount: 4,
      supersededBy: null,
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:01:00.000Z',
    });
  });

  test('rejects a create whose insert returns no record', async () => {
    const { query, repository } = repositoryWithQuery();
    query.mockResolvedValue(queryResult([]));

    await expect(
      repository.createBatch({
        batchReference: '11111111-1111-4111-8111-111111111111',
        submitterId: '7',
        competitionId: '9',
        idempotencyKey: 'season-2026',
      }),
    ).rejects.toThrow('Batch insertion returned no record');
  });

  test('queues validation, its outbox message, and the initial transition after insertion', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([batchRow({ sourceChecksum: null, sourceUri: null })]))
      .mockResolvedValue(queryResult([]));

    const created = await repository.createBatchAndQueueValidation({
      batchReference: '11111111-1111-4111-8111-111111111111',
      submitterId: '7',
      competitionId: '9',
      idempotencyKey: 'season-2026',
    });

    expect(created.source).toBeNull();
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[1]?.[0]).toContain('INSERT INTO background_job');
    expect(query.mock.calls[1]?.[1]?.slice(1)).toEqual(['batch.validate:41', '7', '41']);
    expect(query.mock.calls[2]?.[0]).toContain('INSERT INTO outbox_message');
    expect(query.mock.calls[2]?.[1]?.slice(2)).toEqual(['41', created.batchReference]);
    expect(query.mock.calls[3]?.[0]).toContain('INSERT INTO batch_state_transition');
    expect(query.mock.calls[3]?.[1]).toEqual([
      '41',
      'received',
      '7',
      'Payload stored and asynchronous validation queued.',
    ]);
  });

  test('returns an existing idempotent receipt without counting or inserting active batches', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([batchRow({ state: 'validating' })]));

    const result = await repository.createOrFindBatchAndQueueValidation({
      batchReference: '22222222-2222-4222-8222-222222222222',
      submitterId: '7',
      competitionId: '9',
      idempotencyKey: 'season-2026',
    });

    expect(result).toMatchObject({ created: false, activeLimitReached: false });
    expect(result.batch?.batchId).toBe('41');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(query.mock.calls[1]?.[1]).toEqual(['7', 'season-2026']);
  });

  test('reports the active-batch bound without creating another batch', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ count: '3' }]));

    await expect(
      repository.createOrFindBatchAndQueueValidation({
        batchReference: '22222222-2222-4222-8222-222222222222',
        submitterId: '7',
        competitionId: '9',
        idempotencyKey: 'new-upload',
      }),
    ).resolves.toEqual({ batch: null, created: false, activeLimitReached: true });
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2]?.[0]).toContain('state NOT IN');
  });

  test('finds batches by each supported identity and returns null for a missing row', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([batchRow()]))
      .mockResolvedValueOnce(queryResult([batchRow()]))
      .mockResolvedValueOnce(queryResult([]));

    expect((await repository.findBatchById('41'))?.batchReference).toContain('1111');
    expect((await repository.findBatchByIdempotencyKey('7', 'season-2026'))?.batchId).toBe('41');
    await expect(repository.findBatchByReference('missing')).resolves.toBeNull();
    expect(query.mock.calls.map((call) => call[1])).toEqual([
      ['41'],
      ['7', 'season-2026'],
      ['missing'],
    ]);
  });

  test('applies ownership, competition, cursor, status, limit, and deterministic ordering', async () => {
    const { query, repository } = repositoryWithQuery();
    query.mockResolvedValue(queryResult([batchRow()]));

    const records = await repository.listBatches({
      submitterId: '7',
      competitionIds: ['9', '10'],
      beforeCreatedAt: '2026-09-01T10:00:00.000Z',
      beforeBatchId: '41',
      status: 'received',
      limit: 25,
    });

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('submitter_id = $1::bigint');
    expect(sql).toContain('competition_id = ANY($2::bigint[])');
    expect(sql).toContain('(created_at, batch_id) < ($3::timestamptz, $4::bigint)');
    expect(sql).toContain('state = $5::batch_state');
    expect(sql).toContain('ORDER BY created_at DESC, batch_id DESC');
    expect(query.mock.calls[0]?.[1]).toEqual([
      '7',
      ['9', '10'],
      '2026-09-01T10:00:00.000Z',
      '41',
      'received',
      25,
    ]);
    expect(records).toHaveLength(1);
  });

  test('maps progress, status counts, lineage, rule groups, and reference-resolution summaries', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(
        queryResult([{ total: 12, processed: 7, accepted: '5', rejected: '2' }]),
      )
      .mockResolvedValueOnce(
        queryResult([
          { accepted: '5', rejected: '2', unresolved: '3', duplicate: '1', conflicting: '1' },
        ]),
      )
      .mockResolvedValueOnce(
        queryResult([
          {
            replacesBatchReference: 'previous-ref',
            supersededByBatchReference: 'replacement-ref',
          },
        ]),
      )
      .mockResolvedValueOnce(
        queryResult([
          { ruleCode: 'EVENT_CONFLICT', count: '2' },
          { ruleCode: 'REFERENCE_MISSING', count: '3' },
        ]),
      )
      .mockResolvedValueOnce(queryResult([{ count: '4' }]))
      .mockResolvedValueOnce(
        queryResult([
          { resolved: '8', ambiguous: '1', unresolved: '2', invalid: '1', proposed: '2' },
        ]),
      );

    await expect(repository.getBatchProgress('41')).resolves.toEqual({
      total: 12,
      processed: 7,
      accepted: 5,
      rejected: 2,
    });
    await expect(repository.getBatchCounts('41')).resolves.toEqual({
      accepted: 5,
      rejected: 2,
      unresolved: 3,
      duplicate: 1,
      conflicting: 1,
    });
    await expect(repository.getBatchLineage('41')).resolves.toEqual({
      replacesBatchReference: 'previous-ref',
      supersededByBatchReference: 'replacement-ref',
    });
    await expect(repository.listBatchRuleGroups('41')).resolves.toEqual([
      { ruleCode: 'EVENT_CONFLICT', count: 2 },
      { ruleCode: 'REFERENCE_MISSING', count: 3 },
    ]);
    await expect(repository.countBlockingValidationErrors('41')).resolves.toBe(4);
    await expect(repository.getBatchResolutionCounts('41')).resolves.toEqual({
      resolved: 8,
      ambiguous: 1,
      unresolved: 2,
      invalid: 1,
      proposed: 2,
    });
  });

  test('uses safe empty defaults for missing progress and lineage aggregates', async () => {
    const { query, repository } = repositoryWithQuery();
    query.mockResolvedValueOnce(queryResult([])).mockResolvedValueOnce(queryResult([]));

    await expect(repository.getBatchProgress('404')).resolves.toEqual({
      total: 0,
      processed: 0,
      accepted: 0,
      rejected: 0,
    });
    await expect(repository.getBatchLineage('404')).resolves.toEqual({
      replacesBatchReference: null,
      supersededByBatchReference: null,
    });
  });

  test('maps fixture summary counters and preserves first-item ordering', async () => {
    const { query, repository } = repositoryWithQuery();
    query.mockResolvedValue(
      queryResult([
        {
          fixtureId: '91',
          label: 'Lions vs Tigers · 2026-09-01',
          total: '8',
          accepted: '5',
          rejected: '2',
          unresolved: '1',
        },
      ]),
    );

    await expect(repository.listBatchFixtureSummaries('41')).resolves.toEqual([
      {
        fixtureId: '91',
        label: 'Lions vs Tigers · 2026-09-01',
        total: 8,
        accepted: 5,
        rejected: 2,
        unresolved: 1,
      },
    ]);
    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY min(bi.ordinal)');
  });

  test('paginates report and item reads with semantic filters and stable ordinal order', async () => {
    const { query, repository } = repositoryWithQuery();
    const item = {
      batchItemId: '2',
      batchId: '41',
      ordinal: 8,
      inningsId: '11',
      overNumber: 3,
      positionInOver: 2,
      payload: {},
      sourceIdentity: 'source-8',
      sourceLocation: null,
      referenceResolutionState: 'resolved',
      resolvedReferences: null,
      state: 'accepted',
      rejectionCode: null,
      rejectionDetail: null,
      publishedEventId: null,
      operation: 'upsert',
      correctsSourceIdentity: null,
      correctionTargetDeliveryId: null,
    };
    query.mockResolvedValueOnce(queryResult([item])).mockResolvedValueOnce(queryResult([item]));

    await expect(
      repository.listBatchReportItems('41', {
        afterOrdinal: 7,
        limit: 10,
        acceptedOnly: true,
        blockingOnly: true,
      }),
    ).resolves.toEqual([item]);
    expect(query.mock.calls[0]?.[1]).toEqual(['41', 7, 10, true, true]);
    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY subjects.ordinal');

    await expect(repository.listBatchItems('41', { afterOrdinal: 7, limit: 10 })).resolves.toEqual([
      item,
    ]);
    expect(query.mock.calls[1]?.[1]).toEqual(['41', 7, 10]);
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY ordinal ASC');
  });

  test('does not query for an empty item insert and sorts returned rows by ordinal', async () => {
    const { query, repository } = repositoryWithQuery();
    await expect(repository.insertBatchItems('41', [])).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();

    const first = { batchItemId: '1', batchId: '41', ordinal: 1 };
    const second = { batchItemId: '2', batchId: '41', ordinal: 2 };
    query.mockResolvedValueOnce(queryResult([second, first]));
    const input = [
      {
        ordinal: 2,
        inningsId: '11',
        overNumber: 1,
        positionInOver: 2,
        payload: { eventId: 'event-2' },
      },
      {
        ordinal: 1,
        inningsId: '11',
        overNumber: 1,
        positionInOver: 1,
        payload: { eventId: 'event-1' },
        state: 'accepted' as const,
      },
    ];

    const inserted = await repository.insertBatchItems('41', input);
    expect(inserted.map((record) => record.ordinal)).toEqual([1, 2]);
    expect(query.mock.calls[0]?.[0]).toContain('INSERT INTO batch_item');
    expect(query.mock.calls[0]?.[1]?.[0]).toBe('41');
    expect(query.mock.calls[0]?.[1]).toContain(JSON.stringify({ eventId: 'event-2' }));
  });

  test('maps checkpoint leases, supports missing checkpoints, and persists retry state', async () => {
    const { query, repository } = repositoryWithQuery();
    const checkpoint = {
      batchId: '41',
      phase: 'validating',
      lastOrdinal: 8,
      leaseOwner: 'worker-1',
      leaseExpiresAt: new Date('2026-09-01T10:05:00.000Z'),
      attemptCount: 2,
    };
    query
      .mockResolvedValueOnce(queryResult([checkpoint]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([checkpoint]));

    await expect(repository.findCheckpoint('41', 'validating')).resolves.toMatchObject({
      leaseExpiresAt: '2026-09-01T10:05:00.000Z',
      attemptCount: 2,
    });
    await expect(repository.findCheckpoint('404', 'validating')).resolves.toBeNull();
    await expect(
      repository.upsertCheckpoint({
        batchId: '41',
        phase: 'validating',
        lastOrdinal: 8,
        leaseOwner: 'worker-1',
        leaseExpiresAt: '2026-09-01T10:05:00.000Z',
        attemptCount: 2,
      }),
    ).resolves.toMatchObject({ attemptCount: 2 });
    expect(query.mock.calls[2]?.[0]).toContain('ON CONFLICT (batch_id, phase) DO UPDATE');
    expect(query.mock.calls[2]?.[1]).toEqual([
      '41',
      'validating',
      8,
      'worker-1',
      '2026-09-01T10:05:00.000Z',
      2,
    ]);
  });

  test('records validation and review decisions and maps the latest decision', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(
        queryResult([
          {
            decision: 'approved',
            actorId: '3',
            actorDisplayName: 'Reviewer',
            reason: null,
            decidedAt: new Date('2026-09-02T08:00:00.000Z'),
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]));

    await repository.recordValidationResult({
      batchId: '41',
      sourceOrdinal: 7,
      ruleCode: 'REFERENCE_MISSING',
      ruleVersion: '1',
      severity: 'error',
      fieldPath: 'events[7].strikerId',
      message: 'Unknown striker',
    });
    expect(query.mock.calls[0]?.[0]).toContain('ON CONFLICT DO NOTHING');
    expect(query.mock.calls[0]?.[1]).toEqual([
      '41',
      null,
      7,
      'REFERENCE_MISSING',
      '1',
      'error',
      null,
      null,
      'events[7].strikerId',
      'Unknown striker',
    ]);

    await repository.recordReviewDecision({
      batchId: '41',
      actorId: '3',
      decision: 'approved',
    });
    expect(query.mock.calls[1]?.[1]).toEqual(['41', '3', 'approved', null]);
    await expect(repository.getLatestReviewDecision('41')).resolves.toEqual({
      decision: 'approved',
      actorId: '3',
      actorDisplayName: 'Reviewer',
      reason: 'Legacy review decision.',
      decidedAt: '2026-09-02T08:00:00.000Z',
    });
    await expect(repository.getLatestReviewDecision('404')).resolves.toBeNull();
  });

  test('approves a resolved batch, transitions it to publishing, and queues publication once', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([batchRow({ state: 'awaiting_review' })]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ count: '0' }]))
      .mockResolvedValueOnce(queryResult([{ count: '0' }]))
      .mockResolvedValueOnce(
        queryResult([{ decision: 'approved', decidedAt: new Date('2026-09-02T08:00:00.000Z') }]),
      )
      .mockResolvedValueOnce(queryResult([batchRow({ state: 'publishing' })]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ jobId: '71' }]))
      .mockResolvedValueOnce(queryResult([]));

    const result = await repository.applyReviewDecision({
      batchId: '41',
      actorId: '3',
      decision: 'approved',
      reason: 'All blocking findings resolved.',
    });

    expect(result).toMatchObject({
      batch: { state: 'publishing' },
      review: { decision: 'approved', actorId: '3' },
      resumePublication: true,
    });
    expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(query.mock.calls[4]?.[1]).toEqual([
      '41',
      '3',
      'approved',
      'All blocking findings resolved.',
    ]);
    expect(query.mock.calls[7]?.[0]).toContain("'batch.publish'");
    expect(query.mock.calls[8]?.[0]).toContain('INSERT INTO outbox_message');
  });

  test('refuses approval while blocking validation or resolution findings remain', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([batchRow({ state: 'awaiting_review' })]))
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(queryResult([{ count: '1' }]))
      .mockResolvedValueOnce(queryResult([{ count: '2' }]));

    await expect(
      repository.applyReviewDecision({
        batchId: '41',
        actorId: '3',
        decision: 'approved',
        reason: 'Premature approval.',
      }),
    ).rejects.toThrow('Resolve all blocking validation errors');
    expect(
      query.mock.calls.some((call) =>
        String(call[0]).includes('INSERT INTO batch_review_decision'),
      ),
    ).toBe(false);
  });

  test('replays the same review decision idempotently without inserting another decision', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([batchRow({ state: 'publishing' })]))
      .mockResolvedValueOnce(
        queryResult([
          {
            decision: 'approved',
            actorId: '3',
            actorDisplayName: 'Reviewer',
            reason: 'Approved.',
            decidedAt: new Date('2026-09-02T08:00:00.000Z'),
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]));

    await expect(
      repository.applyReviewDecision({
        batchId: '41',
        actorId: '3',
        decision: 'approved',
        reason: 'Retry.',
      }),
    ).resolves.toMatchObject({ resumePublication: true, review: { reason: 'Approved.' } });
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2]?.[0]).toContain('ON CONFLICT (idempotency_key) DO NOTHING');
  });

  test('reuses an identical reference mapping decision without revalidation', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([batchRow({ state: 'awaiting_review' })]))
      .mockResolvedValueOnce(
        queryResult([
          {
            decisionReference: '33333333-3333-4333-8333-333333333333',
            itemOrdinal: 4,
            referencePath: 'events[4].strikerId',
            entityType: 'participant',
            candidateId: '20',
            candidateLabel: 'Asha Patel',
            decisionKey: 'decision-4',
            state: 'queued',
            decidedAt: new Date('2026-09-02T09:00:00.000Z'),
          },
        ]),
      );

    await expect(
      repository.queueReferenceMapping({
        decisionReference: '33333333-3333-4333-8333-333333333333',
        batchId: '41',
        actorId: '3',
        itemOrdinal: 4,
        referencePath: 'events[4].strikerId',
        entityType: 'participant',
        candidateId: '20',
        candidateLabel: 'Asha Patel',
        decisionKey: 'decision-4',
      }),
    ).resolves.toMatchObject({ decidedAt: '2026-09-02T09:00:00.000Z' });
    expect(query).toHaveBeenCalledTimes(2);
  });

  test('applies reference resolutions in one ordered statement and links publication provenance', async () => {
    const { query, repository } = repositoryWithQuery();
    const first = { batchItemId: '1', batchId: '41', ordinal: 1 };
    const second = { batchItemId: '2', batchId: '41', ordinal: 2 };
    query
      .mockResolvedValueOnce(queryResult([second, first]))
      .mockResolvedValueOnce(queryResult([]));

    await expect(repository.applyReferenceResolution([])).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
    const resolved = await repository.applyReferenceResolution([
      {
        batchItemId: '2',
        inningsId: '10',
        sourceIdentity: 'source-2',
        referenceResolutionState: 'resolved',
        resolvedReferences: { fixtureId: '91' },
      },
      {
        batchItemId: '1',
        inningsId: null,
        sourceIdentity: null,
        referenceResolutionState: 'unresolved',
        resolvedReferences: null,
      },
    ]);
    expect(resolved.map((row) => row.ordinal)).toEqual([1, 2]);
    expect(query.mock.calls[0]?.[0]).toContain('FROM (VALUES');
    expect(query.mock.calls[0]?.[1]).toContain(JSON.stringify({ fixtureId: '91' }));

    await repository.linkPublishedDelivery('2', '101');
    expect(query.mock.calls[1]?.[0]).toContain(
      'SET source_batch_item_id = linked_item.batch_item_id',
    );
    expect(query.mock.calls[1]?.[1]).toEqual(['2', '101']);
  });

  test('lists only outstanding onboarding work in deterministic fixture and name order', async () => {
    const { query, repository } = repositoryWithQuery();
    const task = {
      taskReference: '44444444-4444-4444-8444-444444444444',
      fixtureId: '91',
      submittedName: 'Asha Patel',
      submittedTeamName: 'Lions',
      reason: 'participant_not_recognised',
      candidates: [],
      teams: [
        { teamId: '4', name: 'Lions' },
        { teamId: '5', name: 'Tigers' },
      ],
    };
    query.mockResolvedValue(queryResult([task]));

    await expect(repository.listParticipantOnboardingTasks('41')).resolves.toEqual([task]);
    expect(query.mock.calls[0]?.[0]).toContain("task.state = 'outstanding'");
    expect(query.mock.calls[0]?.[0]).toContain(
      'ORDER BY task.fixture_id, task.submitted_name, task.task_reference',
    );
  });
});
