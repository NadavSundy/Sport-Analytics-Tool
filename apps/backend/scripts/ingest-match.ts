/**
 * Load a single Cricsheet match into the delivery event schema.
 *
 * This script exists to validate the schema against a published scorecard. It is
 * not the ingestion pipeline, which is a separate concern: it loads one match,
 * makes no attempt to be fast, and holds everything in memory.
 *
 * It is idempotent. Running it twice produces the same database state, which is
 * the property required of a replayable feed.
 *
 * Usage:
 *   npm run db:ingest --workspace=@sport-analytics/backend -- <path-to-match.json>
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { Client } from 'pg';

interface Delivery {
  actual_delivery?: string;
  batter: string;
  bowler: string;
  non_striker: string;
  runs: { batter: number; extras: number; total: number; non_boundary?: boolean };
  extras?: Record<string, number>;
  wickets?: Array<{
    kind: string;
    player_out: string;
    fielders?: Array<{ name?: string; substitute?: boolean }>;
  }>;
  review?: {
    by: string;
    umpire?: string;
    batter?: string;
    decision: string;
    type?: string;
  };
  replacements?: {
    role?: Array<{ in: string; out?: string; reason?: string; role?: string }>;
    player?: Array<{ in: string; out?: string; reason?: string }>;
  };
}

const matchPath = process.argv[2];
if (!matchPath) {
  console.error('Usage: db:ingest -- <path-to-match.json>');
  process.exit(1);
}

const raw = readFileSync(matchPath);
const match = JSON.parse(raw.toString('utf8'));
const info = match.info;
const meta = match.meta ?? {};
const registry: Record<string, string> = info.registry?.people ?? {};

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(new URL('../certs/supabase-ca.crt', import.meta.url), 'utf8'),
  },
});

/** Resolve a player name through this match's registry to a stable identifier. */
function sourceRefFor(name: string): string {
  const ref = registry[name];
  if (!ref) {
    throw new Error(`Name "${name}" is absent from this match's registry.`);
  }
  return ref;
}

async function scalar<T>(sql: string, values: unknown[] = []): Promise<T> {
  const { rows } = await client.query(sql, values);
  return rows[0][Object.keys(rows[0])[0]] as T;
}

