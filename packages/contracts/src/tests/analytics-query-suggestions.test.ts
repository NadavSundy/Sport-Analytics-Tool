import { describe, expect, it } from 'vitest';

import {
  analyticsQueryDefinitionSchema,
  analyticsQueryTranslationSchema,
  ANALYTICS_QUERY_PROMPT_DESCRIPTION,
  MAX_QUERY_SUGGESTIONS,
  naturalLanguageQueryResultSchema,
  QUERY_DEFINITION_VERSION,
  querySuggestionSchema,
} from '../analytics-query';
import { leaderboardMetricSchema } from '../public-read';

const UNSUPPORTED = { kind: 'unsupported' as const, reason: 'ambiguous' as const };
const LEADERBOARD = {
  kind: 'leaderboard' as const,
  metric: 'most_runs' as const,
  scope: 'competition' as const,
  competition: { name: 'Indian Premier League' },
};
const EVALUATION = {
  outcome: 'unsupported' as const,
  definitionVersion: `qdv1_${'a'.repeat(43)}`,
  definition: UNSUPPORTED,
  reason: 'ambiguous' as const,
};

describe('a suggestion', () => {
  it('is an answerable definition', () => {
    expect(querySuggestionSchema.safeParse(LEADERBOARD).success).toBe(true);
    expect(
      querySuggestionSchema.safeParse({
        kind: 'participant_statistics',
        participant: { name: 'V Kohli' },
        scope: 'career',
      }).success,
    ).toBe(true);
    expect(
      querySuggestionSchema.safeParse({
        kind: 'participant_comparison',
        participants: [{ name: 'V Kohli' }, { name: 'RD Gaikwad' }],
        scope: 'career',
      }).success,
    ).toBe(true);
  });

  // Suggesting a refusal would offer the reader nothing to click.
  it('is never itself unsupported', () => {
    expect(querySuggestionSchema.safeParse(UNSUPPORTED).success).toBe(false);
  });

  it('obeys the same bounds and scope rule as any definition', () => {
    expect(
      querySuggestionSchema.safeParse({ ...LEADERBOARD, competition: { name: '' } }).success,
    ).toBe(false);
    // A competition scope carrying a season reference breaks the scope rule.
    expect(
      querySuggestionSchema.safeParse({
        ...LEADERBOARD,
        season: { competitionName: 'Indian Premier League', seasonLabel: '2024' },
      }).success,
    ).toBe(false);
    expect(querySuggestionSchema.safeParse({ ...LEADERBOARD, limit: 51 }).success).toBe(false);
  });
});

describe('the translation wrapper', () => {
  it('carries the definition and no suggestions at all', () => {
    const translation = analyticsQueryTranslationSchema.parse({ definition: LEADERBOARD });

    // The contract applies its own `limit` default, as it does anywhere a
    // definition is parsed.
    expect(translation.definition).toEqual({ ...LEADERBOARD, limit: 10 });
    expect(translation.suggestions).toBeUndefined();
  });

  it('rejects a wrapper with no definition', () => {
    expect(analyticsQueryTranslationSchema.safeParse({ suggestions: [] }).success).toBe(false);
  });

  it('rejects a definition that fails the contract', () => {
    expect(
      analyticsQueryTranslationSchema.safeParse({ definition: { kind: 'sql', query: 'SELECT 1' } })
        .success,
    ).toBe(false);
  });

  it('rejects an unrecognised property', () => {
    expect(
      analyticsQueryTranslationSchema.safeParse({ definition: LEADERBOARD, note: 'hello' }).success,
    ).toBe(false);
  });

  /**
   * Suggestions are carried through unvalidated on purpose: one unusable
   * suggestion must not cost the reader the answer, so the adapter validates them
   * one by one and drops the bad ones. Validating them here would fail the whole
   * wrapper.
   */
  it('accepts suggestions without validating them, so one bad suggestion cannot lose the answer', () => {
    const translation = analyticsQueryTranslationSchema.parse({
      definition: UNSUPPORTED,
      suggestions: [LEADERBOARD, { kind: 'nonsense' }, 'not even an object'],
    });

    expect(translation.definition).toEqual(UNSUPPORTED);
    expect(translation.suggestions).toHaveLength(3);
  });
});

