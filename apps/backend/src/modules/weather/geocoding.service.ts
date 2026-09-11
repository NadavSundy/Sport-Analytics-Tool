export interface GeocodedCoordinates {
  latitude: number;
  longitude: number;
}

interface OpenMeteoGeocodingResult {
  latitude?: number;
  longitude?: number;
  name?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REQUEST_TIMEOUT_MS = 5000;

export class GeocodingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeocodingValidationError';
  }
}

export class GeocodingTimeoutError extends Error {
  constructor(message = 'Open-Meteo geocoding request timed out') {
    super(message);
    this.name = 'GeocodingTimeoutError';
  }
}

export class GeocodingUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeocodingUpstreamError';
  }
}

interface GeocodingService {
  /**
   * Resolves a free-text place name (e.g. a venue name, optionally combined
   * with a city) to coordinates.
   *
   * Returns `null` when the location genuinely cannot be resolved (the
   * provider responded successfully but found no match) rather than
   * throwing, so callers can distinguish "unknown location" from a failed
   * request. Provider/network failures throw `GeocodingTimeoutError` or
   * `GeocodingUpstreamError`.
   */
  resolveLocation(query: string): Promise<GeocodedCoordinates | null>;
}

/**
 * Resolves place names to coordinates using Open-Meteo's free geocoding API
 * (https://geocoding-api.open-meteo.com), which, like the forecast/archive
 * endpoints already used by `WeatherService`, requires no API key.
 */
export class OpenMeteoGeocodingService implements GeocodingService {
  async resolveLocation(query: string): Promise<GeocodedCoordinates | null> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      throw new GeocodingValidationError('A location name is required');
    }

    const url = new URL(GEOCODING_BASE_URL);
    url.searchParams.set('name', trimmedQuery);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const response = await this.fetchWithTimeout(url.toString());

    if (!response.ok) {
      throw new GeocodingUpstreamError(
        `Open-Meteo geocoding request failed with status ${response.status}`,
      );
    }

    let data: OpenMeteoGeocodingResponse;

    try {
      data = (await response.json()) as OpenMeteoGeocodingResponse;
    } catch {
      throw new GeocodingUpstreamError('Open-Meteo geocoding returned invalid JSON');
    }

    return this.parseGeocodingResponse(data);
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
        throw new GeocodingTimeoutError();
      }

      throw new GeocodingUpstreamError('Unable to reach Open-Meteo geocoding');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseGeocodingResponse(data: OpenMeteoGeocodingResponse): GeocodedCoordinates | null {
    const results = data.results;

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const [first] = results;

    if (
      !first ||
      typeof first.latitude !== 'number' ||
      typeof first.longitude !== 'number' ||
      !Number.isFinite(first.latitude) ||
      !Number.isFinite(first.longitude)
    ) {
      return null;
    }

    return { latitude: first.latitude, longitude: first.longitude };
  }
}
