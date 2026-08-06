import type { RequestHandler, Response } from 'express';
import type { VerifyAccessToken } from '../auth/supabase-auth';

function rejectAuthentication(response: Response): void {
  response.setHeader('WWW-Authenticate', 'Bearer');
  response.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'A valid authentication token is required.',
    },
  });
}

export function requireAuthentication(verifyAccessToken: VerifyAccessToken): RequestHandler {
  return async (request, response, next) => {
    const authorization = request.get('authorization');
    const parts = authorization?.trim().split(/\s+/);
    const scheme = parts?.[0];
    const token = parts?.[1];

    if (parts?.length !== 2 || scheme?.toLowerCase() !== 'bearer' || !token) {
      rejectAuthentication(response);
      return;
    }

    try {
      const identity = await verifyAccessToken(token);
      response.locals.authenticatedIdentity = identity;
      next();
    } catch {
      // Do not reveal token-validation details or log the submitted token.
      rejectAuthentication(response);
    }
  };
}