describe('the definition contract is unchanged by suggestions', () => {
  // The definition is what definitionVersion is computed over, so a suggestion
  // inside it would make the same question carry different versions.
  it('does not admit suggestions inside a definition', () => {
    expect(
      analyticsQueryDefinitionSchema.safeParse({ ...UNSUPPORTED, suggestions: [LEADERBOARD] })
        .success,
    ).toBe(false);
    expect(
      analyticsQueryDefinitionSchema.safeParse({ ...LEADERBOARD, suggestions: [] }).success,
    ).toBe(false);
  });

  it('keeps the definition version at 1.0', () => {
    expect(QUERY_DEFINITION_VERSION).toBe('1.0');
  });
});

describe('the natural-language result', () => {
  it('may carry up to three suggestions', () => {
    expect(MAX_QUERY_SUGGESTIONS).toBe(3);

    const result = naturalLanguageQueryResultSchema.parse({
      question: 'who is the best batter in the IPL?',
      model: 'claude-haiku-4-5-20251001',
      evaluation: EVALUATION,
      suggestions: [LEADERBOARD],
    });

    expect(result.suggestions).toHaveLength(1);
  });

  it('may omit suggestions entirely', () => {
    const result = naturalLanguageQueryResultSchema.parse({
      question: 'a question',
      model: 'claude-haiku-4-5-20251001',
      evaluation: EVALUATION,
    });

    expect(result.suggestions).toBeUndefined();
  });

  it('rejects more than three suggestions', () => {
    expect(
      naturalLanguageQueryResultSchema.safeParse({
        question: 'a question',
        model: 'claude-haiku-4-5-20251001',
        evaluation: EVALUATION,
        suggestions: [LEADERBOARD, LEADERBOARD, LEADERBOARD, LEADERBOARD],
      }).success,
    ).toBe(false);
  });

  // Nothing unvalidated may reach a reader, so the response contract refuses a
  // suggestion the definition contract would refuse.
  it('rejects a suggestion that is not an answerable definition', () => {
    for (const suggestion of [UNSUPPORTED, { kind: 'nonsense' }, { ...LEADERBOARD, limit: 0 }]) {
      expect(
        naturalLanguageQueryResultSchema.safeParse({
          question: 'a question',
          model: 'claude-haiku-4-5-20251001',
          evaluation: EVALUATION,
          suggestions: [suggestion],
        }).success,
      ).toBe(false);
    }
  });
});

describe('the prompt description', () => {
  it('asks for the wrapper rather than a bare definition', () => {
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/"definition"/);
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/"suggestions"/);
  });

  // The rules exist so a subjective question is answered with something to click
  // rather than a bare refusal.
  it('names the subjective and all-time cases and what to do about them', () => {
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/\bbest\b/i);
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/greatest/i);
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/all[- ]time|in history/i);
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/ambiguous/);
  });

  it('still generates its metric list from the contract', () => {
    for (const metric of ['most_runs', 'highest_batting_average', 'best_economy_rate']) {
      expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toContain(metric);
    }
  });

  it('says a suggestion must be answerable and bounded to three', () => {
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/at most three/i);
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/never "unsupported"|not "unsupported"/i);
  });
});

/**
 * Issue #851 first stated the subjective-question rule without exempting the
 * published metrics, and "Who took the most wickets in the IPL?" was then refused
 * as a superlative like "best". The rule has to separate the two.
 */
describe('the subjective-question rule', () => {
  it('exempts every published metric by name, from the contract enum', () => {
    for (const metric of leaderboardMetricSchema.options) {
      expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toContain(`"${metric}"`);
    }
  });

  it('says a superlative naming a metric is concrete and must be a leaderboard', () => {
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/NOT subjective/);
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(/most wickets/i);
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(
      /[Nn]ever return "unsupported" for a question that names one of them/,
    );
  });

  it('keeps the subjective case narrowed to superlatives that name no metric', () => {
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(
      /subjective only when its superlative names no such metric/,
    );
    for (const subjective of ['best batter', 'greatest bowler', 'top player', 'most dangerous']) {
      expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toContain(subjective);
    }
  });

  // An all-time question spans every competition, which is a different problem
  // from a subjective one, and must not swallow a scoped metric question.
  it('limits the all-time rule to questions that really span everything', () => {
    expect(ANALYTICS_QUERY_PROMPT_DESCRIPTION).toMatch(
      /names a competition\s*\n?\s*or a season is scoped, and translates normally/,
    );
  });

  it('states the exemption before the refusal, so the exemption is read first', () => {
    const exemption = ANALYTICS_QUERY_PROMPT_DESCRIPTION.indexOf('NOT subjective');
    const refusal = ANALYTICS_QUERY_PROMPT_DESCRIPTION.indexOf('subjective only when');

    expect(exemption).toBeGreaterThan(-1);
    expect(refusal).toBeGreaterThan(exemption);
  });
});
