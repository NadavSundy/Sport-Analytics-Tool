import { Router } from 'express';

import { createPublicReadController } from './public-read.controller';
import type { PublicReadService } from './public-read.service';

export function createPublicReadRouter(service: PublicReadService): Router {
  const router = Router();
  const controller = createPublicReadController(service);

  router.get('/competitions', controller.listCompetitions);

  router.get('/competitions/:competitionId', controller.getCompetition);

  router.get('/seasons', controller.listSeasons);

  router.get('/seasons/:seasonId', controller.getSeason);

  router.get('/fixtures', controller.listFixtures);

  router.get('/fixtures/:fixtureId', controller.getFixture);

  router.get('/fixtures/:fixtureId/events', controller.listFixtureEvents);

  router.get('/fixtures/:fixtureId/events/export.json', controller.exportFixtureEventsJson);

  router.get('/fixtures/:fixtureId/events/export.csv', controller.exportFixtureEventsCsv);

  router.get('/fixtures/:fixtureId/events/:eventId', controller.getFixtureEvent);

  router.get('/competitors', controller.listCompetitors);

  router.get('/competitors/:competitorId', controller.getCompetitor);

  router.get('/participants', controller.listParticipants);

  router.get('/participants/:participantId/fixtures', controller.listParticipantFixtures);

  router.get('/participants/:participantId', controller.getParticipant);

  return router;
}
