import {
  competitionListQuerySchema,
  competitorListQuerySchema,
  FIXTURE_EVENT_EXPORT_LIMIT,
  fixtureEventExportQuerySchema,
  fixtureEventListQuerySchema,
  fixtureListQuerySchema,
  participantFixtureListQuerySchema,
  participantListQuerySchema,
  seasonListQuerySchema,
} from '@sport-analytics/contracts';
import type { PublicEvent } from '@sport-analytics/contracts';
import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

import { PublicReadInputError } from './public-read.errors';
import type { PublicReadService } from './public-read.service';

const fixtureEventCsvColumns = [
  'eventId',
  'fixtureId',
  'competitionId',
  'competitionName',
  'inningsId',
  'inningsOrdinal',
  'sequenceNumber',
  'overNumber',
  'positionInOver',
  'ballNumber',
  'battingCompetitorId',
  'battingCompetitorName',
  'bowlingCompetitorId',
  'bowlingCompetitorName',
  'strikerParticipantId',
  'strikerParticipantName',
  'nonStrikerParticipantId',
  'nonStrikerParticipantName',
  'bowlerParticipantId',
  'bowlerParticipantName',
  'runsOffBat',
  'runsExtras',
  'runsTotal',
  'runsNonBoundary',
  'extrasWides',
  'extrasNoBalls',
  'extrasByes',
  'extrasLegByes',
  'extrasPenalty',
  'wicketCount',
  'wicketIds',
  'wicketKinds',
  'playersOutParticipantIds',
  'playersOutParticipantNames',
  'fielderParticipantIds',
  'fielderParticipantNames',
] as const;

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

function escapeCsvCell(value: boolean | number | string | null): string {
  let text = value === null ? '' : String(value);

  // Prevent spreadsheet applications from interpreting public text as a formula.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function normalizeExportEvent(event: PublicEvent): PublicEvent {
  return {
    ...event,
    extras: {
      wides: event.extras.wides ?? 0,
      noBalls: event.extras.noBalls ?? 0,
      byes: event.extras.byes ?? 0,
      legByes: event.extras.legByes ?? 0,
      penalty: event.extras.penalty ?? 0,
    },
  };
}

function filenamePart(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function fixtureEventExportFilename(
  fixtureId: string,
  query: z.output<typeof fixtureEventExportQuerySchema>,
): string {
  const trace = [
    query.inningsId ? `innings-${filenamePart(query.inningsId)}` : null,
    query.competitorId ? `team-${filenamePart(query.competitorId)}` : null,
    query.participantId ? `player-${filenamePart(query.participantId)}` : null,
    query.overNumber !== undefined ? `over-${query.overNumber}` : null,
    query.wicketKind ? `wicket-${filenamePart(query.wicketKind)}` : null,
  ].filter((part): part is string => part !== null);

  return `fixture-${filenamePart(fixtureId)}-${trace.length > 0 ? trace.join('-') : 'all'}-events.csv`;
}

function serializeFixtureEventsCsv(events: PublicEvent[]): string {
  const rows = events.map((event) => {
    const wickets = event.wickets;
    const fielderParticipantIds = wickets.flatMap((wicket) =>
      wicket.fielders.flatMap((fielder) =>
        fielder.participantId === null ? [] : [fielder.participantId],
      ),
    );
    const fielderParticipantNames = wickets.flatMap((wicket) =>
      wicket.fielders.flatMap((fielder) =>
        fielder.participantName === null ? [] : [fielder.participantName],
      ),
    );

    const values: Array<boolean | number | string | null> = [
      event.eventId,
      event.fixtureId,
      event.competitionId,
      event.competitionName,
      event.inningsId,
      event.inningsOrdinal,
      event.sequenceNumber,
      event.overNumber,
      event.positionInOver,
      event.ballNumber,
      event.battingCompetitorId,
      event.battingCompetitorName,
      event.bowlingCompetitorId,
      event.bowlingCompetitorName,
      event.strikerParticipantId,
      event.strikerParticipantName,
      event.nonStrikerParticipantId,
      event.nonStrikerParticipantName,
      event.bowlerParticipantId,
      event.bowlerParticipantName,
      event.runs.offBat,
      event.runs.extras,
      event.runs.total,
      event.runs.nonBoundary,
      event.extras.wides ?? 0,
      event.extras.noBalls ?? 0,
      event.extras.byes ?? 0,
      event.extras.legByes ?? 0,
      event.extras.penalty ?? 0,
      wickets.length,
      wickets.map((wicket) => wicket.wicketId).join('|'),
      wickets.map((wicket) => wicket.kind).join('|'),
      wickets.map((wicket) => wicket.playerOutParticipantId).join('|'),
      wickets.map((wicket) => wicket.playerOutParticipantName).join('|'),
      fielderParticipantIds.join('|'),
      fielderParticipantNames.join('|'),
    ];

    return values.map(escapeCsvCell).join(',');
  });

  return [fixtureEventCsvColumns.join(','), ...rows].join('\r\n').concat('\r\n');
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

    exportFixtureEventsJson: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(fixtureEventExportQuerySchema, request, response);

      if (!query) {
        return;
      }

      const result = await service.listFixtureEvents(getPathParameter(request, 'fixtureId'), {
        ...query,
        limit: FIXTURE_EVENT_EXPORT_LIMIT,
      });

      if (!result) {
        sendNotFound(response, 'Fixture');
        return;
      }

      response
        .status(200)
        .type('application/json')
        .json({ data: result.data.map(normalizeExportEvent) });
    }),

    exportFixtureEventsCsv: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(fixtureEventExportQuerySchema, request, response);

      if (!query) {
        return;
      }

      const fixtureId = getPathParameter(request, 'fixtureId');
      const result = await service.listFixtureEvents(fixtureId, {
        ...query,
        limit: FIXTURE_EVENT_EXPORT_LIMIT,
      });

      if (!result) {
        sendNotFound(response, 'Fixture');
        return;
      }

      response
        .status(200)
        .type('text/csv')
        .attachment(fixtureEventExportFilename(fixtureId, query))
        .send(serializeFixtureEventsCsv(result.data));
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
