import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeatherService } from '../../src/modules/weather/weather.service';

describe('WeatherService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns weather data from Open-Meteo', async () => {
    const mockResponse = {
      daily: {
        time: ['2026-08-19'],
        temperature_2m_max: [23.4],
        temperature_2m_min: [10.2],
        precipitation_sum: [0],
        wind_speed_10m_max: [18.5],
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    const service = new WeatherService();

    const result = await service.getWeather(-26.2041, 28.0473, '2026-08-19');

    expect(result).toEqual({
      date: '2026-08-19',
      latitude: -26.2041,
      longitude: 28.0473,
      temperatureMax: 23.4,
      temperatureMin: 10.2,
      precipitationSum: 0,
      windSpeedMax: 18.5,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('handles an external API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Service unavailable', {
        status: 503,
      }),
    );

    const service = new WeatherService();

    await expect(service.getWeather(-26.2041, 28.0473, '2026-08-19')).rejects.toThrow(
      'Open-Meteo request failed with status 503',
    );
  });

  it('handles invalid JSON from the external API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not valid json', {
        status: 200,
      }),
    );

    const service = new WeatherService();

    await expect(service.getWeather(-26.2041, 28.0473, '2026-08-19')).rejects.toThrow(
      'Open-Meteo returned invalid JSON',
    );
  });

  it('handles an invalid weather response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          daily: {},
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const service = new WeatherService();

    await expect(service.getWeather(-26.2041, 28.0473, '2026-08-19')).rejects.toThrow(
      'Open-Meteo returned an invalid weather response',
    );
  });

  it('rejects invalid latitude', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const service = new WeatherService();

    await expect(service.getWeather(100, 28.0473, '2026-08-19')).rejects.toThrow(
      'Latitude must be between -90 and 90',
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid longitude', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const service = new WeatherService();

    await expect(service.getWeather(-26.2041, 200, '2026-08-19')).rejects.toThrow(
      'Longitude must be between -180 and 180',
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects an incorrectly formatted date', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const service = new WeatherService();

    await expect(service.getWeather(-26.2041, 28.0473, '19-08-2026')).rejects.toThrow(
      'Date must use YYYY-MM-DD format',
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
