import type { Request, RequestHandler } from 'express';

import {
  LocationGeocodingTimeoutError,
  LocationGeocodingUpstreamError,
} from './location-geocoding.service';
import {
  WeatherTimeoutError,
  WeatherUpstreamError,
  WeatherValidationError,
} from './weather.service';
import { GeocodingTimeoutError, GeocodingUpstreamError } from './geocoding.service';
import type { FixtureWeatherService } from './fixture-weather.service';

function pathParameter(request: Request, name: string): string {
  const value = request.params[name];
  if (value === undefined) {
    throw new Error(`Expected route parameter "${name}" was not provided.`);
  }
  return value;
}

export function getFixtureWeather(service: FixtureWeatherService): RequestHandler {
  return (request, response) => {
    void (async () => {
      try {
        const result = await service.getFixtureWeather(pathParameter(request, 'fixtureId'));
        if (!result) {
          response.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Fixture not found.' },
          });
          return;
        }

        response.status(200).json({ data: result });
      } catch (error) {
        request.log?.error({ err: error }, 'Fixture weather API request failed');

        if (error instanceof WeatherValidationError) {
          response.status(503).json({
            error: {
              code: 'WEATHER_SERVICE_UNAVAILABLE',
              message: 'Weather information is temporarily unavailable.',
            },
          });
          return;
        }

        if (error instanceof WeatherTimeoutError || error instanceof GeocodingTimeoutError) {
          response.status(504).json({
            error: {
              code: 'UPSTREAM_TIMEOUT',
              message: 'The weather provider did not respond in time.',
            },
          });
          return;
        }

        if (error instanceof WeatherUpstreamError || error instanceof GeocodingUpstreamError) {
          response.status(502).json({
            error: { code: 'UPSTREAM_ERROR', message: 'The weather provider returned an error.' },
          });
          return;
        }

        if (error instanceof LocationGeocodingTimeoutError) {
          response.status(504).json({
            error: {
              code: 'UPSTREAM_TIMEOUT',
              message: 'The location provider did not respond in time.',
            },
          });
          return;
        }

        if (error instanceof LocationGeocodingUpstreamError) {
          response.status(502).json({
            error: { code: 'UPSTREAM_ERROR', message: 'The location provider returned an error.' },
          });
          return;
        }

        response.status(503).json({
          error: {
            code: 'WEATHER_SERVICE_UNAVAILABLE',
            message: 'Weather information is temporarily unavailable.',
          },
        });
      }
    })();
  };
}
