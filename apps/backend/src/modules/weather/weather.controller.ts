import type { Request, Response } from 'express';
import type { WeatherService } from './weather.service';
import {
  WeatherDateUnsupportedError,
  WeatherTimeoutError,
  WeatherUpstreamError,
  WeatherValidationError,
} from './weather.service';

export function getWeather(weatherService: WeatherService) {
  return async (req: Request, res: Response): Promise<void> => {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const date = String(req.query.date ?? '');

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !date) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message:
            'latitude, longitude and date are required. Latitude and longitude must be numbers.',
        },
      });
      return;
    }

    try {
      const weather = await weatherService.getWeather(latitude, longitude, date);
      res.status(200).json({ data: weather });
    } catch (error) {
      req.log?.error({ err: error }, 'Weather API request failed');

      if (error instanceof WeatherValidationError) {
        res.status(400).json({
          error: { code: 'VALIDATION_FAILED', message: error.message },
        });
        return;
      }

      if (error instanceof WeatherDateUnsupportedError) {
        res.status(422).json({
          error: { code: 'DATE_UNSUPPORTED', message: error.message },
        });
        return;
      }

      if (error instanceof WeatherTimeoutError) {
        res.status(504).json({
          error: {
            code: 'UPSTREAM_TIMEOUT',
            message: 'The weather provider did not respond in time.',
          },
        });
        return;
      }

      if (error instanceof WeatherUpstreamError) {
        res.status(502).json({
          error: { code: 'UPSTREAM_ERROR', message: 'The weather provider returned an error.' },
        });
        return;
      }

      res.status(503).json({
        error: {
          code: 'WEATHER_SERVICE_UNAVAILABLE',
          message: 'Weather information is temporarily unavailable.',
        },
      });
    }
  };
}
