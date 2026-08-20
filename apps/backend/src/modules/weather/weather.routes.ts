import { Router } from "express";
import { getWeather } from "./weather.controller";
import { WeatherService } from "./weather.service";

export function createWeatherRouter(
  weatherService: WeatherService,
) {
  const router = Router();

  router.get("/weather", getWeather(weatherService));

  return router;
}