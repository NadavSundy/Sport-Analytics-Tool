import {
  competitionCollectionResponseSchema,
  fixtureWeatherResponseSchema,
} from '@sport-analytics/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiResponseError } from './client';
import { ApiContractError, fixtureEventExportFilename, requestPublicApi } from './public-read';

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
