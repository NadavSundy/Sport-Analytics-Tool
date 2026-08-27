import { currentUserProfileResponseSchema } from '@sport-analytics/contracts';
import { Router } from 'express';
import type { VerifyAccessToken } from '../auth/supabase-auth';
import { requireAuthentication } from '../middleware/require-authentication';
import type { ApplicationAccount } from '../modules/accounts/account';
import type { SynchronizeAccount } from '../modules/accounts/account.service';

export function createAuthRouter(
  verifyAccessToken: VerifyAccessToken,
  synchronizeAccount: SynchronizeAccount,
): Router {
  const authRouter = Router();

  authRouter.get(
    '/me',
    requireAuthentication(verifyAccessToken, synchronizeAccount),
    (_request, response, next) => {
      const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;

      if (!account) {
        next(new Error('Authenticated account was not attached to the response'));
        return;
      }

      const responseBody = currentUserProfileResponseSchema.parse({
        user: {
          id: account.accountId,
          subject: account.subject,
          displayName: account.displayName,
          role: account.role,
          approvalState: account.approvalState,
          requestedCompetition: account.requestedCompetition,
          competitionIds: account.competitionIds,
        },
      });

      response.status(200).json(responseBody);
    },
  );

  return authRouter;
}
