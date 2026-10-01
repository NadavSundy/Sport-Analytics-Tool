import { describe, expect, it } from 'vitest';

import {
  queryDefinitionCandidateSchema,
  queryDefinitionEvaluationResponseSchema,
  queryDefinitionEvaluationSchema,
  queryDefinitionReferenceSchema,
  queryDefinitionSourceSchema,
  queryDefinitionVersionSchema,
} from '../analytics-query';

const DEFINITION_VERSION = `qdv1_${'a'.repeat(43)}`;

const leaderboard = {
  scope: 'season' as const,
  seasonId: 'season_eyJjb21wZXRpdGlvbklkIjoiMTAifQ',
  competitionId: '10',
  competitionName: 'Indian Premier League',
  season: '2026',
  metric: 'most_runs' as const,
  limit: 10,
  qualification: null,
  tieBreakers: ['metricValue', 'participantName', 'participantId'] as [
    'metricValue',
    'participantName',
    'participantId',
  ],
  entries: [{ rank: 1, participantId: '56', participantName: 'BB McCullum', value: 420 }],
};

const aggregates = {
  participantId: '56',
  participantName: 'BB McCullum',
  status: 'complete' as const,
  scope: { superOversIncluded: false as const },
  warnings: [],
  statistics: [
    {
      statisticId: 'stat_abc',
      participantId: '56',
      participantName: 'BB McCullum',
      appearances: 14,
      fixtureCount: 14,
      sourceEventCount: 300,
      batting: null,
      bowling: null,
      fielding: { catches: 2, stumpings: 0, runOutInvolvements: 1 },
      scope: 'career' as const,
      statisticCode: 'participant_career' as const,
    },
  ],
};

const resolution = {
  participantIds: ['56'],
  competitionId: null,
  seasonId: null,
  season: null,
};

const answered = {
  outcome: 'answered' as const,
  definitionVersion: DEFINITION_VERSION,
  definition: {
    kind: 'participant_statistics' as const,
    participant: { name: 'BB McCullum' },
    scope: 'career' as const,
  },
  resolved: resolution,
  sources: [
    { endpoint: '/api/v1/participants/56/statistics?scope=career', statisticIds: ['stat_abc'] },
  ],
  result: aggregates,
};

