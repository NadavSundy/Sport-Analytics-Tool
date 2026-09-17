import { leaderboardQuerySchema } from '@sport-analytics/contracts';
import type { Request, RequestHandler, Response } from 'express';

import { PublicReadInputError } from '../public-read/public-read.errors';
import type { LeaderboardsService } from './leaderboards.service';

export function createLeaderboardsController(service: LeaderboardsService): RequestHandler {
  return (request: Request, response: Response, next) => {
    const parsed = leaderboardQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The request is invalid.',
          details: parsed.error.issues.map((issue) => ({
            code: 'INVALID_FIELD',
            message: issue.message,
            ...(issue.path.length > 0 ? { field: issue.path.join('.') } : {}),
          })),
        },
      });
      return;
    }

    void service
      .getLeaderboard(parsed.data)
      .then((leaderboard) => {
        if (!leaderboard) {
          response.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Leaderboard scope not found.' },
          });
          return;
        }
        response.status(200).json({ data: leaderboard });
      })
      .catch((error: unknown) => {
        if (error instanceof PublicReadInputError) {
          response.status(400).json({ error: { code: error.code, message: error.message } });
          return;
        }
        next(error);
      });
  };
}
