import { describe, expect, it, vi } from 'vitest';
import {
  analyticsQueryDefinitionSchema,
  queryDefinitionEvaluationSchema,
  type Leaderboard,
  type ParticipantAggregates,
} from '@sport-analytics/contracts';

import {
  createQueryDefinitionEvaluator,
  type QueryDefinitionNameResolver,
} from '../../src/modules/analytics-query/query-definition.evaluator';
import { createSeasonId } from '../../src/modules/public-read/season-id';

const COMPETITION = { competitionId: '10', name: 'Indian Premier League' };
const SEASON = { competitionId: '10', competitionName: 'Indian Premier League', label: '2026' };
const MCCULLUM = { participantId: '56', displayName: 'BB McCullum' };
const SHORT = { participantId: '57', displayName: "D'Arcy Short" };

function aggregates(participantId: string, statisticId: string): ParticipantAggregates {
  return {
    participantId,
    participantName: 'Player',
    status: 'complete',
    scope: { superOversIncluded: false },
    warnings: [],
    statistics: [
      {
        statisticId,
        participantId,
        participantName: 'Player',
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

function seasonAggregates(participantId: string): ParticipantAggregates {
  return {
    ...aggregates(participantId, 'stat_unused'),
    statistics: [
      {
        statisticId: 'stat_2026',
        participantId,
        participantName: 'Player',
        appearances: 14,
        fixtureCount: 14,
        sourceEventCount: 300,
        batting: null,
        bowling: null,
        fielding: { catches: 1, stumpings: 0, runOutInvolvements: 0 },
        scope: 'season',
        statisticCode: 'participant_season',
        competitionId: '10',
        competitionName: 'Indian Premier League',
        seasonId: createSeasonId({ competitionId: '10', label: '2026' }),
        season: '2026',
      },
      {
        statisticId: 'stat_2025',
        participantId,
        participantName: 'Player',
        appearances: 10,
        fixtureCount: 10,
        sourceEventCount: 200,
        batting: null,
        bowling: null,
        fielding: { catches: 0, stumpings: 0, runOutInvolvements: 0 },
        scope: 'season',
        statisticCode: 'participant_season',
        competitionId: '10',
        competitionName: 'Indian Premier League',
        seasonId: createSeasonId({ competitionId: '10', label: '2025' }),
        season: '2025',
      },
    ],
  };
}

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

function names(overrides: Partial<QueryDefinitionNameResolver> = {}): QueryDefinitionNameResolver {
  return {
    async findParticipantsByName() {
      return { records: [MCCULLUM], totalRecords: 1 };
    },
    async findCompetitionsByName() {
      return { records: [COMPETITION], hasMore: false };
    },
    async findSeasonExact() {
      return SEASON;
    },
    async findSeasonsByLabel() {
      return { records: [SEASON] };
    },
    ...overrides,
  };
}

function evaluator(
  overrides: {
    names?: Partial<QueryDefinitionNameResolver>;
    leaderboard?: Leaderboard | null;
    participantAggregates?: ParticipantAggregates | null;
    getLeaderboard?: ReturnType<typeof vi.fn>;
    getParticipantAggregates?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const leaderboard = 'leaderboard' in overrides ? overrides.leaderboard : LEADERBOARD;
  const aggregate =
    'participantAggregates' in overrides
      ? overrides.participantAggregates
      : aggregates('56', 'stat_career');

  return createQueryDefinitionEvaluator({
    leaderboards: {
      getLeaderboard: overrides.getLeaderboard ?? vi.fn(async () => leaderboard ?? null),
    },
    participantAggregates: {
      getParticipantAggregates:
        overrides.getParticipantAggregates ?? vi.fn(async () => aggregate ?? null),
    },
    names: names(overrides.names),
  });
}

function definition(value: unknown) {
  return analyticsQueryDefinitionSchema.parse(value);
}

describe('query definition evaluator: answered outcomes', () => {
  it('answers a competition leaderboard through the leaderboards service', async () => {
    const getLeaderboard = vi.fn(async () => LEADERBOARD);

    const evaluation = await evaluator({ getLeaderboard }).evaluate(
      definition({
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
      }),
    );

    expect(getLeaderboard).toHaveBeenCalledWith({
      scope: 'competition',
      competitionId: '10',
      metric: 'most_runs',
      limit: 10,
    });
    expect(evaluation.outcome).toBe('answered');
    if (evaluation.outcome !== 'answered') return;
    // The published resource, unmodified.
    expect(evaluation.result).toBe(LEADERBOARD);
    expect(evaluation.resolved.competitionId).toBe('10');
    expect(evaluation.sources).toEqual([
      {
        endpoint:
          '/api/v1/statistics/leaderboards?scope=competition&competitionId=10&metric=most_runs&limit=10',
        statisticIds: [],
      },
    ]);
  });

  it('answers a season leaderboard with the composed season identifier', async () => {
    const getLeaderboard = vi.fn(async () => LEADERBOARD);
    const seasonId = createSeasonId({ competitionId: '10', label: '2026' });

    const evaluation = await evaluator({ getLeaderboard }).evaluate(
      definition({
        kind: 'leaderboard',
        metric: 'most_sixes',
        scope: 'season',
        season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
        limit: 5,
      }),
    );

    expect(getLeaderboard).toHaveBeenCalledWith({
      scope: 'season',
      seasonId,
      metric: 'most_sixes',
      limit: 5,
    });
    if (evaluation.outcome !== 'answered') throw new Error(evaluation.outcome);
    expect(evaluation.resolved).toEqual({
      participantIds: [],
      competitionId: '10',
      seasonId,
      season: '2026',
    });
    expect(evaluation.sources[0]?.endpoint).toContain(`seasonId=${encodeURIComponent(seasonId)}`);
  });

  it('answers career participant statistics and names the answering row', async () => {
    const getParticipantAggregates = vi.fn(async () => aggregates('56', 'stat_career'));

    const evaluation = await evaluator({ getParticipantAggregates }).evaluate(
      definition({
        kind: 'participant_statistics',
        participant: { name: 'BB McCullum' },
        scope: 'career',
      }),
    );

    expect(getParticipantAggregates).toHaveBeenCalledWith('56', { scope: 'career' });
    if (evaluation.outcome !== 'answered') throw new Error(evaluation.outcome);
    expect(evaluation.result).toEqual(aggregates('56', 'stat_career'));
    expect(evaluation.sources).toEqual([
      {
        endpoint: '/api/v1/participants/56/statistics?scope=career',
        statisticIds: ['stat_career'],
      },
    ]);
  });

  // The published endpoint takes no season filter, so the whole scope level is
  // returned and the evaluation names the row that answers the question.
  it('selects the matching season row without narrowing the published result', async () => {
    const published = seasonAggregates('56');
    const getParticipantAggregates = vi.fn(async () => published);

    const evaluation = await evaluator({ getParticipantAggregates }).evaluate(
      definition({
        kind: 'participant_statistics',
        participant: { name: 'BB McCullum' },
        scope: 'season',
        season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
      }),
    );

    if (evaluation.outcome !== 'answered') throw new Error(evaluation.outcome);
    expect(evaluation.result).toBe(published);
    expect((evaluation.result as ParticipantAggregates).statistics).toHaveLength(2);
    expect(evaluation.sources[0]?.statisticIds).toEqual(['stat_2026']);
  });

  it('answers with no statistic identifier when the player has no row at that scope', async () => {
    const getParticipantAggregates = vi.fn(async () => ({
      ...seasonAggregates('56'),
      statistics: [],
    }));

    const evaluation = await evaluator({ getParticipantAggregates }).evaluate(
      definition({
        kind: 'participant_statistics',
        participant: { name: 'BB McCullum' },
        scope: 'season',
        season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
      }),
    );

    if (evaluation.outcome !== 'answered') throw new Error(evaluation.outcome);
    expect(evaluation.sources[0]?.statisticIds).toEqual([]);
  });

  it('answers a comparison by calling the aggregates service once per participant', async () => {
    const getParticipantAggregates = vi
      .fn()
      .mockResolvedValueOnce(aggregates('56', 'stat_a'))
      .mockResolvedValueOnce(aggregates('57', 'stat_b'));

    const evaluation = await evaluator({
      getParticipantAggregates,
      names: {
        async findParticipantsByName(name: string) {
          return {
            records: [name === 'BB McCullum' ? MCCULLUM : SHORT],
            totalRecords: 1,
          };
        },
      },
    }).evaluate(
      definition({
        kind: 'participant_comparison',
        participants: [{ name: 'BB McCullum' }, { name: "D'Arcy Short" }],
        scope: 'career',
      }),
    );

    expect(getParticipantAggregates).toHaveBeenCalledTimes(2);
    if (evaluation.outcome !== 'answered') throw new Error(evaluation.outcome);
    // In the order the definition named them.
    expect(evaluation.resolved.participantIds).toEqual(['56', '57']);
    expect(evaluation.result).toEqual([aggregates('56', 'stat_a'), aggregates('57', 'stat_b')]);
    expect(evaluation.sources).toEqual([
      { endpoint: '/api/v1/participants/56/statistics?scope=career', statisticIds: ['stat_a'] },
      { endpoint: '/api/v1/participants/57/statistics?scope=career', statisticIds: ['stat_b'] },
    ]);
  });

  it('reports an unsupported definition with the contract reason and calls no service', async () => {
    const getLeaderboard = vi.fn();
    const getParticipantAggregates = vi.fn();

    const evaluation = await evaluator({ getLeaderboard, getParticipantAggregates }).evaluate(
      definition({ kind: 'unsupported', reason: 'bowler_type' }),
    );

    expect(evaluation).toMatchObject({ outcome: 'unsupported', reason: 'bowler_type' });
    expect(getLeaderboard).not.toHaveBeenCalled();
    expect(getParticipantAggregates).not.toHaveBeenCalled();
  });

  it('returns an evaluation that satisfies the published contract, for every kind', async () => {
    const definitions = [
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'x' },
      },
      { kind: 'participant_statistics', participant: { name: 'x' }, scope: 'career' },
      {
        kind: 'participant_comparison',
        participants: [{ name: 'x' }, { name: 'y' }],
        scope: 'career',
      },
      { kind: 'unsupported', reason: 'other' },
    ];

    for (const value of definitions) {
      const evaluation = await evaluator().evaluate(definition(value));

      expect(queryDefinitionEvaluationSchema.safeParse(evaluation).success).toBe(true);
    }
  });

  it('carries a source endpoint and statistic identifiers on every answered outcome', async () => {
    const definitions = [
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'x' },
      },
      { kind: 'participant_statistics', participant: { name: 'x' }, scope: 'career' },
      {
        kind: 'participant_comparison',
        participants: [{ name: 'x' }, { name: 'y' }],
        scope: 'career',
      },
    ];

    for (const value of definitions) {
      const evaluation = await evaluator().evaluate(definition(value));

      if (evaluation.outcome !== 'answered') throw new Error(evaluation.outcome);
      expect(evaluation.sources.length).toBeGreaterThan(0);
      for (const source of evaluation.sources) {
        expect(source.endpoint).toMatch(/^\/api\/v1\//);
        expect(Array.isArray(source.statisticIds)).toBe(true);
      }
    }
  });
});

describe('query definition evaluator: name resolution', () => {
  it('prefers an exact case-insensitive match over a partial one', async () => {
    const getParticipantAggregates = vi.fn(async () => aggregates('56', 'stat_career'));

    const evaluation = await evaluator({
      getParticipantAggregates,
      names: {
        async findParticipantsByName() {
          return {
            records: [{ participantId: '99', displayName: 'BB McCullum Junior' }, MCCULLUM],
            totalRecords: 2,
          };
        },
      },
    }).evaluate(
      definition({
        kind: 'participant_statistics',
        participant: { name: 'bb mccullum' },
        scope: 'career',
      }),
    );

    if (evaluation.outcome !== 'answered') throw new Error(evaluation.outcome);
    expect(getParticipantAggregates).toHaveBeenCalledWith('56', { scope: 'career' });
  });

  it('resolves a single partial match when no exact match exists', async () => {
    const getParticipantAggregates = vi.fn(async () => aggregates('99', 'stat_career'));

    const evaluation = await evaluator({
      getParticipantAggregates,
      names: {
        async findParticipantsByName() {
          return {
            records: [{ participantId: '99', displayName: 'BB McCullum Junior' }],
            totalRecords: 1,
          };
        },
      },
    }).evaluate(
      definition({
        kind: 'participant_statistics',
        participant: { name: 'McCullum' },
        scope: 'career',
      }),
    );

    expect(evaluation.outcome).toBe('answered');
    expect(getParticipantAggregates).toHaveBeenCalledWith('99', { scope: 'career' });
  });

  it.each([
    [
      'participant',
      { kind: 'participant_statistics', participant: { name: 'Nobody' }, scope: 'career' },
      { findParticipantsByName: async () => ({ records: [], totalRecords: 0 }) },
      'Nobody',
    ],
    [
      'competition',
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'No' },
      },
      { findCompetitionsByName: async () => ({ records: [], hasMore: false }) },
      'No',
    ],
    [
      'season',
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'season',
        season: { competitionName: 'Indian Premier League', seasonLabel: '1999' },
      },
      { findSeasonExact: async () => null, findSeasonsByLabel: async () => ({ records: [] }) },
      '1999',
    ],
  ])('reports %s not found with the name hint', async (reference, value, overrides, hint) => {
    const evaluation = await evaluator({
      names: overrides as Partial<QueryDefinitionNameResolver>,
    }).evaluate(definition(value));

    expect(evaluation).toMatchObject({
      outcome: 'entity_not_found',
      reference,
      nameHint: hint,
    });
  });

  it.each([
    [
      'participant',
      { kind: 'participant_statistics', participant: { name: 'Rahul' }, scope: 'career' },
      {
        findParticipantsByName: async () => ({
          records: [
            { participantId: '1', displayName: 'KL Rahul' },
            { participantId: '2', displayName: 'Rahul Dravid' },
          ],
          totalRecords: 2,
        }),
      },
    ],
    [
      'competition',
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'League' },
      },
      {
        findCompetitionsByName: async () => ({
          records: [
            { competitionId: '1', name: 'Indian Premier League' },
            { competitionId: '2', name: 'Big Bash League' },
          ],
          hasMore: false,
        }),
      },
    ],
    [
      'season',
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'season',
        season: { competitionName: 'Indian Premier League', seasonLabel: '20' },
      },
      {
        findSeasonExact: async () => null,
        findSeasonsByLabel: async () => ({
          records: [
            { competitionId: '10', competitionName: 'Indian Premier League', label: '2025' },
            { competitionId: '10', competitionName: 'Indian Premier League', label: '2026' },
          ],
        }),
      },
    ],
  ])('reports %s ambiguity with candidates', async (reference, value, overrides) => {
    const evaluation = await evaluator({
      names: overrides as Partial<QueryDefinitionNameResolver>,
    }).evaluate(definition(value));

    expect(evaluation.outcome).toBe('entity_ambiguous');
    if (evaluation.outcome !== 'entity_ambiguous') return;
    expect(evaluation.reference).toBe(reference);
    expect(evaluation.candidates).toHaveLength(2);
    for (const candidate of evaluation.candidates) {
      expect(Object.keys(candidate).sort()).toEqual(['displayName', 'id']);
    }
  });

  it('caps candidates at five even when more matched', async () => {
    const evaluation = await evaluator({
      names: {
        async findParticipantsByName() {
          return {
            records: Array.from({ length: 9 }, (_, index) => ({
              participantId: String(index),
              displayName: `Rahul ${index}`,
            })),
            totalRecords: 9,
          };
        },
      },
    }).evaluate(
      definition({
        kind: 'participant_statistics',
        participant: { name: 'Rahul' },
        scope: 'career',
      }),
    );

    if (evaluation.outcome !== 'entity_ambiguous') throw new Error(evaluation.outcome);
    expect(evaluation.candidates).toHaveLength(5);
  });

  // More matches than one search page can hold cannot be narrowed safely, because
  // a second exact match may sit outside the page.
  it('treats more matches than the search bound as ambiguous', async () => {
    const evaluation = await evaluator({
      names: {
        async findParticipantsByName() {
          return {
            records: [MCCULLUM, { participantId: '99', displayName: 'BB McCullum' }],
            totalRecords: 26,
          };
        },
      },
    }).evaluate(
      definition({
        kind: 'participant_statistics',
        participant: { name: 'BB McCullum' },
        scope: 'career',
      }),
    );

    expect(evaluation.outcome).toBe('entity_ambiguous');
  });

  it('names the second participant when it is the ambiguous one', async () => {
    const evaluation = await evaluator({
      names: {
        async findParticipantsByName(name: string) {
          if (name === 'BB McCullum') return { records: [MCCULLUM], totalRecords: 1 };
          return {
            records: [
              { participantId: '1', displayName: 'D Short' },
              { participantId: '2', displayName: 'DJ Short' },
            ],
            totalRecords: 2,
          };
        },
      },
    }).evaluate(
      definition({
        kind: 'participant_comparison',
        participants: [{ name: 'BB McCullum' }, { name: 'Short' }],
        scope: 'career',
      }),
    );

    expect(evaluation).toMatchObject({ outcome: 'entity_ambiguous', reference: 'participants.1' });
  });

  it('reports a competition that cannot be narrowed within one search page', async () => {
    const evaluation = await evaluator({
      names: {
        async findCompetitionsByName() {
          return {
            records: [COMPETITION, { competitionId: '11', name: 'Indian Premier League B' }],
            hasMore: true,
          };
        },
      },
    }).evaluate(
      definition({
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
      }),
    );

    expect(evaluation.outcome).toBe('entity_ambiguous');
  });
});

