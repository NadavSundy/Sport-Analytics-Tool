import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import {
  analyticsQueryDefinitionSchema,
  leaderboardQueryDefinitionSchema,
  participantComparisonQueryDefinitionSchema,
  participantStatisticsQueryDefinitionSchema,
  unsupportedQueryDefinitionSchema,
} from '@sport-analytics/contracts';

import {
  ANALYTICS_QUERY_JSON_SCHEMA,
  ANALYTICS_QUERY_TRANSLATION_JSON_SCHEMA,
} from '../../src/modules/analytics-query/analytics-query.json-schema';

/**
 * The JSON Schema is the shape the provider is constrained to. It is written by
 * hand because the provider rejects several keywords a generator emits, so these
 * tests are what keep it in step with the issue #811 contract.
 */
const ajv = new Ajv2020({ strict: false, allErrors: true });
const validate = ajv.compile(ANALYTICS_QUERY_JSON_SCHEMA);

const season = { competitionName: 'Indian Premier League', seasonLabel: '2026' };
const competition = { name: 'Indian Premier League' };
const striker = { name: 'Quinton de Kock' };
const opener = { name: "D'Arcy Short" };

const definitions: Record<string, unknown> = {
  'a season-scoped leaderboard': {
    kind: 'leaderboard',
    metric: 'most_runs',
    scope: 'season',
    season,
    limit: 10,
  },
  'a competition-scoped leaderboard without a limit': {
    kind: 'leaderboard',
    metric: 'best_economy_rate',
    scope: 'competition',
    competition,
  },
  'season-scoped participant statistics': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'season',
    season,
  },
  'career-scoped participant statistics': {
    kind: 'participant_statistics',
    participant: striker,
    scope: 'career',
  },
  'a career-scoped participant comparison': {
    kind: 'participant_comparison',
    participants: [striker, opener],
    scope: 'career',
  },
  'an unsupported question': { kind: 'unsupported', reason: 'bowler_type' },
};

/** Every keyword the provider documents as unsupported for a constrained schema. */
const UNSUPPORTED_KEYWORDS = [
  'minLength',
  'maxLength',
  'pattern',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'maxItems',
  'uniqueItems',
  'prefixItems',
  '$dynamicRef',
  'if',
  'not',
];

function keywordsIn(node: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const entry of node) keywordsIn(entry, found);
    return found;
  }

  if (typeof node === 'object' && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      found.add(key);
      keywordsIn(value, found);
    }
  }

  return found;
}

function objectNodes(node: unknown, collected: Record<string, unknown>[] = []) {
  if (Array.isArray(node)) {
    for (const entry of node) objectNodes(entry, collected);
    return collected;
  }

  if (typeof node === 'object' && node !== null) {
    const record = node as Record<string, unknown>;
    if (record.type === 'object') collected.push(record);
    for (const value of Object.values(record)) objectNodes(value, collected);
  }

  return collected;
}

describe('analytics query JSON Schema', () => {
  for (const [description, definition] of Object.entries(definitions)) {
    it(`accepts ${description}`, () => {
      expect(validate(definition)).toBe(true);
      // Anything the JSON Schema admits must also satisfy the contract, or the
      // provider could be constrained to something the adapter then rejects.
      expect(analyticsQueryDefinitionSchema.safeParse(definition).success).toBe(true);
    });
  }

  it('rejects an unknown kind', () => {
    expect(validate({ kind: 'season_summary' })).toBe(false);
  });

  it('rejects an unknown property', () => {
    expect(
      validate({
        kind: 'unsupported',
        reason: 'other',
        question: 'Who bowls the fastest?',
      }),
    ).toBe(false);
  });

  it('rejects a metric outside the contract enum', () => {
    expect(validate({ kind: 'leaderboard', metric: 'most_maidens', scope: 'season', season })).toBe(
      false,
    );
  });

  it('rejects a career-scoped leaderboard, which the contract does not allow', () => {
    expect(validate({ kind: 'leaderboard', metric: 'most_runs', scope: 'career' })).toBe(false);
  });

  it('closes every object so the provider cannot add a property', () => {
    for (const node of objectNodes(ANALYTICS_QUERY_JSON_SCHEMA)) {
      expect(node.additionalProperties).toBe(false);
    }
  });

  it('uses no keyword the provider rejects in a constrained schema', () => {
    const used = keywordsIn(ANALYTICS_QUERY_JSON_SCHEMA);

    expect([...used].filter((keyword) => UNSUPPORTED_KEYWORDS.includes(keyword))).toEqual([]);
  });
});

