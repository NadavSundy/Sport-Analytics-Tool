import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyWeatherDate, WeatherService } from '../../src/modules/weather/weather.service';

describe('classifyWeatherDate', () => {
  const referenceDate = new Date('2026-08-31T00:00:00Z');

  it('selects the forecast endpoint for today', () => {
    expect(classifyWeatherDate('2026-08-31', referenceDate)).toBe('forecast');
  });

  it('selects the forecast endpoint for a date 90 days in the past', () => {
    expect(classifyWeatherDate('2026-06-02', referenceDate)).toBe('forecast');
  });

  it('selects the forecast endpoint for a date 10 days in the future', () => {
    expect(classifyWeatherDate('2026-09-10', referenceDate)).toBe('forecast');
  });

  it('selects the archive endpoint for a date 200 days in the past', () => {
    expect(classifyWeatherDate('2026-02-12', referenceDate)).toBe('archive');
  });

  it('selects the archive endpoint for a date near the earliest supported year', () => {
    expect(classifyWeatherDate('1945-01-01', referenceDate)).toBe('archive');
  });

  it('is unsupported for a date before the archive endpoint begins', () => {
    expect(classifyWeatherDate('1900-01-01', referenceDate)).toBe('unsupported');
  });

  it('is unsupported for a date far in the future', () => {
    expect(classifyWeatherDate('2026-10-15', referenceDate)).toBe('unsupported');
  });
});

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

  it('uses the archive endpoint for a historical date', async () => {
    const mockResponse = {
      daily: {
        time: ['1995-06-14'],
        temperature_2m_max: [19.1],
        temperature_2m_min: [7.4],
        precipitation_sum: [2.1],
        wind_speed_10m_max: [12.3],
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const service = new WeatherService();

    const result = await service.getWeather(-26.2041, 28.0473, '1995-06-14');

    expect(result.temperatureMax).toBe(19.1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const requestedUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(requestedUrl.startsWith('https://archive-api.open-meteo.com')).toBe(true);
  });

  it('throws WeatherDateUnsupportedError without calling Open-Meteo for an out-of-range date', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const service = new WeatherService();

    await expect(service.getWeather(-26.2041, 28.0473, '1900-01-01')).rejects.toThrow(
      'Weather data is not available for the requested date',
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});