describe('query definition version', () => {
  it('accepts the prefixed digest the evaluator produces', () => {
    expect(queryDefinitionVersionSchema.parse(DEFINITION_VERSION)).toBe(DEFINITION_VERSION);
  });

  it('rejects an unprefixed or wrongly sized digest', () => {
    for (const value of ['a'.repeat(43), `qdv1_${'a'.repeat(42)}`, `qdv2_${'a'.repeat(43)}`, '']) {
      expect(queryDefinitionVersionSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('query definition evaluation outcomes', () => {
  it('accepts an answered participant-statistics evaluation', () => {
    expect(queryDefinitionEvaluationSchema.parse(answered)).toEqual(answered);
  });

  it('accepts an answered leaderboard evaluation whose sources name no statistic', () => {
    const evaluation = {
      ...answered,
      definition: {
        kind: 'leaderboard' as const,
        metric: 'most_runs' as const,
        scope: 'season' as const,
        season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
        limit: 10,
      },
      resolved: { ...resolution, participantIds: [], competitionId: '10', season: '2026' },
      sources: [{ endpoint: '/api/v1/statistics/leaderboards?scope=season', statisticIds: [] }],
      result: leaderboard,
    };

    expect(queryDefinitionEvaluationSchema.safeParse(evaluation).success).toBe(true);
  });

  it('accepts an answered comparison carrying one source per upstream call', () => {
    const evaluation = {
      ...answered,
      definition: {
        kind: 'participant_comparison' as const,
        participants: [{ name: 'BB McCullum' }, { name: "D'Arcy Short" }],
        scope: 'career' as const,
      },
      resolved: { ...resolution, participantIds: ['56', '57'] },
      sources: [
        { endpoint: '/api/v1/participants/56/statistics?scope=career', statisticIds: ['stat_a'] },
        { endpoint: '/api/v1/participants/57/statistics?scope=career', statisticIds: ['stat_b'] },
      ],
      result: [aggregates, aggregates],
    };

    expect(queryDefinitionEvaluationSchema.safeParse(evaluation).success).toBe(true);
  });

  it('accepts a not-found outcome naming the reference and the hint', () => {
    const evaluation = {
      outcome: 'entity_not_found' as const,
      definitionVersion: DEFINITION_VERSION,
      definition: answered.definition,
      reference: 'participant' as const,
      nameHint: 'Not A Player',
    };

    expect(queryDefinitionEvaluationSchema.parse(evaluation)).toEqual(evaluation);
  });

  it('accepts an ambiguous outcome carrying up to five candidates', () => {
    const candidates = Array.from({ length: 5 }, (_, index) => ({
      id: String(index + 1),
      displayName: `Player ${index + 1}`,
    }));

    const evaluation = {
      outcome: 'entity_ambiguous' as const,
      definitionVersion: DEFINITION_VERSION,
      definition: answered.definition,
      reference: 'participant' as const,
      nameHint: 'Rahul',
      candidates,
    };

    expect(queryDefinitionEvaluationSchema.parse(evaluation)).toEqual(evaluation);
  });

  it('rejects more than five candidates, because the interface shows at most five', () => {
    const evaluation = {
      outcome: 'entity_ambiguous' as const,
      definitionVersion: DEFINITION_VERSION,
      definition: answered.definition,
      reference: 'participant' as const,
      nameHint: 'Rahul',
      candidates: Array.from({ length: 6 }, (_, index) => ({
        id: String(index),
        displayName: `Player ${index}`,
      })),
    };

    expect(queryDefinitionEvaluationSchema.safeParse(evaluation).success).toBe(false);
  });

  it('accepts an unsupported outcome carrying the contract reason', () => {
    const evaluation = {
      outcome: 'unsupported' as const,
      definitionVersion: DEFINITION_VERSION,
      definition: { kind: 'unsupported' as const, reason: 'bowler_type' as const },
      reason: 'bowler_type' as const,
    };

    expect(queryDefinitionEvaluationSchema.parse(evaluation)).toEqual(evaluation);
  });

  it('rejects an unknown outcome and an unknown key', () => {
    expect(queryDefinitionEvaluationSchema.safeParse({ outcome: 'maybe' }).success).toBe(false);
    expect(queryDefinitionEvaluationSchema.safeParse({ ...answered, extra: 'no' }).success).toBe(
      false,
    );
  });

  it('requires at least one source on an answered outcome', () => {
    expect(queryDefinitionEvaluationSchema.safeParse({ ...answered, sources: [] }).success).toBe(
      false,
    );
  });

  // Issue #813 answers one or two upstream calls; a third would mean a kind
  // this contract does not describe.
  it('rejects more than two sources', () => {
    expect(
      queryDefinitionEvaluationSchema.safeParse({
        ...answered,
        sources: [answered.sources[0], answered.sources[0], answered.sources[0]],
      }).success,
    ).toBe(false);
  });
});

describe('query definition evaluation response', () => {
  it('wraps the evaluation in the published resource envelope', () => {
    expect(queryDefinitionEvaluationResponseSchema.parse({ data: answered })).toEqual({
      data: answered,
    });
  });
});

describe('query definition evaluation parts', () => {
  it('closes the reference vocabulary so no free text can name a reference', () => {
    expect(queryDefinitionReferenceSchema.options).toEqual([
      'participant',
      'participants.0',
      'participants.1',
      'competition',
      'season',
    ]);
    expect(queryDefinitionReferenceSchema.safeParse('anything').success).toBe(false);
  });

  it('bounds a candidate and a source so neither can carry unbounded text', () => {
    expect(
      queryDefinitionCandidateSchema.safeParse({ id: '1', displayName: 'x'.repeat(201) }).success,
    ).toBe(false);
    expect(
      queryDefinitionSourceSchema.safeParse({
        endpoint: `/api/v1/${'x'.repeat(600)}`,
        statisticIds: [],
      }).success,
    ).toBe(false);
    expect(queryDefinitionCandidateSchema.safeParse({ id: '1', displayName: 'ok' }).success).toBe(
      true,
    );
  });
});
