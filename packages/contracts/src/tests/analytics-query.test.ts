import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  ANALYTICS_QUERY_KINDS,
  ANALYTICS_QUERY_PROMPT_DESCRIPTION,
  QUERY_DEFINITION_VERSION,
  analyticsCompetitionReferenceSchema,
  analyticsParticipantReferenceSchema,
  analyticsQueryDefinitionSchema,
  analyticsSeasonReferenceSchema,
  leaderboardQueryDefinitionSchema,
  participantComparisonQueryDefinitionSchema,
  participantStatisticsQueryDefinitionSchema,
  unsupportedQueryDefinitionSchema,
  unsupportedQueryReasonSchema,
} from '../analytics-query';
import { leaderboardMetricSchema, participantAggregateScopeSchema } from '../public-read';

const season = { competitionName: 'Indian Premier League', seasonLabel: '2026' };
const competition = { name: 'Indian Premier League' };
const striker = { name: 'Quinton de Kock' };
const opener = { name: "D'Arcy Short" };

// Built rather than written as escapes so that this source file never itself
// stores a control character.
const NULL_CHARACTER = String.fromCharCode(0);
const HORIZONTAL_TAB = String.fromCharCode(9);
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

const validDefinitions: Record<string, unknown> = {
  'a season-scoped leaderboard': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season,
    limit: 10,
  },
  'a competition-scoped leaderboard': {
    kind: 'leaderboard',
    metric: 'best_economy_rate',
    scope: 'competition',
    competition,
    limit: 5,
  },
  'season-scoped participant statistics': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'season',
    season,
  },
  'competition-scoped participant statistics': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'competition',
    competition,
  },
  'career-scoped participant statistics': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'career',
  },
  'a season-scoped participant comparison': {
    kind: 'participant_comparison',
    participants: [striker, opener],
    scope: 'season',
    season,
  },
  'a competition-scoped participant comparison': {
    kind: 'participant_comparison',
    participants: [striker, opener],
    scope: 'competition',
    competition,
  },
  'a career-scoped participant comparison': {
    kind: 'participant_comparison',
    participants: [striker, opener],
    scope: 'career',
  },
  'an unsupported question': {
    kind: 'unsupported',
    reason: 'bowler_type',
  },
};

const rejectedDefinitions: Record<string, unknown> = {
  'an unknown kind': { kind: 'season_summary', scope: 'career' },
  'a missing kind': { scope: 'career' },

  'an unknown key beside a leaderboard': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season,
    phase: 'death_overs',
  },
  'an unknown key inside a participant reference': {
    kind: 'participant_statistics',
    participant: { name: 'Quinton de Kock', team: 'Titans' },
    scope: 'career',
  },
  'an unknown key inside a season reference': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season: { ...season, startDate: '2026-01-01' },
  },
  'an unknown key inside a comparison participant': {
    kind: 'participant_comparison',
    participants: [striker, { name: "D'Arcy Short", hand: 'left' }],
    scope: 'career',
  },
  'an unknown key beside an unsupported reason': {
    kind: 'unsupported',
    reason: 'other',
    question: 'Who bowls the fastest?',
  },

  'a metric outside the enum': {
    kind: 'leaderboard',
    metric: 'most_maidens',
    scope: 'season',
    season,
  },
  'an unsupported reason outside the enum': { kind: 'unsupported', reason: 'unknown_player' },
  'a scope outside the enum': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'innings',
  },
  'a career-scoped leaderboard, which the leaderboard endpoint does not rank': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'career',
  },

  'a limit of zero': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season,
    limit: 0,
  },
  'a limit of fifty-one': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season,
    limit: 51,
  },
  'a non-integer limit': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season,
    limit: 10.5,
  },
  'a limit sent as a string': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season,
    limit: '10',
  },

  'an empty name hint': {
    kind: 'participant_statistics',
    participant: { name: '' },
    scope: 'career',
  },
  'a whitespace-only name hint': {
    kind: 'participant_statistics',
    participant: { name: '   ' },
    scope: 'career',
  },
  'a name hint of a hundred and one characters': {
    kind: 'participant_statistics',
    participant: { name: 'q'.repeat(101) },
    scope: 'career',
  },
  'a name hint carrying a null character': {
    kind: 'participant_statistics',
    participant: { name: `Quinton${NULL_CHARACTER}de Kock` },
    scope: 'career',
  },
  'a name hint carrying a tab': {
    kind: 'participant_statistics',
    participant: { name: `Quinton${HORIZONTAL_TAB}de Kock` },
    scope: 'career',
  },
  'a name hint carrying a zero-width space': {
    kind: 'participant_statistics',
    participant: { name: `Quinton${ZERO_WIDTH_SPACE}de Kock` },
    scope: 'career',
  },
  'a name hint that is not a string': {
    kind: 'participant_statistics',
    participant: { name: 12 },
    scope: 'career',
  },

  'a career scope carrying a season reference': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'career',
    season,
  },
  'a career scope carrying a competition reference': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'career',
    competition,
  },
  'a career-scoped comparison carrying a season reference': {
    kind: 'participant_comparison',
    participants: [striker, opener],
    scope: 'career',
    season,
  },
  'a season scope without a season reference': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'season',
  },
  'a competition scope without a competition reference': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'competition',
  },
  'a season scope carrying a competition reference instead': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    competition,
  },
  'a season-scoped comparison without a season reference': {
    kind: 'participant_comparison',
    participants: [striker, opener],
    scope: 'season',
  },

  'a comparison of one participant': {
    kind: 'participant_comparison',
    participants: [striker],
    scope: 'career',
  },
  'a comparison of three participants': {
    kind: 'participant_comparison',
    participants: [striker, opener, { name: 'Temba Bavuma' }],
    scope: 'career',
  },
  'a comparison of no participants': {
    kind: 'participant_comparison',
    participants: [],
    scope: 'career',
  },
};

