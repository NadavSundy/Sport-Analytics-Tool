import { submitterAccessRequestResponseSchema } from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import type { ApplicationAccount } from '../accounts/account';
import { SubmitterAccessConflictError } from './submitter-access.errors';
import type { SubmitterAccessService } from './submitter-access.service';

function getAuthenticatedAccount(response: Response): ApplicationAccount {
  const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;

  if (!account) {
    throw new Error('Submitter access controller requires an authenticated application account');
  }

  return account;
}

export function createSubmitterAccessController(service: SubmitterAccessService): RequestHandler {
  return (_request, response, next) => {
    let account: ApplicationAccount;

    try {
      account = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    void service
      .requestAccess(account)
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

        next(error);
      });
  };
}
