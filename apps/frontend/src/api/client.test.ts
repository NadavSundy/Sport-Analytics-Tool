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

  it('exposes successful HTTP status when a caller needs it as a response discriminator', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(202, { data: { status: 'pending' } })),
    );
    const client = createAuthenticatedApiClient(() => 'current-access-token');

    await expect(client.requestWithStatus('/admin/dataset-releases')).resolves.toEqual({
      status: 202,
      body: { data: { status: 'pending' } },
    });
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

  it('preserves structured validation details from an API error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(422, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'The submission is invalid.',
            details: [
              {
                code: 'INVALID_FIELD',
                message: 'Total runs do not match.',
                field: 'events.0.runs.total',
                eventIndex: 0,
              },
            ],
          },
        }),
      ),
    );
    const client = createAuthenticatedApiClient(() => 'current-access-token');

    await expect(client.request('/submissions')).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'The submission is invalid.',
      details: [expect.objectContaining({ field: 'events.0.runs.total', eventIndex: 0 })],
    });
  });

  it('carries every fault of an all-or-nothing array with the task each one belongs to', async () => {
    // Error bodies are parsed by schema, and a plain object schema strips what
    // it does not declare. Without taskReference declared, a reviewer who sent
    // several decisions would be shown faults with nothing to attach them to.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(409, {
          error: {
            code: 'BATCH_PARTICIPANT_ONBOARDING_CONFLICT',
            message: 'One or more participant onboarding decisions could not be applied.',
            details: [
              {
                taskReference: '7c1a8f4e-1f5a-4f2b-9c3d-2e4f6a8b0c1d',
                code: 'TEAM_NOT_IN_FIXTURE',
                message: 'Name one of the two teams of the fixture this task belongs to.',
              },
              {
                taskReference: '9d2b7e5f-2a6b-4c3d-8e4f-3b5c7d9e1f2a',
                code: 'CANDIDATE_NOT_OFFERED',
                message: 'Choose one of the candidates this task offered.',
              },
            ],
          },
        }),
      ),
    );
    const client = createAuthenticatedApiClient(() => 'current-access-token');

    await expect(client.request('/batches/reference/participants')).rejects.toMatchObject({
      status: 409,
      code: 'BATCH_PARTICIPANT_ONBOARDING_CONFLICT',
      details: [
        {
          taskReference: '7c1a8f4e-1f5a-4f2b-9c3d-2e4f6a8b0c1d',
          code: 'TEAM_NOT_IN_FIXTURE',
          message: 'Name one of the two teams of the fixture this task belongs to.',
        },
        {
          taskReference: '9d2b7e5f-2a6b-4c3d-8e4f-3b5c7d9e1f2a',
          code: 'CANDIDATE_NOT_OFFERED',
          message: 'Choose one of the candidates this task offered.',
        },
      ],
    });
  });
});
