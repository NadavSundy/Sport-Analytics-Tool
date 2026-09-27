import { describe, expect, test, vi } from 'vitest';

import type { QueryExecutor } from '../../src/database';
import {
  findFixtureById,
  findFixtureWeatherContext,
  listFixtures,
  updateVenueCoordinates,
} from '../../src/modules/fixtures/fixture.repository';

describe('fixture repository', () => {
  test('returns the filtered fixture count with each cursor page', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          fixtureId: '17',
          competitionId: '5',
          competitionName: 'Premier Cricket League',
          season: '2026',
          competitors: [],
          matchType: 'T20',
          teamType: 'club',
          gender: 'female',
          ballsPerOver: 6,
          scheduledOvers: 20,
          venue: null,
          toss: null,
          startDate: '2026-08-19',
          endDate: '2026-08-19',
          totalRecords: 51,
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });
    const executor = { query } as unknown as QueryExecutor;

    const page = await listFixtures({ limit: 50 }, executor);

    expect(query.mock.calls[0]?.[0]).toContain('COUNT(*) OVER()::integer AS "totalRecords"');
    expect(query.mock.calls[0]?.[0]).toContain('f."totalRecords"');
    expect(page.totalRecords).toBe(51);
  });

  test('reads venue and toss metadata with readable team context', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          fixtureId: '17',
          competitionId: '5',
          competitionName: 'Premier Cricket League',
          season: '2026',
          competitors: [],
          matchType: 'T20',
          teamType: 'club',
          gender: 'female',
          ballsPerOver: 6,
          scheduledOvers: 20,
          venue: { name: 'Wits Cricket Oval', city: 'Johannesburg' },
          toss: {
            winnerCompetitorId: '9',
            winnerCompetitorName: 'Wanderers',
            decision: 'field',
          },
          startDate: '2026-08-19',
          endDate: '2026-08-19',
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });
    const executor = { query } as unknown as QueryExecutor;

    const result = await findFixtureById('17', executor);

    expect(query.mock.calls[0]?.[0]).toContain('LEFT JOIN venue');
    expect(query.mock.calls[0]?.[0]).toContain('LEFT JOIN team toss_winner');
    expect(result?.venue).toEqual({ name: 'Wits Cricket Oval', city: 'Johannesburg' });
    expect(result?.toss).toEqual({
      winnerCompetitorId: '9',
      winnerCompetitorName: 'Wanderers',
      decision: 'field',
    });
  });

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
    expect(query.mock.calls[0]?.[0]).toContain('AND latitude IS NULL');
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
