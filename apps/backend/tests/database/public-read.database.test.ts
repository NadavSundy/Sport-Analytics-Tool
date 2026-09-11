import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import {
  findFixtureById,
  findFixtureWeatherContext,
  listFixtures,
  updateVenueCoordinates,
} from '../../src/modules/fixtures/fixture.repository';
import { findSeason, listSeasons } from '../../src/modules/seasons/season.repository';

const seedPath = resolve(__dirname, '../../../../database/seeds/matches/423788.json');
const sourceRef = `issue-192-public-read-${process.pid}`;

describe.sequential('public read relationship summaries database integration', () => {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  let fixtureId: string | undefined;

  function databaseClient(): PoolClient {
    if (!client) {
      throw new Error('Test database client has not been initialised.');
    }

    return client;
  }

  function ingestedFixtureId(): string {
    if (!fixtureId) {
      throw new Error('Reference fixture has not been ingested.');
    }

    return fixtureId;
  }

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );

    pool = new Pool({ connectionString: databaseUrl.toString() });
    client = await pool.connect();
    await client.query('BEGIN');

    try {
      const ingestion = await ingestMatchData(client, seedPath, { sourceRef });
      fixtureId = ingestion.fixtureId;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      client = undefined;
      await pool.end();
      pool = undefined;
      throw error;
    }
  }, 30_000);

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      client = undefined;
    }

    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  test('returns seasons with their readable competition name', async () => {
    const executor = databaseClient();

    const page = await listSeasons(
      {
        limit: 50,
      },
      executor,
    );

    const season = page.records.find(
      (record) =>
        record.label === '2009/10' &&
        record.competitionName === 'Australia in New Zealand T20I Series',
    );

    expect(season).toBeDefined();

    if (!season) {
      throw new Error('Expected the ingested competition season.');
    }

    const detail = await findSeason(season.competitionId, season.label, executor);

    expect(detail).toEqual({
      competitionId: season.competitionId,
      competitionName: 'Australia in New Zealand T20I Series',
      label: '2009/10',
    });
  });

  test('returns fixtures with readable competition and participating team summaries', async () => {
    const executor = databaseClient();
    const currentFixtureId = ingestedFixtureId();

    const fixture = await findFixtureById(currentFixtureId, executor);

    expect(fixture).not.toBeNull();

    expect(fixture).toMatchObject({
      fixtureId: currentFixtureId,
      competitionName: 'Australia in New Zealand T20I Series',
      season: '2009/10',
    });

    expect(fixture?.competitors).toEqual(
      expect.arrayContaining([
        {
          name: 'New Zealand',
          competitorId: expect.any(String),
        },
        {
          name: 'Australia',
          competitorId: expect.any(String),
        },
      ]),
    );

    const page = await listFixtures(
      {
        limit: 50,
      },
      executor,
    );

    const listedFixture = page.records.find((record) => record.fixtureId === currentFixtureId);

    expect(listedFixture).toMatchObject({
      fixtureId: currentFixtureId,
      competitionName: 'Australia in New Zealand T20I Series',
      season: '2009/10',
    });

    expect(listedFixture?.competitors).toEqual(
      expect.arrayContaining([
        {
          name: 'New Zealand',
          competitorId: expect.any(String),
        },
        {
          name: 'Australia',
          competitorId: expect.any(String),
        },
      ]),
    );
  });

  test('returns stored venue coordinates for fixture weather resolution', async () => {
    const executor = databaseClient();
    const currentFixtureId = ingestedFixtureId();

    const initial = await findFixtureWeatherContext(currentFixtureId, executor);
    const venueId = initial?.venue?.venueId;
    expect(venueId).toBeDefined();

    await updateVenueCoordinates(venueId!, -43.4894, 172.5405, executor);

    await expect(findFixtureWeatherContext(currentFixtureId, executor)).resolves.toMatchObject({
      fixtureId: currentFixtureId,
      date: '2010-02-28',
      venue: {
        name: 'AMI Stadium',
        latitude: -43.4894,
        longitude: 172.5405,
      },
    });
  });
});
