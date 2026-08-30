import type { Request, RequestHandler, Response } from 'express';
import type { ApplicationAccount } from '../modules/accounts/account';
import { rejectAuthorization } from './authorization-response';

type CompetitionIdResolver = (request: Request) => string | undefined | Promise<string | undefined>;

function getAuthenticatedAccount(response: Response): ApplicationAccount {
  const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;

  if (!account) {
    throw new Error('Authorization middleware requires an authenticated application account');
  }

  return account;
}

export function requireAdministrator(): RequestHandler {
  return (_request, response, next) => {
    let account: ApplicationAccount;

    try {
      account = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    if (account.role !== 'admin') {
      rejectAuthorization(response);
      return;
    }

    next();
  };
}

export function requireSubmitter(): RequestHandler {
  return (_request, response, next) => {
    let account: ApplicationAccount;

    try {
      account = getAuthenticatedAccount(response);
    } catch (error) {
      next(error);
      return;
    }

    if (account.role !== 'submitter' && account.role !== 'admin') {
      rejectAuthorization(response);
      return;
    }

    next();
  };
}

function hasCompetitionScope(account: ApplicationAccount, competitionId: string): boolean {
  return account.competitionIds.includes(competitionId);
}

export function canSubmitToCompetition(
  account: ApplicationAccount,
  competitionId: string,
): boolean {
  return account.role === 'admin' || hasCompetitionScope(account, competitionId);
}

export function requireCompetitionScope(
  resolveCompetitionId: CompetitionIdResolver,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const account = getAuthenticatedAccount(response);
      const competitionId = await resolveCompetitionId(request);

      if (!competitionId) {
        throw new Error('Competition-scope authorization requires a competition identifier');
      }

      if (!hasCompetitionScope(account, competitionId)) {
        rejectAuthorization(response);
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