/**
 * Walks every schema reachable from a definition and reports the path of each
 * string field that does not declare a maximum length. An unbounded string in
 * this contract would let a translated question carry arbitrary text into the
 * platform, so the absence of one is asserted structurally rather than one field
 * at a time.
 */
function unboundedStringPaths(schema: z.ZodTypeAny, path: string): string[] {
  if (schema instanceof z.ZodString) {
    return schema._def.checks.some((check) => check.kind === 'max') ? [] : [path];
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as z.ZodRawShape;
    return Object.entries(shape).flatMap(([key, field]) =>
      unboundedStringPaths(field, `${path}.${key}`),
    );
  }

  if (schema instanceof z.ZodDiscriminatedUnion || schema instanceof z.ZodUnion) {
    const options = schema.options as z.ZodTypeAny[];
    return options.flatMap((option, index) => unboundedStringPaths(option, `${path}|${index}`));
  }

  if (schema instanceof z.ZodTuple) {
    const items = schema.items as z.ZodTypeAny[];
    return items.flatMap((item, index) => unboundedStringPaths(item, `${path}[${index}]`));
  }

  if (schema instanceof z.ZodArray) {
    return unboundedStringPaths(schema.element as z.ZodTypeAny, `${path}[]`);
  }

  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unboundedStringPaths(schema.unwrap() as z.ZodTypeAny, path);
  }

  if (schema instanceof z.ZodDefault) {
    return unboundedStringPaths(schema._def.innerType as z.ZodTypeAny, path);
  }

  if (schema instanceof z.ZodEffects) {
    return unboundedStringPaths(schema._def.schema as z.ZodTypeAny, path);
  }

  return [];
}

describe('analytics query definition contract', () => {
  it('publishes the query-definition version', () => {
    expect(QUERY_DEFINITION_VERSION).toBe('1.0');
  });

  // Read off the union itself rather than off a list of the variants, so that a
  // kind added to the union without being published here fails.
  it('keeps the published kind list in step with the discriminated union', () => {
    const options = analyticsQueryDefinitionSchema._def.schema.options;

    expect(options.map((option) => option.shape.kind.value)).toEqual([...ANALYTICS_QUERY_KINDS]);
  });

  it('exports each variant of the union on its own', () => {
    const options: unknown[] = [...analyticsQueryDefinitionSchema._def.schema.options];

    for (const variant of [
      leaderboardQueryDefinitionSchema,
      participantStatisticsQueryDefinitionSchema,
      participantComparisonQueryDefinitionSchema,
      unsupportedQueryDefinitionSchema,
    ]) {
      expect(options).toContain(variant);
    }
  });
});

