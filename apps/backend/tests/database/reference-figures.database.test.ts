import { resolve } from 'node:path';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { withExplicitZeroExtras } from './explicit-zero-extras';
import {
  deriveReferenceFigures,
  inningsExtrasComparisons,
  type DerivedReferenceFigures,
} from './reference-derived-figures';

/**
 * Published-figure comparisons for the reference fixtures added under issue #287.
 *
 * Expected values are transcribed from published scorecards and recorded in
 * evidence/validation/<id>-published-figures.md. Nothing here is derived from the
 * committed source file except where a figure is explicitly labelled as measured,
 * because a comparison against the same data the platform ingests proves nothing.
 *
 * Fixtures 729307 and 423788 are covered by reference-fixture.database.test.ts and
 * fixture-statistics.database.test.ts respectively. The expectation table below is
 * shaped so that both can be folded in without changing the assertions.
 *
 * The provenance and update rules governing these figures are in
 * docs/development/reference-fixtures.md. In particular, a figure on which the
 * published record and the committed source disagree is not asserted.
 */

interface ReferenceCheck {
  actual: string | number;
  expected: string | number;
  label: string;
}

interface InningsSummaryRow {
  ordinal: number;
  team: string;
  runs: number;
  wickets: number;
  deliveries: number;
  legalDeliveries: number;
  extras: number;
  byeRuns: number;
  legByeRuns: number;
  wideRuns: number;
  wideDeliveries: number;
  noBallRuns: number;
  noBallDeliveries: number;
}

interface FallOfWicketRow {
  inningsOrdinal: number;
  score: number;
  playerOut: string;
}

interface DismissalCreditRow {
  ordinal: number;
  credited: number;
  uncredited: number;
}

interface InningsExpectation {
  team: string;
  runs: number;
  wickets: number;
  deliveries: number;
  /** Null where the published record and the committed source disagree. */
  legalDeliveries: number | null;
  extras: number;
  byeRuns: number;
  legByeRuns: number;
  wideRuns: number;
  wideDeliveries: number;
  noBallRuns: number;
  noBallDeliveries: number;
  credited: number;
  uncredited: number;
  /** Score and dismissed player, in the order the wickets fell. */
  fallOfWickets: Array<[number, string]>;
}

interface FixtureExpectation {
  id: string;
  title: string;
  evidence: string;
  /** Includes super-over innings where present. */
  inningsCount: number;
  innings: InningsExpectation[];
}

