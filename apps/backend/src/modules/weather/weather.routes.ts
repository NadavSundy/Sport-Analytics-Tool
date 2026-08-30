import { Router } from 'express';
import { getWeather } from './weather.controller';
import { getFixtureWeather } from './fixture-weather.controller';
import type { FixtureWeatherService } from './fixture-weather.service';
import { WeatherService } from './weather.service';

export function createWeatherRouter(
  weatherService: WeatherService,
  fixtureWeatherService: FixtureWeatherService,
) {
  const router = Router();

  router.get('/weather', getWeather(weatherService));
  router.get('/fixtures/:fixtureId/weather', getFixtureWeather(fixtureWeatherService));

  return router;
}
