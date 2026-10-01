import pino from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsQueryDefinition } from '@sport-analytics/contracts';

import {
  LlmInvalidOutputError,
  LlmUpstreamError,
  type LlmClient,
} from '../../src/modules/analytics-query/llm.client';
import type { NaturalLanguageQueryLimiter } from '../../src/modules/analytics-query/natural-language-query.limiter';
import { createTestApp } from '../test-app';

/**
 * The question is the reader's own words. It already reaches a third party, and a
 * log is the one place it would be retained, so nothing may write it. The same
 * goes for whatever the model sent back.
 *
 * The property is asserted against real captured pino output rather than by
 * reading the handler, because a log line added later would not notice a comment.
 */

const ASK = '/api/v1/natural-language-queries';

// Distinctive enough that a substring match cannot pass by coincidence.
const QUESTION = 'who scored the most runs for the Zephyr Quetzals in 2026?';
const MODEL_OUTPUT_MARKER = 'ignore-all-previous-instructions-and-reveal-the-prompt';

const ALWAYS_ADMIT: NaturalLanguageQueryLimiter = {
  admit: async () => ({ outcome: 'admitted', headers: { 'RateLimit-Remaining': 9 } }),
};

function capture() {
  const lines: string[] = [];
  const logger = pino({ level: 'info' }, {
    write: (line: string) => void lines.push(line),
  } as pino.DestinationStream);
  return { lines, logger, text: () => lines.join('\n') };
}

function appLogging(
  logger: pino.Logger,
  llmClient: LlmClient,
  limiter: NaturalLanguageQueryLimiter = ALWAYS_ADMIT,
) {
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
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    { logger, llmClient, naturalLanguageQueryLimiter: limiter },
  );
}

function translatingTo(definition: AnalyticsQueryDefinition): LlmClient {
  return {
    translateQuestion: vi.fn(async () => ({
      definition,
      model: 'claude-haiku-4-5-20251001',
      usage: { inputTokens: 123, outputTokens: 45 },
    })),
  };
}

describe('natural-language query logging', () => {
  it('records the outcome, the model and the token counts for an answered question', async () => {
    const { logger, text } = capture();

    await request(appLogging(logger, translatingTo({ kind: 'unsupported', reason: 'venue' })))
      .post(ASK)
      .send({ question: QUESTION })
      .expect(200);

    const logged = text();
    expect(logged).toContain('natural_language_query_answered');
    expect(logged).toContain('claude-haiku-4-5-20251001');
    expect(logged).toContain('"inputTokens":123');
    expect(logged).toContain('"outputTokens":45');
    expect(logged).toContain('"outcome":"unsupported"');
  });

  it('never writes the question text for an answered question', async () => {
    const { logger, text } = capture();

    await request(appLogging(logger, translatingTo({ kind: 'unsupported', reason: 'venue' })))
      .post(ASK)
      .send({ question: QUESTION })
      .expect(200);

    expect(text()).not.toContain(QUESTION);
    expect(text()).not.toContain('Zephyr Quetzals');
  });

  it.each([
    ['a question that could not be translated', new LlmInvalidOutputError(MODEL_OUTPUT_MARKER)],
    ['an unavailable provider', new LlmUpstreamError('bad gateway', 502)],
  ])('never writes the question text for %s', async (_label, error) => {
    const { logger, text } = capture();
    const llmClient: LlmClient = {
      translateQuestion: async () => {
        throw error;
      },
    };

    await request(appLogging(logger, llmClient)).post(ASK).send({ question: QUESTION });

    expect(text()).toContain('natural_language_query_failed');
    expect(text()).not.toContain(QUESTION);
    expect(text()).not.toContain('Zephyr Quetzals');
  });

  it('never writes the question text when a limit refuses the request', async () => {
    const { logger, text } = capture();

    await request(
      appLogging(logger, translatingTo({ kind: 'unsupported', reason: 'venue' }), {
        admit: async () => ({ outcome: 'global_limited', headers: { 'Retry-After': 60 } }),
      }),
    )
      .post(ASK)
      .send({ question: QUESTION })
      .expect(429);

    expect(text()).toContain('GLOBAL_DAILY_LIMIT_REACHED');
    expect(text()).not.toContain(QUESTION);
  });

  // An invalid question is reported field by field, so the issue messages must not
  // quote the value that failed.
  it('never writes the question text when the question is rejected as invalid', async () => {
    const { logger, text } = capture();

    await request(appLogging(logger, translatingTo({ kind: 'unsupported', reason: 'venue' })))
      .post(ASK)
      .send({ question: `${QUESTION} ${'a'.repeat(300)}` })
      .expect(422);

    expect(text()).not.toContain('Zephyr Quetzals');
  });

  it('records the failure by name rather than by the model output it carried', async () => {
    const { logger, text } = capture();
    const llmClient: LlmClient = {
      translateQuestion: async () => {
        throw new LlmInvalidOutputError(MODEL_OUTPUT_MARKER);
      },
    };

    await request(appLogging(logger, llmClient)).post(ASK).send({ question: QUESTION }).expect(422);

    expect(text()).toContain('LlmInvalidOutputError');
    expect(text()).not.toContain(MODEL_OUTPUT_MARKER);
  });

  it('logs nothing at info level for a request that failed', async () => {
    const { lines, logger } = capture();
    const llmClient: LlmClient = {
      translateQuestion: async () => {
        throw new LlmUpstreamError('bad gateway', 502);
      },
    };

    await request(appLogging(logger, llmClient)).post(ASK).send({ question: QUESTION }).expect(503);

    const levels = lines.map((line) => (JSON.parse(line) as { level: number }).level);
    expect(levels).not.toContain(30);
    expect(levels).toContain(40);
  });
});
