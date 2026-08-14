import type { RequestHandler, Response } from 'express';

import type { ApplicationAccount } from '../accounts/account';

const WINDOW_MILLISECONDS = 60_000;
const MAX_SUBMISSIONS_PER_WINDOW = 30;

interface RateWindow {
  startedAt: number;
  count: number;
}

function accountId(response: Response): string {
  const account = response.locals.authenticatedAccount as ApplicationAccount | undefined;
  if (!account) {
    throw new Error('Submission rate limiting requires an authenticated application account');
  }

  return account.accountId;
}

export function createSubmissionRateLimit(
  maximum = MAX_SUBMISSIONS_PER_WINDOW,
  windowMilliseconds = WINDOW_MILLISECONDS,
): RequestHandler {
  const windows = new Map<string, RateWindow>();

  return (_request, response, next) => {
    let key: string;
    try {
      key = accountId(response);
    } catch (error) {
      next(error);
      return;
    }

    const now = Date.now();
    const existing = windows.get(key);
    const window =
      !existing || now - existing.startedAt >= windowMilliseconds
        ? { startedAt: now, count: 0 }
        : existing;

    window.count += 1;
    windows.set(key, window);

    const secondsUntilReset = Math.max(
      1,
      Math.ceil((window.startedAt + windowMilliseconds - now) / 1_000),
    );
    response.setHeader('RateLimit-Limit', maximum);
    response.setHeader('RateLimit-Remaining', Math.max(0, maximum - window.count));
    response.setHeader('RateLimit-Reset', secondsUntilReset);

    if (window.count > maximum) {
      response.setHeader('Retry-After', secondsUntilReset);
      response.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many submissions. Retry after the current rate-limit window.',
        },
      });
      return;
    }

    next();
  };
}
