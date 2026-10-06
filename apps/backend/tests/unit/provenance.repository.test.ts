import { describe, expect, test, vi } from 'vitest';

import type { Pool } from 'pg';

import { createProvenanceRepository } from '../../src/modules/provenance/provenance.repository';

const queryResult = <Row>(rows: Row[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

function repositoryWithQuery() {
  const query = vi.fn();
  return {
    query,
    repository: createProvenanceRepository({ query } as unknown as Pool),
  };
}

const submissionRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  kind: 'file',
  reference: '51',
  submissionId: '51',
  batchReference: null,
  fixtureId: '91',
  competitionId: '2',
  submitterId: '7',
  submitterDisplayName: 'Nadia',
  status: 'accepted',
  receivedAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-01T10:01:00.000Z'),
  eventCount: 120,
  fileName: 'match.json',
  mediaType: 'application/json',
  sizeBytes: '4096',
  checksum: 'abcdef',
  packageVersion: '1.0',
  ...overrides,
});

const eventRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  deliveryId: '101',
  sourceEventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fixtureId: '91',
  competitionId: '2',
  revision: 1,
  recordedAt: new Date('2026-09-01T10:00:00.000Z'),
  supersededAt: null,
  current: true,
  submissionId: '51',
  submissionEventOrdinal: 3,
  submissionStatus: 'accepted',
  submissionReceivedAt: new Date('2026-09-01T09:59:00.000Z'),
  sourceFileName: 'match.json',
  legacySourceFileName: null,
  sourceChecksum: 'ABCDEF',
  submitterId: '7',
  submitterDisplayName: 'Nadia',
  batchItemId: null,
  batchReference: null,
  batchChecksum: null,
  batchDecision: null,
  batchDecisionActorId: null,
  batchDecisionActorDisplayName: null,
  batchDecidedAt: null,
  batchDecisionReason: null,
  correctionId: null,
  correctionRequesterId: null,
  correctionRequesterDisplayName: null,
  correctedAt: null,
  correctionReason: null,
  correctionReviewDecision: null,
  correctionReviewerId: null,
  correctionReviewerDisplayName: null,
  correctionReviewedAt: null,
  correctionReviewReason: null,
  ...overrides,
});

