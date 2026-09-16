import { describe, expect, test, vi } from 'vitest';

import type { FixtureStatisticsService } from '../../src/modules/statistics/fixture-statistics.service';
import type { ParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import type { ProvenanceRepository } from '../../src/modules/provenance/provenance.repository';
import {
  createProvenanceService,
  ProvenanceForbiddenError,
} from '../../src/modules/provenance/provenance.service';
import { createTestAccount } from '../test-app';

function repository(overrides: Partial<ProvenanceRepository> = {}): ProvenanceRepository {
  return {
    listSubmissions: vi.fn().mockResolvedValue([]),
    findSubmission: vi.fn().mockResolvedValue(null),
    listBatchLifecycle: vi.fn().mockResolvedValue([]),
    listBatchDecisions: vi.fn().mockResolvedValue([]),
    findEvent: vi.fn().mockResolvedValue(null),
    findFixtureCompetition: vi.fn().mockResolvedValue('5'),
    listContributorSources: vi.fn().mockResolvedValue([]),
    listParticipantContributorSources: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function statistics(): FixtureStatisticsService {
  return {
    getFixtureStatistics: vi.fn(),
    getFixtureStatistic: vi.fn().mockResolvedValue({
      statisticId: 'stat_example',
      fixtureId: '7',
      statisticCode: 'team_total',
      scope: 'innings',
      sourceEventCount: 1,
      contributingEvents: [{ eventId: '101' }],
    }),
  } as unknown as FixtureStatisticsService;
}

function participantStatistics(): ParticipantAggregatesService {
  return {
    getParticipantAggregates: vi.fn(),
    getParticipantAggregate: vi.fn().mockResolvedValue({
      statisticId: 'stat_career',
      participantId: '101',
      participantName: 'Player',
      scope: 'career',
      statisticCode: 'participant_career',
      fixtureCount: 1,
      sourceEventCount: 1,
      batting: null,
      bowling: null,
    }),
  };
}

const source = {
  kind: 'direct' as const,
  reference: '30',
  submissionId: '30',
  batchReference: null,
  batchItemId: null,
  submissionEventOrdinal: 0,
  submitter: { accountId: '1', displayName: 'Submitter' },
  checksum: 'a'.repeat(64),
  decision: {
    decision: 'accepted' as const,
    actor: null,
    decidedAt: '2026-09-09T09:00:00.000Z',
    reason: null,
  },
};

describe('provenance service authorization', () => {
  test('traces a career aggregate through current stable event identities', async () => {
    const data = repository({
      listParticipantContributorSources: vi.fn().mockResolvedValue([
        {
          deliveryId: '101',
          revision: 2,
          sourceEventId: '11111111-1111-4111-8111-111111111111',
          source,
        },
      ]),
    });
    const service = createProvenanceService(statistics(), data, participantStatistics());

    await expect(
      service.getParticipantStatistic(
        createTestAccount({ role: 'submitter', accountId: '1' }),
        '101',
        'stat_career',
        { limit: 25 },
      ),
    ).resolves.toMatchObject({
      data: {
        scope: 'career',
        contributors: [{ sourceEventId: '11111111-1111-4111-8111-111111111111' }],
      },
    });
    expect(data.listParticipantContributorSources).toHaveBeenCalledWith(
      '101',
      expect.any(Object),
      26,
    );
  });
  test('ordinary submitters list only their own submission provenance', async () => {
    const data = repository();
    const service = createProvenanceService(statistics(), data);
    const account = createTestAccount({ role: 'submitter', competitionIds: ['5'] });

    await service.listSubmissions(account, { limit: 50 });

    expect(data.listSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: account.accountId,
        reviewerCompetitionIds: [],
        limit: 51,
      }),
    );
  });

  test('reviewers receive only their explicit competition scope', async () => {
    const data = repository();
    const service = createProvenanceService(statistics(), data);
    const account = createTestAccount({ role: 'admin', competitionIds: ['5', '6'] });

    await service.listSubmissions(account, { limit: 25 });

    expect(data.listSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ reviewerCompetitionIds: ['5', '6'], limit: 26 }),
    );
  });

  test('submitters can trace a statistic only when every contributor is theirs', async () => {
    const data = repository({
      listContributorSources: vi
        .fn()
        .mockResolvedValue([{ deliveryId: '101', revision: 1, sourceEventId: null, source }]),
    });
    const service = createProvenanceService(statistics(), data);

    await expect(
      service.getStatistic(
        createTestAccount({ role: 'submitter', accountId: '1' }),
        '7',
        'stat_example',
      ),
    ).resolves.toMatchObject({ data: { contributors: [{ deliveryId: '101' }] } });

    const foreign = repository({
      listContributorSources: vi.fn().mockResolvedValue([
        {
          deliveryId: '101',
          revision: 1,
          sourceEventId: null,
          source: { ...source, submitter: { accountId: '9', displayName: 'Other' } },
        },
      ]),
    });
    await expect(
      createProvenanceService(statistics(), foreign).getStatistic(
        createTestAccount({ role: 'submitter', accountId: '1', competitionIds: ['5'] }),
        '7',
        'stat_example',
      ),
    ).rejects.toBeInstanceOf(ProvenanceForbiddenError);
  });

  test('an in-scope reviewer can trace mixed-source statistics', async () => {
    const data = repository({
      listContributorSources: vi.fn().mockResolvedValue([
        {
          deliveryId: '101',
          revision: 1,
          sourceEventId: null,
          source: { ...source, submitter: { accountId: '9', displayName: 'Other' } },
        },
      ]),
    });

    await expect(
      createProvenanceService(statistics(), data).getStatistic(
        createTestAccount({ role: 'admin', competitionIds: ['5'] }),
        '7',
        'stat_example',
      ),
    ).resolves.toMatchObject({ data: { sourceEventCount: 1 } });
  });
});
