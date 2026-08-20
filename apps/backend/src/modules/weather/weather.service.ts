export interface WeatherData {
  date: string;
  latitude: number;
  longitude: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
}

interface OpenMeteoResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
  };
}

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

const REQUEST_TIMEOUT_MS = 5000;

export class WeatherValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherValidationError';
  }
}

export class WeatherTimeoutError extends Error {
  constructor(message = 'Open-Meteo request timed out') {
    super(message);
    this.name = 'WeatherTimeoutError';
  }
}

export class WeatherUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherUpstreamError';
  }
}

export class WeatherService {
  async getWeather(latitude: number, longitude: number, date: string): Promise<WeatherData> {
    this.validateCoordinates(latitude, longitude);
    this.validateDate(date);

    const url = new URL(OPEN_METEO_BASE_URL);

    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('start_date', date);
    url.searchParams.set('end_date', date);
    url.searchParams.set(
      'daily',
      ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max'].join(
        ',',
      ),
    );
    url.searchParams.set('timezone', 'auto');

    const response = await this.fetchWithTimeout(url.toString());

    if (!response.ok) {
      throw new WeatherUpstreamError(`Open-Meteo request failed with status ${response.status}`);
    }

    let data: OpenMeteoResponse;

    try {
      data = (await response.json()) as OpenMeteoResponse;
    } catch {
      throw new WeatherUpstreamError('Open-Meteo returned invalid JSON');
    }

    return this.parseWeatherResponse(data, latitude, longitude, date);
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      return await fetch(url, {
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new WeatherTimeoutError();
      }

      throw new WeatherUpstreamError('Unable to reach Open-Meteo');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseWeatherResponse(
    data: OpenMeteoResponse,
    latitude: number,
    longitude: number,
    date: string,
  ): WeatherData {
    const daily = data.daily;

    if (
      !daily ||
      !Array.isArray(daily.time) ||
      !Array.isArray(daily.temperature_2m_max) ||
      !Array.isArray(daily.temperature_2m_min) ||
      !Array.isArray(daily.precipitation_sum) ||
      !Array.isArray(daily.wind_speed_10m_max)
    ) {
      throw new WeatherUpstreamError('Open-Meteo returned an invalid weather response');
    }

    const dateIndex = daily.time.indexOf(date);

    if (dateIndex === -1) {
      throw new WeatherUpstreamError('Weather data was not available for the requested date');
    }

    return {
      date,
      latitude,
      longitude,
      temperatureMax: daily.temperature_2m_max[dateIndex] ?? null,
      temperatureMin: daily.temperature_2m_min[dateIndex] ?? null,
      precipitationSum: daily.precipitation_sum[dateIndex] ?? null,
      windSpeedMax: daily.wind_speed_10m_max[dateIndex] ?? null,
    };
  }

  private validateCoordinates(latitude: number, longitude: number): void {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new WeatherValidationError('Latitude must be between -90 and 90');
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new WeatherValidationError('Longitude must be between -180 and 180');
    }
  }

  private validateDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new WeatherValidationError('Date must use YYYY-MM-DD format');
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new WeatherValidationError('Invalid date');
    }
  }
}