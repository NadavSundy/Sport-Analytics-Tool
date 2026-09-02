import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

import {
  WeatherDateUnsupportedError,
  type WeatherService,
} from '../../src/modules/weather/weather.service';
import { createTestApp } from '../test-app';

function createService(overrides: Partial<WeatherService> = {}): WeatherService {
  return {
    async getWeather() {
      throw new Error('The test weather service was not configured for this call.');
    },
    ...overrides,
  } as WeatherService;
}

function createApp(service: WeatherService) {
  return createTestApp(
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

describe('weather API', () => {
  test('returns weather for a historical date served by the archive endpoint', async () => {
    const getWeather = vi.fn<WeatherService['getWeather']>().mockResolvedValue({
      date: '1995-06-14',
      latitude: -26.2041,
      longitude: 28.0473,
      temperatureMax: 19.1,
      temperatureMin: 7.4,
      precipitationSum: 2.1,
      windSpeedMax: 12.3,
    });

    const response = await request(createApp(createService({ getWeather })))
      .get('/api/v1/weather')
      .query({ latitude: -26.2041, longitude: 28.0473, date: '1995-06-14' })
      .expect(200);

    expect(getWeather).toHaveBeenCalledWith(-26.2041, 28.0473, '1995-06-14');
    expect(response.body.data).toMatchObject({ date: '1995-06-14', temperatureMax: 19.1 });
  });

  test('returns 422 DATE_UNSUPPORTED for a date outside all supported ranges', async () => {
    const app = createApp(
      createService({
        async getWeather() {
          throw new WeatherDateUnsupportedError();
        },
      }),
    );

    const response = await request(app)
      .get('/api/v1/weather')
      .query({ latitude: -26.2041, longitude: 28.0473, date: '1900-01-01' })
      .expect(422);

    expect(response.body.error.code).toBe('DATE_UNSUPPORTED');
  });

  test('rejects a request missing required parameters', async () => {
    const response = await request(createApp(createService()))
      .get('/api/v1/weather')
      .query({ latitude: -26.2041, longitude: 28.0473 })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });
});
