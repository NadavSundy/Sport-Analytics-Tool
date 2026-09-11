import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import {
  findFixtureWeatherContext,
  updateVenueCoordinates,
} from '../../src/modules/fixtures/fixture.repository';

describe('fixture repository', () => {
  test('persists resolved venue coordinates by venue id', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 1,
      command: 'UPDATE',
      oid: 0,
      fields: [],
    });
    const executor = { query } as unknown as QueryExecutor;

    await updateVenueCoordinates('5', -26.1929, 28.0305, executor);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('UPDATE venue');
    expect(query.mock.calls[0]?.[0]).toContain('WHERE venue_id = $1::bigint');
    expect(query.mock.calls[0]?.[1]).toEqual(['5', -26.1929, 28.0305]);
  });

  test('includes the venue id needed to persist geocoded coordinates', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          fixtureId: '17',
          date: '2026-08-19',
          venue: {
            venueId: '5',
            name: 'Wits Cricket Oval',
            city: 'Johannesburg',
            latitude: null,
            longitude: null,
          },
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });
    const executor = { query } as unknown as QueryExecutor;

    const result = await findFixtureWeatherContext('17', executor);

    expect(query.mock.calls[0]?.[0]).toContain("'venueId', v.venue_id::text");
    expect(result?.venue?.venueId).toBe('5');
  });
});
