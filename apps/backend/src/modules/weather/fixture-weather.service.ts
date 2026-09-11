import { findFixtureWeatherContext, updateVenueCoordinates } from '../fixtures/fixture.repository';
import {
  type GeocodedLocation,
  type LocationGeocodingService,
  OpenMeteoLocationGeocodingService,
} from './location-geocoding.service';
import { classifyWeatherDate, type WeatherData, type WeatherService } from './weather.service';

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

export interface FixtureWeatherService {
  getFixtureWeather(fixtureId: string): Promise<FixtureWeatherResult | null>;
}

export function createFixtureWeatherService(
  weatherService: WeatherService,
  findContext: FindFixtureWeatherContext = findFixtureWeatherContext,
  geocodingService: LocationGeocodingService = new OpenMeteoLocationGeocodingService(),
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

      const venue = {
        name: context.venue.name,
        city: context.venue.city,
      };

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

      let latitude = context.venue.latitude;
      let longitude = context.venue.longitude;

      if (latitude === null || longitude === null) {
        const queries = context.venue.city
          ? [`${context.venue.name}, ${context.venue.city}`, context.venue.name]
          : [context.venue.name];

        let resolved: GeocodedLocation | null = null;

        for (const query of queries) {
          resolved = await geocodingService.resolve(query);

          if (resolved) {
            break;
          }
        }

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

        latitude = resolved.latitude;
        longitude = resolved.longitude;

        await persistVenueCoordinates(
          context.venue.venueId,
          latitude,
          longitude,
        );
      }

      const resolvedCoordinates = {
        latitude,
        longitude,
      };

      if (!hasUsableCoordinates(resolvedCoordinates)) {
        return {
          fixtureId: context.fixtureId,
          date: context.date,
          availability: 'unavailable',
          reason: 'UNSUPPORTED_LOCATION',
          venue,
          weather: null,
        };
      }

      const weather = await weatherService.getWeather(
        resolvedCoordinates.latitude,
        resolvedCoordinates.longitude,
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