import { describe, expect, test, vi } from 'vitest';

import {
  createFixtureWeatherService,
  type FixtureWeatherContext,
} from '../../src/modules/weather/fixture-weather.service';
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
    const geocoder = { resolve: vi.fn() };
    const persist = vi.fn();

    const result = await createFixtureWeatherService(
      weather,
      findContext,
      geocoder,
      persist,
    ).getFixtureWeather('17');

    expect(findContext).toHaveBeenCalledWith('17');
    expect(getWeather).toHaveBeenCalledWith(-26.1929, 28.0305, '2026-08-19');
    expect(geocoder.resolve).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      fixtureId: '17',
      date: '2026-08-19',
      availability: 'available',
      venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
      weather: { temperatureMax: 24, precipitationSum: 0 },
    });
  });

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

  test('resolves a missing venue location by city, persists it, and fetches weather', async () => {
    const weather = weatherService();
    vi.mocked(weather.getWeather).mockResolvedValue({
      date: '2026-08-19',
      latitude: -43.5321,
      longitude: 172.6362,
      temperatureMax: 20,
      temperatureMin: 8,
      precipitationSum: 0,
      windSpeedMax: 16,
    });
    const geocoder = {
      resolve: vi.fn().mockResolvedValue({ latitude: -43.5321, longitude: 172.6362 }),
    };
    const persist = vi.fn().mockResolvedValue(undefined);
    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: {
          ...venueContext.venue!,
          name: 'AMI Stadium',
          city: 'Christchurch',
          latitude: null,
          longitude: null,
        },
      }),
      geocoder,
      persist,
    ).getFixtureWeather('17');

    expect(geocoder.resolve).toHaveBeenCalledWith('Christchurch');
    expect(geocoder.resolve).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith('5', -43.5321, 172.6362);
    expect(weather.getWeather).toHaveBeenCalledWith(-43.5321, 172.6362, '2026-08-19');
    expect(result).toMatchObject({ availability: 'available' });
  });

  test('falls back from an unresolved city to the raw venue name without combining queries', async () => {
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
    const geocoder = {
      resolve: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ latitude: -1.9501, longitude: 30.0588 }),
    };
    const persist = vi.fn().mockResolvedValue(undefined);
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
      geocoder,
      persist,
    ).getFixtureWeather('17');

    expect(geocoder.resolve).toHaveBeenNthCalledWith(1, 'Kigali City');
    expect(geocoder.resolve).toHaveBeenNthCalledWith(
      2,
      'Gahanga International Cricket Stadium, Rwanda',
    );
    expect(persist).toHaveBeenCalledWith('5', -1.9501, 30.0588);
    expect(result).toMatchObject({ availability: 'available' });
  });

  test('returns LOCATION_NOT_FOUND when neither the city nor venue can be resolved', async () => {
    const weather = weatherService();
    const geocoder = { resolve: vi.fn().mockResolvedValue(null) };
    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: { ...venueContext.venue!, latitude: null, longitude: null },
      }),
      geocoder,
      vi.fn(),
    ).getFixtureWeather('17');

    expect(result).toMatchObject({ availability: 'unavailable', reason: 'LOCATION_NOT_FOUND' });
    expect(geocoder.resolve).toHaveBeenNthCalledWith(1, 'Johannesburg');
    expect(geocoder.resolve).toHaveBeenNthCalledWith(2, 'Wits Cricket Oval');
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test('does not query Open-Meteo when the fixture date is outside all supported ranges', async () => {
    const weather = weatherService();
    const geocoder = { resolve: vi.fn() };
    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        date: '1900-01-01',
        venue: { ...venueContext.venue!, latitude: null, longitude: null },
      }),
      geocoder,
    ).getFixtureWeather('17');

    expect(result).toMatchObject({ availability: 'unavailable', reason: 'UNSUPPORTED_DATE' });
    expect(weather.getWeather).not.toHaveBeenCalled();
    expect(geocoder.resolve).not.toHaveBeenCalled();
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
