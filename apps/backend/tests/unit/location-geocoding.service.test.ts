import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  LocationGeocodingTimeoutError,
  LocationGeocodingUpstreamError,
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
