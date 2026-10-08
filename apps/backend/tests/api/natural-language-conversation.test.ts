import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  naturalLanguageQueryResponseSchema,
  type AnalyticsQueryDefinition,
  type Leaderboard,
  type NaturalLanguageConversationTurn,
  type ParticipantAggregates,
  type QueryAssumption,
} from '@sport-analytics/contracts';

import type { LlmClient } from '../../src/modules/analytics-query/llm.client';
import type { NaturalLanguageQueryLimiter } from '../../src/modules/analytics-query/natural-language-query.limiter';
import type { QueryDefinitionNameResolver } from '../../src/modules/analytics-query/query-definition.evaluator';
import type { LeaderboardsService } from '../../src/modules/statistics/leaderboards.service';
import type { ParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import { createTestApp, type TestAppOptions } from '../test-app';

/**
 * Issue #868 at the endpoint: a conversation is accepted and passed to the
 * adapter, an invalid one is refused before anything is spent, and an assumption
 * reaches the caller.
 *
 * The admission order is what most of this holds. A bad history has to fail on
 * the body, which happens before the limiter and before the paid provider, so a
 * caller cannot spend the day's budget — or reach the provider at all — with a
 * history the contract rejects.
 */

const ASK = '/api/v1/natural-language-queries';

const KOHLI = { participantId: '42', displayName: 'V Kohli' };

const CAREER_DEFINITION = {
  kind: 'participant_statistics',
  participant: { name: 'V Kohli' },
  scope: 'career',
} as const;

const LEADERBOARD: Leaderboard = {
  scope: 'competition',
  competitionId: '10',
  competitionName: 'Indian Premier League',
  metric: 'most_sixes',
  limit: 10,
  qualification: null,
  tieBreakers: ['metricValue', 'participantName', 'participantId'],
  entries: [{ rank: 1, participantId: '42', participantName: 'V Kohli', value: 38 }],
};

function aggregatesFor(participantId: string): ParticipantAggregates {
  return {
    participantId,
    participantName: KOHLI.displayName,
    status: 'complete',
    scope: { superOversIncluded: false },
    warnings: [],
    statistics: [
      {
        statisticId: `stat_career_${participantId}`,
        participantId,
        participantName: KOHLI.displayName,
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

const names: QueryDefinitionNameResolver = {
  // Mirrors the real read, which is `display_name ILIKE '%name%'`: the searched
  // name is the pattern and the display name is what it is matched against. The
  // surname fallback depends on that direction, so getting it the wrong way round
  // here would make a passing test prove nothing.
  findParticipantsByName: async (name) => {
    const records = KOHLI.displayName.toLowerCase().includes(name.trim().toLowerCase())
      ? [KOHLI]
      : [];
    return { records, totalRecords: records.length };
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

const ALWAYS_ADMIT: NaturalLanguageQueryLimiter = {
  admit: async () => ({ outcome: 'admitted', headers: {} }),
};

/**
 * A client recording what the controller handed it, so a test can assert that the
 * validated history reached the adapter rather than only that the request passed.
 */
function recordingClient(
  definition: AnalyticsQueryDefinition,
  assumptions: QueryAssumption[] = [],
) {
  const calls: {
    question: string;
    conversation: readonly NaturalLanguageConversationTurn[] | undefined;
  }[] = [];

  const client: LlmClient = {
    translateQuestion: vi.fn(async (question, conversation) => {
      calls.push({ question, conversation });
      return {
        definition,
        model: 'claude-haiku-4-5-20251001',
        usage: { inputTokens: 2_600, outputTokens: 160 },
        suggestions: [],
        assumptions,
      };
    }),
  };

  return { client, calls };
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

const PRIOR_TURN: NaturalLanguageConversationTurn = {
  question: "What are V Kohli's career statistics?",
  definition: CAREER_DEFINITION,
};

describe('a question carrying a conversation', () => {
  it('answers it and passes the turns to the adapter, oldest first', async () => {
    const { client, calls } = recordingClient(CAREER_DEFINITION);
    const conversation = [
      PRIOR_TURN,
      { question: 'And in the Indian Premier League?', definition: CAREER_DEFINITION },
    ];

    const response = await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({ question: 'What about his strike rate?', conversation })
      .expect(200);

    expect(naturalLanguageQueryResponseSchema.safeParse(response.body).success).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.question).toBe('What about his strike rate?');
    expect(calls[0]?.conversation).toEqual(conversation);
  });

  it('accepts the maximum of five turns', async () => {
    const { client } = recordingClient(CAREER_DEFINITION);

    await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({
        question: 'and his strike rate?',
        conversation: Array.from({ length: 5 }, () => PRIOR_TURN),
      })
      .expect(200);
  });

  it('still answers a question sent without one', async () => {
    const { client, calls } = recordingClient(CAREER_DEFINITION);

    await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({ question: "What are V Kohli's career statistics?" })
      .expect(200);

    expect(calls[0]?.conversation).toBeUndefined();
  });

  // The question echoed back is the reader's current one. The history is theirs
  // already, so returning it would only make the response bigger.
  it('echoes only the current question', async () => {
    const { client } = recordingClient(CAREER_DEFINITION);

    const response = await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({ question: 'What about his strike rate?', conversation: [PRIOR_TURN] })
      .expect(200);

    expect(response.body.data.question).toBe('What about his strike rate?');
    expect(response.body.data).not.toHaveProperty('conversation');
  });
});

describe('an invalid conversation', () => {
  const INVALID_HISTORIES: [string, unknown][] = [
    ['a sixth turn', Array.from({ length: 6 }, () => PRIOR_TURN)],
    [
      'a definition the contract rejects',
      [{ question: 'most runs?', definition: { kind: 'leaderboard', metric: 'most_runs' } }],
    ],
    [
      'a definition naming no scope reference',
      [
        {
          question: 'most runs?',
          definition: { kind: 'leaderboard', metric: 'most_runs', scope: 'season' },
        },
      ],
    ],
    ['a turn with no definition', [{ question: 'most runs?' }]],
    ['a turn with no question', [{ definition: CAREER_DEFINITION }]],
    [
      'an over-long earlier question',
      [{ question: 'a'.repeat(301), definition: CAREER_DEFINITION }],
    ],
    ['an empty earlier question', [{ question: '   ', definition: CAREER_DEFINITION }]],
    ['an unrecognised property on a turn', [{ ...PRIOR_TURN, answer: 'anything' }]],
    ['a turn that is not an object', ['just a question']],
    ['a conversation that is not an array', { turns: [] }],
  ];

  it.each(INVALID_HISTORIES)(
    'reports %s as 422 VALIDATION_FAILED',
    async (_label, conversation) => {
      const { client, calls } = recordingClient(CAREER_DEFINITION);

      const response = await request(appWith({ llmClient: client }))
        .post(ASK)
        .send({ question: 'and his strike rate?', conversation })
        .expect(422);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      // The body is validated before the provider is called, so nothing was spent.
      expect(calls).toHaveLength(0);
    },
  );

  it('names the turn and the field that failed', async () => {
    const response = await request(appWith())
      .post(ASK)
      .send({
        question: 'and his strike rate?',
        conversation: [
          PRIOR_TURN,
          { question: 'most runs?', definition: { ...CAREER_DEFINITION, scope: 'season' } },
        ],
      })
      .expect(422);

    const fields = (response.body.error.details as { field?: string }[]).map(
      (detail) => detail.field,
    );
    expect(fields.some((field) => field?.startsWith('conversation.1'))).toBe(true);
  });

  // The limiter counts attempts rather than successes, so this asserts the order
  // rather than the count: a history the contract rejects must not even be
  // admitted, because admission is what spends the budget.
  it('fails before the limiter is consulted', async () => {
    const admit = vi.fn(async () => ({ outcome: 'admitted' as const, headers: {} }));

    await request(appWith({ naturalLanguageQueryLimiter: { admit } }))
      .post(ASK)
      .send({ question: 'and his strike rate?', conversation: [{ question: 'q' }] })
      .expect(422);

    expect(admit).not.toHaveBeenCalled();
  });

  it('still refuses an unrecognised top-level property', async () => {
    await request(appWith())
      .post(ASK)
      .send({ question: 'most runs?', conversation: [], priorContext: 'anything' })
      .expect(422);
  });
});

describe('an assumed competition', () => {
  it('is returned beside the answer', async () => {
    const { client } = recordingClient(
      {
        kind: 'leaderboard',
        metric: 'most_sixes',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
        limit: 10,
      },
      ['competition'],
    );

    const response = await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({ question: 'Who has the most sixes?' })
      .expect(200);

    expect(naturalLanguageQueryResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.data.assumptions).toEqual(['competition']);
    expect(response.body.data.evaluation.outcome).toBe('answered');
  });

  // An absent field says the reader named everything themselves, so a client only
  // has to show "(assumed)" when it is present.
  it('is omitted entirely when nothing was assumed', async () => {
    const { client } = recordingClient(CAREER_DEFINITION);

    const response = await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({ question: "What are V Kohli's career statistics?" })
      .expect(200);

    expect(response.body.data).not.toHaveProperty('assumptions');
  });

  // The assumption is reported beside the definition, never inside it, so the
  // digest of the same question does not change according to what was assumed.
  it('does not appear in the definition the question was read as', async () => {
    const { client } = recordingClient(
      {
        kind: 'leaderboard',
        metric: 'most_sixes',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
        limit: 10,
      },
      ['competition'],
    );

    const response = await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({ question: 'Who has the most sixes?' })
      .expect(200);

    expect(response.body.data.evaluation.definition).not.toHaveProperty('assumptions');
    expect(response.body.data.evaluation.definition.competition).toEqual({
      name: 'Indian Premier League',
    });
  });
});

describe('a name resolved through the surname fallback', () => {
  it('answers a full name the scorecard spells with an initial', async () => {
    const { client } = recordingClient({
      kind: 'participant_statistics',
      participant: { name: 'Virat Kohli' },
      scope: 'career',
    });

    const response = await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({ question: "What are Virat Kohli's career statistics?" })
      .expect(200);

    expect(response.body.data.evaluation.outcome).toBe('answered');
    expect(response.body.data.evaluation.resolved.participantIds).toEqual(['42']);
  });

  it('offers one candidate to confirm when the initial disagrees', async () => {
    const { client } = recordingClient({
      kind: 'participant_statistics',
      participant: { name: 'Suresh Kohli' },
      scope: 'career',
    });

    const response = await request(appWith({ llmClient: client }))
      .post(ASK)
      .send({ question: "What are Suresh Kohli's career statistics?" })
      .expect(200);

    expect(naturalLanguageQueryResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.data.evaluation.outcome).toBe('entity_ambiguous');
    expect(response.body.data.evaluation.candidates).toEqual([
      { id: '42', displayName: 'V Kohli' },
    ]);
  });
});
