import { findFixtureWeatherContext, updateVenueCoordinates } from '../fixtures/fixture.repository';
import {
  type GeocodedLocation,
  type LocationGeocodingService,
  NominatimPoiGeocodingService,
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

interface NullableCoordinates {
  latitude: number | null;
  longitude: number | null;
}

function hasUsableCoordinates(coordinates: NullableCoordinates): coordinates is Coordinates {
  return (
    coordinates.latitude !== null &&
    coordinates.longitude !== null &&
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
  poiGeocodingService: LocationGeocodingService = new NominatimPoiGeocodingService(),
): FixtureWeatherService {
  const inFlightRequests = new Map<string, Promise<FixtureWeatherResult | null>>();

  async function resolveFixtureWeather(fixtureId: string): Promise<FixtureWeatherResult | null> {
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

    let resolvedCoordinates: NullableCoordinates = {
      latitude: context.venue.latitude,
      longitude: context.venue.longitude,
    };

    if (!hasUsableCoordinates(resolvedCoordinates)) {
      let resolved: GeocodedLocation | null = null;
      const venueName = context.venue.name.trim();
      const cityName = context.venue.city?.trim() || null;

      if (cityName) {
        resolved = await geocodingService.resolve(`${venueName}, ${cityName}`);
      }

      if (!resolved) {
        resolved = await geocodingService.resolve(venueName);
      }

      if (!resolved) {
        resolved = await poiGeocodingService.resolve(venueName);
      }

      if (!resolved && cityName && cityName !== venueName) {
        resolved = await geocodingService.resolve(cityName);
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

      const candidateCoordinates: NullableCoordinates = {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
      };

      if (!hasUsableCoordinates(candidateCoordinates)) {
        return {
          fixtureId: context.fixtureId,
          date: context.date,
          availability: 'unavailable',
          reason: 'UNSUPPORTED_LOCATION',
          venue,
          weather: null,
        };
      }

      await persistVenueCoordinates(
        context.venue.venueId,
        candidateCoordinates.latitude,
        candidateCoordinates.longitude,
      );

      resolvedCoordinates = candidateCoordinates;
    }

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
  }

  return {
    getFixtureWeather(fixtureId) {
      const inFlight = inFlightRequests.get(fixtureId);
      if (inFlight) {
        return inFlight;
      }

      const request = resolveFixtureWeather(fixtureId).finally(() => {
        inFlightRequests.delete(fixtureId);
      });

      inFlightRequests.set(fixtureId, request);
      return request;
    },
  };
}
