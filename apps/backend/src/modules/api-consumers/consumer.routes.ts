import { Router } from 'express';

import { createPublicReadController } from '../public-read/public-read.controller';
import type { PublicReadService } from '../public-read/public-read.service';
import { createConsumerAuthentication } from './consumer-authentication';
import type { ApiConsumerRepository } from './api-consumer.repository';

export function createConsumerRouter(
  service: PublicReadService,
  repository: ApiConsumerRepository,
): Router {
  const router = Router();
  const controller = createPublicReadController(service);
  const authenticate = createConsumerAuthentication(repository);
  router.get('/consumer/competitions', authenticate, controller.listCompetitions);
  router.get('/consumer/fixtures', authenticate, controller.listFixtures);
  return router;
}