const FIXTURES: FixtureExpectation[] = [
  {
    id: '1399114',
    title: 'Pakistan v Hong Kong, Asian Games 2023',
    evidence: 'evidence/validation/1399114-published-figures.md',
    inningsCount: 2,
    innings: [
      {
        team: 'Pakistan',
        runs: 160,
        wickets: 10,
        deliveries: 123,
        legalDeliveries: 120,
        extras: 5,
        byeRuns: 0,
        legByeRuns: 2,
        wideRuns: 1,
        wideDeliveries: 1,
        noBallRuns: 2,
        noBallDeliveries: 2,
        credited: 10,
        uncredited: 0,
        fallOfWickets: [
          [1, 'Mirza Baig'],
          [19, 'Rohail Nazir'],
          [24, 'Haider Ali'],
          [51, 'Qasim Akram'],
          [54, 'Omair Yousuf'],
          [73, 'Khushdil Shah'],
          [109, 'Asif Ali'],
          [126, 'Arafat Minhas'],
          [160, 'Aamer Jamal'],
          [160, 'Arshad Iqbal'],
        ],
      },
      {
        team: 'Hong Kong',
        runs: 92,
        wickets: 10,
        deliveries: 118,
        // 114, not the 113 implied by the printed 18.5 overs: the ninth over
        // contained seven legal deliveries. See the evidence document.
        legalDeliveries: 114,
        extras: 7,
        byeRuns: 1,
        legByeRuns: 2,
        wideRuns: 4,
        wideDeliveries: 4,
        noBallRuns: 0,
        noBallDeliveries: 0,
        credited: 9,
        uncredited: 1,
        fallOfWickets: [
          [10, 'Muhammad Khan'],
          [29, 'Nizakat Khan'],
          [54, 'Babar Hayat'],
          [54, 'S Mathur'],
          [55, 'Nasrulla Rana'],
          [57, 'Anas Khan'],
          [62, 'Akbar Khan'],
          [63, 'A Shukla'],
          [76, 'Mohammad Ghazanfar'],
          [92, 'Niaz Ali'],
        ],
      },
    ],
  },
  {
    id: '1462921',
    title: 'Uganda v Rwanda, Africa Continental Cup 2024/25',
    evidence: 'evidence/validation/1462921-published-figures.md',
    inningsCount: 2,
    innings: [
      {
        team: 'Uganda',
        runs: 192,
        wickets: 7,
        deliveries: 115,
        // Not asserted. The scorecard prints a completed 18.0 overs, which is 108
        // legal deliveries; the committed source holds 107, omitting one scoreless
        // delivery from the seventeenth over. No run or wicket figure is affected.
        // Asserting either number would pin a divergence rather than test a
        // derivation. See docs/development/reference-fixtures.md section 5.
        legalDeliveries: null,
        extras: 11,
        byeRuns: 0,
        legByeRuns: 3,
        wideRuns: 6,
        wideDeliveries: 6,
        noBallRuns: 2,
        noBallDeliveries: 2,
        credited: 4,
        uncredited: 3,
        fallOfWickets: [
          [22, 'SG Mangela'],
          [50, 'Raghav Dhawan'],
          [107, 'Riazat Ali Shah'],
          [146, 'R Obuya'],
          [170, 'AR Ramjani'],
          [171, 'DM Nakrani'],
          [183, 'F Achelam'],
        ],
      },
      {
        team: 'Rwanda',
        runs: 83,
        wickets: 10,
        deliveries: 101,
        legalDeliveries: 97,
        extras: 12,
        byeRuns: 1,
        legByeRuns: 7,
        wideRuns: 4,
        wideDeliveries: 4,
        noBallRuns: 0,
        noBallDeliveries: 0,
        credited: 10,
        uncredited: 0,
        fallOfWickets: [
          [37, 'O Manishimwe'],
          [37, 'E Dusingizimana'],
          [37, 'I Niyomugabo'],
          [38, 'D Gumyusenge'],
          [39, 'RJ Pierre'],
          [41, 'D Ndikubwimana'],
          [65, 'E Rukiriza'],
          [66, 'M Akayezu'],
          [82, 'Z Bimenyimana'],
          [83, 'I Ntirenganya'],
        ],
      },
    ],
  },
];

const INNINGS_SUMMARY = `
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
      JOIN delivery_current wd ON wd.delivery_id = w.delivery_id
      WHERE wd.innings_id = i.innings_id
    ) AS wickets,
    COUNT(*)::int AS deliveries,
    COUNT(*) FILTER (
      WHERE COALESCE(d.extra_wides, 0) = 0 AND COALESCE(d.extra_noballs, 0) = 0
    )::int AS "legalDeliveries",
    COALESCE(SUM(d.runs_extras), 0)::int AS extras,
    COALESCE(SUM(d.extra_byes), 0)::int AS "byeRuns",
    COALESCE(SUM(d.extra_legbyes), 0)::int AS "legByeRuns",
    COALESCE(SUM(d.extra_wides), 0)::int AS "wideRuns",
    COUNT(*) FILTER (WHERE COALESCE(d.extra_wides, 0) > 0)::int AS "wideDeliveries",
    COALESCE(SUM(d.extra_noballs), 0)::int AS "noBallRuns",
    COUNT(*) FILTER (WHERE COALESCE(d.extra_noballs, 0) > 0)::int AS "noBallDeliveries"
  FROM innings i
  JOIN team t ON t.team_id = i.batting_team_id
  JOIN delivery_current d ON d.innings_id = i.innings_id
  WHERE i.fixture_id = $1 AND i.is_super_over = false
  GROUP BY i.innings_id, i.ordinal, t.name, i.penalty_pre, i.penalty_post
  ORDER BY i.ordinal
`;

