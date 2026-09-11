export interface GeocodedLocation {
  latitude: number;
  longitude: number;
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{ latitude?: number; longitude?: number }>;
}

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REQUEST_TIMEOUT_MS = 5000;

export class LocationGeocodingTimeoutError extends Error {
  constructor(message = 'The location geocoding request timed out') {
    super(message);
    this.name = 'LocationGeocodingTimeoutError';
  }
}

export class LocationGeocodingUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationGeocodingUpstreamError';
  }
}

export interface LocationGeocodingService {
  resolve(query: string): Promise<GeocodedLocation | null>;
}

export class OpenMeteoLocationGeocodingService implements LocationGeocodingService {
  async resolve(query: string): Promise<GeocodedLocation | null> {
    const url = new URL(GEOCODING_BASE_URL);
    url.searchParams.set('name', query);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      if (!response.ok) {
        throw new LocationGeocodingUpstreamError(
          `Open-Meteo geocoding request failed with status ${response.status}`,
        );
      }
      let data: OpenMeteoGeocodingResponse;
      try {
        data = (await response.json()) as OpenMeteoGeocodingResponse;
      } catch {
        throw new LocationGeocodingUpstreamError('Open-Meteo geocoding returned invalid JSON');
      }
      const result = data.results?.find(
        (candidate) =>
          Number.isFinite(candidate.latitude) &&
          Number.isFinite(candidate.longitude) &&
          candidate.latitude! >= -90 &&
          candidate.latitude! <= 90 &&
          candidate.longitude! >= -180 &&
          candidate.longitude! <= 180,
      );
      return result?.latitude === undefined || result.longitude === undefined
        ? null
        : { latitude: result.latitude, longitude: result.longitude };
    } catch (error) {
      if (error instanceof LocationGeocodingUpstreamError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LocationGeocodingTimeoutError();
      }
      throw new LocationGeocodingUpstreamError('Unable to reach Open-Meteo geocoding service');
    } finally {
      clearTimeout(timeout);
    }
  }
}