describe('accepted query definitions', () => {
  for (const [description, definition] of Object.entries(validDefinitions)) {
    it(`accepts ${description}`, () => {
      const result = analyticsQueryDefinitionSchema.safeParse(definition);

      expect(result.success).toBe(true);
    });
  }

  it('accepts every unsupported reason', () => {
    for (const reason of unsupportedQueryReasonSchema.options) {
      expect(
        analyticsQueryDefinitionSchema.safeParse({ kind: 'unsupported', reason }).success,
      ).toBe(true);
    }
  });

  it('accepts every leaderboard metric', () => {
    for (const metric of leaderboardMetricSchema.options) {
      const result = analyticsQueryDefinitionSchema.safeParse({
        kind: 'leaderboard',
        metric,
        scope: 'competition',
        competition,
      });

      expect(result.success).toBe(true);
    }
  });

  it('defaults the leaderboard limit to ten', () => {
    const result = analyticsQueryDefinitionSchema.parse({
      kind: 'leaderboard',
      metric: 'most_runs',
      scope: 'season',
      season,
    });

    expect(result).toEqual({
      kind: 'leaderboard',
      metric: 'most_runs',
      scope: 'season',
      season,
      limit: 10,
    });
  });

  it('accepts the bounding limits of one and fifty', () => {
    for (const limit of [1, 50]) {
      const result = analyticsQueryDefinitionSchema.safeParse({
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'season',
        season,
        limit,
      });

      expect(result.success).toBe(true);
    }
  });
});

describe('rejected query definitions', () => {
  for (const [description, definition] of Object.entries(rejectedDefinitions)) {
    it(`rejects ${description}`, () => {
      const result = analyticsQueryDefinitionSchema.safeParse(definition);

      expect(result.success).toBe(false);
    });
  }

  it('names the reference field when a scope requires one', () => {
    const result = analyticsQueryDefinitionSchema.safeParse({
      kind: 'participant_statistics',
      participant: striker,
      scope: 'season',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['season']);
  });

  it('names the reference field a career scope must not carry', () => {
    const result = analyticsQueryDefinitionSchema.safeParse({
      kind: 'participant_statistics',
      participant: striker,
      scope: 'career',
      competition,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['competition']);
  });
});

describe('name hint references', () => {
  it('accepts cricket names with spaces, apostrophes and accented characters', () => {
    for (const name of ['Quinton de Kock', "D'Arcy Short", 'José Ramírez', 'Jean-Paul Duminy']) {
      expect(analyticsParticipantReferenceSchema.parse({ name })).toEqual({ name });
      expect(analyticsCompetitionReferenceSchema.parse({ name })).toEqual({ name });
    }
  });

  it('accepts a name hint of exactly a hundred characters', () => {
    const name = 'q'.repeat(100);

    expect(analyticsParticipantReferenceSchema.parse({ name })).toEqual({ name });
  });

  it('trims surrounding whitespace rather than rejecting it', () => {
    expect(analyticsParticipantReferenceSchema.parse({ name: '  Temba Bavuma  ' })).toEqual({
      name: 'Temba Bavuma',
    });
  });

  it('identifies a season by its competition and label', () => {
    expect(analyticsSeasonReferenceSchema.parse(season)).toEqual(season);
    expect(analyticsSeasonReferenceSchema.safeParse({ competitionName: 'x' }).success).toBe(false);
    expect(analyticsSeasonReferenceSchema.safeParse({ seasonLabel: '2026' }).success).toBe(false);
  });
});

describe('analytics query definition hardening', () => {
  it('declares a maximum length for every string field', () => {
    expect(unboundedStringPaths(analyticsQueryDefinitionSchema, 'definition')).toEqual([]);
  });

  // Without this, the assertion above would also pass if the walk never reached
  // a string at all.
  it('reports an unbounded string reached through the shapes this contract uses', () => {
    const probe = z
      .discriminatedUnion('kind', [
        z
          .object({
            kind: z.literal('probe'),
            bounded: z.string().max(10),
            nested: z.object({ unbounded: z.string() }).strict().optional(),
            pair: z.tuple([z.object({ alsoUnbounded: z.string() }).strict()]),
          })
          .strict(),
      ])
      .superRefine(() => undefined);

    expect(unboundedStringPaths(probe, 'probe')).toEqual([
      'probe|0.nested.unbounded',
      'probe|0.pair[0].alsoUnbounded',
    ]);
  });
});

describe('analytics query prompt description', () => {
  it('names every query kind', () => {
    for (const kind of ANALYTICS_QUERY_KINDS) {
      expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toContain(kind);
    }
  });

  it('names every unsupported reason', () => {
    for (const reason of unsupportedQueryReasonSchema.options) {
      expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toContain(reason);
    }
  });

  it('names every leaderboard metric', () => {
    for (const metric of leaderboardMetricSchema.options) {
      expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toContain(metric);
    }
  });

  it('names every participant aggregate scope', () => {
    for (const scope of participantAggregateScopeSchema.options) {
      expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toContain(scope);
    }
  });

  it('requires an unsupported answer rather than a guess', () => {
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/rather than guess/i);
  });

  it('requires JSON matching the schema and nothing else', () => {
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/only.*JSON/is);
  });
});