/**
 * Fall of wickets by running score and dismissed player.
 *
 * The over label is deliberately not asserted. Deriving one from a legal-ball
 * count assumes six legal deliveries per over, which fixture 1399114 breaks, and
 * the printed ball number is not currently verified against the position it
 * describes. Score, order and attribution are asserted instead; reproducing all
 * three still requires delivery ordering, run accumulation and wicket attribution
 * to be simultaneously correct.
 */
const FALL_OF_WICKETS = `
  WITH ordered_delivery AS (
    SELECT
      d.delivery_id,
      d.innings_sequence,
      i.ordinal AS innings_ordinal,
      SUM(d.runs_total) OVER (
        PARTITION BY d.innings_id ORDER BY d.innings_sequence
      ) AS running_total
    FROM delivery_current d
    JOIN innings i ON i.innings_id = d.innings_id
    WHERE i.fixture_id = $1 AND i.is_super_over = false
  )
  SELECT
    o.innings_ordinal AS "inningsOrdinal",
    o.running_total::int AS score,
    p.display_name AS "playerOut"
  FROM ordered_delivery o
  JOIN delivery_wicket w ON w.delivery_id = o.delivery_id
  JOIN person p ON p.person_id = w.player_out_id
  ORDER BY o.innings_ordinal, o.innings_sequence, w.ordinal
`;

const DISMISSAL_CREDITS = `
  SELECT
    i.ordinal,
    COUNT(*) FILTER (WHERE k.credits_bowler)::int AS credited,
    COUNT(*) FILTER (WHERE NOT k.credits_bowler)::int AS uncredited
  FROM delivery_current d
  JOIN innings i ON i.innings_id = d.innings_id
  JOIN delivery_wicket w ON w.delivery_id = d.delivery_id
  JOIN dismissal_kind k ON k.code = w.kind
  WHERE i.fixture_id = $1 AND i.is_super_over = false
  GROUP BY i.ordinal
  ORDER BY i.ordinal
`;

