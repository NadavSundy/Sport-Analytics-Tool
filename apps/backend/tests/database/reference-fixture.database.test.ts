import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { withExplicitZeroExtras } from './explicit-zero-extras';
import { deriveReferenceFigures, type DerivedReferenceFigures } from './reference-derived-figures';

interface ReferenceCheck {
  actual: string | number;
  expected: string | number;
  label: string;
}

interface FixtureShapeRow {
  competition: string;
  season: string;
  competitors: number;
  participants: number;
  innings: number;
  events: number;
}

interface EventCoverageRow {
  scoringDeliveries: number;
  boundaries: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  wickets: number;
}

interface InningsRow {
  ordinal: number;
  team: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: number;
}

interface FallOfWicketRow {
  score: number;
  over: string;
  playerOut: string;
}

interface DismissalCreditRow {
  credited: number;
  uncredited: number;
}

interface CheckpointRow {
  ordinal: number;
  target: number;
  ballNumber: string;
  balls: number;
  extras: number;
}

interface PowerplayRow {
  ordinal: number;
  type: string;
  fromBall: string;
  toBall: string;
  runs: number;
  wickets: number;
}

interface DomainSnapshotRow {
  fixtures: number;
  innings: number;
  participants: number;
  deliveries: number;
  wickets: number;
}

const PUBLISHED_INNINGS = [
  { team: 'Kings XI Punjab', runs: 132, wickets: 9, legalBalls: 120, extras: 5 },
  { team: 'Kolkata Knight Riders', runs: 109, wickets: 10, legalBalls: 110, extras: 10 },
];

const seedPath = withExplicitZeroExtras(
  resolve(__dirname, '../../../../database/seeds/matches/729307.json'),
);
const sourceRef = `reference-729307-${process.pid}`;

