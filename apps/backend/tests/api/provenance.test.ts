import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import { createApp } from '../../src/app';
import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { Environment } from '../../src/config/env';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import type { ProvenanceService } from '../../src/modules/provenance/provenance.service';
import { createTestAccount } from '../test-app';

const environment: Environment = {
  NODE_ENV: 'test',
  PORT: 3000,
  CORS_ORIGINS: 'http://localhost:5173',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
};

const verify: VerifyAccessToken = async () => ({ uid: 'user', displayName: 'User' });

function synchronize(account: ReturnType<typeof createTestAccount>): SynchronizeAccount {
  return async () => account;
}

function service(): ProvenanceService {
  return {
    listSubmissions: vi.fn().mockResolvedValue({ data: [], pagination: { nextCursor: null } }),
    getSubmission: vi.fn().mockResolvedValue({
      data: {
        kind: 'direct',
        reference: '30',
        submissionId: '30',
        batchReference: null,
        fixtureId: '7',
        competitionId: '5',
        submitter: { accountId: '1', displayName: 'Submitter' },
        status: 'accepted',
        receivedAt: '2026-09-09T09:00:00.000Z',
        updatedAt: '2026-09-09T09:00:00.000Z',
        eventCount: 1,
        source: {
          fileName: null,
          mediaType: null,
          sizeBytes: null,
          checksum: 'a'.repeat(64),
          packageVersion: '1.0',
        },
        lifecycle: [
          {
            fromState: null,
            toState: 'accepted',
            at: '2026-09-09T09:00:00.000Z',
            actorKind: 'api',
            actorIdentifier: '1',
            reason: 'Submission validated and accepted.',
          },
        ],
        decisions: [
          {
            decision: 'accepted',
            actor: null,
            decidedAt: '2026-09-09T09:00:00.000Z',
            reason: null,
          },
        ],
      },
    }),
    getEvent: vi.fn().mockResolvedValue({
      data: {
        eventId: '101',
        sourceEventId: null,
        fixtureId: '7',
        competitionId: '5',
        currentDeliveryId: '101',
        revisions: [],
      },
    }),
    getStatistic: vi.fn().mockResolvedValue({
      data: {
        statisticId: 'stat_example',
        fixtureId: '7',
        participantId: null,
        statisticCode: 'team_total',
        scope: 'innings',
        sourceEventCount: 0,
        contributors: [],
        pagination: { nextCursor: null },
      },
    }),
    getParticipantStatistic: vi.fn().mockResolvedValue({
      data: {
        statisticId: 'stat_career',
        fixtureId: null,
        participantId: '101',
        statisticCode: 'participant_career',
        scope: 'career',
        sourceEventCount: 0,
        contributors: [],
        pagination: { nextCursor: null },
      },
    }),
  };
}

function app(account: ReturnType<typeof createTestAccount>, provenanceService: ProvenanceService) {
  return createApp({
    environment,
    verifyAccessToken: verify,
    synchronizeAccount: synchronize(account),
    provenanceService,
  });
}

describe('protected provenance API', () => {
  test('lists and inspects provenance for submitters', async () => {
    const provenance = service();
    const account = createTestAccount({ role: 'submitter' });

    await request(app(account, provenance))
      .get('/api/v1/provenance/submissions?limit=25')
      .set('Authorization', 'Bearer token')
      .expect(200);
    await request(app(account, provenance))
      .get('/api/v1/provenance/submissions/30')
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(provenance.listSubmissions).toHaveBeenCalledWith(account, { limit: 25 });
    expect(provenance.getSubmission).toHaveBeenCalledWith(account, '30');
  });

  test('blocks viewers before private provenance reaches the service', async () => {
    const provenance = service();
    const account = createTestAccount({ role: 'viewer' });

    await request(app(account, provenance))
      .get('/api/v1/provenance/events/101')
      .set('Authorization', 'Bearer token')
      .expect(403);

    expect(provenance.getEvent).not.toHaveBeenCalled();
  });

  test('routes event and statistic traces through authenticated services', async () => {
    const provenance = service();
    const account = createTestAccount({ role: 'admin', competitionIds: ['5'] });

    await request(app(account, provenance))
      .get('/api/v1/provenance/events/101')
      .set('Authorization', 'Bearer token')
      .expect(200);
    await request(app(account, provenance))
      .get('/api/v1/provenance/fixtures/7/statistics/stat_example')
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(provenance.getEvent).toHaveBeenCalledWith(account, '101');
    expect(provenance.getStatistic).toHaveBeenCalledWith(account, '7', 'stat_example');
  });

  test('routes paginated participant aggregate provenance through the private API', async () => {
    const provenance = service();
    const account = createTestAccount({ role: 'admin', competitionIds: ['5'] });
    await request(app(account, provenance))
      .get('/api/v1/provenance/participants/101/statistics/stat_career?limit=25')
      .set('Authorization', 'Bearer token')
      .expect(200);
    expect(provenance.getParticipantStatistic).toHaveBeenCalledWith(account, '101', 'stat_career', {
      limit: 25,
    });
  });
});
