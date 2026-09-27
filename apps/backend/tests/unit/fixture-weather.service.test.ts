import { describe, expect, test, vi } from 'vitest';

import {
  createFixtureWeatherService,
  type FixtureWeatherContext,
} from '../../src/modules/weather/fixture-weather.service';
import {
  LocationGeocodingTimeoutError,
  LocationGeocodingUpstreamError,
  type LocationGeocodingService,
} from '../../src/modules/weather/location-geocoding.service';
import type { WeatherService } from '../../src/modules/weather/weather.service';

const venueContext: FixtureWeatherContext = {
  fixtureId: '17',
  date: '2026-08-19',
  venue: {
    venueId: '5',
    name: 'Wits Cricket Oval',
    city: 'Johannesburg',
    latitude: -26.1929,
    longitude: 28.0305,
  },
};

function weatherService(): WeatherService {
  return {
    getWeather: vi.fn(),
  } as unknown as WeatherService;
}

function geocodingService(): LocationGeocodingService {
  return {
    resolve: vi.fn(),
  };
}

describe('fixture weather service', () => {
  test('uses the fixture start date and stored venue coordinates with WeatherService', async () => {
    const weather = weatherService();
    const getWeather = vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: -26.1929,
      longitude: 28.0305,
      temperatureMax: 24,
      temperatureMin: 11,
      precipitationSum: 0,
      windSpeedMax: 17,
    });

    const findContext = vi.fn().mockResolvedValue(venueContext);
    const geocoding = geocodingService();
    const persistVenueCoordinates = vi.fn();

    const result = await createFixtureWeatherService(
      weather,
      findContext,
      geocoding,
      persistVenueCoordinates,
    ).getFixtureWeather('17');

    expect(findContext).toHaveBeenCalledWith('17');
    expect(getWeather).toHaveBeenCalledWith(-26.1929, 28.0305, '2026-08-19');
    expect(geocoding.resolve).not.toHaveBeenCalled();
    expect(persistVenueCoordinates).not.toHaveBeenCalled();

    expect(result).toMatchObject({
      fixtureId: '17',
      date: '2026-08-19',
      availability: 'available',
      venue: {
        name: 'Wits Cricket Oval',
        city: 'Johannesburg',
      },
      weather: {
        temperatureMax: 24,
        precipitationSum: 0,
      },
    });
  });

  test('geocodes and persists coordinates when the venue has none stored, then fetches weather', async () => {
    const weather = weatherService();
    const getWeather = vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: -26.1929,
      longitude: 28.0305,
      temperatureMax: 24,
      temperatureMin: 11,
      precipitationSum: 0,
      windSpeedMax: 17,
    });

    const geocoding = geocodingService();
    vi.mocked(geocoding.resolve).mockResolvedValue({
      latitude: -26.1929,
      longitude: 28.0305,
    });

    const persistVenueCoordinates = vi.fn().mockResolvedValue(undefined);
    const poiGeocoding = geocodingService();

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: {
          ...venueContext.venue!,
          latitude: null,
          longitude: null,
        },
      }),
      geocoding,
      persistVenueCoordinates,
      poiGeocoding,
    ).getFixtureWeather('17');

    expect(geocoding.resolve).toHaveBeenCalledWith('Wits Cricket Oval, Johannesburg');
    expect(geocoding.resolve).toHaveBeenCalledTimes(1);
    expect(poiGeocoding.resolve).not.toHaveBeenCalled();

    expect(persistVenueCoordinates).toHaveBeenCalledWith('5', -26.1929, 28.0305);

    expect(getWeather).toHaveBeenCalledWith(-26.1929, 28.0305, '2026-08-19');

    expect(result).toMatchObject({
      availability: 'available',
    });
  });

  test('uses newly resolved coordinates for the first weather request and reuses them on the next request', async () => {
    const weather = weatherService();
    const getWeather = vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: -26.1929,
      longitude: 28.0305,
      temperatureMax: 24,
      temperatureMin: 11,
      precipitationSum: 0,
      windSpeedMax: 17,
    });
    let currentVenue: NonNullable<FixtureWeatherContext['venue']> = {
      ...venueContext.venue!,
      latitude: null,
      longitude: null,
    };
    const findContext = vi.fn(async () => ({ ...venueContext, venue: currentVenue }));
    const geocoding = geocodingService();
    vi.mocked(geocoding.resolve).mockResolvedValue(null);
    const persistVenueCoordinates = vi.fn(
      async (_venueId: string, latitude: number, longitude: number) => {
        currentVenue = { ...currentVenue, latitude, longitude };
      },
    );
    const poiGeocoding = geocodingService();
    vi.mocked(poiGeocoding.resolve).mockResolvedValue({
      latitude: -26.1929,
      longitude: 28.0305,
    });
    const service = createFixtureWeatherService(
      weather,
      findContext,
      geocoding,
      persistVenueCoordinates,
      poiGeocoding,
    );

    await expect(service.getFixtureWeather('17')).resolves.toMatchObject({
      availability: 'available',
    });
    expect(getWeather).toHaveBeenCalledWith(-26.1929, 28.0305, '2026-08-19');

    await expect(service.getFixtureWeather('17')).resolves.toMatchObject({
      availability: 'available',
    });
    expect(geocoding.resolve).toHaveBeenCalledTimes(2);
    expect(poiGeocoding.resolve).toHaveBeenCalledTimes(1);
    expect(persistVenueCoordinates).toHaveBeenCalledTimes(1);
    expect(getWeather).toHaveBeenCalledTimes(2);
  });

  test('shares concurrent unresolved-venue requests without duplicate persistence or weather calls', async () => {
    const weather = weatherService();
    const getWeather = vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: -26.1929,
      longitude: 28.0305,
      temperatureMax: 24,
      temperatureMin: 11,
      precipitationSum: 0,
      windSpeedMax: 17,
    });
    const findContext = vi.fn().mockResolvedValue({
      ...venueContext,
      venue: { ...venueContext.venue!, latitude: null, longitude: null },
    });
    const geocoding = geocodingService();
    vi.mocked(geocoding.resolve).mockResolvedValue({
      latitude: -26.1929,
      longitude: 28.0305,
    });
    const persistVenueCoordinates = vi.fn().mockResolvedValue(undefined);
    const poiGeocoding = geocodingService();
    const service = createFixtureWeatherService(
      weather,
      findContext,
      geocoding,
      persistVenueCoordinates,
      poiGeocoding,
    );

    const first = service.getFixtureWeather('17');
    const second = service.getFixtureWeather('17');
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(first).toBe(second);
    expect(firstResult).toMatchObject({ availability: 'available' });
    expect(secondResult).toMatchObject({ availability: 'available' });
    expect(findContext).toHaveBeenCalledTimes(1);
    expect(geocoding.resolve).toHaveBeenCalledTimes(1);
    expect(persistVenueCoordinates).toHaveBeenCalledTimes(1);
    expect(getWeather).toHaveBeenCalledTimes(1);
  });

  test('falls back from the canonical venue and city query to the stored city', async () => {
    const weather = weatherService();

    vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: -1.9501,
      longitude: 30.0588,
      temperatureMax: 24,
      temperatureMin: 15,
      precipitationSum: 2,
      windSpeedMax: 10,
    });

    const geocoding = geocodingService();

    vi.mocked(geocoding.resolve)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        latitude: -1.9501,
        longitude: 30.0588,
      });

    const persistVenueCoordinates = vi.fn().mockResolvedValue(undefined);
    const poiGeocoding = geocodingService();

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: {
          ...venueContext.venue!,
          name: 'Gahanga International Cricket Stadium, Rwanda',
          city: 'Kigali City',
          latitude: null,
          longitude: null,
        },
      }),
      geocoding,
      persistVenueCoordinates,
      poiGeocoding,
    ).getFixtureWeather('17');

    expect(geocoding.resolve).toHaveBeenNthCalledWith(
      1,
      'Gahanga International Cricket Stadium, Rwanda, Kigali City',
    );

    expect(geocoding.resolve).toHaveBeenNthCalledWith(
      2,
      'Gahanga International Cricket Stadium, Rwanda',
    );
    expect(geocoding.resolve).toHaveBeenNthCalledWith(3, 'Kigali City');
    expect(poiGeocoding.resolve).toHaveBeenCalledWith(
      'Gahanga International Cricket Stadium, Rwanda',
    );

    expect(persistVenueCoordinates).toHaveBeenCalledWith('5', -1.9501, 30.0588);

    expect(result).toMatchObject({
      availability: 'available',
    });
  });

  test('falls back to the stored city, persists its coordinates, and fetches weather', async () => {
    const weather = weatherService();
    vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: 37.4563,
      longitude: 126.7052,
      temperatureMax: 24,
      temperatureMin: 15,
      precipitationSum: 0,
      windSpeedMax: 10,
    });
    const geocoding = geocodingService();
    vi.mocked(geocoding.resolve)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ latitude: 37.4563, longitude: 126.7052 });
    const persistVenueCoordinates = vi.fn().mockResolvedValue(undefined);
    const poiGeocoding = geocodingService();

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: {
          ...venueContext.venue!,
          name: 'Yeonhui Cricket Ground',
          city: 'Incheon',
          latitude: null,
          longitude: null,
        },
      }),
      geocoding,
      persistVenueCoordinates,
      poiGeocoding,
    ).getFixtureWeather('17');

    expect(geocoding.resolve).toHaveBeenNthCalledWith(1, 'Yeonhui Cricket Ground, Incheon');
    expect(geocoding.resolve).toHaveBeenNthCalledWith(2, 'Yeonhui Cricket Ground');
    expect(geocoding.resolve).toHaveBeenNthCalledWith(3, 'Incheon');
    expect(poiGeocoding.resolve).toHaveBeenCalledWith('Yeonhui Cricket Ground');
    expect(persistVenueCoordinates).toHaveBeenCalledWith('5', 37.4563, 126.7052);
    expect(weather.getWeather).toHaveBeenCalledWith(37.4563, 126.7052, '2026-08-19');
    expect(result).toMatchObject({ availability: 'available' });
  });

  test('uses a venue-only geocoding result when canonical city is absent', async () => {
    const weather = weatherService();
    vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: -37.8199,
      longitude: 144.9834,
      temperatureMax: 22,
      temperatureMin: 12,
      precipitationSum: 1,
      windSpeedMax: 14,
    });
    const geocoding = geocodingService();
    vi.mocked(geocoding.resolve).mockResolvedValue(null);
    const poiGeocoding = geocodingService();
    vi.mocked(poiGeocoding.resolve).mockResolvedValue({ latitude: -37.8199, longitude: 144.9834 });
    const persistVenueCoordinates = vi.fn().mockResolvedValue(undefined);

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: {
          ...venueContext.venue!,
          name: 'Example Cricket Ground',
          city: null,
          latitude: null,
          longitude: null,
        },
      }),
      geocoding,
      persistVenueCoordinates,
      poiGeocoding,
    ).getFixtureWeather('17');

    expect(geocoding.resolve).toHaveBeenCalledTimes(1);
    expect(geocoding.resolve).toHaveBeenCalledWith('Example Cricket Ground');
    expect(poiGeocoding.resolve).toHaveBeenCalledWith('Example Cricket Ground');
    expect(persistVenueCoordinates).toHaveBeenCalledWith('5', -37.8199, 144.9834);
    expect(weather.getWeather).toHaveBeenCalledWith(-37.8199, 144.9834, '2026-08-19');
    expect(result).toMatchObject({ availability: 'available' });
  });

  test('does not query duplicate geocoding candidates twice', async () => {
    const weather = weatherService();
    const geocoding = geocodingService();
    const poiGeocoding = geocodingService();
    vi.mocked(geocoding.resolve).mockResolvedValue(null);
    vi.mocked(poiGeocoding.resolve).mockResolvedValue(null);

    await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: {
          ...venueContext.venue!,
          name: 'Incheon',
          city: 'Incheon',
          latitude: null,
          longitude: null,
        },
      }),
      geocoding,
      undefined,
      poiGeocoding,
    ).getFixtureWeather('17');

    expect(geocoding.resolve).toHaveBeenCalledTimes(2);
    expect(geocoding.resolve).toHaveBeenNthCalledWith(1, 'Incheon, Incheon');
    expect(geocoding.resolve).toHaveBeenNthCalledWith(2, 'Incheon');
    expect(poiGeocoding.resolve).toHaveBeenCalledTimes(1);
    expect(poiGeocoding.resolve).toHaveBeenCalledWith('Incheon');
  });

  test('returns LOCATION_NOT_FOUND when no geocoding candidate resolves', async () => {
    const weather = weatherService();
    const geocoding = geocodingService();
    const poiGeocoding = geocodingService();

    vi.mocked(geocoding.resolve).mockResolvedValue(null);
    vi.mocked(poiGeocoding.resolve).mockResolvedValue(null);

    const persistVenueCoordinates = vi.fn();

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: {
          ...venueContext.venue!,
          latitude: null,
          longitude: null,
        },
      }),
      geocoding,
      persistVenueCoordinates,
      poiGeocoding,
    ).getFixtureWeather('17');

    expect(result).toMatchObject({
      availability: 'unavailable',
      reason: 'LOCATION_NOT_FOUND',
    });

    expect(geocoding.resolve).toHaveBeenNthCalledWith(1, 'Wits Cricket Oval, Johannesburg');

    expect(geocoding.resolve).toHaveBeenNthCalledWith(2, 'Wits Cricket Oval');
    expect(geocoding.resolve).toHaveBeenNthCalledWith(3, 'Johannesburg');
    expect(poiGeocoding.resolve).toHaveBeenCalledWith('Wits Cricket Oval');

    expect(persistVenueCoordinates).not.toHaveBeenCalled();
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test.each([
    new LocationGeocodingTimeoutError(),
    new LocationGeocodingUpstreamError('geocoding provider error'),
  ])(
    'propagates a geocoding provider failure without persisting or fetching weather',
    async (error) => {
      const weather = weatherService();
      const geocoding = geocodingService();

      vi.mocked(geocoding.resolve).mockRejectedValue(error);

      const persistVenueCoordinates = vi.fn();

      const service = createFixtureWeatherService(
        weather,
        vi.fn().mockResolvedValue({
          ...venueContext,
          venue: {
            ...venueContext.venue!,
            latitude: null,
            longitude: null,
          },
        }),
        geocoding,
        persistVenueCoordinates,
      );

      await expect(service.getFixtureWeather('17')).rejects.toThrow(error.message);

      expect(persistVenueCoordinates).not.toHaveBeenCalled();
      expect(weather.getWeather).not.toHaveBeenCalled();
    },
  );

  test('does not persist or use invalid geocoding coordinates', async () => {
    const weather = weatherService();
    const geocoding = geocodingService();
    vi.mocked(geocoding.resolve).mockResolvedValue({ latitude: 91, longitude: 28.0305 });
    const persistVenueCoordinates = vi.fn();

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: { ...venueContext.venue!, latitude: null, longitude: null },
      }),
      geocoding,
      persistVenueCoordinates,
    ).getFixtureWeather('17');

    expect(result).toMatchObject({ availability: 'unavailable', reason: 'UNSUPPORTED_LOCATION' });
    expect(persistVenueCoordinates).not.toHaveBeenCalled();
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test('preserves the safe provider failure when weather retrieval fails after coordinate reuse', async () => {
    const weather = weatherService();
    vi.mocked(weather.getWeather).mockRejectedValue(new Error('weather provider unavailable'));
    const geocoding = geocodingService();

    await expect(
      createFixtureWeatherService(
        weather,
        vi.fn().mockResolvedValue(venueContext),
        geocoding,
      ).getFixtureWeather('17'),
    ).rejects.toThrow('weather provider unavailable');

    expect(geocoding.resolve).not.toHaveBeenCalled();
  });

  test('preserves existing service error handling when coordinate persistence fails', async () => {
    const weather = weatherService();
    const geocoding = geocodingService();
    vi.mocked(geocoding.resolve).mockResolvedValue({ latitude: -26.1929, longitude: 28.0305 });
    const persistVenueCoordinates = vi
      .fn()
      .mockRejectedValue(new Error('coordinate persistence failed'));

    await expect(
      createFixtureWeatherService(
        weather,
        vi.fn().mockResolvedValue({
          ...venueContext,
          venue: { ...venueContext.venue!, latitude: null, longitude: null },
        }),
        geocoding,
        persistVenueCoordinates,
      ).getFixtureWeather('17'),
    ).rejects.toThrow('coordinate persistence failed');

    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test('does not query Open-Meteo when the fixture has no venue', async () => {
    const weather = weatherService();
    const geocoding = geocodingService();

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        fixtureId: '17',
        date: '2026-08-19',
        venue: null,
      }),
      geocoding,
    ).getFixtureWeather('17');

    expect(result).toMatchObject({
      availability: 'unavailable',
      reason: 'MISSING_VENUE',
    });

    expect(geocoding.resolve).not.toHaveBeenCalled();
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test('does not geocode or query weather when the fixture date is outside all supported ranges', async () => {
    const weather = weatherService();
    const geocoding = geocodingService();

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        date: '1900-01-01',
        venue: {
          ...venueContext.venue!,
          latitude: null,
          longitude: null,
        },
      }),
      geocoding,
    ).getFixtureWeather('17');

    expect(result).toMatchObject({
      availability: 'unavailable',
      reason: 'UNSUPPORTED_DATE',
    });

    expect(weather.getWeather).not.toHaveBeenCalled();
    expect(geocoding.resolve).not.toHaveBeenCalled();
  });

  test('returns null without querying data for an invalid or unknown fixture', async () => {
    const weather = weatherService();
    const findContext = vi.fn().mockResolvedValue(null);

    const service = createFixtureWeatherService(weather, findContext);

    await expect(service.getFixtureWeather('not-an-id')).resolves.toBeNull();

    await expect(service.getFixtureWeather('999')).resolves.toBeNull();

    expect(findContext).toHaveBeenCalledTimes(1);
    expect(weather.getWeather).not.toHaveBeenCalled();
  });
});
