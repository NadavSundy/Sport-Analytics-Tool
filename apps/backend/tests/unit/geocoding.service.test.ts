import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GeocodingTimeoutError,
  GeocodingUpstreamError,
  GeocodingValidationError,
  OpenMeteoGeocodingService,
} from '../../src/modules/weather/geocoding.service';

describe('OpenMeteoGeocodingService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a location to coordinates from Open-Meteo', async () => {
    const mockResponse = {
      results: [{ name: 'Wits Cricket Oval', latitude: -26.1929, longitude: 28.0305 }],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const service = new OpenMeteoGeocodingService();

    const result = await service.resolveLocation('Wits Cricket Oval, Johannesburg');

    expect(result).toEqual({ latitude: -26.1929, longitude: 28.0305 });

    const requestedUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(requestedUrl.startsWith('https://geocoding-api.open-meteo.com/v1/search')).toBe(true);
    expect(requestedUrl).toContain('name=Wits+Cricket+Oval%2C+Johannesburg');
  });

  it('returns null for a location the provider cannot find', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const service = new OpenMeteoGeocodingService();

    await expect(service.resolveLocation('Nowhere In Particular')).resolves.toBeNull();
  });

  it('rejects an empty location query without calling the provider', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const service = new OpenMeteoGeocodingService();

    await expect(service.resolveLocation('   ')).rejects.toThrow(GeocodingValidationError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handles an external API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Service unavailable', { status: 503 }),
    );

    const service = new OpenMeteoGeocodingService();

    await expect(service.resolveLocation('Wits Cricket Oval')).rejects.toThrow(
      GeocodingUpstreamError,
    );
  });

  it('handles invalid JSON from the external API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not valid json', { status: 200 }),
    );

    const service = new OpenMeteoGeocodingService();

    await expect(service.resolveLocation('Wits Cricket Oval')).rejects.toThrow(
      GeocodingUpstreamError,
    );
  });

  it('times out when the provider does not respond in time', async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as RequestInit | undefined)?.signal;
        signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const service = new OpenMeteoGeocodingService();

    const resultPromise = service.resolveLocation('Wits Cricket Oval');
    const assertion = expect(resultPromise).rejects.toThrow(GeocodingTimeoutError);

    await vi.advanceTimersByTimeAsync(5000);
    await assertion;

    vi.useRealTimers();
  });
});
