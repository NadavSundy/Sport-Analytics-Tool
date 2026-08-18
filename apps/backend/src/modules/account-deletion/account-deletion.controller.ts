import {
  accountDeletionRequestSchema,
  accountDeletionResponseSchema,
} from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import type { VerifiedIdentity } from '../../auth/supabase-auth';
import type { ApplicationAccount } from '../accounts/account';
import {
  AccountDeletionIncompleteError,
  AccountDeletionUnavailableError,
  RecentAuthenticationRequiredError,
} from './account-deletion.errors';
import type { AccountDeletionService } from './account-deletion.service';

function authenticatedContext(response: Response): {
  account: ApplicationAccount;
  identity: VerifiedIdentity;
} {
  const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;
  const identity = response.locals.authenticatedIdentity as VerifiedIdentity | undefined;

  if (!account || !identity) {
    throw new Error('Account deletion requires an authenticated account and identity');
  }

  return { account, identity };
}

export function createAccountDeletionController(service: AccountDeletionService): RequestHandler {
  return (request, response, next) => {
    const parsed = accountDeletionRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(422).json({
        error: {
          code: 'DELETION_CONFIRMATION_REQUIRED',
          message: 'Enter DELETE exactly to confirm permanent account deletion.',
        },
      });
      return;
    }

    let context;
    try {
      context = authenticatedContext(response);
    } catch (error) {
      next(error);
      return;
    }

    void service
      .deleteAccount(context.account, context.identity)
      .then((result) => {
        response.status(200).json(accountDeletionResponseSchema.parse(result));
      })
      .catch((error: unknown) => {
        if (error instanceof AccountDeletionUnavailableError) {
          response.status(501).json({
            error: {
              code: error.code,
              message: error.message,
            },
          });
          return;
        }

        if (error instanceof RecentAuthenticationRequiredError) {
          response.status(403).json({
            error: {
              code: error.code,
              message: error.message,
            },
          });
          return;
        }

        if (error instanceof AccountDeletionIncompleteError) {
          response.status(503).json({
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
