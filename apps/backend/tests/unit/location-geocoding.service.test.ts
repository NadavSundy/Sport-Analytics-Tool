import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  LocationGeocodingTimeoutError,
  LocationGeocodingUpstreamError,
  NominatimPoiGeocodingService,
  OpenMeteoLocationGeocodingService,
} from '../../src/modules/weather/location-geocoding.service';

describe('OpenMeteoLocationGeocodingService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('uses the supplied city query without constructing a venue-city compound', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ results: [{ latitude: -43.5321, longitude: 172.6362 }] })),
      );

    await expect(new OpenMeteoLocationGeocodingService().resolve('Christchurch')).resolves.toEqual({
      latitude: -43.5321,
      longitude: 172.6362,
    });
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('name')).toBe(
      'Christchurch',
    );
  });

  test('returns null when the provider cannot resolve a location', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ results: [] })));
    await expect(new OpenMeteoLocationGeocodingService().resolve('Unknown')).resolves.toBeNull();
  });

  test.each([
    [new Response('invalid json'), LocationGeocodingUpstreamError],
    [new Response('{}', { status: 500 }), LocationGeocodingUpstreamError],
  ])('maps invalid provider responses safely', async (response, error) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    await expect(
      new OpenMeteoLocationGeocodingService().resolve('Christchurch'),
    ).rejects.toBeInstanceOf(error);
  });

  test('maps a timed-out request safely', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error(), { name: 'AbortError' })),
          );
        }),
    );
    const request = new OpenMeteoLocationGeocodingService().resolve('Christchurch');
    const rejection = expect(request).rejects.toBeInstanceOf(LocationGeocodingTimeoutError);
    await vi.advanceTimersByTimeAsync(5000);
    await rejection;
  });
});

describe('NominatimPoiGeocodingService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('requests a single JSON POI result with an application user agent', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ lat: '-37.8199', lon: '144.9834' }])),
    );

    await expect(new NominatimPoiGeocodingService().resolve('Example Cricket Ground')).resolves.toEqual({
      latitude: -37.8199,
      longitude: 144.9834,
    });

    const [requestUrl, options] = fetchMock.mock.calls[0]!;
    const url = new URL(String(requestUrl));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(url.searchParams.get('q')).toBe('Example Cricket Ground');
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('limit')).toBe('1');
    expect(options?.headers).toMatchObject({
      Accept: 'application/json',
      'User-Agent': 'Sport-Analytics-Tool/1.0 (weather geocoding)',
    });
  });

  test('rejects invalid POI coordinates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ lat: '91', lon: '144.9834' }])),
    );

    await expect(new NominatimPoiGeocodingService().resolve('Example Cricket Ground')).resolves.toBeNull();
  });
});
