import { Router } from 'express';

import { createLeaderboardsController } from './leaderboards.controller';
import type { LeaderboardsService } from './leaderboards.service';

export function createLeaderboardsRouter(service: LeaderboardsService): Router {
  const router = Router();
  router.get('/statistics/leaderboards', createLeaderboardsController(service));
  return router;
}
