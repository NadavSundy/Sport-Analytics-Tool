import { Router } from 'express';

import { createQueryDefinitionController } from './query-definition.controller';
import type { QueryDefinitionEvaluator } from './query-definition.evaluator';

/**
 * The evaluation route carries no authentication.
 *
 * It is mounted alongside the public statistics reads because that is what it
 * is: it resolves names and returns the resources those reads already serve
 * anonymously. Requiring a token here would gate a view of public data behind
 * an account, and the natural-language experience this supports is offered to
 * anonymous visitors.
 */
export function createQueryDefinitionRouter(evaluator: QueryDefinitionEvaluator): Router {
  const router = Router();

  router.post('/query-definitions/evaluate', createQueryDefinitionController(evaluator));

  return router;
}
