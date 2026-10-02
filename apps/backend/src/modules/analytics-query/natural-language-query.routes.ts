import { Router } from 'express';

import {
  createNaturalLanguageQueryController,
  type NaturalLanguageQueryControllerDependencies,
} from './natural-language-query.controller';

/**
 * The natural-language query route carries no authentication.
 *
 * The feature is offered to anonymous visitors through the home-page widget, and
 * it returns only resources the public statistics reads already serve
 * anonymously, so requiring a credential would gate a view of public data behind
 * an account.
 *
 * What stands in place of authentication is the durable limiter: a per-client
 * rate limit and daily quota, a global daily cap, and a bounded question length.
 * Those are the reason an anonymous endpoint in front of a paid provider is
 * affordable, so the route must never be mounted without them.
 */
export function createNaturalLanguageQueryRouter(
  dependencies: NaturalLanguageQueryControllerDependencies,
): Router {
  const router = Router();

  router.post('/natural-language-queries', createNaturalLanguageQueryController(dependencies));

  return router;
}
