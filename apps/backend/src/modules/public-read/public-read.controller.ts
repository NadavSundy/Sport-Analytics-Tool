import {
  competitionListQuerySchema,
  competitorListQuerySchema,
  fixtureEventListQuerySchema,
  fixtureListQuerySchema,
  participantFixtureListQuerySchema,
  participantListQuerySchema,
  seasonListQuerySchema,
} from '@sport-analytics/contracts';
import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

import { PublicReadInputError } from './public-read.errors';
import type { PublicReadService } from './public-read.service';

type AsyncHandler = (request: Request, response: Response) => Promise<void>;

function wrapPublicHandler(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    void handler(request, response).catch((error) => {
      if (error instanceof PublicReadInputError) {
        response.status(400).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      next(error);
    });
  };
}

function parseQuery<S extends z.ZodTypeAny>(
  schema: S,
  request: Request,
  response: Response,
): z.output<S> | undefined {
  const result = schema.safeParse(request.query);
  if (result.success) {
    return result.data;
  }

  response.status(400).json({
    error: {
      code: 'VALIDATION_FAILED',
      message: 'The request is invalid.',
      details: result.error.issues.map((issue) => ({
        code: 'INVALID_FIELD',
        message: issue.message,
        ...(issue.path.length > 0
          ? {
              field: issue.path.join('.'),
            }
          : {}),
      })),
    },
  });

  return undefined;
}
function getPathParameter(request: Request, name: string): string {
  const value = request.params[name];

  if (value === undefined) {
    throw new Error(`Expected route parameter "${name}" was not provided.`);
  }

  return value;
}

function sendNotFound(response: Response, resource: string): void {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `${resource} not found.`,
    },
  });
}

export function createPublicReadController(service: PublicReadService) {
  return {
    listCompetitions: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(competitionListQuerySchema, request, response);

      if (!query) {
        return;
      }

      response.status(200).json(await service.listCompetitions(query));
    }),

    getCompetition: wrapPublicHandler(async (request, response) => {
      const competition = await service.getCompetition(getPathParameter(request, 'competitionId'));

      if (!competition) {
        sendNotFound(response, 'Competition');
        return;
      }

      response.status(200).json({
        data: competition,
      });
    }),

    listSeasons: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(seasonListQuerySchema, request, response);

      if (!query) {
        return;
      }

      response.status(200).json(await service.listSeasons(query));
    }),

    getSeason: wrapPublicHandler(async (request, response) => {
      const season = await service.getSeason(getPathParameter(request, 'seasonId'));

      if (!season) {
        sendNotFound(response, 'Season');
        return;
      }

      response.status(200).json({
        data: season,
      });
    }),

    listFixtures: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(fixtureListQuerySchema, request, response);

      if (!query) {
        return;
      }

      response.status(200).json(await service.listFixtures(query));
    }),

    getFixture: wrapPublicHandler(async (request, response) => {
      const fixture = await service.getFixture(getPathParameter(request, 'fixtureId'));

      if (!fixture) {
        sendNotFound(response, 'Fixture');
        return;
      }

      response.status(200).json({
        data: fixture,
      });
    }),

    listFixtureEvents: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(fixtureEventListQuerySchema, request, response);

      if (!query) {
        return;
      }

      const result = await service.listFixtureEvents(getPathParameter(request, 'fixtureId'), query);

      if (!result) {
        sendNotFound(response, 'Fixture');
        return;
      }

      response.status(200).json(result);
    }),

    getFixtureEvent: wrapPublicHandler(async (request, response) => {
      const event = await service.getFixtureEvent(
        getPathParameter(request, 'fixtureId'),
        getPathParameter(request, 'eventId'),
      );

      if (!event) {
        sendNotFound(response, 'Event');
        return;
      }

      response.status(200).json({
        data: event,
      });
    }),

    listCompetitors: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(competitorListQuerySchema, request, response);

      if (!query) {
        return;
      }

      response.status(200).json(await service.listCompetitors(query));
    }),

    getCompetitor: wrapPublicHandler(async (request, response) => {
      const competitor = await service.getCompetitor(getPathParameter(request, 'competitorId'));

      if (!competitor) {
        sendNotFound(response, 'Competitor');
        return;
      }

      response.status(200).json({
        data: competitor,
      });
    }),

    listParticipants: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(participantListQuerySchema, request, response);

      if (!query) {
        return;
      }

      response.status(200).json(await service.listParticipants(query));
    }),

    getParticipant: wrapPublicHandler(async (request, response) => {
      const participant = await service.getParticipant(getPathParameter(request, 'participantId'));

      if (!participant) {
        sendNotFound(response, 'Participant');
        return;
      }

      response.status(200).json({
        data: participant,
      });
    }),

    listParticipantFixtures: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(participantFixtureListQuerySchema, request, response);

      if (!query) {
        return;
      }

      const result = await service.listParticipantFixtures(
        getPathParameter(request, 'participantId'),
        query,
      );

      if (!result) {
        sendNotFound(response, 'Participant');
        return;
      }

      response.status(200).json(result);
    }),
  };
}
