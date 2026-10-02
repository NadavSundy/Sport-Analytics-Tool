import { naturalLanguageQuerySchema } from '@sport-analytics/contracts';
import type { Request, RequestHandler, Response } from 'express';

import {
  LlmInvalidOutputError,
  LlmNotConfiguredError,
  LlmTimeoutError,
  LlmUpstreamError,
  type LlmClient,
} from './llm.client';
import type { NaturalLanguageQueryLimiter } from './natural-language-query.limiter';
import type { QueryDefinitionEvaluator } from './query-definition.evaluator';

/**
 * Answers a reader's question from the statistics the platform already publishes.
 *
 * The order of work is the point of this handler. The body is validated first, so
 * a malformed request cannot spend the day's budget; the limits are then consumed,
 * so every request that reaches the paid provider has been counted; and only then
 * is the question translated and the resulting definition evaluated. A request
 * that fails after admission still spends one attempt, which is the deliberate
 * cost of a budget that cannot be bypassed by failing on purpose.
 *
 * What the model returns can never become data. The adapter validates the model's
 * output against the issue #811 contract and raises `LlmInvalidOutputError` when
 * it does not satisfy it, so the evaluator only ever sees a definition that
 * passed, and anything else is reported as a question that was not understood.
 *
 * Nothing here logs the question or the model's output. The question is the
 * reader's own words, it reaches a third party already, and a log is the one place
 * it would be retained; the adapter's error messages are fixed strings for the
 * same reason.
 */

const LIMIT_RESPONSES = {
  rate_limited: {
    status: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Retry after the current rate-limit window.',
  },
  quota_exceeded: {
    status: 429,
    code: 'QUOTA_EXCEEDED',
    message: 'The daily question limit for this client has been reached.',
  },
  global_limited: {
    status: 429,
    code: 'GLOBAL_DAILY_LIMIT_REACHED',
    message: 'The service has answered its maximum number of questions today. Please try tomorrow.',
  },
  unavailable: {
    status: 503,
    code: 'RATE_LIMIT_UNAVAILABLE',
    message: 'Question rate limiting is temporarily unavailable. Please retry shortly.',
  },
} as const;

export interface NaturalLanguageQueryControllerDependencies {
  llmClient: LlmClient;
  evaluator: QueryDefinitionEvaluator;
  limiter: NaturalLanguageQueryLimiter;
  now?: () => Date;
}

export function createNaturalLanguageQueryController(
  dependencies: NaturalLanguageQueryControllerDependencies,
): RequestHandler {
  const now = dependencies.now ?? (() => new Date());

  return (request: Request, response: Response, next) => {
    const parsed = naturalLanguageQuerySchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The question is invalid.',
          details: parsed.error.issues.map((issue) => ({
            code: 'INVALID_FIELD',
            message: issue.message,
            ...(issue.path.length > 0 ? { field: issue.path.join('.') } : {}),
          })),
        },
      });
      return;
    }

    const { question } = parsed.data;
    const startedAt = process.hrtime.bigint();

    void (async () => {
      const decision = await dependencies.limiter.admit(request.ip ?? '', now());

      for (const [header, value] of Object.entries(decision.headers)) {
        response.setHeader(header, value);
      }

      if (decision.outcome !== 'admitted') {
        const { status, code, message } = LIMIT_RESPONSES[decision.outcome];
        request.log.warn(
          { event: 'natural_language_query_refused', failure: code },
          'Natural-language query refused by a limit',
        );
        response.status(status).json({ error: { code, message } });
        return;
      }

      const translationStartedAt = process.hrtime.bigint();
      const translation = await dependencies.llmClient.translateQuestion(question);
      const translationMs = elapsedMs(translationStartedAt);

      const evaluation = await dependencies.evaluator.evaluate(translation.definition);

      // Token counts are metered here rather than returned, so spend can be
      // summed against the ADR-017 limit without exposing it to the caller.
      request.log.info(
        {
          event: 'natural_language_query_answered',
          outcome: evaluation.outcome,
          definitionKind: translation.definition.kind,
          definitionVersion: evaluation.definitionVersion,
          model: translation.model,
          inputTokens: translation.usage.inputTokens,
          outputTokens: translation.usage.outputTokens,
          translationMs,
          totalMs: elapsedMs(startedAt),
        },
        'Natural-language query answered',
      );

      response.status(200).json({
        data: { question, model: translation.model, evaluation },
      });
    })().catch((error: unknown) => {
      if (!reportTranslationFailure(error, request, response)) {
        next(error);
      }
    });
  };
}

function elapsedMs(from: bigint): number {
  return Math.round(Number(process.hrtime.bigint() - from) / 1_000_000);
}

/**
 * Splits the adapter's failures into the two things they mean to a reader.
 *
 * A provider that is absent, unreachable or too slow is a temporary condition and
 * retrying may work, so it is `503`. Output that does not satisfy the contract is
 * not temporary — the same question would fail again — so it is reported as a
 * question that could not be translated. Every other error is left to the
 * application error handler, which keeps the statement-timeout `503` and the
 * generic `500`.
 */
function reportTranslationFailure(error: unknown, request: Request, response: Response): boolean {
  const unavailable =
    error instanceof LlmNotConfiguredError ||
    error instanceof LlmUpstreamError ||
    error instanceof LlmTimeoutError;

  if (!unavailable && !(error instanceof LlmInvalidOutputError)) {
    return false;
  }

  // `error.name` and the adapter's fixed messages carry neither the question nor
  // the model's output, so this is safe to log.
  request.log.warn(
    { event: 'natural_language_query_failed', failure: error.name },
    'Natural-language query failed',
  );

  if (unavailable) {
    response.status(503).json({
      error: {
        code: 'QUERY_SERVICE_UNAVAILABLE',
        message: 'Natural-language querying is temporarily unavailable. Please retry shortly.',
      },
    });
    return true;
  }

  response.status(422).json({
    error: {
      code: 'QUERY_NOT_UNDERSTOOD',
      message: 'The question could not be turned into a query over the published statistics.',
    },
  });
  return true;
}
