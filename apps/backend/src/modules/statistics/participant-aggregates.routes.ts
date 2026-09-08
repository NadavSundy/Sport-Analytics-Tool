import { Router } from 'express';

import { createParticipantAggregatesController } from './participant-aggregates.controller';
import type { ParticipantAggregatesService } from './participant-aggregates.service';

export function createParticipantAggregatesRouter(service: ParticipantAggregatesService): Router {
  const router = Router();
  const controller = createParticipantAggregatesController(service);

  router.get('/participants/:participantId/statistics', controller.getParticipantAggregates);
  router.get(
    '/participants/:participantId/statistics/:statisticId',
    controller.getParticipantAggregate,
  );

  return router;
}