describe('analytics query JSON Schema agreement with the contract', () => {
  const variants = [
    leaderboardQueryDefinitionSchema,
    participantStatisticsQueryDefinitionSchema,
    participantComparisonQueryDefinitionSchema,
    unsupportedQueryDefinitionSchema,
  ];

  const branches = (ANALYTICS_QUERY_JSON_SCHEMA as { anyOf: Record<string, never>[] }).anyOf;

  it('declares one branch per contract variant, in the same order', () => {
    expect(branches).toHaveLength(variants.length);

    expect(
      branches.map(
        (branch) =>
          (branch as unknown as { properties: { kind: { const: string } } }).properties.kind.const,
      ),
    ).toEqual(variants.map((variant) => variant.shape.kind.value));
  });

  it('declares exactly the properties each contract variant declares', () => {
    branches.forEach((branch, index) => {
      const schemaProperties = Object.keys(
        (branch as unknown as { properties: Record<string, unknown> }).properties,
      ).sort();
      const contractProperties = Object.keys(variants[index]!.shape).sort();

      expect(schemaProperties).toEqual(contractProperties);
    });
  });

  it('requires exactly the properties the contract makes non-optional', () => {
    branches.forEach((branch, index) => {
      const required = [...((branch as unknown as { required?: string[] }).required ?? [])].sort();
      const contractRequired = Object.entries(variants[index]!.shape)
        .filter(([, field]) => !(field as { isOptional(): boolean }).isOptional())
        .map(([key]) => key)
        .sort();

      expect(required).toEqual(contractRequired);
    });
  });
});

describe('analytics query translation JSON Schema', () => {
  const validateTranslation = ajv.compile(ANALYTICS_QUERY_TRANSLATION_JSON_SCHEMA);

  it('requires a definition and admits the definition schema unchanged', () => {
    expect(
      validateTranslation({ definition: definitions['season-scoped participant statistics'] }),
    ).toBe(true);
    expect(validateTranslation({})).toBe(false);
    expect(validateTranslation({ suggestions: [] })).toBe(false);
  });

  it('admits up to three answerable suggestions beside the definition', () => {
    const leaderboard = { kind: 'leaderboard', metric: 'most_runs', scope: 'season', season };

    expect(
      validateTranslation({
        definition: { kind: 'unsupported', reason: 'ambiguous' },
        suggestions: [leaderboard, leaderboard, leaderboard],
      }),
    ).toBe(true);
  });

  // A suggested refusal would give the reader nothing to ask, so the provider is
  // constrained away from producing one.
  it('refuses an unsupported suggestion', () => {
    expect(
      validateTranslation({
        definition: { kind: 'unsupported', reason: 'ambiguous' },
        suggestions: [{ kind: 'unsupported', reason: 'other' }],
      }),
    ).toBe(false);
  });

  it('refuses a suggestion that is not a definition at all', () => {
    for (const suggestion of [{ kind: 'season_summary' }, 'most runs', 42]) {
      expect(
        validateTranslation({
          definition: { kind: 'unsupported', reason: 'ambiguous' },
          suggestions: [suggestion],
        }),
      ).toBe(false);
    }
  });

  it('carries no label, because the application words a suggestion itself', () => {
    expect(
      validateTranslation({
        definition: { kind: 'unsupported', reason: 'ambiguous' },
        suggestions: [
          { kind: 'leaderboard', metric: 'most_runs', scope: 'season', season, label: 'Most runs' },
        ],
      }),
    ).toBe(false);
  });

  it('closes the wrapper and uses no keyword the provider rejects', () => {
    for (const node of objectNodes(ANALYTICS_QUERY_TRANSLATION_JSON_SCHEMA)) {
      expect(node.additionalProperties).toBe(false);
    }

    const used = keywordsIn(ANALYTICS_QUERY_TRANSLATION_JSON_SCHEMA);
    expect([...used].filter((keyword) => UNSUPPORTED_KEYWORDS.includes(keyword))).toEqual([]);
  });
});
