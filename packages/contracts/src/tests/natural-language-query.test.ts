import { describe, expect, it } from 'vitest';

import {
  NATURAL_LANGUAGE_QUESTION_MAX_LENGTH,
  naturalLanguageQuerySchema,
  naturalLanguageQueryResponseSchema,
  naturalLanguageQueryResultSchema,
  naturalLanguageQuestionSchema,
} from '../analytics-query';

const EVALUATION = {
  outcome: 'unsupported' as const,
  definitionVersion: `qdv1_${'a'.repeat(43)}`,
  definition: { kind: 'unsupported' as const, reason: 'venue' as const },
  reason: 'venue' as const,
};

describe('natural-language question', () => {
  it('bounds a question at 300 characters', () => {
    expect(NATURAL_LANGUAGE_QUESTION_MAX_LENGTH).toBe(300);
    expect(naturalLanguageQuestionSchema.safeParse('a'.repeat(300)).success).toBe(true);
    expect(naturalLanguageQuestionSchema.safeParse('a'.repeat(301)).success).toBe(false);
  });

  // A question is trimmed before it is measured, so trailing whitespace cannot
  // buy a longer question and cannot stand in for one either.
  it('rejects an empty and a whitespace-only question', () => {
    expect(naturalLanguageQuestionSchema.safeParse('').success).toBe(false);
    expect(naturalLanguageQuestionSchema.safeParse('   \t\n ').success).toBe(false);
  });

  it('trims the question it returns', () => {
    expect(naturalLanguageQuestionSchema.parse('  who scored most runs?  ')).toBe(
      'who scored most runs?',
    );
  });

  it('accepts a question of exactly 300 characters after trimming', () => {
    const padded = `  ${'a'.repeat(300)}  `;
    expect(naturalLanguageQuestionSchema.parse(padded)).toHaveLength(300);
  });

  it('rejects a question that is not a string', () => {
    for (const value of [42, null, undefined, {}, ['a']]) {
      expect(naturalLanguageQuestionSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('natural-language query request', () => {
  it('accepts a body carrying only a question', () => {
    expect(naturalLanguageQuerySchema.parse({ question: 'most runs in the IPL' })).toEqual({
      question: 'most runs in the IPL',
    });
  });

  // The request body is the one place an anonymous caller controls, so an
  // unrecognised property is refused rather than ignored.
  it('rejects an unrecognised property', () => {
    expect(
      naturalLanguageQuerySchema.safeParse({ question: 'most runs', definition: { kind: 'x' } })
        .success,
    ).toBe(false);
  });

  it('rejects a missing question', () => {
    expect(naturalLanguageQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe('natural-language query result', () => {
  it('carries the question, the model and the evaluation', () => {
    const result = naturalLanguageQueryResultSchema.parse({
      question: 'which venue hosts most sixes?',
      model: 'claude-haiku-4-5-20251001',
      evaluation: EVALUATION,
    });

    expect(result.question).toBe('which venue hosts most sixes?');
    expect(result.model).toBe('claude-haiku-4-5-20251001');
    expect(result.evaluation.outcome).toBe('unsupported');
  });

  // Token counts are operator metering data. They are logged rather than
  // returned, so the contract must refuse them instead of quietly passing them on.
  it('rejects token usage in the result', () => {
    expect(
      naturalLanguageQueryResultSchema.safeParse({
        question: 'most runs',
        model: 'claude-haiku-4-5-20251001',
        evaluation: EVALUATION,
        usage: { inputTokens: 10, outputTokens: 20 },
      }).success,
    ).toBe(false);
  });

  it('rejects a result whose evaluation is not an outcome the contract names', () => {
    expect(
      naturalLanguageQueryResultSchema.safeParse({
        question: 'most runs',
        model: 'claude-haiku-4-5-20251001',
        evaluation: { ...EVALUATION, outcome: 'maybe' },
      }).success,
    ).toBe(false);
  });

  it('bounds the reported model identifier', () => {
    expect(
      naturalLanguageQueryResultSchema.safeParse({
        question: 'most runs',
        model: '',
        evaluation: EVALUATION,
      }).success,
    ).toBe(false);
    expect(
      naturalLanguageQueryResultSchema.safeParse({
        question: 'most runs',
        model: 'm'.repeat(101),
        evaluation: EVALUATION,
      }).success,
    ).toBe(false);
  });

  it('wraps the result in the data envelope', () => {
    const response = naturalLanguageQueryResponseSchema.parse({
      data: { question: 'most runs', model: 'claude-haiku-4-5-20251001', evaluation: EVALUATION },
    });

    expect(response.data.evaluation.definitionVersion).toBe(EVALUATION.definitionVersion);
  });

  it('rejects a response without the data envelope', () => {
    expect(
      naturalLanguageQueryResponseSchema.safeParse({
        question: 'most runs',
        model: 'claude-haiku-4-5-20251001',
        evaluation: EVALUATION,
      }).success,
    ).toBe(false);
  });
});
