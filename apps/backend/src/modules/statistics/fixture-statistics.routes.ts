import { Router } from 'express';

import { createFixtureStatisticsController } from './fixture-statistics.controller';
import type { FixtureStatisticsService } from './fixture-statistics.service';

export function createFixtureStatisticsRouter(service: FixtureStatisticsService): Router {
  const router = Router();
  const controller = createFixtureStatisticsController(service);

  router.get('/fixtures/:fixtureId/statistics', controller.getFixtureStatistics);
  router.get('/fixtures/:fixtureId/statistics/:statisticId', controller.getFixtureStatistic);

  return router;
}
