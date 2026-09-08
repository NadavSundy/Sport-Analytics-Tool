import { participantAggregatesQuerySchema } from '@sport-analytics/contracts';
import type { Request, RequestHandler, Response } from 'express';

import type { ParticipantAggregatesService } from './participant-aggregates.service';

type AsyncHandler = (request: Request, response: Response) => Promise<void>;

function wrapHandler(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    void handler(request, response).catch(next);
  };
}

function pathParameter(request: Request, name: string): string {
  const value = request.params[name];
  if (value === undefined) {
    throw new Error(`Expected route parameter "${name}" was not provided.`);
  }

  return value;
}

function parseQuery(request: Request, response: Response) {
  const result = participantAggregatesQuerySchema.safeParse(request.query);
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
        ...(issue.path.length > 0 ? { field: issue.path.join('.') } : {}),
      })),
    },
  });
  return null;
}

function sendNotFound(response: Response): void {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Participant statistics not found.',
    },
  });
}

export function createParticipantAggregatesController(service: ParticipantAggregatesService) {
  return {
    getParticipantAggregates: wrapHandler(async (request, response) => {
      const query = parseQuery(request, response);
      if (!query) {
        return;
      }

      const aggregates = await service.getParticipantAggregates(
        pathParameter(request, 'participantId'),
        query,
      );
      if (!aggregates) {
        sendNotFound(response);
        return;
      }

      response.status(200).json({ data: aggregates });
    }),

    getParticipantAggregate: wrapHandler(async (request, response) => {
      const aggregate = await service.getParticipantAggregate(
        pathParameter(request, 'participantId'),
        pathParameter(request, 'statisticId'),
      );
      if (!aggregate) {
        sendNotFound(response);
        return;
      }

      response.status(200).json({ data: aggregate });
    }),
  };
}
