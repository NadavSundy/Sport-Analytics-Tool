import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import type { FixtureWeatherService } from '../../src/modules/weather/fixture-weather.service';
import {
  WeatherTimeoutError,
  WeatherUpstreamError,
} from '../../src/modules/weather/weather.service';
import { createTestApp } from '../test-app';

function createService(overrides: Partial<FixtureWeatherService> = {}): FixtureWeatherService {
  return {
    async getFixtureWeather() {
      return null;
    },
    ...overrides,
  };
}

function createApp(service: FixtureWeatherService) {
  return createTestApp(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    service,
  );
}

describe('fixture weather API', () => {
  test('returns contextual weather for an existing fixture', async () => {
    const getFixtureWeather = vi
      .fn<FixtureWeatherService['getFixtureWeather']>()
      .mockResolvedValue({
        fixtureId: '17',
        date: '2026-08-19',
        availability: 'available',
        venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
        weather: {
          date: '2026-08-19',
          latitude: -26.1929,
          longitude: 28.0305,
          temperatureMax: 24,
          temperatureMin: 11,
          precipitationSum: 0,
          windSpeedMax: 17,
        },
      });

    const response = await request(createApp(createService({ getFixtureWeather })))
      .get('/api/v1/fixtures/17/weather')
      .expect(200);

    expect(getFixtureWeather).toHaveBeenCalledWith('17');
    expect(response.body.data).toMatchObject({ availability: 'available', fixtureId: '17' });
  });

  test('distinguishes an unknown fixture from an unavailable fixture location', async () => {
    await request(createApp(createService()))
      .get('/api/v1/fixtures/999/weather')
      .expect(404)
      .expect({ error: { code: 'NOT_FOUND', message: 'Fixture not found.' } });

    const response = await request(
      createApp(
        createService({
          async getFixtureWeather() {
            return {
              fixtureId: '17',
              date: '2026-08-19',
              availability: 'unavailable',
              reason: 'MISSING_COORDINATES',
              venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
              weather: null,
            };
          },
        }),
      ),
    )
      .get('/api/v1/fixtures/17/weather')
      .expect(200);

    expect(response.body.data).toMatchObject({
      availability: 'unavailable',
      reason: 'MISSING_COORDINATES',
    });
  });

  test.each([
    [new WeatherUpstreamError('provider error'), 502, 'UPSTREAM_ERROR'],
    [new WeatherTimeoutError(), 504, 'UPSTREAM_TIMEOUT'],
  ])('maps a weather provider failure safely', async (error, status, code) => {
    const app = createApp(
      createService({
        async getFixtureWeather() {
          throw error;
        },
      }),
    );

    const response = await request(app).get('/api/v1/fixtures/17/weather').expect(status);
    expect(response.body.error.code).toBe(code);
  });
});
