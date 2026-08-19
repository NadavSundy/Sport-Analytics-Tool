import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { executeQuery, withTransaction } from '../../src/database';
import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

/**
 * Ingestion inserts rows per set rather than per row, so a delivery's dependent
 * rows are attached by mapping a returned identifier back to the natural key
 * rather than by position. These tests exercise that mapping, the idempotency
 * the importer relies on to resume, and the rejection of a name the registry
 * omits.
 */

const sourcePrefix = `import-test-${process.pid}`;

/** A minimal match carrying the cases the batching put at risk. */
function matchFixture(): unknown {
  return {
    meta: { data_version: '1.1.0', revision: 1 },
    info: {
      teams: [`${sourcePrefix}-batting`, `${sourcePrefix}-bowling`],
      dates: ['2026-01-01'],
      season: '2026',
      match_type: 'T20',
      team_type: 'international',
      gender: 'male',
      balls_per_over: 6,
      overs: 20,
      venue: `${sourcePrefix}-venue`,
      toss: { winner: `${sourcePrefix}-batting`, decision: 'bat' },
      outcome: { winner: `${sourcePrefix}-batting`, by: { runs: 10 } },
      registry: {
        people: {
          'A Striker': `${sourcePrefix}-striker`,
          'B NonStriker': `${sourcePrefix}-nonstriker`,
          'C Bowler': `${sourcePrefix}-bowler`,
          'D Fielder': `${sourcePrefix}-fielder`,
        },
      },
      players: {
        [`${sourcePrefix}-batting`]: ['A Striker', 'B NonStriker'],
        [`${sourcePrefix}-bowling`]: ['C Bowler', 'D Fielder'],
      },
    },
    innings: [
      {
        team: `${sourcePrefix}-batting`,
        overs: [
          {
            over: 0,
            deliveries: [
              // A wide, so the printed ball number does not advance.
              {
                batter: 'A Striker',
                bowler: 'C Bowler',
                non_striker: 'B NonStriker',
                runs: { batter: 0, extras: 1, total: 1 },
                extras: { wides: 1 },
              },
              {
                batter: 'A Striker',
                bowler: 'C Bowler',
                non_striker: 'B NonStriker',
                runs: { batter: 4, extras: 0, total: 4 },
              },
              // A wicket with a named fielder, on the third delivery rather than
              // the first, so a mapping by position would attach it wrongly.
              {
                batter: 'A Striker',
                bowler: 'C Bowler',
                non_striker: 'B NonStriker',
                runs: { batter: 0, extras: 0, total: 0 },
                wickets: [
                  {
                    kind: 'caught',
                    player_out: 'A Striker',
                    fielders: [{ name: 'D Fielder' }],
                  },
                ],
              },
            ],
          },
        ],
      },
      // An innings with no overs, which the batched insert must not treat as an
      // empty parameter list.
      {
        team: `${sourcePrefix}-bowling`,
        forfeited: true,
        overs: [],
      },
    ],
  };
}