describe.sequential('reference fixture published figures', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }
    return pool;
  }

  beforeAll(() => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  describe.each(FIXTURES)('fixture $id — $title', (fixture) => {
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
      const seedPath = withExplicitZeroExtras(
        resolve(__dirname, `../../../../database/seeds/matches/${fixture.id}.json`),
      );
      client = await databasePool().connect();
      await client.query('BEGIN');
      try {
        const ingestion = await ingestMatchData(client, seedPath, {
          sourceRef: `reference-${fixture.id}-${process.pid}`,
        });
        fixtureId = ingestion.fixtureId;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
        client = undefined;
        throw error;
      }
    }, 30_000);

    afterAll(async () => {
      if (client) {
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
        client = undefined;
      }
    });

    test('ingests the expected number of innings', async () => {
      const result = await databaseClient().query<{ innings: number }>(
        'SELECT COUNT(*)::int AS innings FROM innings WHERE fixture_id = $1',
        [ingestedFixtureId()],
      );
      expect(result.rows[0]?.innings).toBe(fixture.inningsCount);
    });

    test('matches the published innings figures', async () => {
      const executor = databaseClient();
      const currentFixtureId = ingestedFixtureId();

      const summary = await executor.query<InningsSummaryRow>(INNINGS_SUMMARY, [currentFixtureId]);
      const credits = await executor.query<DismissalCreditRow>(DISMISSAL_CREDITS, [
        currentFixtureId,
      ]);

      const checks: ReferenceCheck[] = [];

      for (const [index, expected] of fixture.innings.entries()) {
        const actual = summary.rows[index];
        const credit = credits.rows.find((row) => row.ordinal === actual?.ordinal);
        const label = `innings ${index + 1}`;

        const comparisons: Array<[string, string | number, string | number]> = [
          ['team', actual?.team ?? 'missing', expected.team],
          ['runs', actual?.runs ?? 'missing', expected.runs],
          ['wickets', actual?.wickets ?? 'missing', expected.wickets],
          ['deliveries', actual?.deliveries ?? 'missing', expected.deliveries],
          ['extras', actual?.extras ?? 'missing', expected.extras],
          ['bye runs', actual?.byeRuns ?? 'missing', expected.byeRuns],
          ['leg bye runs', actual?.legByeRuns ?? 'missing', expected.legByeRuns],
          ['wide runs', actual?.wideRuns ?? 'missing', expected.wideRuns],
          ['wide deliveries', actual?.wideDeliveries ?? 'missing', expected.wideDeliveries],
          ['no-ball runs', actual?.noBallRuns ?? 'missing', expected.noBallRuns],
          ['no-ball deliveries', actual?.noBallDeliveries ?? 'missing', expected.noBallDeliveries],
          ['dismissals credited', credit?.credited ?? 0, expected.credited],
          ['dismissals uncredited', credit?.uncredited ?? 0, expected.uncredited],
        ];

        if (expected.legalDeliveries !== null) {
          comparisons.push([
            'legal deliveries',
            actual?.legalDeliveries ?? 'missing',
            expected.legalDeliveries,
          ]);
        }

        for (const [field, actualValue, expectedValue] of comparisons) {
          checks.push({ label: `${label} ${field}`, actual: actualValue, expected: expectedValue });
        }
      }

      expect(summary.rows).toHaveLength(fixture.innings.length);

      for (const check of checks) {
        expect.soft(check.actual, `${check.label} (${fixture.evidence})`).toEqual(check.expected);
      }
    });

    test('reproduces the published fall of wickets', async () => {
      const result = await databaseClient().query<FallOfWicketRow>(FALL_OF_WICKETS, [
        ingestedFixtureId(),
      ]);

      const checks: ReferenceCheck[] = [];

      for (const [inningsIndex, innings] of fixture.innings.entries()) {
        const rows = result.rows.filter((row) => row.inningsOrdinal === inningsIndex);

        checks.push({
          label: `innings ${inningsIndex + 1} wicket count`,
          actual: rows.length,
          expected: innings.fallOfWickets.length,
        });

        for (const [wicketIndex, [score, playerOut]] of innings.fallOfWickets.entries()) {
          const row = rows[wicketIndex];
          checks.push({
            label: `innings ${inningsIndex + 1} wicket ${wicketIndex + 1}`,
            actual: row ? `${row.score}|${row.playerOut}` : 'missing',
            expected: `${score}|${playerOut}`,
          });
        }
      }

      for (const check of checks) {
        expect.soft(check.actual, `${check.label} (${fixture.evidence})`).toEqual(check.expected);
      }
    });

    let derivedFigures: Promise<DerivedReferenceFigures> | undefined;
    function referenceFigures(): Promise<DerivedReferenceFigures> {
      derivedFigures ??= deriveReferenceFigures(databaseClient(), ingestedFixtureId());
      return derivedFigures;
    }

    test('reproduces the published extras through the statistics derivation and history', async () => {
      const figures = await referenceFigures();
      const checks: ReferenceCheck[] = [];

      for (const [index, expected] of fixture.innings.entries()) {
        const bowlingTeam = fixture.innings.find((innings) => innings.team !== expected.team)?.team;

        for (const [path, teams] of [
          ['derivation', figures.derivation],
          ['history', figures.history],
        ] as const) {
          for (const [label, actual, expectedValue] of inningsExtrasComparisons(
            `innings ${index + 1} ${path}`,
            expected,
            teams.get(expected.team),
            bowlingTeam === undefined ? undefined : teams.get(bowlingTeam),
          )) {
            checks.push({ label, actual, expected: expectedValue });
          }
        }
      }

      for (const check of checks) {
        expect.soft(check.actual, `${check.label} (${fixture.evidence})`).toEqual(check.expected);
      }
    });
  });
});
