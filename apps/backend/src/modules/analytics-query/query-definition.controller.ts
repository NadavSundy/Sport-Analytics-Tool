import { analyticsQueryDefinitionSchema } from '@sport-analytics/contracts';
import type { Request, RequestHandler, Response } from 'express';

import type { QueryDefinitionEvaluator } from './query-definition.evaluator';

/**
 * Evaluates a query definition sent as the request body.
 *
 * A body that is not JSON is already answered `400 INVALID_JSON` by the
 * application's error handler, so the only failure this reports is a body that
 * parses but does not satisfy the issue #811 contract, which is
 * `422 VALIDATION_FAILED`, as the other POST operations report an invalid body.
 *
 * Every other result is `200`. A reference that resolves to nothing or to more
 * than one entity, and a question the published statistics cannot answer, are
 * outcomes rather than failures: the request was valid and the platform answered
 * it correctly by saying so.
 */
export function createQueryDefinitionController(
  evaluator: QueryDefinitionEvaluator,
): RequestHandler {
  return (request: Request, response: Response, next) => {
    const parsed = analyticsQueryDefinitionSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The query definition is invalid.',
          details: parsed.error.issues.map((issue) => ({
            code: 'INVALID_FIELD',
            message: issue.message,
            ...(issue.path.length > 0 ? { field: issue.path.join('.') } : {}),
          })),
        },
      });
      return;
    }

    void evaluator
      .evaluate(parsed.data)
      .then((evaluation) => {
        response.status(200).json({ data: evaluation });
      })
      .catch(next);
  };
}
