import { findFixtureWeatherContext } from '../fixtures/fixture.repository';
import { type WeatherData, type WeatherService } from './weather.service';

export type FixtureWeatherUnavailableReason =
  'MISSING_VENUE' | 'MISSING_COORDINATES' | 'UNSUPPORTED_LOCATION';

export interface FixtureWeatherContext {
  fixtureId: string;
  date: string;
  venue: {
    name: string;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export interface FixtureWeatherAvailable {
  fixtureId: string;
  date: string;
  availability: 'available';
  venue: { name: string; city: string | null };
  weather: WeatherData;
}

export interface FixtureWeatherUnavailable {
  fixtureId: string;
  date: string;
  availability: 'unavailable';
  reason: FixtureWeatherUnavailableReason;
  venue: { name: string; city: string | null } | null;
  weather: null;
}

export type FixtureWeatherResult = FixtureWeatherAvailable | FixtureWeatherUnavailable;

export type FindFixtureWeatherContext = (
  fixtureId: string,
) => Promise<FixtureWeatherContext | null>;

const databaseIdPattern = /^\d+$/;

function hasUsableCoordinates(
  venue: NonNullable<FixtureWeatherContext['venue']>,
): venue is NonNullable<FixtureWeatherContext['venue']> & {
  latitude: number;
  longitude: number;
} {
  if (venue.latitude === null || venue.longitude === null) {
    return false;
  }

  return (
    Number.isFinite(venue.latitude) &&
    Number.isFinite(venue.longitude) &&
    venue.latitude >= -90 &&
    venue.latitude <= 90 &&
    venue.longitude >= -180 &&
    venue.longitude <= 180
  );
}

export interface FixtureWeatherService {
  getFixtureWeather(fixtureId: string): Promise<FixtureWeatherResult | null>;
}

export function createFixtureWeatherService(
  weatherService: WeatherService,
  findContext: FindFixtureWeatherContext = findFixtureWeatherContext,
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
      if (context.venue.latitude === null || context.venue.longitude === null) {
        return {
          fixtureId: context.fixtureId,
          date: context.date,
          availability: 'unavailable',
          reason: 'MISSING_COORDINATES',
          venue,
          weather: null,
        };
      }

      if (!hasUsableCoordinates(context.venue)) {
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
        context.venue.latitude,
        context.venue.longitude,
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