describe.sequential('development reference fixture database integration', () => {
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

  async function domainSnapshot(): Promise<DomainSnapshotRow> {
    const result = await databaseClient().query<DomainSnapshotRow>(
      `
        SELECT
          (SELECT COUNT(*)::int FROM fixture WHERE fixture_id = $1) AS fixtures,
          (SELECT COUNT(*)::int FROM innings WHERE fixture_id = $1) AS innings,
          (SELECT COUNT(*)::int FROM fixture_squad WHERE fixture_id = $1) AS participants,
          (
            SELECT COUNT(*)::int
            FROM delivery_current d
            JOIN innings i ON i.innings_id = d.innings_id
            WHERE i.fixture_id = $1
          ) AS deliveries,
          (
            SELECT COUNT(*)::int
            FROM delivery_wicket w
            JOIN delivery_current d ON d.delivery_id = w.delivery_id
            JOIN innings i ON i.innings_id = d.innings_id
            WHERE i.fixture_id = $1
          ) AS wickets
      `,
      [ingestedFixtureId()],
    );
    return result.rows[0];
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

  test('contains the representative domain and ordered Basic event vocabulary', async () => {
    const executor = databaseClient();
    const currentFixtureId = ingestedFixtureId();
    const shape = await executor.query<FixtureShapeRow>(
      `
        SELECT
          c.name AS competition,
          f.season,
          (SELECT COUNT(*)::int FROM fixture_team ft WHERE ft.fixture_id = f.fixture_id)
            AS competitors,
          (SELECT COUNT(*)::int FROM fixture_squad fs WHERE fs.fixture_id = f.fixture_id)
            AS participants,
          (SELECT COUNT(*)::int FROM innings i WHERE i.fixture_id = f.fixture_id)
            AS innings,
          (
            SELECT COUNT(*)::int
            FROM delivery_current d
            JOIN innings i ON i.innings_id = d.innings_id
            WHERE i.fixture_id = f.fixture_id
          ) AS events
        FROM fixture f
        JOIN competition c ON c.competition_id = f.competition_id
        WHERE f.fixture_id = $1
      `,
      [currentFixtureId],
    );

    expect(shape.rows).toEqual([
      {
        competition: 'Indian Premier League',
        season: '2014',
        competitors: 2,
        participants: 22,
        innings: 2,
        events: 237,
      },
    ]);

    const coverage = await executor.query<EventCoverageRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE d.runs_off_bat > 0)::int AS "scoringDeliveries",
          COUNT(*) FILTER (
            WHERE d.runs_off_bat IN (4, 6) AND NOT d.non_boundary
          )::int AS boundaries,
          COUNT(*) FILTER (WHERE COALESCE(d.extra_wides, 0) > 0)::int AS wides,
          COUNT(*) FILTER (WHERE COALESCE(d.extra_noballs, 0) > 0)::int AS "noBalls",
          COUNT(*) FILTER (WHERE COALESCE(d.extra_byes, 0) > 0)::int AS byes,
          COUNT(*) FILTER (WHERE COALESCE(d.extra_legbyes, 0) > 0)::int AS "legByes",
          (
            SELECT COUNT(*)::int
            FROM delivery_wicket w
            JOIN delivery_current wicket_delivery
              ON wicket_delivery.delivery_id = w.delivery_id
            JOIN innings wicket_innings
              ON wicket_innings.innings_id = wicket_delivery.innings_id
            WHERE wicket_innings.fixture_id = $1
          ) AS wickets
        FROM delivery_current d
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id = $1
      `,
      [currentFixtureId],
    );

    expect(coverage.rows[0]).toMatchObject({
      wides: 6,
      noBalls: 1,
      byes: 1,
      legByes: 7,
      wickets: 19,
    });
    expect(coverage.rows[0].scoringDeliveries).toBeGreaterThan(0);
    expect(coverage.rows[0].boundaries).toBeGreaterThan(0);

    const ordering = await executor.query<{ ordered: boolean }>(
      `
        WITH per_innings AS (
          SELECT
            i.innings_id,
            MIN(d.innings_sequence) AS first_sequence,
            MAX(d.innings_sequence) AS last_sequence,
            COUNT(*)::int AS event_count,
            COUNT(DISTINCT d.innings_sequence)::int AS distinct_sequences
          FROM innings i
          JOIN delivery_current d ON d.innings_id = i.innings_id
          WHERE i.fixture_id = $1
          GROUP BY i.innings_id
        )
        SELECT BOOL_AND(
          first_sequence = 1
          AND last_sequence = event_count
          AND distinct_sequences = event_count
        ) AS ordered
        FROM per_innings
      `,
      [currentFixtureId],
    );
    expect(ordering.rows[0].ordered).toBe(true);
  });

  test('passes all 22 published-scorecard comparisons', async () => {
    const executor = databaseClient();
    const currentFixtureId = ingestedFixtureId();
    const innings = await executor.query<InningsRow>(
      `
        SELECT
          i.ordinal,
          t.name AS team,
          (
            COALESCE(SUM(d.runs_total), 0)
            + COALESCE(i.penalty_pre, 0)
            + COALESCE(i.penalty_post, 0)
          )::int AS runs,
          (
            SELECT COUNT(*)::int
            FROM delivery_wicket w
            JOIN delivery_current wicket_delivery
              ON wicket_delivery.delivery_id = w.delivery_id
            WHERE wicket_delivery.innings_id = i.innings_id
          ) AS wickets,
          COUNT(*) FILTER (
            WHERE COALESCE(d.extra_wides, 0) = 0 AND COALESCE(d.extra_noballs, 0) = 0
          )::int AS "legalBalls",
          COALESCE(SUM(d.runs_extras), 0)::int AS extras
        FROM innings i
        JOIN team t ON t.team_id = i.batting_team_id
        JOIN delivery_current d ON d.innings_id = i.innings_id
        WHERE i.fixture_id = $1
        GROUP BY i.innings_id, i.ordinal, t.name, i.penalty_pre, i.penalty_post
        ORDER BY i.ordinal
      `,
      [currentFixtureId],
    );
    const checks: ReferenceCheck[] = PUBLISHED_INNINGS.flatMap((expected, index) => {
      const actual = innings.rows[index];
      return (['team', 'runs', 'wickets', 'legalBalls', 'extras'] as const).map((field) => ({
        label: `innings ${index + 1} ${field}`,
        actual: actual?.[field] ?? 'missing',
        expected: expected[field],
      }));
    });

    const fallOfWickets = await executor.query<FallOfWicketRow>(
      `
        WITH ordered_delivery AS (
          SELECT
            d.*,
            SUM(d.runs_total) OVER (ORDER BY d.innings_sequence) AS running_total,
            COUNT(*) FILTER (
              WHERE COALESCE(d.extra_wides, 0) = 0 AND COALESCE(d.extra_noballs, 0) = 0
            ) OVER (ORDER BY d.innings_sequence) AS legal_balls
          FROM delivery_current d
          JOIN innings i ON i.innings_id = d.innings_id
          WHERE i.fixture_id = $1 AND i.ordinal = 1
        )
        SELECT
          d.running_total::int AS score,
          (d.legal_balls - 1) / 6 || '.' || ((d.legal_balls - 1) % 6 + 1) AS over,
          p.display_name AS "playerOut"
        FROM ordered_delivery d
        JOIN delivery_wicket w ON w.delivery_id = d.delivery_id
        JOIN person p ON p.person_id = w.player_out_id
        ORDER BY d.innings_sequence
      `,
      [currentFixtureId],
    );
    const expectedFallOfWickets: Array<[number, string, string]> = [
      [13, '2.4', 'MK Pandey'],
      [19, '4.1', 'G Gambhir'],
      [19, '5.1', 'JH Kallis'],
      [50, '11.1', 'CA Lynn'],
      [59, '12.3', 'YK Pathan'],
      [62, '12.6', 'RV Uthappa'],
      [65, '13.4', 'PP Chawla'],
      [85, '15.6', 'SP Narine'],
      [103, '17.3', 'SA Yadav'],
      [109, '18.2', 'UT Yadav'],
    ];
    for (const [index, expected] of expectedFallOfWickets.entries()) {
      const actual = fallOfWickets.rows[index];
      checks.push({
        label: `fall of wicket ${index + 1}`,
        actual: actual ? `${actual.score}|${actual.over}|${actual.playerOut}` : 'missing',
        expected: expected.join('|'),
      });
    }

    const dismissalCredits = await executor.query<DismissalCreditRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE k.credits_bowler)::int AS credited,
          COUNT(*) FILTER (WHERE NOT k.credits_bowler)::int AS uncredited
        FROM delivery_current d
        JOIN innings i ON i.innings_id = d.innings_id
        JOIN delivery_wicket w ON w.delivery_id = d.delivery_id
        JOIN dismissal_kind k ON k.code = w.kind
        WHERE i.fixture_id = $1
      `,
      [currentFixtureId],
    );
    checks.push(
      {
        label: 'dismissals credited to bowlers',
        actual: dismissalCredits.rows[0].credited,
        expected: 17,
      },
      {
        label: 'dismissals not credited to bowlers',
        actual: dismissalCredits.rows[0].uncredited,
        expected: 2,
      },
    );

    expect(checks).toHaveLength(22);
    for (const check of checks) {
      expect.soft(check.actual, check.label).toEqual(check.expected);
    }
  });

  let derivedFigures: Promise<DerivedReferenceFigures> | undefined;
  function referenceFigures(): Promise<DerivedReferenceFigures> {
    derivedFigures ??= deriveReferenceFigures(databaseClient(), ingestedFixtureId());
    return derivedFigures;
  }

  test('reproduces the published legal balls through the statistics derivation and history', async () => {
    const figures = await referenceFigures();

    for (const expected of PUBLISHED_INNINGS) {
      const bowlingTeam = PUBLISHED_INNINGS.find((innings) => innings.team !== expected.team)?.team;

      for (const [path, teams] of [
        ['derivation', figures.derivation],
        ['history', figures.history],
      ] as const) {
        expect
          .soft(
            bowlingTeam === undefined ? 'missing' : teams.get(bowlingTeam)?.legalBallsBowled,
            `${expected.team} innings ${path} legal balls bowled`,
          )
          .toBe(expected.legalBalls);
      }
    }
  });

  test('matches the independently recorded score checkpoints and powerplays', async () => {
    const executor = databaseClient();
    const currentFixtureId = ingestedFixtureId();
    const checkpoints = await executor.query<CheckpointRow>(
      `
        WITH targets(ordinal, target) AS (
          VALUES (0, 50), (0, 100), (1, 50)
        ),
        running_score AS (
          SELECT
            i.ordinal,
            d.ball_number,
            d.innings_sequence,
            COUNT(*) FILTER (WHERE COALESCE(d.extra_wides, 0) = 0) OVER (
              PARTITION BY i.innings_id ORDER BY d.innings_sequence
            )::int AS balls,
            SUM(d.runs_total) OVER (
              PARTITION BY i.innings_id ORDER BY d.innings_sequence
            ) AS runs,
            SUM(d.runs_extras) OVER (
              PARTITION BY i.innings_id ORDER BY d.innings_sequence
            ) AS extras
          FROM innings i
          JOIN delivery_current d ON d.innings_id = i.innings_id
          WHERE i.fixture_id = $1
        )
        SELECT DISTINCT ON (r.ordinal, t.target)
          r.ordinal,
          t.target,
          r.ball_number AS "ballNumber",
          r.balls,
          r.extras::int
        FROM running_score r
        JOIN targets t ON t.ordinal = r.ordinal AND r.runs >= t.target
        ORDER BY r.ordinal, t.target, r.innings_sequence
      `,
      [currentFixtureId],
    );
    expect(checkpoints.rows).toEqual([
      { ordinal: 0, target: 50, ballNumber: '5.5', balls: 36, extras: 4 },
      { ordinal: 0, target: 100, ballNumber: '13.1', balls: 80, extras: 4 },
      { ordinal: 1, target: 50, ballNumber: '10.5', balls: 65, extras: 5 },
    ]);

    const powerplays = await executor.query<PowerplayRow>(
      `
        SELECT
          i.ordinal,
          p.type,
          p.from_ball::text AS "fromBall",
          p.to_ball::text AS "toBall",
          SUM(d.runs_total)::int AS runs,
          (
            SELECT COUNT(*)::int
            FROM delivery_wicket w
            JOIN delivery_current wicket_delivery
              ON wicket_delivery.delivery_id = w.delivery_id
            WHERE wicket_delivery.innings_id = i.innings_id
              AND wicket_delivery.ball_number::numeric BETWEEN p.from_ball AND p.to_ball
          ) AS wickets
        FROM innings i
        JOIN innings_powerplay p ON p.innings_id = i.innings_id
        JOIN delivery_current d ON d.innings_id = i.innings_id
          AND d.ball_number::numeric BETWEEN p.from_ball AND p.to_ball
        WHERE i.fixture_id = $1
        GROUP BY i.innings_id, i.ordinal, p.type, p.from_ball, p.to_ball
        ORDER BY i.ordinal
      `,
      [currentFixtureId],
    );
    expect(powerplays.rows).toEqual([
      {
        ordinal: 0,
        type: 'mandatory',
        fromBall: '0.10',
        toBall: '5.60',
        runs: 51,
        wickets: 2,
      },
      {
        ordinal: 1,
        type: 'mandatory',
        fromBall: '0.10',
        toBall: '5.60',
        runs: 24,
        wickets: 3,
      },
    ]);
  });

  test('can be loaded repeatedly without duplicating domain records', async () => {
    const before = await domainSnapshot();
    const repeated = await ingestMatchData(databaseClient(), seedPath, { sourceRef });
    const after = await domainSnapshot();

    expect(repeated.fixtureId).toBe(ingestedFixtureId());
    expect(repeated.deliveriesAdded).toBe(0);
    expect(after).toEqual(before);
  });

  test.each([
    ['unregistered-name.json', /unregistered.*batter|batter.*unregistered/i],
    ['inconsistent-runs.json', /delivery_runs_ck|runs.*total/i],
    ['striker-equals-non-striker.json', /delivery_striker_ck|striker/i],
  ])('rejects the committed invalid example %s without partial data', async (file, error) => {
    const executor = databaseClient();
    const invalidSourceRef = `${sourceRef}-${file.replace(/\.json$/, '')}`;
    const invalidPath = resolve(__dirname, `../../../../database/seeds/invalid/${file}`);
    await executor.query('SAVEPOINT invalid_submission');

    try {
      await expect(
        ingestMatchData(executor, invalidPath, { sourceRef: invalidSourceRef }),
      ).rejects.toThrow(error);
    } finally {
      await executor.query('ROLLBACK TO SAVEPOINT invalid_submission');
      await executor.query('RELEASE SAVEPOINT invalid_submission');
    }

    const partialFixture = await executor.query<{ fixtures: number }>(
      'SELECT COUNT(*)::int AS fixtures FROM fixture WHERE source_ref = $1',
      [invalidSourceRef],
    );
    expect(partialFixture.rows[0].fixtures).toBe(0);
  });
});
