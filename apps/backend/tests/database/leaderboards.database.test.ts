import { resolve } from 'node:path';

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { executeQuery, type QueryExecutor } from '../../src/database';
import { createSeasonId } from '../../src/modules/public-read/season-id';
import { loadLeaderboardSource } from '../../src/modules/statistics/leaderboards.repository';
import { createLeaderboardsService } from '../../src/modules/statistics/leaderboards.service';
import { withExplicitZeroExtras } from './explicit-zero-extras';

interface FixtureScopeRow {
  competitionId: string;
  season: string;
}

interface DeliveryRow {
  deliveryId: string;
}

const seedPath = withExplicitZeroExtras(
  resolve(__dirname, '../../../../database/seeds/matches/423788.json'),
);
const sourcePrefix = `issue-635-${process.pid}`;

function countingExecutor(client: PoolClient): { executor: QueryExecutor; statements: string[] } {
  const statements: string[] = [];
  return {
    statements,
    executor: {
      query<Row extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: unknown[],
      ): Promise<QueryResult<Row>> {
        statements.push(text);
        return client.query<Row>(text, values);
      },
    },
  };
}

describe.sequential('season and competition leaderboard database integration', () => {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  let competitionId = '';
  let season = '';
  let firstFixtureId = '';

  function databaseClient(): PoolClient {
    if (!client) {
      throw new Error('Test database client has not been initialised.');
    }
    return client;
  }

  function service(executor: QueryExecutor = databaseClient()) {
    return createLeaderboardsService((scope, metric, limit) =>
      loadLeaderboardSource(scope, metric, limit, executor),
    );
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
      const fixtureIds: string[] = [];
      for (let index = 0; index < 6; index += 1) {
        const ingestion = await ingestMatchData(client, seedPath, {
          sourceRef: `${sourcePrefix}-${index}`,
        });
        fixtureIds.push(ingestion.fixtureId);
      }
      firstFixtureId = fixtureIds[0] ?? '';

      const scopeResult = await executeQuery<FixtureScopeRow>(
        client,
        `
          SELECT competition_id::text AS "competitionId", season
          FROM fixture
          WHERE fixture_id = $1::bigint
        `,
        [firstFixtureId],
      );
      const scope = scopeResult.rows[0];
      if (!scope) {
        throw new Error('Expected the reference fixture scope to exist.');
      }
      competitionId = scope.competitionId;
      season = scope.season;

      // The sixth copy represents another season in the same competition. It
      // makes season isolation and the wider competition rollup observable.
      await executeQuery(client, 'UPDATE fixture SET season = $2 WHERE fixture_id = $1::bigint', [
        fixtureIds[5],
        '2010/11',
      ]);
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
    }
    if (pool) {
      await pool.end();
    }
  });

  test('ranks authoritative totals, scopes seasons, bounds results and breaks ties by name', async () => {
    const seasonId = createSeasonId({ competitionId, label: season });
    const seasonRuns = await service().getLeaderboard({
      scope: 'season',
      seasonId,
      metric: 'most_runs',
      limit: 2,
    });
    const competitionRuns = await service().getLeaderboard({
      scope: 'competition',
      competitionId,
      metric: 'most_runs',
      limit: 2,
    });

    expect(seasonRuns?.entries).toHaveLength(2);
    expect(seasonRuns?.entries[0]).toMatchObject({
      rank: 1,
      participantName: 'BB McCullum',
      value: 580,
    });
    expect(competitionRuns?.entries[0]).toMatchObject({
      participantName: 'BB McCullum',
      value: 696,
    });

    const fours = await service().getLeaderboard({
      scope: 'season',
      seasonId,
      metric: 'most_fours',
      limit: 1,
    });
    const sixes = await service().getLeaderboard({
      scope: 'season',
      seasonId,
      metric: 'most_sixes',
      limit: 1,
    });
    expect(fours?.entries[0]).toMatchObject({ participantName: 'BB McCullum', value: 60 });
    expect(sixes?.entries[0]).toMatchObject({ participantName: 'BB McCullum', value: 40 });

    const wickets = await service().getLeaderboard({
      scope: 'season',
      seasonId,
      metric: 'most_wickets',
      limit: 2,
    });
    expect(wickets?.entries).toEqual([
      expect.objectContaining({ rank: 1, participantName: 'JEC Franklin', value: 10 }),
      expect.objectContaining({ rank: 2, participantName: 'SW Tait', value: 10 }),
    ]);
  });

  test('applies rate qualifications below, exactly at and above their thresholds', async () => {
    const seasonId = createSeasonId({ competitionId, label: season });
    const strikeRate = await service().getLeaderboard({
      scope: 'season',
      seasonId,
      metric: 'highest_strike_rate',
      limit: 50,
    });
    expect(strikeRate?.qualification).toMatchObject({ field: 'ballsFaced', minimum: 100 });
    expect(strikeRate?.entries.map((entry) => entry.participantName)).toContain('BB McCullum');
    expect(strikeRate?.entries.map((entry) => entry.participantName)).not.toContain('GJ Hopkins');

    const bowlingAverage = await service().getLeaderboard({
      scope: 'season',
      seasonId,
      metric: 'best_bowling_average',
      limit: 50,
    });
    expect(bowlingAverage?.qualification).toMatchObject({
      field: 'wicketsTaken',
      minimum: 5,
    });
    // One-wicket bowlers in each reference fixture are exactly at five;
    // Franklin and Tait are above it with ten. Wicketless bowlers are absent.
    expect(bowlingAverage?.entries.map((entry) => entry.participantName)).toEqual(
      expect.arrayContaining(['JEC Franklin', 'SW Tait', 'SPD Smith']),
    );
    expect(bowlingAverage?.entries.map((entry) => entry.participantName)).not.toContain(
      'NL McCullum',
    );

    for (const metric of [
      'highest_batting_average',
      'best_economy_rate',
      'best_bowling_strike_rate',
    ] as const) {
      const leaderboard = await service().getLeaderboard({
        scope: 'season',
        seasonId,
        metric,
        limit: 10,
      });
      expect(leaderboard?.qualification).not.toBeNull();
      expect(leaderboard?.entries.length).toBeGreaterThan(0);
    }
  });

  test('reflects an accepted-current correction and retains a single bounded statement', async () => {
    const seasonId = createSeasonId({ competitionId, label: season });
    const targetResult = await executeQuery<DeliveryRow>(
      databaseClient(),
      `
        SELECT d.delivery_id::text AS "deliveryId"
        FROM delivery_current d
        JOIN innings i ON i.innings_id = d.innings_id
        JOIN person striker ON striker.person_id = d.striker_id
        WHERE i.fixture_id = $1::bigint
          AND striker.source_ref = 'b8a55852'
          AND d.runs_off_bat = 6
          AND NOT EXISTS (SELECT 1 FROM delivery_wicket w WHERE w.delivery_id = d.delivery_id)
        ORDER BY d.innings_sequence
        LIMIT 1
      `,
      [firstFixtureId],
    );
    const target = targetResult.rows[0];
    if (!target) {
      throw new Error('Expected a correctable McCullum six.');
    }

    await executeQuery(
      databaseClient(),
      `UPDATE delivery SET superseded_at = now(), superseded_by = delivery_id WHERE delivery_id = $1`,
      [target.deliveryId],
    );
    const replacement = await executeQuery<DeliveryRow>(
      databaseClient(),
      `
        INSERT INTO delivery (
          innings_id, over_number, position_in_over, innings_sequence, ball_number,
          striker_id, non_striker_id, bowler_id,
          runs_off_bat, runs_extras, runs_total, non_boundary,
          extra_wides, extra_noballs, extra_byes, extra_legbyes, extra_penalty,
          revision, submission_id, source_event_id, submission_event_ordinal,
          source_batch_item_id, supersedes_delivery_id
        )
        SELECT
          innings_id, over_number, position_in_over, innings_sequence, ball_number,
          striker_id, non_striker_id, bowler_id,
          0, runs_extras, runs_extras, non_boundary,
          extra_wides, extra_noballs, extra_byes, extra_legbyes, extra_penalty,
          revision + 1, submission_id, source_event_id, submission_event_ordinal,
          source_batch_item_id, delivery_id
        FROM delivery
        WHERE delivery_id = $1::bigint
        RETURNING delivery_id::text AS "deliveryId"
      `,
      [target.deliveryId],
    );
    await executeQuery(
      databaseClient(),
      'UPDATE delivery SET superseded_by = $2::bigint WHERE delivery_id = $1::bigint',
      [target.deliveryId, replacement.rows[0]?.deliveryId],
    );

    const { executor, statements } = countingExecutor(databaseClient());
    const corrected = await service(executor).getLeaderboard({
      scope: 'season',
      seasonId,
      metric: 'most_runs',
      limit: 1,
    });

    expect(corrected?.entries[0]).toMatchObject({ participantName: 'BB McCullum', value: 574 });
    expect(statements).toHaveLength(1);
  });
});
