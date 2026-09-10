import { describe, expect, test, vi } from 'vitest';

import {
  createFixtureWeatherService,
  type FixtureWeatherContext,
} from '../../src/modules/weather/fixture-weather.service';
import type { WeatherService } from '../../src/modules/weather/weather.service';
import {
  GeocodingTimeoutError,
  GeocodingUpstreamError,
  type GeocodingService,
} from '../../src/modules/weather/geocoding.service';

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

function geocodingService(): GeocodingService {
  return {
    resolveLocation: vi.fn(),
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
    expect(result).toMatchObject({
      fixtureId: '17',
      date: '2026-08-19',
      availability: 'available',
      venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
      weather: { temperatureMax: 24, precipitationSum: 0 },
    });
  });

  test('reuses stored coordinates instead of geocoding the venue again', async () => {
    const weather = weatherService();
    vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: -26.1929,
      longitude: 28.0305,
      temperatureMax: 24,
      temperatureMin: 11,
      precipitationSum: 0,
      windSpeedMax: 17,
    });
    const geocoding = geocodingService();
    const persistVenueCoordinates = vi.fn();

    await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue(venueContext),
      geocoding,
      persistVenueCoordinates,
    ).getFixtureWeather('17');

    expect(geocoding.resolveLocation).not.toHaveBeenCalled();
    expect(persistVenueCoordinates).not.toHaveBeenCalled();
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
    vi.mocked(geocoding.resolveLocation).mockResolvedValue({
      latitude: -26.1929,
      longitude: 28.0305,
    });
    const persistVenueCoordinates = vi.fn().mockResolvedValue(undefined);

    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: { ...venueContext.venue!, latitude: null, longitude: null },
      }),
      geocoding,
      persistVenueCoordinates,
    ).getFixtureWeather('17');

    expect(geocoding.resolveLocation).toHaveBeenCalledWith('Wits Cricket Oval, Johannesburg');
    expect(persistVenueCoordinates).toHaveBeenCalledWith('5', -26.1929, 28.0305);
    expect(getWeather).toHaveBeenCalledWith(-26.1929, 28.0305, '2026-08-19');
    expect(result).toMatchObject({ availability: 'available' });
  });

  test('returns a handled error when the venue location cannot be resolved', async () => {
    const weather = weatherService();
    const geocoding = geocodingService();
    vi.mocked(geocoding.resolveLocation).mockResolvedValue(null);
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

    expect(result).toMatchObject({ availability: 'unavailable', reason: 'LOCATION_NOT_FOUND' });
    expect(persistVenueCoordinates).not.toHaveBeenCalled();
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test.each([new GeocodingTimeoutError(), new GeocodingUpstreamError('geocoding provider error')])(
    'propagates a geocoding provider failure without persisting or fetching weather',
    async (error) => {
      const weather = weatherService();
      const geocoding = geocodingService();
      vi.mocked(geocoding.resolveLocation).mockRejectedValue(error);
      const persistVenueCoordinates = vi.fn();

      const service = createFixtureWeatherService(
        weather,
        vi.fn().mockResolvedValue({
          ...venueContext,
          venue: { ...venueContext.venue!, latitude: null, longitude: null },
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
    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        fixtureId: '17',
        date: '2026-08-19',
        venue: null,
      }),
    ).getFixtureWeather('17');

    expect(result).toMatchObject({ availability: 'unavailable', reason: 'MISSING_VENUE' });
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test('does not query Open-Meteo when the fixture date is outside all supported ranges', async () => {
    const weather = weatherService();
    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        date: '1900-01-01',
      }),
    ).getFixtureWeather('17');

    expect(result).toMatchObject({ availability: 'unavailable', reason: 'UNSUPPORTED_DATE' });
    expect(weather.getWeather).not.toHaveBeenCalled();
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
