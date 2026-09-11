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
    ).getFixtureWeather('17');

    expect(geocoding.resolve).toHaveBeenCalledWith('Wits Cricket Oval, Johannesburg');
    expect(geocoding.resolve).toHaveBeenCalledTimes(1);

    expect(persistVenueCoordinates).toHaveBeenCalledWith('5', -26.1929, 28.0305);

    expect(getWeather).toHaveBeenCalledWith(-26.1929, 28.0305, '2026-08-19');

    expect(result).toMatchObject({
      availability: 'available',
    });
  });

  test('falls back from the combined venue and city query to the raw venue name', async () => {
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

    vi.mocked(geocoding.resolve).mockResolvedValueOnce(null).mockResolvedValueOnce({
      latitude: -1.9501,
      longitude: 30.0588,
    });

    const persistVenueCoordinates = vi.fn().mockResolvedValue(undefined);

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
    ).getFixtureWeather('17');

    expect(geocoding.resolve).toHaveBeenNthCalledWith(
      1,
      'Gahanga International Cricket Stadium, Rwanda, Kigali City',
    );

    expect(geocoding.resolve).toHaveBeenNthCalledWith(
      2,
      'Gahanga International Cricket Stadium, Rwanda',
    );

    expect(persistVenueCoordinates).toHaveBeenCalledWith('5', -1.9501, 30.0588);

    expect(result).toMatchObject({
      availability: 'available',
    });
  });

  test('returns LOCATION_NOT_FOUND when neither geocoding query resolves', async () => {
    const weather = weatherService();
    const geocoding = geocodingService();

    vi.mocked(geocoding.resolve).mockResolvedValue(null);

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
    ).getFixtureWeather('17');

    expect(result).toMatchObject({
      availability: 'unavailable',
      reason: 'LOCATION_NOT_FOUND',
    });

    expect(geocoding.resolve).toHaveBeenNthCalledWith(1, 'Wits Cricket Oval, Johannesburg');

    expect(geocoding.resolve).toHaveBeenNthCalledWith(2, 'Wits Cricket Oval');

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
