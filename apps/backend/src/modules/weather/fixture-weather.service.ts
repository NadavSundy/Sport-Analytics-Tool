import { findFixtureWeatherContext, updateVenueCoordinates } from '../fixtures/fixture.repository';
import { classifyWeatherDate, type WeatherData, type WeatherService } from './weather.service';
import { OpenMeteoGeocodingService, type GeocodingService } from './geocoding.service';

type FixtureWeatherUnavailableReason =
  | 'MISSING_VENUE'
  | 'MISSING_COORDINATES'
  | 'UNSUPPORTED_LOCATION'
  | 'LOCATION_NOT_FOUND'
  | 'UNSUPPORTED_DATE';

export interface FixtureWeatherContext {
  fixtureId: string;
  date: string;
  venue: {
    venueId: string;
    name: string;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

interface FixtureWeatherAvailable {
  fixtureId: string;
  date: string;
  availability: 'available';
  venue: { name: string; city: string | null };
  weather: WeatherData;
}

interface FixtureWeatherUnavailable {
  fixtureId: string;
  date: string;
  availability: 'unavailable';
  reason: FixtureWeatherUnavailableReason;
  venue: { name: string; city: string | null } | null;
  weather: null;
}

type FixtureWeatherResult = FixtureWeatherAvailable | FixtureWeatherUnavailable;

type FindFixtureWeatherContext = (fixtureId: string) => Promise<FixtureWeatherContext | null>;

type PersistVenueCoordinates = (
  venueId: string,
  latitude: number,
  longitude: number,
) => Promise<void>;

const databaseIdPattern = /^\d+$/;

interface Coordinates {
  latitude: number;
  longitude: number;
}

function hasUsableCoordinates(coordinates: Coordinates): boolean {
  return (
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

/**
 * Builds the free-text query sent to the geocoding provider from the stored
 * venue name and, when available, its city, e.g. "AMI Stadium, Christchurch".
 */
function buildGeocodingQuery(venue: { name: string; city: string | null }): string {
  return venue.city ? `${venue.name}, ${venue.city}` : venue.name;
}

export interface FixtureWeatherService {
  getFixtureWeather(fixtureId: string): Promise<FixtureWeatherResult | null>;
}

export function createFixtureWeatherService(
  weatherService: WeatherService,
  findContext: FindFixtureWeatherContext = findFixtureWeatherContext,
  geocodingService: GeocodingService = new OpenMeteoGeocodingService(),
  persistVenueCoordinates: PersistVenueCoordinates = updateVenueCoordinates,
): FixtureWeatherService {
  return {
    async getFixtureWeather(fixtureId) {
      if (!databaseIdPattern.test(fixtureId)) {
        return null;
      }

      const context = await findContext(fixtureId);
      if (!context) {
        return null;
      }

      if (!context.venue) {
        return {
          fixtureId: context.fixtureId,
          date: context.date,
          availability: 'unavailable',
          reason: 'MISSING_VENUE',
          venue: null,
          weather: null,
        };
      }

      const venue = { name: context.venue.name, city: context.venue.city };

      let coordinates: Coordinates | null =
        context.venue.latitude === null || context.venue.longitude === null
          ? null
          : { latitude: context.venue.latitude, longitude: context.venue.longitude };

      // Reuse stored coordinates when present; only geocode the venue the
      // first time weather is requested for it, and persist the result so
      // subsequent requests never geocode the same venue again.
      if (!coordinates) {
        const resolved = await geocodingService.resolveLocation(buildGeocodingQuery(venue));

        if (!resolved) {
          return {
            fixtureId: context.fixtureId,
            date: context.date,
            availability: 'unavailable',
            reason: 'LOCATION_NOT_FOUND',
            venue,
            weather: null,
          };
        }

        coordinates = resolved;
        await persistVenueCoordinates(context.venue.venueId, resolved.latitude, resolved.longitude);
      }

      if (!hasUsableCoordinates(coordinates)) {
        return {
          fixtureId: context.fixtureId,
          date: context.date,
          availability: 'unavailable',
          reason: 'UNSUPPORTED_LOCATION',
          venue,
          weather: null,
        };
      }

      if (classifyWeatherDate(context.date) === 'unsupported') {
        return {
          fixtureId: context.fixtureId,
          date: context.date,
          availability: 'unavailable',
          reason: 'UNSUPPORTED_DATE',
          venue,
          weather: null,
        };
      }

      const weather = await weatherService.getWeather(
        coordinates.latitude,
        coordinates.longitude,
        context.date,
      );

      return {
        fixtureId: context.fixtureId,
        date: context.date,
        availability: 'available',
        venue,
        weather,
      };
    },
  };
}