async function main(): Promise<void> {
  await client.connect();
  await client.query('BEGIN');

  const sourceRef = basename(matchPath).replace(/\.json$/, '');

  // ---- submission -------------------------------------------------------
  const submissionId = await scalar<number>(
    `INSERT INTO submission (source_filename, source_sha256, status)
     VALUES ($1, $2, 'accepted')
     RETURNING submission_id`,
    [basename(matchPath), createHash('sha256').update(raw).digest('hex')]
  );

  // ---- people -----------------------------------------------------------
  const personId = new Map<string, number>();
  for (const [name, ref] of Object.entries(registry)) {
    const id = await scalar<number>(
      `INSERT INTO person (source_ref, display_name) VALUES ($1, $2)
       ON CONFLICT (source_ref) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING person_id`,
      [ref, name]
    );
    await client.query(
      `INSERT INTO person_alias (person_id, name, first_seen) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [id, name, info.dates[0]]
    );
    personId.set(name, id);
  }

  // ---- teams, venue, competition ---------------------------------------
  const teamId = new Map<string, number>();
  for (const name of info.teams as string[]) {
    teamId.set(
      name,
      await scalar<number>(
        `INSERT INTO team (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING team_id`,
        [name]
      )
    );
  }

  const venueId = await scalar<number>(
    `INSERT INTO venue (name, city) VALUES ($1, $2)
     ON CONFLICT ON CONSTRAINT venue_name_city_key DO UPDATE SET name = EXCLUDED.name
     RETURNING venue_id`,
    [info.venue, info.city ?? null]
  );

  let competitionId: number | null = null;
  if (info.event?.name) {
    competitionId = await scalar<number>(
      `INSERT INTO competition (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING competition_id`,
      [info.event.name]
    );
  }

  // ---- fixture ----------------------------------------------------------
  const outcome = info.outcome ?? {};
  let outcomeKind = 'no result';
  if (outcome.winner) outcomeKind = 'won';
  else if (outcome.result === 'tie') outcomeKind = 'tie';
  else if (outcome.result === 'draw') outcomeKind = 'draw';

  const dates = info.dates as string[];

  await client.query(
    `INSERT INTO fixture (
        source_ref, competition_id, event_match_number, event_group, event_stage,
        season, match_type, team_type, gender, balls_per_over, scheduled_overs,
        venue_id, start_date, end_date, toss_winner_id, toss_decision,
        toss_uncontested, outcome, winner_id, eliminator_id, outcome_by_runs,
        outcome_by_wickets, outcome_method, decided_by_bowl_out, missing_fields,
        source_version, source_revision, first_seen_in)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
             $20,$21,$22,$23,$24,$25,$26,$27,$28)
     ON CONFLICT (source_ref) DO NOTHING`,
    [
      sourceRef,
      competitionId,
      info.event?.match_number ?? null,
      info.event?.group ?? null,
      info.event?.stage ?? null,
      String(info.season),
      info.match_type,
      info.team_type,
      info.gender,
      info.balls_per_over,
      info.overs ?? null,
      venueId,
      dates[0],
      dates[dates.length - 1],
      teamId.get(info.toss.winner) ?? null,
      info.toss.decision,
      Boolean(info.toss.uncontested),
      outcomeKind,
      outcome.winner ? teamId.get(outcome.winner) : null,
      outcome.eliminator ? (teamId.get(outcome.eliminator) ?? null) : null,
      outcome.by?.runs ?? null,
      outcome.by?.wickets ?? null,
      outcome.method ?? null,
      Boolean(outcome.bowl_out),
      info.missing ?? [],
      meta.data_version ?? 'unknown',
      meta.revision ?? 0,
      submissionId,
    ]
  );

  const fixtureId = await scalar<number>(
    'SELECT fixture_id FROM fixture WHERE source_ref = $1',
    [sourceRef]
  );

  for (const [ordinal, name] of (info.teams as string[]).entries()) {
    await client.query(
      `INSERT INTO fixture_team (fixture_id, team_id, ordinal) VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [fixtureId, teamId.get(name), ordinal + 1]
    );
  }

  for (const [team, players] of Object.entries(info.players ?? {})) {
    for (const name of players as string[]) {
      await client.query(
        `INSERT INTO fixture_squad (fixture_id, person_id, team_id, role)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [
          fixtureId,
          personId.get(name),
          teamId.get(team),
          info.supersubs?.[team] === name ? 'supersub' : null,
        ]
      );
    }
  }

  for (const [role, names] of Object.entries(info.officials ?? {})) {
    for (const name of names as string[]) {
      const officialId = await scalar<number>(
        `INSERT INTO official (display_name) VALUES ($1)
         ON CONFLICT DO NOTHING RETURNING official_id`,
        [name]
      ).catch(async () =>
        scalar<number>('SELECT official_id FROM official WHERE display_name = $1', [name])
      );
      await client.query(
        `INSERT INTO fixture_official (fixture_id, official_id, role)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [fixtureId, officialId, role]
      );
    }
  }

  for (const name of (info.player_of_match ?? []) as string[]) {
    await client.query(
      `INSERT INTO fixture_player_of_match (fixture_id, person_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [fixtureId, personId.get(name)]
    );
  }

  // ---- innings and deliveries ------------------------------------------
  let deliveryCount = 0;

  for (const [ordinal, innings] of (match.innings as any[]).entries()) {
    await client.query(
      `INSERT INTO innings (fixture_id, ordinal, batting_team_id, is_super_over,
                            declared, forfeited, target_runs, target_overs,
                            penalty_pre, penalty_post)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (fixture_id, ordinal) DO NOTHING`,
      [
        fixtureId,
        ordinal,
        teamId.get(innings.team),
        Boolean(innings.super_over),
        Boolean(innings.declared),
        Boolean(innings.forfeited),
        innings.target?.runs ?? null,
        innings.target?.overs ?? null,
        innings.penalty_runs?.pre ?? null,
        innings.penalty_runs?.post ?? null,
      ]
    );

    const inningsId = await scalar<number>(
      'SELECT innings_id FROM innings WHERE fixture_id = $1 AND ordinal = $2',
      [fixtureId, ordinal]
    );

    for (const powerplay of innings.powerplays ?? []) {
      await client.query(
        `INSERT INTO innings_powerplay (innings_id, from_ball, to_ball, type)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [inningsId, powerplay.from, powerplay.to, powerplay.type]
      );
    }

    for (const name of innings.absent_hurt ?? []) {
      await client.query(
        `INSERT INTO innings_absent (innings_id, person_id) VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [inningsId, personId.get(name)]
      );
    }

    // The source supplies the ball count as a string in some matches and an
    // integer in others; coerce it.
    for (const [over, detail] of Object.entries(innings.miscounted_overs ?? {})) {
      await client.query(
        `INSERT INTO innings_miscounted_over (innings_id, over_number, balls)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [inningsId, Number(over), Number((detail as { balls: string | number }).balls)]
      );
    }

    let sequence = 0;

    for (const over of innings.overs ?? []) {
     let legalBalls = 0;

      for (const [position, delivery] of (over.deliveries as Delivery[]).entries()) {
        sequence += 1;
        const extras = delivery.extras ?? {};

        // The printed ball number counts legal deliveries only. Wides and
        // no-balls do not advance it, so it repeats within an over. It is a
        // label, never an identifier.
        const isLegal = extras.wides === undefined && extras.noballs === undefined;
        if (isLegal) legalBalls += 1;
        const ballNumber = `${over.over}.${Math.max(legalBalls, 1)}`;

        const { rows } = await client.query(
          `INSERT INTO delivery (
              innings_id, over_number, position_in_over, innings_sequence,
              ball_number, striker_id, non_striker_id, bowler_id,
              runs_off_bat, runs_extras, runs_total, non_boundary,
              extra_wides, extra_noballs, extra_byes, extra_legbyes, extra_penalty,
              submission_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (innings_id, over_number, position_in_over)
             WHERE superseded_at IS NULL
           DO NOTHING
           RETURNING delivery_id`,
          [
            inningsId,
            over.over,
            position,
            sequence,
            ballNumber,            
            personId.get(delivery.batter),
            personId.get(delivery.non_striker),
            personId.get(delivery.bowler),
            delivery.runs.batter,
            delivery.runs.extras,
            delivery.runs.total,
            Boolean(delivery.runs.non_boundary),
            extras.wides ?? null,
            extras.noballs ?? null,
            extras.byes ?? null,
            extras.legbyes ?? null,
            extras.penalty ?? null,
            submissionId,
          ]
        );

        if (rows.length === 0) continue; // already present; nothing further to insert
        const deliveryId = rows[0].delivery_id as number;
        deliveryCount += 1;

        for (const [wicketOrdinal, wicket] of (delivery.wickets ?? []).entries()) {
          const wicketId = await scalar<number>(
            `INSERT INTO delivery_wicket
               (delivery_id, ordinal, kind, source_kind, player_out_id)
             VALUES ($1,$2,$3,$4,$5) RETURNING wicket_id`,
            [deliveryId, wicketOrdinal, wicket.kind, wicket.kind, personId.get(wicket.player_out)]
          );

          for (const [fielderOrdinal, fielder] of (wicket.fielders ?? []).entries()) {
            await client.query(
              `INSERT INTO delivery_wicket_fielder
                 (wicket_id, ordinal, person_id, is_substitute)
               VALUES ($1,$2,$3,$4)`,
              [
                wicketId,
                fielderOrdinal,
                fielder.name ? (personId.get(fielder.name) ?? null) : null,
                Boolean(fielder.substitute),
              ]
            );
          }
        }

        if (delivery.review) {
          const umpire = delivery.review.umpire
            ? await scalar<number | null>(
                'SELECT official_id FROM official WHERE display_name = $1',
                [delivery.review.umpire]
              ).catch(() => null)
            : null;
          await client.query(
            `INSERT INTO delivery_review
               (delivery_id, by_team_id, umpire_id, batter_id, decision, type)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              deliveryId,
              teamId.get(delivery.review.by),
              umpire,
              delivery.review.batter ? (personId.get(delivery.review.batter) ?? null) : null,
              delivery.review.decision,
              delivery.review.type ?? null,
            ]
          );
        }

        for (const kind of ['role', 'player'] as const) {
          for (const replacement of delivery.replacements?.[kind] ?? []) {
            await client.query(
              `INSERT INTO delivery_replacement
                 (delivery_id, replacement_type, in_person_id, out_person_id, reason, role)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [
                deliveryId,
                kind,
                personId.get(replacement.in),
                replacement.out ? (personId.get(replacement.out) ?? null) : null,
                replacement.reason ?? null,
                (replacement as { role?: string }).role ?? null,
              ]
            );
          }
        }
      }
    }
  }

  await client.query('COMMIT');

  console.log(`Ingested ${sourceRef}`);
  console.log(`  fixture_id       : ${fixtureId}`);
  console.log(`  people resolved  : ${personId.size}`);
  console.log(`  deliveries added : ${deliveryCount}`);
  if (deliveryCount === 0) {
    console.log('  (already present: this run was a no-op, which is the intended behaviour)');
  }
}

main()
  .catch(async (error: unknown) => {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Ingestion failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end();
  });