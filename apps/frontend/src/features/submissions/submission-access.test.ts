import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiResponseError, type AuthenticatedApiClient } from '../../api/client';
import {
  canRetrySubmissionAccess,
  loadSubmissionAccess,
  SUBMISSION_ACCESS_RETRY_DELAYS_MS,
  SubmissionAccessError,
  submissionAccessErrorMessage,
} from './submission-access';

const submitterProfile = {
  user: {
    id: '17',
    subject: 'approved-user',
    displayName: 'Submitter User',
    role: 'submitter',
    approvalState: 'approved',
    requestedCompetition: null,
    competitionIds: ['5'],
  },
};

function clientReturning(...outcomes: (unknown | Error)[]) {
  const request = vi.fn();
  for (const outcome of outcomes) {
    if (outcome instanceof Error) request.mockRejectedValueOnce(outcome);
    else request.mockResolvedValueOnce(outcome);
  }
  return { client: { request } as unknown as AuthenticatedApiClient, request };
}

function competitionResponse(status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: vi
      .fn()
      .mockResolvedValue(
        status === 200
          ? { data: { competitionId: '5', name: 'Example Competition' } }
          : { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Busy.' } },
      ),
  } as unknown as Response;
}

const noWait = vi.fn((_milliseconds: number, _signal: AbortSignal) => Promise.resolve());

afterEach(() => {
  noWait.mockClear();
  vi.unstubAllGlobals();
});

describe('loadSubmissionAccess (issue #909)', () => {
  it('retries a server error on the current-user request and then succeeds', async () => {
    const { client, request } = clientReturning(new ApiResponseError(503), submitterProfile);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(competitionResponse()));

    const access = await loadSubmissionAccess(client, new AbortController().signal, noWait);

    expect(access.kind).toBe('permitted');
    expect(request).toHaveBeenCalledTimes(2);
    expect(noWait).toHaveBeenCalledWith(SUBMISSION_ACCESS_RETRY_DELAYS_MS[0], expect.anything());
  });

  it('gives up after the bounded number of retries and reports an unavailable service', async () => {
    const attempts = SUBMISSION_ACCESS_RETRY_DELAYS_MS.length + 1;
    const { client, request } = clientReturning(
      ...Array.from({ length: attempts }, () => new ApiResponseError(502)),
    );

    const failure = await loadSubmissionAccess(client, new AbortController().signal, noWait).catch(
      (error: unknown) => error,
    );

    expect(request).toHaveBeenCalledTimes(attempts);
    expect(failure).toBeInstanceOf(SubmissionAccessError);
    expect(failure).toMatchObject({ stage: 'profile', reason: 'unavailable' });
    expect(canRetrySubmissionAccess(failure)).toBe(true);
  });

  it.each([
    [401, 'unauthenticated'],
    [403, 'not-permitted'],
  ] as const)('never retries a %i from the current-user request', async (status, reason) => {
    const { client, request } = clientReturning(new ApiResponseError(status));

    const failure = await loadSubmissionAccess(client, new AbortController().signal, noWait).catch(
      (error: unknown) => error,
    );

    expect(request).toHaveBeenCalledTimes(1);
    expect(noWait).not.toHaveBeenCalled();
    expect(failure).toMatchObject({ stage: 'profile', reason });
    expect(canRetrySubmissionAccess(failure)).toBe(false);
  });

  it('never retries a response that breaks the shared contract', async () => {
    const { client, request } = clientReturning({ user: { role: 'submitter' } });

    await expect(
      loadSubmissionAccess(client, new AbortController().signal, noWait),
    ).rejects.toMatchObject({ stage: 'profile', reason: 'unavailable' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('waits out a short Retry-After on the scope lookup instead of the default backoff', async () => {
    const { client } = clientReturning(submitterProfile);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(competitionResponse(429, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(competitionResponse());
    vi.stubGlobal('fetch', fetchMock);

    const access = await loadSubmissionAccess(client, new AbortController().signal, noWait);

    expect(access.kind).toBe('permitted');
    expect(noWait).toHaveBeenCalledWith(2000, expect.anything());
  });

  it('reports a long rate-limit window as a scope failure with the wait, not a role failure', async () => {
    const { client } = clientReturning(submitterProfile);
    const fetchMock = vi.fn().mockResolvedValue(competitionResponse(429, { 'Retry-After': '45' }));
    vi.stubGlobal('fetch', fetchMock);

    const failure = await loadSubmissionAccess(client, new AbortController().signal, noWait).catch(
      (error: unknown) => error,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(failure).toMatchObject({
      stage: 'competitions',
      reason: 'rate-limited',
      retryAfterSeconds: 45,
    });
    const message = submissionAccessErrorMessage(failure);
    expect(message).toContain('submitter role was confirmed');
    expect(message).toContain('Try again in 45 seconds.');
  });

  it('does not keep retrying once the page has abandoned the check', async () => {
    const controller = new AbortController();
    const { client, request } = clientReturning(new ApiResponseError(503), submitterProfile);
    const abortingWait = vi.fn((_milliseconds: number, signal: AbortSignal) => {
      controller.abort();
      return Promise.reject(signal.reason);
    });

    await expect(
      loadSubmissionAccess(client, controller.signal, abortingWait),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