describe.sequential('corpus ingestion database integration', () => {
  let pool: Pool | undefined;
  let directory: string | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }
    return pool;
  }

  function writeMatch(sourceRef: string, match: unknown): string {
    const path = join(directory as string, `${sourceRef}.json`);
    writeFileSync(path, JSON.stringify(match), 'utf8');
    return path;
  }

  beforeAll(() => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });
    directory = mkdtempSync(join(tmpdir(), 'import-test-'));
  });

  afterAll(async () => {
    if (pool) {
      await executeQuery(pool, 'DELETE FROM fixture WHERE source_ref LIKE $1', [
        `${sourcePrefix}%`,
      ]);
      await executeQuery(pool, 'DELETE FROM person WHERE source_ref LIKE $1', [`${sourcePrefix}%`]);
      await executeQuery(pool, 'DELETE FROM team WHERE name LIKE $1', [`${sourcePrefix}%`]);
      await executeQuery(pool, 'DELETE FROM venue WHERE name LIKE $1', [`${sourcePrefix}%`]);
      await pool.end();
    }

    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('attaches a wicket and its fielder to the delivery that carried them', async () => {
    const sourceRef = `${sourcePrefix}-attribution`;
    const path = writeMatch(sourceRef, matchFixture());

    const result = await withTransaction(databasePool(), (client) => ingestMatchData(client, path));

    expect(result.deliveriesAdded).toBe(3);

    const wickets = await executeQuery<{
      positionInOver: number;
      ballNumber: string;
      fielderName: string | null;
    }>(
      databasePool(),
      `
        SELECT d.position_in_over AS "positionInOver",
               d.ball_number      AS "ballNumber",
               p.display_name     AS "fielderName"
          FROM delivery d
          JOIN innings i ON i.innings_id = d.innings_id
          JOIN fixture f ON f.fixture_id = i.fixture_id
          JOIN delivery_wicket w ON w.delivery_id = d.delivery_id
          LEFT JOIN delivery_wicket_fielder wf ON wf.wicket_id = w.wicket_id
          LEFT JOIN person p ON p.person_id = wf.person_id
         WHERE f.source_ref = $1
      `,
      [sourceRef],
    );

    // The wicket belongs to the third delivery, not the first: a mapping by
    // position rather than by natural key would attach it wrongly.
    expect(wickets.rows).toHaveLength(1);
    expect(wickets.rows[0].positionInOver).toBe(2);
    expect(wickets.rows[0].fielderName).toBe('D Fielder');

    // The wide does not advance the printed ball number, so the first two
    // deliveries share a label while their positions differ.
    const labels = await executeQuery<{ positionInOver: number; ballNumber: string }>(
      databasePool(),
      `
        SELECT d.position_in_over AS "positionInOver", d.ball_number AS "ballNumber"
          FROM delivery d
          JOIN innings i ON i.innings_id = d.innings_id
          JOIN fixture f ON f.fixture_id = i.fixture_id
         WHERE f.source_ref = $1
         ORDER BY d.innings_sequence
      `,
      [sourceRef],
    );

    expect(labels.rows.map((row) => row.ballNumber)).toEqual(['0.1', '0.1', '0.2']);
  });

  test('adds nothing when the same match is ingested a second time', async () => {
    const sourceRef = `${sourcePrefix}-idempotent`;
    const path = writeMatch(sourceRef, matchFixture());

    const first = await withTransaction(databasePool(), (client) => ingestMatchData(client, path));
    const second = await withTransaction(databasePool(), (client) => ingestMatchData(client, path));

    expect(first.deliveriesAdded).toBe(3);
    expect(second.deliveriesAdded).toBe(0);
    expect(second.fixtureId).toBe(first.fixtureId);

    const count = await executeQuery<{ deliveries: string }>(
      databasePool(),
      `
        SELECT count(*) AS deliveries
          FROM delivery d
          JOIN innings i ON i.innings_id = d.innings_id
          JOIN fixture f ON f.fixture_id = i.fixture_id
         WHERE f.source_ref = $1
      `,
      [sourceRef],
    );

    expect(Number(count.rows[0].deliveries)).toBe(3);
  });

  test('ingests an innings carrying no deliveries', async () => {
    const sourceRef = `${sourcePrefix}-forfeited`;
    const path = writeMatch(sourceRef, matchFixture());

    await withTransaction(databasePool(), (client) => ingestMatchData(client, path));

    const innings = await executeQuery<{ innings: string }>(
      databasePool(),
      `
        SELECT count(*) AS innings
          FROM innings i
          JOIN fixture f ON f.fixture_id = i.fixture_id
         WHERE f.source_ref = $1
      `,
      [sourceRef],
    );

    // Both innings are stored, including the one with no overs.
    expect(Number(innings.rows[0].innings)).toBe(2);
  });

  test('rejects a name the registry omits, naming the field and the value', async () => {
    const sourceRef = `${sourcePrefix}-unregistered`;
    const match = matchFixture() as {
      innings: Array<{ overs: Array<{ deliveries: Array<{ batter: string }> }> }>;
    };
    match.innings[0].overs[0].deliveries[0].batter = 'Z Unregistered';
    const path = writeMatch(sourceRef, match);

    await expect(
      withTransaction(databasePool(), (client) => ingestMatchData(client, path)),
    ).rejects.toThrow(/Z Unregistered/);

    // The transaction rolled back, so the fixture is not left behind.
    const fixtures = await executeQuery<{ fixtures: string }>(
      databasePool(),
      'SELECT count(*) AS fixtures FROM fixture WHERE source_ref = $1',
      [sourceRef],
    );

    expect(Number(fixtures.rows[0].fixtures)).toBe(0);
  });
});
