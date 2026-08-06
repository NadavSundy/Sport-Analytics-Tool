import { Router } from 'express';
import type { VerifiedIdentity, VerifyIdToken } from '../auth/firebase-auth';
import { requireAuthentication } from '../middleware/require-authentication';

export function createAuthRouter(verifyIdToken: VerifyIdToken): Router {
  const authRouter = Router();

  authRouter.get('/me', requireAuthentication(verifyIdToken), (_request, response, next) => {
    const identity = response.locals.authenticatedIdentity as VerifiedIdentity | undefined;

    if (!identity) {
      next(new Error('Authenticated identity was not attached to the response'));
      return;
    }

    response.status(200).json({
      identity: {
        subject: identity.uid,
      },
    });
  });

  return authRouter;
}
