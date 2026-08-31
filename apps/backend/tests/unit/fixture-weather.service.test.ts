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

    const result = await createFixtureWeatherService(weather, findContext).getFixtureWeather('17');

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

  test('does not query Open-Meteo when the venue has no coordinates', async () => {
    const weather = weatherService();
    const result = await createFixtureWeatherService(
      weather,
      vi.fn().mockResolvedValue({
        ...venueContext,
        venue: { ...venueContext.venue!, latitude: null, longitude: null },
      }),
    ).getFixtureWeather('17');

    expect(result).toMatchObject({ availability: 'unavailable', reason: 'MISSING_COORDINATES' });
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