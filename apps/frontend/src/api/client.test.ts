import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiResponseError, createAuthenticatedApiClient } from './client';

function response(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('authenticated API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('attaches the current session access token as a bearer credential', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, { identity: { subject: 'user-1' } }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createAuthenticatedApiClient(() => 'current-access-token');

    await client.request('/auth/me');

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get('Authorization')).toBe(
      'Bearer current-access-token',
    );
  });

  it('does not send an authorization header without a session token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal('fetch', fetchMock);
    const client = createAuthenticatedApiClient(() => null);

    await client.request('/auth/me', {
      headers: { Authorization: 'Bearer stale-token' },
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).has('Authorization')).toBe(false);
  });

  it.each([
    [401, 'unauthenticated'],
    [403, 'forbidden'],
  ] as const)('preserves a %i response as %s', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(status)));
    const client = createAuthenticatedApiClient(() => 'current-access-token');

    const request = client.request('/auth/me');

    await expect(request).rejects.toBeInstanceOf(ApiResponseError);
    await expect(request).rejects.toMatchObject({ kind, status });
  });
});
