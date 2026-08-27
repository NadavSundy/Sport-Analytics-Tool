import {
  correctionRequestSchema,
  submissionEventIdSchema,
  submissionRequestSchema,
} from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import { rejectAuthorization } from '../../middleware/authorization-response';
import type { ApplicationAccount } from '../accounts/account';
import {
  SubmissionConflictError,
  SubmissionForbiddenError,
  SubmissionValidationError,
} from './submission.errors';
import type { SubmissionService } from './submission.service';

function getAuthenticatedAccount(response: Response): ApplicationAccount {
  const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;

  if (!account) {
    throw new Error('Submission controller requires an authenticated application account');
  }

  return account;
}

export function createSubmissionController(service: SubmissionService): RequestHandler {
  return (request, response, next) => {
    const parsed = submissionRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The submission is invalid.',
          details: parsed.error.issues.map((issue) => {
            const eventPathIndex = issue.path[0] === 'events' ? issue.path[1] : undefined;
            return {
              code: 'INVALID_FIELD',
              message: issue.message,
              ...(issue.path.length > 0 ? { field: issue.path.join('.') } : {}),
              ...(typeof eventPathIndex === 'number' ? { eventIndex: eventPathIndex } : {}),
            };
          }),
        },
      });
      return;
    }

    let account: ApplicationAccount;
    try {
      account = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    void service
      .submit(account, parsed.data)
      .then((submission) => {
        response.status(201).json(submission);
      })
      .catch((error: unknown) => {
        if (error instanceof SubmissionForbiddenError) {
          rejectAuthorization(response);
          return;
        }

        if (error instanceof SubmissionValidationError) {
          response.status(422).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: error.message,
              details: error.details,
            },
          });
          return;
        }

        if (error instanceof SubmissionConflictError) {
          response.status(409).json({
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

export function createCorrectionController(service: SubmissionService): RequestHandler {
  return (request, response, next) => {
    const eventId = submissionEventIdSchema.safeParse(request.params.eventId);
    const parsed = correctionRequestSchema.safeParse(request.body);

    if (!eventId.success || !parsed.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The correction is invalid.',
          details: [
            ...(!eventId.success
              ? eventId.error.issues.map((issue) => ({
                  code: 'INVALID_FIELD',
                  message: issue.message,
                  field: 'eventId',
                }))
              : []),
            ...(!parsed.success
              ? parsed.error.issues.map((issue) => ({
                  code: 'INVALID_FIELD',
                  message: issue.message,
                  ...(issue.path.length > 0 ? { field: issue.path.join('.') } : {}),
                }))
              : []),
          ],
        },
      });
      return;
    }

    let account: ApplicationAccount;
    try {
      account = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    void service
      .correct(account, eventId.data, parsed.data)
      .then((correction) => response.status(200).json(correction))
      .catch((error: unknown) => {
        if (error instanceof SubmissionForbiddenError) {
          rejectAuthorization(response);
          return;
        }

        if (error instanceof SubmissionValidationError) {
          response.status(422).json({
            error: {
              code: 'VALIDATION_FAILED',
              message: error.message,
              details: error.details,
            },
          });
          return;
        }

        if (error instanceof SubmissionConflictError) {
          response.status(409).json({
            error: { code: error.code, message: error.message },
          });
          return;
        }

        next(error);
      });
  };
}
