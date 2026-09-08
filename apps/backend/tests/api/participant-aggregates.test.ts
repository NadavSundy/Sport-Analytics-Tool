import type { ParticipantAggregates } from '@sport-analytics/contracts';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { VerifyAccessToken } from '../../src/auth/supabase-auth';
import type { ParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import { createTestApp } from '../test-app';

const careerAggregates: ParticipantAggregates = {
  participantId: '101',
  participantName: 'BB McCullum',
  status: 'complete',
  scope: { superOversIncluded: false },
  warnings: [],
  statistics: [
    {
      statisticId: 'stat_career',
      participantId: '101',
      participantName: 'BB McCullum',
      scope: 'career',
      statisticCode: 'participant_career',
      fixtureCount: 1,
      sourceEventCount: 60,
      batting: {
        runsScored: 116,
        ballsFaced: 56,
        fours: 12,
        sixes: 8,
        strikeRate: 207.14,
      },
      bowling: null,
    },
  ],
};

function createService(
  overrides: Partial<ParticipantAggregatesService> = {},
): ParticipantAggregatesService {
  return {
    async getParticipantAggregates() {
      return null;
    },
    async getParticipantAggregate() {
      return null;
    },
    ...overrides,
  };
}

function appWith(service: ParticipantAggregatesService, verifyAccessToken?: VerifyAccessToken) {
  return createTestApp(
    verifyAccessToken,
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
    service,
  );
}

describe('public participant aggregate statistics API', () => {
  test('returns every level without authentication', async () => {
    const verifyAccessToken = vi.fn<VerifyAccessToken>();
    const getParticipantAggregates = vi
      .fn<ParticipantAggregatesService['getParticipantAggregates']>()
      .mockResolvedValue(careerAggregates);

    const response = await request(
      appWith(createService({ getParticipantAggregates }), verifyAccessToken),
    )
      .get('/api/v1/participants/101/statistics')
      .expect(200);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(getParticipantAggregates).toHaveBeenCalledWith('101', {});
    expect(response.body.data.participantId).toBe('101');
    expect(response.body.data.scope).toEqual({ superOversIncluded: false });
  });

  test('passes a requested scope through to the service', async () => {
    const getParticipantAggregates = vi
      .fn<ParticipantAggregatesService['getParticipantAggregates']>()
      .mockResolvedValue(careerAggregates);

    await request(appWith(createService({ getParticipantAggregates })))
      .get('/api/v1/participants/101/statistics?scope=career')
      .expect(200);

    expect(getParticipantAggregates).toHaveBeenCalledWith('101', { scope: 'career' });
  });

  test('rejects an unknown scope', async () => {
    const getParticipantAggregates =
      vi.fn<ParticipantAggregatesService['getParticipantAggregates']>();

    const response = await request(appWith(createService({ getParticipantAggregates })))
      .get('/api/v1/participants/101/statistics?scope=super-over')
      .expect(400);

    expect(getParticipantAggregates).not.toHaveBeenCalled();
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  test('resolves one aggregate statistic resource', async () => {
    const getParticipantAggregate = vi
      .fn<ParticipantAggregatesService['getParticipantAggregate']>()
      .mockResolvedValue(careerAggregates.statistics[0]);

    const response = await request(appWith(createService({ getParticipantAggregate })))
      .get('/api/v1/participants/101/statistics/stat_career')
      .expect(200);

    expect(getParticipantAggregate).toHaveBeenCalledWith('101', 'stat_career');
    expect(response.body.data.statisticCode).toBe('participant_career');
  });

  test('reports an unknown participant as not found', async () => {
    const response = await request(appWith(createService())).get(
      '/api/v1/participants/999/statistics',
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
