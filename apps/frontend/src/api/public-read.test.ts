import {
  competitionCollectionResponseSchema,
  fixtureWeatherResponseSchema,
  naturalLanguageQueryResponseSchema,
} from '@sport-analytics/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiResponseError } from './client';
import {
  ApiContractError,
  fixtureEventExportFilename,
  postPublicApi,
  requestPublicApi,
} from './public-read';

const testApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('public read API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('requests and validates public data without an authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(200, {
        data: [{ competitionId: 'competition-1', name: 'Premier League' }],
        pagination: { nextCursor: null },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestPublicApi(
      '/competitions?name=Premier',
      competitionCollectionResponseSchema,
    );

    expect(result.data[0]?.name).toBe('Premier League');
    expect(fetchMock).toHaveBeenCalledWith(
      `${testApiBaseUrl}/competitions?name=Premier`,
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).has('Authorization')).toBe(false);
  });

  it('names event exports for their active trace filters', () => {
    expect(fixtureEventExportFilename('8936', 'csv', { participantId: '20511' })).toBe(
      'fixture-8936-player-20511-events.csv',
    );
    expect(
      fixtureEventExportFilename('8936', 'csv', {
        inningsId: '401',
        competitorId: '77',
      }),
    ).toBe('fixture-8936-innings-401-team-77-events.csv');
    expect(fixtureEventExportFilename('8936', 'json', {})).toBe('fixture-8936-all-events.json');
  });

  it('exposes a safe backend error message and status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(400, {
          error: { code: 'INVALID_QUERY', message: 'The fixture filters are invalid.' },
        }),
      ),
    );

    const request = requestPublicApi('/fixtures?limit=0', competitionCollectionResponseSchema);

    await expect(request).rejects.toBeInstanceOf(ApiResponseError);
    await expect(request).rejects.toMatchObject({
      message: 'The fixture filters are invalid.',
      status: 400,
    });
  });

  it('rejects a successful response that violates the shared contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(200, { data: [{ privateAccountEmail: 'private@test' }] })),
    );

    await expect(
      requestPublicApi('/competitions', competitionCollectionResponseSchema),
    ).rejects.toBeInstanceOf(ApiContractError);
  });

  it.each(['LOCATION_NOT_FOUND', 'UNSUPPORTED_DATE'])(
    'parses fixture-weather unavailable responses without a contract error',
    async (reason) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          response(200, {
            data: {
              fixtureId: '17',
              date: '2026-08-19',
              availability: 'unavailable',
              reason,
              venue: { name: 'AMI Stadium', city: 'Christchurch' },
              weather: null,
            },
          }),
        ),
      );

      await expect(
        requestPublicApi('/fixtures/17/weather', fixtureWeatherResponseSchema),
      ).resolves.toMatchObject({ data: { availability: 'unavailable', reason } });
    },
  );
});

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const ASK_PATH = '/natural-language-queries';
const EVALUATION = {
  outcome: 'unsupported' as const,
  definitionVersion: `qdv1_${'a'.repeat(43)}`,
  definition: { kind: 'unsupported' as const, reason: 'venue' as const },
  reason: 'venue' as const,
};

describe('public API POST', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('posts JSON without an authorization header and validates the response', async () => {
    const body = {
      data: { question: 'most sixes by venue', model: 'test-model', evaluation: EVALUATION },
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, body));
    vi.stubGlobal('fetch', fetchMock);

    const result = await postPublicApi(
      ASK_PATH,
      { question: 'most sixes by venue' },
      naturalLanguageQueryResponseSchema,
    );

    expect(result.data.model).toBe('test-model');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${testApiBaseUrl}${ASK_PATH}`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ question: 'most sixes by venue' }));
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  // The widget distinguishes nine outcomes by code, so a dropped code would make
  // several of them indistinguishable.
  it('carries the error code through', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          error: { code: 'QUERY_NOT_UNDERSTOOD', message: 'Could not be translated.' },
        }),
      ),
    );

    const failure = await postPublicApi(
      ASK_PATH,
      { question: 'nonsense' },
      naturalLanguageQueryResponseSchema,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiResponseError);
    expect((failure as ApiResponseError).status).toBe(422);
    expect((failure as ApiResponseError).code).toBe('QUERY_NOT_UNDERSTOOD');
    expect((failure as ApiResponseError).message).toBe('Could not be translated.');
  });

  it('reads Retry-After as whole seconds', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            429,
            { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests.' } },
            { 'Retry-After': '42' },
          ),
        ),
    );

    const failure = (await postPublicApi(
      ASK_PATH,
      { question: 'a question' },
      naturalLanguageQueryResponseSchema,
    ).catch((error: unknown) => error)) as ApiResponseError;

    expect(failure.status).toBe(429);
    expect(failure.retryAfterSeconds).toBe(42);
  });

  it.each([
    ['no header at all', {}],
    [
      'an HTTP-date, which this client does not interpret',
      { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' },
    ],
    ['a negative value', { 'Retry-After': '-5' }],
    ['a fractional value', { 'Retry-After': '1.5' }],
  ])('leaves retryAfterSeconds undefined for %s', async (_label, headers) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            429,
            { error: { code: 'QUOTA_EXCEEDED', message: 'Quota reached.' } },
            headers,
          ),
        ),
    );

    const failure = (await postPublicApi(
      ASK_PATH,
      { question: 'a question' },
      naturalLanguageQueryResponseSchema,
    ).catch((error: unknown) => error)) as ApiResponseError;

    expect(failure.retryAfterSeconds).toBeUndefined();
  });

  it('rejects a response the contract does not accept', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { data: { question: 'a question' } })),
    );

    await expect(
      postPublicApi(ASK_PATH, { question: 'a question' }, naturalLanguageQueryResponseSchema),
    ).rejects.toBeInstanceOf(ApiContractError);
  });
});