describe('provenance repository', () => {
  test('lists scoped submissions with kind and keyset filters and maps nullable source metadata', async () => {
    const { query, repository } = repositoryWithQuery();
    query.mockResolvedValue(
      queryResult([
        submissionRow(),
        submissionRow({
          kind: 'batch',
          reference: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          submissionId: null,
          batchReference: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          sizeBytes: null,
        }),
      ]),
    );

    const records = await repository.listSubmissions({
      accountId: '7',
      reviewerCompetitionIds: ['2'],
      kind: 'file',
      before: { receivedAt: '2026-09-02T00:00:00.000Z', kind: 'file', reference: '60' },
      limit: 25,
    });

    expect(records[0]).toMatchObject({
      kind: 'file',
      submitter: { accountId: '7', displayName: 'Nadia' },
      source: { sizeBytes: 4096, checksum: 'abcdef' },
      receivedAt: '2026-09-01T10:00:00.000Z',
    });
    expect(records[1]?.source.sizeBytes).toBeNull();
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('s.submitted_by = $1::bigint');
    expect(sql).toContain('f.competition_id = ANY($2::bigint[])');
    expect(sql).toContain('kind = $3');
    expect(sql).toContain('ORDER BY "receivedAt" DESC, kind DESC, reference DESC');
    expect(query.mock.calls[0]?.[1]).toEqual([
      '7',
      ['2'],
      'file',
      '2026-09-02T00:00:00.000Z',
      'file',
      '60',
      25,
    ]);
  });

  test('finds only visible submissions and returns null when no scoped row exists', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([submissionRow()]))
      .mockResolvedValueOnce(queryResult([]));

    await expect(repository.findSubmission('51', '7', ['2'])).resolves.toMatchObject({
      submissionId: '51',
      fixtureId: '91',
    });
    await expect(repository.findSubmission('404', '7', ['2'])).resolves.toBeNull();
    expect(query.mock.calls[0]?.[1]).toEqual(['7', ['2'], '51']);
  });

  test('maps ordered batch lifecycle transitions and reviewer decisions', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(
        queryResult([
          {
            fromState: 'received',
            toState: 'validating',
            at: new Date('2026-09-01T10:02:00.000Z'),
            actorKind: 'worker',
            actorIdentifier: 'worker-1',
            reason: 'Validation claimed.',
          },
        ]),
      )
      .mockResolvedValueOnce(
        queryResult([
          {
            decision: 'approved',
            actorId: '3',
            actorDisplayName: 'Reviewer',
            decidedAt: new Date('2026-09-01T11:00:00.000Z'),
            reason: 'Checks passed.',
          },
        ]),
      );

    await expect(repository.listBatchLifecycle('batch-ref')).resolves.toEqual([
      {
        fromState: 'received',
        toState: 'validating',
        at: '2026-09-01T10:02:00.000Z',
        actorKind: 'worker',
        actorIdentifier: 'worker-1',
        reason: 'Validation claimed.',
      },
    ]);
    await expect(repository.listBatchDecisions('batch-ref')).resolves.toEqual([
      {
        decision: 'approved',
        actor: { accountId: '3', displayName: 'Reviewer' },
        decidedAt: '2026-09-01T11:00:00.000Z',
        reason: 'Checks passed.',
      },
    ]);
    expect(query.mock.calls[0]?.[0]).toContain(
      'ORDER BY transition.created_at, transition.batch_state_transition_id',
    );
    expect(query.mock.calls[1]?.[0]).toContain(
      'ORDER BY decision.decided_at, decision.batch_review_decision_id',
    );
  });

  test('builds a current event trace across direct and corrected batch revisions', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(
        queryResult([
          {
            sourceEventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            fixtureId: '91',
            competitionId: '2',
            submitterId: '7',
          },
        ]),
      )
      .mockResolvedValueOnce(
        queryResult([
          eventRow({
            deliveryId: '100',
            revision: 0,
            current: false,
            supersededAt: new Date('2026-09-01T11:00:00.000Z'),
          }),
          eventRow({
            batchItemId: '88',
            batchReference: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            batchChecksum: 'BATCHHASH',
            batchDecision: 'approved',
            batchDecisionActorId: '3',
            batchDecisionActorDisplayName: 'Reviewer',
            batchDecidedAt: new Date('2026-09-01T10:30:00.000Z'),
            batchDecisionReason: 'Valid.',
            correctionId: '5',
            correctionRequesterId: '7',
            correctionRequesterDisplayName: 'Nadia',
            correctedAt: new Date('2026-09-01T11:00:00.000Z'),
            correctionReason: 'Corrected striker.',
            correctionReviewDecision: 'approved',
            correctionReviewerId: '3',
            correctionReviewerDisplayName: 'Reviewer',
            correctionReviewedAt: new Date('2026-09-01T11:05:00.000Z'),
            correctionReviewReason: 'Confirmed.',
          }),
        ]),
      );

    const trace = await repository.findEvent('101');
    expect(trace).toMatchObject({
      eventId: '101',
      currentDeliveryId: '101',
      revisions: [
        { source: { kind: 'file', checksum: 'abcdef' }, correction: null },
        {
          source: {
            kind: 'batch',
            reference: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            checksum: 'batchhash',
            decision: { actor: { accountId: '3' } },
          },
          correction: {
            correctionId: '5',
            requester: { accountId: '7' },
            review: { decision: 'approved', actor: { accountId: '3' } },
          },
        },
      ],
    });
  });

  test('handles missing event anchors and revision rows without a trace', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([]))
      .mockResolvedValueOnce(
        queryResult([
          {
            sourceEventId: null,
            fixtureId: '91',
            competitionId: null,
            submitterId: null,
          },
        ]),
      )
      .mockResolvedValueOnce(queryResult([]));

    await expect(repository.findEvent('404')).resolves.toBeNull();
    await expect(repository.findEvent('101')).resolves.toBeNull();
  });

  test('loads scoped contributor sources with bounds and reports ownership safely', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce(queryResult([{ competitionId: '2' }]))
      .mockResolvedValueOnce(queryResult([eventRow()]))
      .mockResolvedValueOnce(queryResult([eventRow()]))
      .mockResolvedValueOnce(queryResult([{ owned: true }]))
      .mockResolvedValueOnce(queryResult([]));

    await expect(repository.findFixtureCompetition('91')).resolves.toBe('2');
    await expect(repository.listContributorSources([])).resolves.toEqual([]);
    await expect(repository.listContributorSources(['101'])).resolves.toMatchObject([
      { deliveryId: '101', source: { kind: 'file' } },
    ]);

    const statistic = {
      scope: 'season' as const,
      competitionId: '2',
      season: '2026',
      batting: {},
      bowling: {},
    };
    await expect(
      repository.listParticipantContributorSources('11', statistic, 20, '101'),
    ).resolves.toHaveLength(1);
    expect(query.mock.calls[2]?.[1]).toEqual(['11', '2', '2026', '101', 20]);
    expect(query.mock.calls[2]?.[0]).toContain('ORDER BY d.delivery_id DESC LIMIT $5');
    await expect(
      repository.hasOnlyParticipantContributorSourcesFromAccount('11', statistic, '7'),
    ).resolves.toBe(true);
    expect(query.mock.calls[3]?.[1]).toEqual(['11', '7', '2', '2026']);

    await expect(repository.findFixtureCompetition('404')).resolves.toBeUndefined();
  });
});
