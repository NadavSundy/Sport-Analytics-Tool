import {
  submitterAccessRequestResponseSchema,
  submitterAccessRequestSchema,
  submitterScopeRequestResponseSchema,
} from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import type { ApplicationAccount } from '../accounts/account';
import {
  InvalidRequestedCompetitionError,
  SubmitterAccessConflictError,
} from './submitter-access.errors';
import type { SubmitterAccessService } from './submitter-access.service';

function getAuthenticatedAccount(response: Response): ApplicationAccount {
  const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;

  if (!account) {
    throw new Error('Submitter access controller requires an authenticated application account');
  }

  return account;
}

export function createSubmitterAccessController(service: SubmitterAccessService): RequestHandler {
  return (request, response, next) => {
    const parsed = submitterAccessRequestSchema.safeParse(request.body);

    if (!parsed.success || !isDatabaseIdentifier(parsed.data.competitionId)) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The submitter access request is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              field: 'competitionId',
              message: 'Select a valid competition.',
            },
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
      .requestAccess(account, parsed.data)
      .then((result) => {
        response.status(201).json(submitterAccessRequestResponseSchema.parse(result));
      })
      .catch((error: unknown) => {
        if (error instanceof SubmitterAccessConflictError) {
          response.status(409).json({
            error: {
              code: error.code,
              message: error.message,
            },
          });
          return;
        }

        if (error instanceof InvalidRequestedCompetitionError) {
          response.status(422).json({
            error: {
              code: 'INVALID_COMPETITION_SCOPE',
              message: error.message,
              details: [
                {
                  code: 'INVALID_SCOPE',
                  field: 'competitionId',
                  message: 'Select a competition that currently exists.',
                },
              ],
            },
          });
          return;
        }

        next(error);
      });
  };
}

export function createSubmitterScopeRequestController(
  service: SubmitterAccessService,
): RequestHandler {
  return (request, response, next) => {
    const parsed = submitterAccessRequestSchema.safeParse(request.body);

    if (!parsed.success || !isDatabaseIdentifier(parsed.data.competitionId)) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The additional competition scope request is invalid.',
          details: [
            {
              code: 'INVALID_FIELD',
              field: 'competitionId',
              message: 'Select a valid competition.',
            },
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
      .requestAdditionalScope(account, parsed.data)
      .then((result) => {
        response.status(201).json(submitterScopeRequestResponseSchema.parse(result));
      })
      .catch((error: unknown) => {
        if (error instanceof SubmitterAccessConflictError) {
          response.status(409).json({
            error: { code: error.code, message: error.message },
          });
          return;
        }

        if (error instanceof InvalidRequestedCompetitionError) {
          response.status(422).json({
            error: {
              code: 'INVALID_COMPETITION_SCOPE',
              message: error.message,
              details: [
                {
                  code: 'INVALID_SCOPE',
                  field: 'competitionId',
                  message: 'Select a competition that currently exists.',
                },
              ],
            },
          });
          return;
        }

        next(error);
      });
  };
}

function isDatabaseIdentifier(value: string): boolean {
  if (!/^[1-9]\d*$/.test(value)) {
    return false;
  }

  try {
    return BigInt(value) <= 9_223_372_036_854_775_807n;
  } catch {
    return false;
  }
}
