import type { Competition, CurrentUserProfile } from '@sport-analytics/contracts';

import { ApiResponseError } from '../../api/client';
import type { AuthenticatedApiClient } from '../../api/client';
import { getCurrentUserProfile } from '../auth/current-user-api';
import { competitionOptions } from './BatchUploadPage';

/**
 * Loads what the Submit data page needs before it can show the form: the
 * account's persisted role (authenticated `/auth/me`) and the names of the
 * competitions in its scope (public competition reads).
 *
 * Issue #909: the competition names come from the canonical public read
 * endpoints, which count every browser without an API key against the
 * per-address anonymous read limit added in issue #821, signed-in or not. A
 * person who has just been browsing Explore Data can therefore reach Submit
 * data with that minute's allowance already spent, get a 429 for the scope
 * lookup, and see "Submission access could not be checked" even though their
 * role is fine. A cold backend, a dropped connection or a 5xx does the same.
 * Those failures are retried here with a short backoff, honouring a short
 * `Retry-After`, and anything left over is reported for what it is rather
 * than as a permission problem. Authentication and authorization refusals
 * (401, 403) and contract mismatches are never retried.
 */

export type SubmissionAccess =
  | {
      kind: 'forbidden';
      role: CurrentUserProfile['role'];
      approvalState: CurrentUserProfile['approvalState'];
    }
  | {
      kind: 'permitted';
      competitions: Competition[];
      profile: CurrentUserProfile & { role: 'submitter' | 'admin' };
    };

export type SubmissionAccessFailureStage = 'profile' | 'competitions';

export type SubmissionAccessFailureReason =
  'unauthenticated' | 'not-permitted' | 'rate-limited' | 'unavailable';

/** Thrown once retries are exhausted or the failure is not worth retrying. */
export class SubmissionAccessError extends Error {
  readonly stage: SubmissionAccessFailureStage;
  readonly reason: SubmissionAccessFailureReason;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    stage: SubmissionAccessFailureStage,
    reason: SubmissionAccessFailureReason,
    retryAfterSeconds?: number,
  ) {
    super(`Submission access ${stage} check failed: ${reason}`);
    this.name = 'SubmissionAccessError';
    this.stage = stage;
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Delays between attempts; the number of entries is the number of retries. */
export const SUBMISSION_ACCESS_RETRY_DELAYS_MS = [400, 1200] as const;

/**
 * The longest `Retry-After` the page will wait out on its own. A longer window
 * is shown to the person instead, so the page never sits on "Checking" for a
 * minute without saying why.
 */
const MAX_AUTOMATIC_RETRY_AFTER_SECONDS = 5;

type Sleep = (milliseconds: number, signal: AbortSignal) => Promise<void>;

function abortableSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function isTransient(error: unknown): boolean {
  if (error instanceof ApiResponseError) {
    return (
      error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
    );
  }

  // `fetch` rejects with a TypeError when the request never got a response:
  // offline, DNS, a dropped connection, or a gateway error without CORS headers.
  return error instanceof TypeError;
}

function classify(stage: SubmissionAccessFailureStage, error: unknown): SubmissionAccessError {
  if (error instanceof ApiResponseError) {
    if (error.kind === 'unauthenticated') {
      return new SubmissionAccessError(stage, 'unauthenticated');
    }

    // A 403 on `/auth/me` is a real refusal (for example a disabled account).
    if (error.kind === 'forbidden' && stage === 'profile') {
      return new SubmissionAccessError(stage, 'not-permitted');
    }

    if (error.status === 429) {
      return new SubmissionAccessError(stage, 'rate-limited', error.retryAfterSeconds);
    }
  }

  return new SubmissionAccessError(stage, 'unavailable');
}

async function withTransientRetry<Result>(
  stage: SubmissionAccessFailureStage,
  operation: () => Promise<Result>,
  signal: AbortSignal,
  sleep: Sleep,
): Promise<Result> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (signal.aborted) throw error;

      const delay = SUBMISSION_ACCESS_RETRY_DELAYS_MS[attempt];
      if (!isTransient(error) || delay === undefined) {
        throw classify(stage, error);
      }

      const retryAfter = error instanceof ApiResponseError ? error.retryAfterSeconds : undefined;
      if (retryAfter !== undefined && retryAfter > MAX_AUTOMATIC_RETRY_AFTER_SECONDS) {
        throw classify(stage, error);
      }

      await sleep(Math.max(delay, (retryAfter ?? 0) * 1000), signal);
    }
  }
}

export async function loadSubmissionAccess(
  client: AuthenticatedApiClient,
  signal: AbortSignal,
  sleep: Sleep = abortableSleep,
): Promise<SubmissionAccess> {
  const profile = await withTransientRetry(
    'profile',
    () => getCurrentUserProfile(client, signal),
    signal,
    sleep,
  );

  if (profile.role !== 'submitter' && profile.role !== 'admin') {
    return { kind: 'forbidden', role: profile.role, approvalState: profile.approvalState };
  }

  // The role is already known here, so a failure from this point on is about
  // loading competition names, never about whether the account may submit.
  const competitions = await withTransientRetry(
    'competitions',
    () => competitionOptions(profile, signal),
    signal,
    sleep,
  );

  return { kind: 'permitted', competitions, profile: { ...profile, role: profile.role } };
}

export function submissionAccessErrorMessage(error: unknown): string {
  if (!(error instanceof SubmissionAccessError)) {
    return 'Your application role and fixture scope could not be loaded. Please try again.';
  }

  if (error.reason === 'unauthenticated') {
    return 'Your session is no longer valid. Sign in again to continue.';
  }

  if (error.reason === 'not-permitted') {
    return 'Your account is not currently permitted to submit data.';
  }

  const wait =
    error.retryAfterSeconds === undefined
      ? 'Wait a moment, then try again.'
      : `Try again in ${error.retryAfterSeconds} second${error.retryAfterSeconds === 1 ? '' : 's'}.`;

  if (error.stage === 'competitions') {
    return error.reason === 'rate-limited'
      ? `Your submitter role was confirmed, but the competitions in your scope could not be loaded because the public data service is busy. Your permissions have not changed. ${wait}`
      : 'Your submitter role was confirmed, but the competitions in your scope could not be loaded. Your permissions have not changed. Please try again.';
  }

  return error.reason === 'rate-limited'
    ? `Your application role and fixture scope could not be loaded because the service is busy. ${wait}`
    : 'Your application role and fixture scope could not be loaded. Please try again.';
}

/** Only an expired session needs a new sign-in; everything else can be retried. */
export function canRetrySubmissionAccess(error: unknown): boolean {
  return !(
    error instanceof SubmissionAccessError &&
    (error.reason === 'unauthenticated' || error.reason === 'not-permitted')
  );
}
