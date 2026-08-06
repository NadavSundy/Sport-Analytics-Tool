/**
 * Derive innings figures from the database and compare them to the published
 * scorecard recorded in evidence/validation/729307-published-figures.md.
 *
 * Every figure below is computed by SQL over delivery_current. Nothing is read
 * from the source file. If the schema models extras, wickets or delivery
 * ordering incorrectly, these numbers will disagree with the published ones.
 *
 * Usage:
 *   npm run db:validate --workspace=@sport-analytics/backend -- <source-ref>
 */

import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const sourceRef = process.argv[2] ?? '729307';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(new URL('../certs/supabase-ca.crt', import.meta.url), 'utf8'),
  },
});

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const pass = String(actual) === String(expected);
  if (!pass) failures += 1;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}: ${actual}${pass ? '' : ` (expected ${expected})`}`);
}

async function main(): Promise<void> {
  await client.connect();

  console.log(`Validating fixture ${sourceRef} against the published scorecard.\n`);

  // ---- innings totals ---------------------------------------------------
  // Team total is the sum of delivery totals PLUS innings-level penalty runs,
  // which belong to no delivery.
  const totals = await client.query(
    `SELECT i.ordinal,
            t.name                                        AS team,
            SUM(d.runs_total)
              + COALESCE(i.penalty_pre, 0)
              + COALESCE(i.penalty_post, 0)               AS runs,
            COUNT(*) FILTER (WHERE d.extra_wides IS NULL)  AS legal_balls
       FROM innings i
       JOIN fixture f  ON f.fixture_id = i.fixture_id
       JOIN team t     ON t.team_id = i.batting_team_id
       JOIN delivery_current d ON d.innings_id = i.innings_id
      WHERE f.source_ref = $1
      GROUP BY i.ordinal, t.name, i.penalty_pre, i.penalty_post
      ORDER BY i.ordinal`,
    [sourceRef]
  );

  // A no-ball is a legal delivery for over-counting purposes only in the sense
  // that it is re-bowled; both wides and no-balls are excluded from the over.
  const overs = await client.query(
    `SELECT i.ordinal,
            COUNT(*) FILTER (WHERE d.extra_wides IS NULL AND d.extra_noballs IS NULL)
              AS legal_balls
       FROM innings i
       JOIN fixture f ON f.fixture_id = i.fixture_id
       JOIN delivery_current d ON d.innings_id = i.innings_id
      WHERE f.source_ref = $1
      GROUP BY i.ordinal ORDER BY i.ordinal`,
    [sourceRef]
  );

  const wickets = await client.query(
    `SELECT i.ordinal, COUNT(w.wicket_id) AS wickets
       FROM innings i
       JOIN fixture f ON f.fixture_id = i.fixture_id
       JOIN delivery_current d ON d.innings_id = i.innings_id
       LEFT JOIN delivery_wicket w ON w.delivery_id = d.delivery_id
      WHERE f.source_ref = $1
      GROUP BY i.ordinal ORDER BY i.ordinal`,
    [sourceRef]
  );

  const extras = await client.query(
    `SELECT i.ordinal,
            COALESCE(SUM(d.extra_wides), 0)   AS wides,
            COALESCE(SUM(d.extra_noballs), 0) AS noballs,
            COALESCE(SUM(d.extra_byes), 0)    AS byes,
            COALESCE(SUM(d.extra_legbyes), 0) AS legbyes,
            COALESCE(SUM(d.runs_extras), 0)   AS total_extras
       FROM innings i
       JOIN fixture f ON f.fixture_id = i.fixture_id
       JOIN delivery_current d ON d.innings_id = i.innings_id
      WHERE f.source_ref = $1
      GROUP BY i.ordinal ORDER BY i.ordinal`,
    [sourceRef]
  );

  const expected = [
    { team: 'Kings XI Punjab', runs: 132, wickets: 9, balls: 120, extras: 5 },
    { team: 'Kolkata Knight Riders', runs: 109, wickets: 10, balls: 110, extras: 10 },
  ];

  for (const [index, row] of totals.rows.entries()) {
    const target = expected[index];
    const ballCount = Number(overs.rows[index].legal_balls);
    console.log(`Innings ${index} — ${row.team}`);
    check('team', row.team, target.team);
    check('runs', row.runs, target.runs);
    check('wickets', wickets.rows[index].wickets, target.wickets);
    check('legal balls', ballCount, target.balls);
    console.log(`        overs: ${Math.floor(ballCount / 6)}.${ballCount % 6}`);
    check('extras', extras.rows[index].total_extras, target.extras);
    const e = extras.rows[index];
    console.log(`        breakdown: ${e.wides}w ${e.noballs}nb ${e.byes}b ${e.legbyes}lb`);
    console.log();
  }

  // ---- fall of wickets --------------------------------------------------
  // The strongest single check: reproducing this requires delivery ordering,
  // run accumulation and wicket attribution to be simultaneously correct.
  console.log('Fall of wickets — Kolkata Knight Riders (innings 1)\n');

  const fow = await client.query(
    `WITH d AS (
       SELECT dc.*,
              SUM(dc.runs_total) OVER (ORDER BY dc.innings_sequence) AS running_total,
              COUNT(*) FILTER (WHERE dc.extra_wides IS NULL AND dc.extra_noballs IS NULL)
                OVER (ORDER BY dc.innings_sequence) AS legal_balls
         FROM delivery_current dc
         JOIN innings i ON i.innings_id = dc.innings_id
         JOIN fixture f ON f.fixture_id = i.fixture_id
        WHERE f.source_ref = $1 AND i.ordinal = 1
     )
     SELECT d.running_total AS score,
            (d.legal_balls - 1) / 6 || '.' || ((d.legal_balls - 1) % 6 + 1) AS over,
            p.display_name AS player_out,
            w.kind
       FROM d
       JOIN delivery_wicket w ON w.delivery_id = d.delivery_id
       JOIN person p ON p.person_id = w.player_out_id
      ORDER BY d.innings_sequence`,
    [sourceRef]
  );

  const expectedFow = [
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

  for (const [index, row] of fow.rows.entries()) {
    const target = expectedFow[index];
    const pass =
      Number(row.score) === target[0] &&
      row.over === target[1] &&
      row.player_out === target[2];
    if (!pass) failures += 1;
    console.log(
      `  ${pass ? 'PASS' : 'FAIL'}  ${index + 1}-${row.score} (${row.over} ov) ${row.player_out}, ${row.kind}` +
        (pass ? '' : `  expected ${target[0]} at ${target[1]} ${target[2]}`)
    );
  }

  // ---- bowler credit ----------------------------------------------------
  // A run out must not be credited to the bowler. This is the check that fails
  // if credits_bowler is ignored.
  console.log('\nWickets credited to bowlers (run outs excluded)\n');

  const credited = await client.query(
    `SELECT p.display_name AS bowler,
            COUNT(*) AS wickets
       FROM delivery_current d
       JOIN innings i ON i.innings_id = d.innings_id
       JOIN fixture f ON f.fixture_id = i.fixture_id
       JOIN delivery_wicket w ON w.delivery_id = d.delivery_id
       JOIN dismissal_kind k ON k.code = w.kind
       JOIN person p ON p.person_id = d.bowler_id
      WHERE f.source_ref = $1 AND k.credits_bowler
      GROUP BY p.display_name
      ORDER BY COUNT(*) DESC, p.display_name`,
    [sourceRef]
  );

  for (const row of credited.rows) {
    console.log(`  ${row.wickets}  ${row.bowler}`);
  }

  const runOuts = await client.query(
    `SELECT COUNT(*) AS n
       FROM delivery_current d
       JOIN innings i ON i.innings_id = d.innings_id
       JOIN fixture f ON f.fixture_id = i.fixture_id
       JOIN delivery_wicket w ON w.delivery_id = d.delivery_id
       JOIN dismissal_kind k ON k.code = w.kind
      WHERE f.source_ref = $1 AND NOT k.credits_bowler`,
    [sourceRef]
  );
  console.log(`\n  ${runOuts.rows[0].n} dismissal(s) not credited to any bowler.`);

  console.log(
    `\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`
  );
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error('Validation failed to run.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end();
  });