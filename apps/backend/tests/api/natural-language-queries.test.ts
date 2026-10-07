import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  naturalLanguageQueryResponseSchema,
  type AnalyticsQueryDefinition,
  type Leaderboard,
  type ParticipantAggregates,
} from '@sport-analytics/contracts';

import {
  LlmInvalidOutputError,
  LlmNotConfiguredError,
  LlmTimeoutError,
  LlmUpstreamError,
  createLlmClient,
  type LlmClient,
} from '../../src/modules/analytics-query/llm.client';
import {
  createNaturalLanguageQueryLimiter,
  type NaturalLanguageQueryDecision,
  type NaturalLanguageQueryLimiter,
  type NaturalLanguageQueryUsageRepository,
} from '../../src/modules/analytics-query/natural-language-query.limiter';
import type { LeaderboardsService } from '../../src/modules/statistics/leaderboards.service';
import type { ParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import type { QueryDefinitionNameResolver } from '../../src/modules/analytics-query/query-definition.evaluator';
import { createTestApp, type TestAppOptions } from '../test-app';

const ASK = '/api/v1/natural-language-queries';

const LEADERBOARD: Leaderboard = {
  scope: 'competition',
  competitionId: '10',
  competitionName: 'Indian Premier League',
  metric: 'most_runs',
  limit: 10,
  qualification: null,
  tieBreakers: ['metricValue', 'participantName', 'participantId'],
  entries: [{ rank: 1, participantId: '56', participantName: 'BB McCullum', value: 420 }],
};

function aggregatesFor(participantId: string): ParticipantAggregates {
  return {
    participantId,
    participantName: 'BB McCullum',
    status: 'complete',
    scope: { superOversIncluded: false },
    warnings: [],
    statistics: [
      {
        statisticId: `stat_career_${participantId}`,
        participantId,
        participantName: 'BB McCullum',
        appearances: 14,
        fixtureCount: 14,
        sourceEventCount: 300,
        batting: null,
        bowling: null,
        fielding: { catches: 1, stumpings: 0, runOutInvolvements: 0 },
        scope: 'career',
        statisticCode: 'participant_career',
      },
    ],
  };
}

const PARTICIPANTS: Record<string, { participantId: string; displayName: string }> = {
  'BB McCullum': { participantId: '56', displayName: 'BB McCullum' },
  "D'Arcy Short": { participantId: '57', displayName: "D'Arcy Short" },
};

const names: QueryDefinitionNameResolver = {
  findParticipantsByName: async (name) => {
    const found = PARTICIPANTS[name];
    return { records: found ? [found] : [], totalRecords: found ? 1 : 0 };
  },
  findCompetitionsByName: async (name) => ({
    records:
      name === 'Indian Premier League'
        ? [{ competitionId: '10', name: 'Indian Premier League' }]
        : [],
    hasMore: false,
  }),
  findSeasonExact: async () => null,
  findSeasonsByLabel: async () => ({ records: [] }),
};

/** A client that answers with the given definition and never reaches a provider. */
function translatingTo(definition: AnalyticsQueryDefinition): LlmClient {
  return {
    translateQuestion: vi.fn(async () => ({
      definition,
      model: 'claude-haiku-4-5-20251001',
      usage: { inputTokens: 120, outputTokens: 40 },
      suggestions: [],
      assumptions: [],
    })),
  };
}

function failingWith(error: Error): LlmClient {
  return {
    translateQuestion: vi.fn(async () => {
      throw error;
    }),
  };
}

const ALWAYS_ADMIT: NaturalLanguageQueryLimiter = {
  admit: async () => ({ outcome: 'admitted', headers: {} }),
};

function deciding(decision: NaturalLanguageQueryDecision): NaturalLanguageQueryLimiter {
  return { admit: async () => decision };
}

function appWith(options: TestAppOptions = {}) {
  const leaderboards: LeaderboardsService = { getLeaderboard: vi.fn(async () => LEADERBOARD) };
  const participantAggregates: ParticipantAggregatesService = {
    getParticipantAggregates: vi.fn(async (participantId: string) => aggregatesFor(participantId)),
    getParticipantAggregate: vi.fn(async () => null),
  };

  return createTestApp(
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
    undefined,
    participantAggregates,
    undefined,
    undefined,
    undefined,
    undefined,
    leaderboards,
    { names },
    undefined,
    { naturalLanguageQueryLimiter: ALWAYS_ADMIT, ...options },
  );
}

/** A limiter counting in memory, so the real admission order is exercised. */
function countingLimiter(limits: {
  rateLimitPerMinute: number;
  dailyQuotaPerClient: number;
  globalDailyLimit: number;
}): NaturalLanguageQueryLimiter {
  const counts = new Map<string, number>();
  const repository: NaturalLanguageQueryUsageRepository = {
    readClientSalt: async () => Buffer.alloc(32, 3),
    consume: async (bucket, bucketKey, windowStart, limit) => {
      const key = `${bucket}:${bucketKey}:${windowStart.toISOString()}`;
      const used = (counts.get(key) ?? 0) + 1;
      if (used > limit) return { allowed: false, used: limit };
      counts.set(key, used);
      return { allowed: true, used };
    },
  };
  return createNaturalLanguageQueryLimiter(repository, limits);
}

describe('natural-language query endpoint', () => {
  // The feature is offered to anonymous visitors, so no credential is required.
  it('answers an unauthenticated request', async () => {
    const response = await request(
      appWith({ llmClient: translatingTo({ kind: 'unsupported', reason: 'venue' }) }),
    )
      .post(ASK)
      .send({ question: 'which venue sees most sixes?' })
      .expect(200);

    expect(response.body.data.evaluation.outcome).toBe('unsupported');
  });

  it.each([
    [
      'a leaderboard question',
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
      } as AnalyticsQueryDefinition,
      'answered',
    ],
    [
      'a participant question',
      {
        kind: 'participant_statistics',
        participant: { name: 'BB McCullum' },
        scope: 'career',
      } as AnalyticsQueryDefinition,
      'answered',
    ],
    [
      'a comparison question',
      {
        kind: 'participant_comparison',
        participants: [{ name: 'BB McCullum' }, { name: "D'Arcy Short" }],
        scope: 'career',
      } as AnalyticsQueryDefinition,
      'answered',
    ],
    [
      'a question the published statistics cannot answer',
      { kind: 'unsupported', reason: 'bowler_type' } as AnalyticsQueryDefinition,
      'unsupported',
    ],
  ])('answers %s', async (_label, definition, outcome) => {
    const response = await request(appWith({ llmClient: translatingTo(definition) }))
      .post(ASK)
      .send({ question: 'a question' })
      .expect(200);

    const parsed = naturalLanguageQueryResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    expect(response.body.data.evaluation.outcome).toBe(outcome);
    expect(response.body.data.evaluation.definition).toEqual(definition);
  });

  it('echoes the question and reports the model that answered it', async () => {
    const response = await request(
      appWith({ llmClient: translatingTo({ kind: 'unsupported', reason: 'venue' }) }),
    )
      .post(ASK)
      .send({ question: '  Which venue sees most sixes?  ' })
      .expect(200);

    expect(response.body.data.question).toBe('Which venue sees most sixes?');
    expect(response.body.data.model).toBe('claude-haiku-4-5-20251001');
  });

  // Token counts are logged rather than returned; the response must not carry them.
  it('does not return token usage', async () => {
    const response = await request(
      appWith({ llmClient: translatingTo({ kind: 'unsupported', reason: 'venue' }) }),
    )
      .post(ASK)
      .send({ question: 'a question' })
      .expect(200);

    expect(JSON.stringify(response.body)).not.toContain('Tokens');
    expect(response.body.data).not.toHaveProperty('usage');
  });

  describe('invalid questions', () => {
    it.each([
      ['an empty question', { question: '' }],
      ['a whitespace-only question', { question: '   \t ' }],
      ['a 301-character question', { question: 'a'.repeat(301) }],
      ['a missing question', {}],
      ['an unrecognised property', { question: 'most runs', definition: { kind: 'leaderboard' } }],
      ['a question that is not a string', { question: 42 }],
    ])('reports %s as 422 VALIDATION_FAILED', async (_label, body) => {
      const llmClient = translatingTo({ kind: 'unsupported', reason: 'venue' });

      const response = await request(appWith({ llmClient })).post(ASK).send(body).expect(422);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details[0].code).toBe('INVALID_FIELD');
      // The body never reaches the provider, so an invalid request costs nothing.
      expect(llmClient.translateQuestion).not.toHaveBeenCalled();
    });

    it('reports a body that is not JSON as 400 INVALID_JSON', async () => {
      const response = await request(appWith())
        .post(ASK)
        .set('Content-Type', 'application/json')
        .send('{"question": ')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('does not spend the limit on a question it refuses', async () => {
      const admit = vi.fn(async (): Promise<NaturalLanguageQueryDecision> => ({
        outcome: 'admitted',
        headers: {},
      }));

      await request(appWith({ naturalLanguageQueryLimiter: { admit } }))
        .post(ASK)
        .send({ question: '' })
        .expect(422);

      expect(admit).not.toHaveBeenCalled();
    });
  });

  describe('when the provider cannot answer', () => {
    it.each([
      ['it is not configured', new LlmNotConfiguredError()],
      ['it is unreachable', new LlmUpstreamError('bad gateway', 502)],
      ['it timed out', new LlmTimeoutError()],
    ])('reports 503 QUERY_SERVICE_UNAVAILABLE when %s', async (_label, error) => {
      const response = await request(appWith({ llmClient: failingWith(error) }))
        .post(ASK)
        .send({ question: 'most runs in the IPL' })
        .expect(503);

      expect(response.body.error.code).toBe('QUERY_SERVICE_UNAVAILABLE');
    });

    it('reports 422 QUERY_NOT_UNDERSTOOD when the output fails the contract', async () => {
      const response = await request(
        appWith({ llmClient: failingWith(new LlmInvalidOutputError('not a definition')) }),
      )
        .post(ASK)
        .send({ question: 'what is the weather like?' })
        .expect(422);

      expect(response.body.error.code).toBe('QUERY_NOT_UNDERSTOOD');
      expect(response.body).not.toHaveProperty('data');
    });

    // The guarantee is structural, so it is tested through the real adapter with a
    // stubbed provider rather than through a stub that merely agrees to throw.
    it('never produces data from model output outside the contract', async () => {
      const outsideTheContract = [
        { kind: 'leaderboard', metric: 'most_sledges', scope: 'competition' },
        { kind: 'participant_statistics', participant: { name: 'x' }, scope: 'galaxy' },
        { kind: 'sql', query: 'SELECT * FROM delivery' },
        { kind: 'leaderboard', metric: 'most_runs', scope: 'season', limit: 5000 },
        'DROP TABLE delivery',
      ];

      for (const output of outsideTheContract) {
        const llmClient = createLlmClient({
          apiKey: 'test-key-never-used',
          model: 'claude-haiku-4-5-20251001',
          timeoutMs: 1_000,
          defaultCompetition: 'Indian Premier League',
          fetchImplementation: async () =>
            new Response(
              JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                stop_reason: 'end_turn',
                content: [{ type: 'text', text: JSON.stringify(output) }],
                usage: { input_tokens: 10, output_tokens: 5 },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        });

        const response = await request(appWith({ llmClient }))
          .post(ASK)
          .send({ question: 'anything at all' })
          .expect(422);

        expect(response.body.error.code).toBe('QUERY_NOT_UNDERSTOOD');
        expect(response.body).not.toHaveProperty('data');
      }
    });
  });

  describe('limits', () => {
    it('refuses the eleventh request in a minute with 429 and the rate-limit headers', async () => {
      const app = appWith({
        llmClient: translatingTo({ kind: 'unsupported', reason: 'venue' }),
        naturalLanguageQueryLimiter: countingLimiter({
          rateLimitPerMinute: 10,
          dailyQuotaPerClient: 100,
          globalDailyLimit: 300,
        }),
      });

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await request(app).post(ASK).send({ question: 'a question' }).expect(200);
      }
      const refused = await request(app).post(ASK).send({ question: 'a question' }).expect(429);

      expect(refused.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(refused.headers['ratelimit-limit']).toBe('10');
      expect(refused.headers['ratelimit-remaining']).toBe('0');
      expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('refuses a client past its daily quota with 429 and the quota headers', async () => {
      const app = appWith({
        llmClient: translatingTo({ kind: 'unsupported', reason: 'venue' }),
        naturalLanguageQueryLimiter: countingLimiter({
          rateLimitPerMinute: 100,
          dailyQuotaPerClient: 2,
          globalDailyLimit: 300,
        }),
      });

      await request(app).post(ASK).send({ question: 'a question' }).expect(200);
      await request(app).post(ASK).send({ question: 'a question' }).expect(200);
      const refused = await request(app).post(ASK).send({ question: 'a question' }).expect(429);

      expect(refused.body.error.code).toBe('QUOTA_EXCEEDED');
      expect(refused.headers['x-quota-limit']).toBe('2');
      expect(refused.headers['x-quota-remaining']).toBe('0');
      expect(Number(refused.headers['x-quota-reset'])).toBeGreaterThan(0);
    });

    it('refuses every client once the global daily cap is reached', async () => {
      const app = appWith({
        llmClient: translatingTo({ kind: 'unsupported', reason: 'venue' }),
        naturalLanguageQueryLimiter: countingLimiter({
          rateLimitPerMinute: 100,
          dailyQuotaPerClient: 100,
          globalDailyLimit: 2,
        }),
      });

      await request(app).post(ASK).send({ question: 'a question' }).expect(200);
      await request(app).post(ASK).send({ question: 'a question' }).expect(200);
      const refused = await request(app).post(ASK).send({ question: 'a question' }).expect(429);

      expect(refused.body.error.code).toBe('GLOBAL_DAILY_LIMIT_REACHED');
      expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
      // The global cap is not this caller's own allowance, so its numbers are not
      // reported as though they were.
      expect(refused.headers['ratelimit-limit']).toBeUndefined();
      expect(refused.headers['x-quota-limit']).toBeUndefined();
    });

    it('reports the remaining allowance on a successful answer', async () => {
      const response = await request(
        appWith({
          llmClient: translatingTo({ kind: 'unsupported', reason: 'venue' }),
          naturalLanguageQueryLimiter: countingLimiter({
            rateLimitPerMinute: 10,
            dailyQuotaPerClient: 100,
            globalDailyLimit: 300,
          }),
        }),
      )
        .post(ASK)
        .send({ question: 'a question' })
        .expect(200);

      expect(response.headers['ratelimit-remaining']).toBe('9');
      expect(response.headers['x-quota-remaining']).toBe('99');
    });

    it('reports 503 when the limiter itself is unavailable', async () => {
      const llmClient = translatingTo({ kind: 'unsupported', reason: 'venue' });
      const response = await request(
        appWith({
          llmClient,
          naturalLanguageQueryLimiter: deciding({ outcome: 'unavailable', headers: {} }),
        }),
      )
        .post(ASK)
        .send({ question: 'a question' })
        .expect(503);

      expect(response.body.error.code).toBe('RATE_LIMIT_UNAVAILABLE');
      // Failing closed means the paid call is not made.
      expect(llmClient.translateQuestion).not.toHaveBeenCalled();
    });

    it('counts the attempt before calling the provider', async () => {
      const calls: string[] = [];
      const llmClient: LlmClient = {
        translateQuestion: async () => {
          calls.push('provider');
          throw new LlmUpstreamError('bad gateway', 502);
        },
      };

      await request(
        appWith({
          llmClient,
          naturalLanguageQueryLimiter: {
            admit: async () => {
              calls.push('limiter');
              return { outcome: 'admitted', headers: {} };
            },
          },
        }),
      )
        .post(ASK)
        .send({ question: 'a question' })
        .expect(503);

      expect(calls).toEqual(['limiter', 'provider']);
    });
  });
});

describe('suggestions (issue #851)', () => {
  const SUGGESTION = {
    kind: 'leaderboard' as const,
    metric: 'most_runs' as const,
    scope: 'competition' as const,
    competition: { name: 'Indian Premier League' },
    limit: 10,
  };

  function suggesting(suggestions: AnalyticsQueryDefinition[]): LlmClient {
    return {
      translateQuestion: vi.fn(async () => ({
        definition: { kind: 'unsupported' as const, reason: 'ambiguous' as const },
        model: 'claude-haiku-4-5-20251001',
        usage: { inputTokens: 120, outputTokens: 40 },
        suggestions,
        assumptions: [],
      })),
    };
  }

  it('returns the suggestions the adapter validated', async () => {
    const response = await request(appWith({ llmClient: suggesting([SUGGESTION]) }))
      .post(ASK)
      .send({ question: 'who is the best batter in the IPL?' })
      .expect(200);

    expect(naturalLanguageQueryResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.data.suggestions).toHaveLength(1);
    expect(response.body.data.suggestions[0]).toMatchObject({ metric: 'most_runs' });
    expect(response.body.data.evaluation.outcome).toBe('unsupported');
  });

  // An empty array would say "we looked and found none", which is not the same as
  // an endpoint that was not asked to suggest anything.
  it('omits the field entirely when there are none', async () => {
    const response = await request(appWith({ llmClient: suggesting([]) }))
      .post(ASK)
      .send({ question: 'which ground sees most sixes?' })
      .expect(200);

    expect(naturalLanguageQueryResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.data).not.toHaveProperty('suggestions');
  });

  it('answers a suggestion through the evaluation endpoint without a model call', async () => {
    const llmClient = suggesting([SUGGESTION]);
    const app = appWith({ llmClient });

    const evaluated = await request(app)
      .post('/api/v1/query-definitions/evaluate')
      .send(SUGGESTION)
      .expect(200);

    expect(evaluated.body.data.outcome).toBe('answered');
    expect(llmClient.translateQuestion).not.toHaveBeenCalled();
  });
});
