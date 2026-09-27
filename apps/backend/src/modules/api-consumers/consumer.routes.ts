import type { RequestHandler } from 'express';
import { Router } from 'express';

import {
  createFixtureStatisticEventExportController,
  createPublicReadController,
} from '../public-read/public-read.controller';
import type { PublicReadService } from '../public-read/public-read.service';
import { createFixtureStatisticsController } from '../statistics/fixture-statistics.controller';
import type { FixtureStatisticsService } from '../statistics/fixture-statistics.service';
import { createParticipantAggregatesController } from '../statistics/participant-aggregates.controller';
import type { ParticipantAggregatesService } from '../statistics/participant-aggregates.service';

export function createConsumerRouter(
  service: PublicReadService,
  fixtureStatisticsService: FixtureStatisticsService,
  participantAggregatesService: ParticipantAggregatesService,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const publicReadController = createPublicReadController(service);
  const fixtureStatisticsController = createFixtureStatisticsController(fixtureStatisticsService);
  const participantAggregatesController = createParticipantAggregatesController(
    participantAggregatesService,
  );
  const traceExportController = createFixtureStatisticEventExportController(
    service,
    fixtureStatisticsService,
  );

  router.get('/consumer/competitions', authenticate, publicReadController.listCompetitions);
  router.get('/consumer/fixtures', authenticate, publicReadController.listFixtures);
  router.get('/consumer/fixtures/:fixtureId', authenticate, publicReadController.getFixture);
  router.get(
    '/consumer/fixtures/:fixtureId/events',
    authenticate,
    publicReadController.listFixtureEvents,
  );
  router.get(
    '/consumer/fixtures/:fixtureId/events/export.json',
    authenticate,
    publicReadController.exportFixtureEventsJson,
  );
  router.get(
    '/consumer/fixtures/:fixtureId/events/export.csv',
    authenticate,
    publicReadController.exportFixtureEventsCsv,
  );
  router.get(
    '/consumer/fixtures/:fixtureId/events/:eventId',
    authenticate,
    publicReadController.getFixtureEvent,
  );
  router.get(
    '/consumer/fixtures/:fixtureId/statistics',
    authenticate,
    fixtureStatisticsController.getFixtureStatistics,
  );
  router.get(
    '/consumer/fixtures/:fixtureId/statistics/:statisticId',
    authenticate,
    fixtureStatisticsController.getFixtureStatistic,
  );
  router.get(
    '/consumer/fixtures/:fixtureId/statistics/:statisticId/events/export.json',
    authenticate,
    traceExportController.exportFixtureStatisticEventsJson,
  );
  router.get(
    '/consumer/fixtures/:fixtureId/statistics/:statisticId/events/export.csv',
    authenticate,
    traceExportController.exportFixtureStatisticEventsCsv,
  );
  router.get(
    '/consumer/participants/:participantId/statistics',
    authenticate,
    participantAggregatesController.getParticipantAggregates,
  );
  router.get(
    '/consumer/participants/:participantId/statistics/:statisticId',
    authenticate,
    participantAggregatesController.getParticipantAggregate,
  );
  return router;
}
