import {
  competitionListQuerySchema,
  competitorListQuerySchema,
  FIXTURE_EVENT_EXPORT_MAX_EVENTS,
  fixtureEventExportQuerySchema,
  fixtureEventListQuerySchema,
  fixtureListQuerySchema,
  fixtureStatisticEventExportQuerySchema,
  participantFixtureListQuerySchema,
  participantListQuerySchema,
  seasonListQuerySchema,
} from '@sport-analytics/contracts';
import type { FixtureStatistic, PublicEvent } from '@sport-analytics/contracts';
import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

import type { FixtureStatisticsService } from '../statistics/fixture-statistics.service';
import {
  fixtureEventExportFilename,
  normalizeExportEvent,
  serializeFixtureEventsCsv,
  type FixtureEventExportFilenameFilters,
} from './fixture-event-export';
import { FixtureEventExportTooLargeError, PublicReadInputError } from './public-read.errors';
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

      if (error instanceof FixtureEventExportTooLargeError) {
        response.status(422).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      // Any other failure, including one on a later export page, reaches the
      // error handler before a file has been sent, so it can never produce a
      // short export.
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

// The trace filters a statistic corresponds to, used only to name its export
// file the same way the filtered export of that trace is named.
function traceFilenameFilters(statistic: FixtureStatistic): FixtureEventExportFilenameFilters {
  return statistic.scope === 'innings'
    ? { inningsId: statistic.inningsId, competitorId: statistic.competitorId }
    : { participantId: statistic.participantId };
}

function sameEventOrder(events: PublicEvent[], eventIds: string[]): boolean {
  return (
    events.length === eventIds.length &&
    events.every((event, index) => event.eventId === eventIds[index])
  );
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

      const events = await service.exportFixtureEvents(
        getPathParameter(request, 'fixtureId'),
        query,
      );

      if (!events) {
        sendNotFound(response, 'Fixture');
        return;
      }

      response
        .status(200)
        .type('application/json')
        .json({ data: events.map(normalizeExportEvent) });
    }),

    exportFixtureEventsCsv: wrapPublicHandler(async (request, response) => {
      const query = parseQuery(fixtureEventExportQuerySchema, request, response);

      if (!query) {
        return;
      }

      const fixtureId = getPathParameter(request, 'fixtureId');
      const events = await service.exportFixtureEvents(fixtureId, query);

      if (!events) {
        sendNotFound(response, 'Fixture');
        return;
      }

      response
        .status(200)
        .type('text/csv')
        .attachment(fixtureEventExportFilename(fixtureId, query))
        .send(serializeFixtureEventsCsv(events));
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

/**
 * Calculation-trace exports: exactly the events a trace displays, so the file
 * reproduces the figure on the page it was downloaded from.
 */
export function createFixtureStatisticEventExportController(
  service: Pick<PublicReadService, 'exportFixtureEvents'>,
  fixtureStatisticsService: Pick<FixtureStatisticsService, 'getFixtureStatistic'>,
) {
  /**
   * The statistic's own contributing events, resolved through the derivation
   * the trace page renders, then read in full through the paging export.
   * Returns null when a response has already been sent.
   */
  async function readStatisticTraceEvents(
    request: Request,
    response: Response,
  ): Promise<{ fixtureId: string; events: PublicEvent[]; statistic: FixtureStatistic } | null> {
    const query = parseQuery(fixtureStatisticEventExportQuerySchema, request, response);
    if (!query) {
      return null;
    }

    const fixtureId = getPathParameter(request, 'fixtureId');
    const statistic = await fixtureStatisticsService.getFixtureStatistic(
      fixtureId,
      getPathParameter(request, 'statisticId'),
      { includeContributors: true },
    );
    if (!statistic) {
      sendNotFound(response, 'Fixture statistic');
      return null;
    }

    const tracedEventIds = (statistic.contributingEvents ?? []).map((event) => event.eventId);
    if (tracedEventIds.length > FIXTURE_EVENT_EXPORT_MAX_EVENTS) {
      throw new FixtureEventExportTooLargeError(FIXTURE_EVENT_EXPORT_MAX_EVENTS);
    }

    const events =
      tracedEventIds.length === 0
        ? []
        : await service.exportFixtureEvents(fixtureId, { eventIds: tracedEventIds });
    if (!events) {
      sendNotFound(response, 'Fixture');
      return null;
    }

    // The trace and the event rows are read separately, so a correction
    // accepted between the two reads could make them differ. The file must
    // then not be sent: it would silently disagree with the trace it names.
    if (!sameEventOrder(events, tracedEventIds)) {
      response.status(409).json({
        error: {
          code: 'EXPORT_TRACE_CHANGED',
          message:
            'The accepted events changed while this export was prepared, so it no longer matches the calculation trace. Reload the trace and try again.',
        },
      });
      return null;
    }

    return { fixtureId, events, statistic };
  }

  return {
    exportFixtureStatisticEventsJson: wrapPublicHandler(async (request, response) => {
      const trace = await readStatisticTraceEvents(request, response);

      if (!trace) {
        return;
      }

      response
        .status(200)
        .type('application/json')
        .json({ data: trace.events.map(normalizeExportEvent) });
    }),

    exportFixtureStatisticEventsCsv: wrapPublicHandler(async (request, response) => {
      const trace = await readStatisticTraceEvents(request, response);

      if (!trace) {
        return;
      }

      response
        .status(200)
        .type('text/csv')
        .attachment(
          fixtureEventExportFilename(trace.fixtureId, traceFilenameFilters(trace.statistic)),
        )
        .send(serializeFixtureEventsCsv(trace.events));
    }),
  };
}
