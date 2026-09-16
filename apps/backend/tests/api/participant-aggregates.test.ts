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
      appearances: 1,
      fixtureCount: 1,
      sourceEventCount: 60,
      batting: {
        innings: 1,
        runsScored: 116,
        ballsFaced: 56,
        dismissals: 0,
        notOuts: 1,
        battingAverage: null,
        fours: 12,
        sixes: 8,
        fifties: 0,
        hundreds: 1,
        highestScore: 116,
        highestScoreNotOut: true,
        strikeRate: 207.14,
      },
      bowling: {
        innings: 1,
        runsConceded: 24,
        wides: 2,
        noBalls: 1,
        legalBallsBowled: 18,
        wicketsTaken: 2,
        bowlingAverage: 12,
        bowlingStrikeRate: 9,
        bestBowling: { wicketsTaken: 2, runsConceded: 24 },
        fourWicketHauls: 0,
        fiveWicketHauls: 0,
        ballsPerOver: 6,
        oversBowled: '3.0',
        economyRate: 8,
      },
      fielding: { catches: 2, stumpings: 1, runOutInvolvements: 1 },
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
    expect(response.body.data.statistics[0].bowling).toMatchObject({
      innings: 1,
      wides: 2,
      noBalls: 1,
      bowlingAverage: 12,
    });
    expect(response.body.data.statistics[0]).toMatchObject({
      appearances: 1,
      fielding: { catches: 2, stumpings: 1, runOutInvolvements: 1 },
    });
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