describe('query definition evaluator: absent published data', () => {
  // The published leaderboard endpoint answers 404 for a scope with nothing
  // published, so the evaluation reports the scope as not found rather than
  // inventing an empty ranking.
  it('reports the scope as not found when no leaderboard is published', async () => {
    const evaluation = await evaluator({ leaderboard: null }).evaluate(
      definition({
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
      }),
    );

    expect(evaluation).toMatchObject({
      outcome: 'entity_not_found',
      reference: 'competition',
      nameHint: 'Indian Premier League',
    });
  });

  it('reports the participant as not found when no aggregates are published', async () => {
    const evaluation = await evaluator({ participantAggregates: null }).evaluate(
      definition({
        kind: 'participant_statistics',
        participant: { name: 'BB McCullum' },
        scope: 'career',
      }),
    );

    expect(evaluation).toMatchObject({ outcome: 'entity_not_found', reference: 'participant' });
  });
});

describe('query definition evaluator: definition version', () => {
  it('reports the same version for the same definition on every outcome', async () => {
    const value = {
      kind: 'participant_statistics' as const,
      participant: { name: 'BB McCullum' },
      scope: 'career' as const,
    };

    const answered = await evaluator().evaluate(definition(value));
    const missing = await evaluator({
      names: { findParticipantsByName: async () => ({ records: [], totalRecords: 0 }) },
    }).evaluate(definition(value));

    expect(answered.definitionVersion).toBe(missing.definitionVersion);
    expect(answered.definitionVersion).toMatch(/^qdv1_/);
  });

  it('echoes the definition it evaluated', async () => {
    const parsed = definition({ kind: 'unsupported', reason: 'venue' });

    const evaluation = await evaluator().evaluate(parsed);

    expect(evaluation.definition).toEqual(parsed);
  });
});
