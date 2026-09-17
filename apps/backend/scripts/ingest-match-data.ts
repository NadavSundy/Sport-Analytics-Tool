/**
 * Load a single Cricsheet match into the delivery event schema using a caller-owned
 * database executor. Connection, transaction and cleanup behavior remain the
 * caller's responsibility so local database tests can roll back their fixtures.
 *
 * Rows are inserted per set rather than per row. At roughly 173 ms per round
 * trip, a match costs about a minute one row at a time and a few seconds
 * batched. Behaviour is unchanged throughout: the same conflict clauses preserve
 * idempotency, and only rows actually inserted are counted.
 *
 * The fixture statistics cache version and the statistics data version of every
 * affected participant are advanced in the caller's transaction, as every other
 * event write does (issue #592). The affected participants are those the ingest
 * actually adds to the fixture squad, whose appearances change, and everyone
 * named by a delivery it actually inserts. A re-ingest that inserts nothing
 * affects no participant, but still advances the fixture version.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import {
  advanceStatisticsDataVersions,
  affectedParticipantIds,
  type AggregateParticipantEvent,
} from '@sport-analytics/batch-processing';
import { isLegalDelivery, submissionExtrasSchema } from '@sport-analytics/contracts';
import type { QueryExecutor } from '../src/database';

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

export interface IngestMatchResult {
  sourceRef: string;
  fixtureId: string;
  peopleResolved: number;
  deliveriesAdded: number;
}

export interface IngestMatchOptions {
  sourceRef?: string;
}

/**
 * Build the VALUES placeholder list for a multi-row insert, appending each row's
 * values to a shared parameter array.
 */
function placeholders(rowCount: number, columnCount: number): string {
  return Array.from({ length: rowCount }, (_unused, row) => {
    const offset = row * columnCount;
    const columns = Array.from(
      { length: columnCount },
      (_ignored, column) => `$${offset + column + 1}`,
    );
    return `(${columns.join(',')})`;
  }).join(',');
}

/** Cricsheet extras keys and the submission contract keys they correspond to. */
const CONTRACT_EXTRAS_KEY_BY_CRICSHEET_KEY: Readonly<Record<string, string>> = {
  wides: 'wides',
  noballs: 'noBalls',
  byes: 'byes',
  legbyes: 'legByes',
  penalty: 'penalty',
};

const MAX_REPORTED_EXTRAS_ISSUES = 5;

interface CricsheetInnings {
  overs?: Array<{ over: number; deliveries: Delivery[] }>;
}

/**
 * Validate every delivery's extras against the submission contract.
 *
 * Runs before anything is written, so a file with one invalid delivery is
 * rejected whole and leaves no partial data whatever transaction the caller
 * holds. A key Cricsheet does not define is passed through unmapped, so the
 * contract rejects it rather than the ingest silently dropping it.
 */
export function assertValidCricsheetExtras(innings: readonly CricsheetInnings[]): void {
  const issues: string[] = [];

  for (const [inningsIndex, currentInnings] of innings.entries()) {
    for (const over of currentInnings.overs ?? []) {
      for (const [position, delivery] of over.deliveries.entries()) {
        const extras = Object.fromEntries(
          Object.entries(delivery.extras ?? {}).map(([key, value]) => [
            CONTRACT_EXTRAS_KEY_BY_CRICSHEET_KEY[key] ?? key,
            value,
          ]),
        );
        const result = submissionExtrasSchema.safeParse(extras);
        if (result.success) continue;

        const location = `innings ${inningsIndex + 1}, over ${over.over}, delivery ${position + 1}`;
        for (const issue of result.error.issues) {
          issues.push(`${location}: ${['extras', ...issue.path].join('.')}: ${issue.message}`);
        }
      }
    }
  }

  if (issues.length > 0) {
    const reported = issues.slice(0, MAX_REPORTED_EXTRAS_ISSUES).join('; ');
    const remaining = issues.length - MAX_REPORTED_EXTRAS_ISSUES;
    throw new Error(
      `Invalid delivery extras; nothing was ingested. ${reported}${
        remaining > 0 ? `; and ${remaining} more` : ''
      }`,
    );
  }
}

export async function ingestMatchData(
  client: QueryExecutor,
  matchPath: string,
  options: IngestMatchOptions = {},
): Promise<IngestMatchResult> {
  const raw = readFileSync(matchPath);
  const match = JSON.parse(raw.toString('utf8'));
  const info = match.info;
  const meta = match.meta ?? {};
  const registry: Record<string, string> = info.registry?.people ?? {};

  assertValidCricsheetExtras(match.innings ?? []);

  async function scalar<T>(sql: string, values: unknown[] = []): Promise<T> {
    const { rows } = await client.query(sql, values);
    const firstRow = rows[0];
    if (!firstRow) {
      throw new Error('Expected the database statement to return a row.');
    }

    const firstColumn = Object.keys(firstRow)[0];
    if (!firstColumn) {
      throw new Error('Expected the database statement to return a column.');
    }

    return firstRow[firstColumn] as T;
  }

  const sourceRef = options.sourceRef ?? basename(matchPath).replace(/\.json$/, '');

  // ---- submission -------------------------------------------------------
  const submissionId = await scalar<number>(
    `INSERT INTO submission (source_filename, source_sha256, status)
     VALUES ($1, $2, 'accepted')
     RETURNING submission_id`,
    [basename(matchPath), createHash('sha256').update(raw).digest('hex')],
  );

  // ---- people -----------------------------------------------------------
  const personId = new Map<string, number>();
  const registryEntries = Object.entries(registry);

  if (registryEntries.length > 0) {
    // A registry reference may appear only once in an insert using DO UPDATE,
    // or Postgres refuses to affect the same row twice.
    const uniqueByRef = new Map<string, string>();
    for (const [name, ref] of registryEntries) {
      if (!uniqueByRef.has(ref)) {
        uniqueByRef.set(ref, name);
      }
    }

    const personRows = [...uniqueByRef.entries()];
    const insertedPeople = await client.query(
      `INSERT INTO person (source_ref, display_name)
       VALUES ${placeholders(personRows.length, 2)}
       ON CONFLICT (source_ref) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING person_id, source_ref`,
      personRows.flatMap(([ref, name]) => [ref, name]),
    );

    // DO UPDATE returns every row, whether inserted or already present.
    const personIdByRef = new Map<string, number>();
    for (const row of insertedPeople.rows) {
      personIdByRef.set(row.source_ref as string, row.person_id as number);
    }

    for (const [name, ref] of registryEntries) {
      const id = personIdByRef.get(ref);
      if (id === undefined) {
        throw new Error(`The registry reference "${ref}" could not be resolved to a person.`);
      }
      personId.set(name, id);
    }

    await client.query(
      `INSERT INTO person_alias (person_id, name, first_seen)
       VALUES ${placeholders(registryEntries.length, 3)}
       ON CONFLICT DO NOTHING`,
      registryEntries.flatMap(([name]) => [personId.get(name), name, info.dates[0]]),
    );
  }

  /**
   * Resolve a name to a person, refusing to proceed on a name the registry
   * omits. Names are not identifiers: a name absent from info.registry.people
   * cannot be resolved to anyone, and inserting a null in its place would
   * produce a constraint error that says nothing about the real problem.
   */
  function requirePerson(name: string, role: string): number {
    const id = personId.get(name);
    if (id === undefined) {
      throw new Error(
        `The ${role} "${name}" is absent from this match's registry. ` +
          `Every person referenced by a delivery must appear in info.registry.people.`,
      );
    }
    return id;
  }

  // ---- teams, venue, competition ---------------------------------------
  const teamId = new Map<string, number>();
  const teamNames = [...new Set(info.teams as string[])];

  if (teamNames.length > 0) {
    const insertedTeams = await client.query(
      `INSERT INTO team (name)
       VALUES ${placeholders(teamNames.length, 1)}
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING team_id, name`,
      teamNames,
    );

    for (const row of insertedTeams.rows) {
      teamId.set(row.name as string, row.team_id as number);
    }
  }

  const venueId = await scalar<number>(
    `INSERT INTO venue (name, city) VALUES ($1, $2)
     ON CONFLICT ON CONSTRAINT venue_name_city_key DO UPDATE SET name = EXCLUDED.name
     RETURNING venue_id`,
    [info.venue, info.city ?? null],
  );

  let competitionId: number | null = null;
  if (info.event?.name) {
    competitionId = await scalar<number>(
      `INSERT INTO competition (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING competition_id`,
      [info.event.name],
    );
  }

  // ---- fixture ----------------------------------------------------------
  const outcome = info.outcome ?? {};
  let outcomeKind = 'no result';
  if (outcome.winner) outcomeKind = 'won';
  else if (outcome.result === 'tie') outcomeKind = 'tie';
  else if (outcome.result === 'draw') outcomeKind = 'draw';

  const dates = info.dates as string[];

  // The identifier is returned directly rather than read back in a second
  // statement. DO UPDATE on the source reference returns the row either way.
  const fixtureId = await scalar<number>(
    `INSERT INTO fixture (
        source_ref, competition_id, event_match_number, event_group, event_stage,
        season, match_type, team_type, gender, balls_per_over, scheduled_overs,
        venue_id, start_date, end_date, toss_winner_id, toss_decision,
        toss_uncontested, outcome, winner_id, eliminator_id, outcome_by_runs,
        outcome_by_wickets, outcome_method, decided_by_bowl_out, missing_fields,
        source_version, source_revision, first_seen_in)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
             $20,$21,$22,$23,$24,$25,$26,$27,$28)
     ON CONFLICT (source_ref) DO UPDATE SET source_ref = EXCLUDED.source_ref
     RETURNING fixture_id`,
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
    ],
  );

  const fixtureTeams = (info.teams as string[]).map((name, ordinal) => [
    fixtureId,
    teamId.get(name),
    ordinal + 1,
  ]);

  if (fixtureTeams.length > 0) {
    await client.query(
      `INSERT INTO fixture_team (fixture_id, team_id, ordinal)
       VALUES ${placeholders(fixtureTeams.length, 3)}
       ON CONFLICT DO NOTHING`,
      fixtureTeams.flat(),
    );
  }

  // A person appears once per fixture in the squad, so a player named in two
  // squads is inserted once.
  const squadRows = new Map<number, unknown[]>();
  for (const [team, players] of Object.entries(info.players ?? {})) {
    for (const name of players as string[]) {
      const person = personId.get(name);
      if (person === undefined || squadRows.has(person)) continue;
      squadRows.set(person, [
        fixtureId,
        person,
        teamId.get(team),
        info.supersubs?.[team] === name ? 'supersub' : null,
      ]);
    }
  }

  // Only squad rows actually inserted change a participant's appearances.
  const addedSquadParticipantIds: string[] = [];
  if (squadRows.size > 0) {
    const insertedSquad = await client.query(
      `INSERT INTO fixture_squad (fixture_id, person_id, team_id, role)
       VALUES ${placeholders(squadRows.size, 4)}
       ON CONFLICT DO NOTHING
       RETURNING person_id`,
      [...squadRows.values()].flat(),
    );
    for (const row of insertedSquad.rows) {
      addedSquadParticipantIds.push(String(row.person_id));
    }
  }

  // ---- officials --------------------------------------------------------
  const officialRoles: Array<[string, string]> = [];
  for (const [role, names] of Object.entries(info.officials ?? {})) {
    for (const name of names as string[]) {
      officialRoles.push([name, role]);
    }
  }

  if (officialRoles.length > 0) {
    const officialNames = [...new Set(officialRoles.map(([name]) => name))];

    // The official table has no unique constraint on the display name, so a name
    // is looked up before insertion rather than relying on a conflict clause.
    const existing = await client.query(
      'SELECT official_id, display_name FROM official WHERE display_name = ANY($1::text[])',
      [officialNames],
    );

    const officialIdByName = new Map<string, number>();
    for (const row of existing.rows) {
      officialIdByName.set(row.display_name as string, row.official_id as number);
    }

    const missing = officialNames.filter((name) => !officialIdByName.has(name));
    if (missing.length > 0) {
      const inserted = await client.query(
        `INSERT INTO official (display_name)
         VALUES ${placeholders(missing.length, 1)}
         RETURNING official_id, display_name`,
        missing,
      );
      for (const row of inserted.rows) {
        officialIdByName.set(row.display_name as string, row.official_id as number);
      }
    }

    const fixtureOfficials = officialRoles.flatMap(([name, role]) => {
      const id = officialIdByName.get(name);
      return id === undefined ? [] : [[fixtureId, id, role]];
    });

    if (fixtureOfficials.length > 0) {
      await client.query(
        `INSERT INTO fixture_official (fixture_id, official_id, role)
         VALUES ${placeholders(fixtureOfficials.length, 3)}
         ON CONFLICT DO NOTHING`,
        fixtureOfficials.flat(),
      );
    }
  }

  const playersOfMatch = [...new Set((info.player_of_match ?? []) as string[])].flatMap((name) => {
    const person = personId.get(name);
    return person === undefined ? [] : [[fixtureId, person]];
  });

  if (playersOfMatch.length > 0) {
    await client.query(
      `INSERT INTO fixture_player_of_match (fixture_id, person_id)
       VALUES ${placeholders(playersOfMatch.length, 2)}
       ON CONFLICT DO NOTHING`,
      playersOfMatch.flat(),
    );
  }

  // ---- innings ----------------------------------------------------------
  const inningsList = match.innings as any[];
  const inningsIdByOrdinal = new Map<number, number>();

  if (inningsList.length > 0) {
    const inningsRows = inningsList.map((innings, ordinal) => [
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
    ]);

    const insertedInnings = await client.query(
      `INSERT INTO innings (fixture_id, ordinal, batting_team_id, is_super_over,
                            declared, forfeited, target_runs, target_overs,
                            penalty_pre, penalty_post)
       VALUES ${placeholders(inningsRows.length, 10)}
       ON CONFLICT (fixture_id, ordinal) DO UPDATE SET ordinal = EXCLUDED.ordinal
       RETURNING innings_id, ordinal`,
      inningsRows.flat(),
    );

    for (const row of insertedInnings.rows) {
      inningsIdByOrdinal.set(Number(row.ordinal), row.innings_id as number);
    }
  }

  const powerplayRows: unknown[][] = [];
  const absentRows: unknown[][] = [];
  const miscountedRows: unknown[][] = [];

  for (const [ordinal, innings] of inningsList.entries()) {
    const inningsId = inningsIdByOrdinal.get(ordinal);
    if (inningsId === undefined) continue;

    for (const powerplay of innings.powerplays ?? []) {
      powerplayRows.push([inningsId, powerplay.from, powerplay.to, powerplay.type]);
    }

    for (const name of innings.absent_hurt ?? []) {
      const person = personId.get(name);
      if (person !== undefined) {
        absentRows.push([inningsId, person]);
      }
    }

    // The source supplies the ball count as a string in some matches and an
    // integer in others; coerce it.
    for (const [over, detail] of Object.entries(innings.miscounted_overs ?? {})) {
      miscountedRows.push([
        inningsId,
        Number(over),
        Number((detail as { balls: string | number }).balls),
      ]);
    }
  }

  if (powerplayRows.length > 0) {
    await client.query(
      `INSERT INTO innings_powerplay (innings_id, from_ball, to_ball, type)
       VALUES ${placeholders(powerplayRows.length, 4)}
       ON CONFLICT DO NOTHING`,
      powerplayRows.flat(),
    );
  }

  if (absentRows.length > 0) {
    await client.query(
      `INSERT INTO innings_absent (innings_id, person_id)
       VALUES ${placeholders(absentRows.length, 2)}
       ON CONFLICT DO NOTHING`,
      absentRows.flat(),
    );
  }

  if (miscountedRows.length > 0) {
    await client.query(
      `INSERT INTO innings_miscounted_over (innings_id, over_number, balls)
       VALUES ${placeholders(miscountedRows.length, 3)}
       ON CONFLICT DO NOTHING`,
      miscountedRows.flat(),
    );
  }

  // ---- deliveries -------------------------------------------------------
  interface PendingDelivery {
    inningsId: number;
    overNumber: number;
    position: number;
    sequence: number;
    ballNumber: string;
    delivery: Delivery;
  }

  let deliveryCount = 0;
  const insertedEvents: AggregateParticipantEvent[] = [];

  for (const [ordinal, innings] of inningsList.entries()) {
    const inningsId = inningsIdByOrdinal.get(ordinal);
    if (inningsId === undefined) continue;

    const pending: PendingDelivery[] = [];
    let sequence = 0;

    for (const over of innings.overs ?? []) {
      let legalBalls = 0;

      for (const [position, delivery] of (over.deliveries as Delivery[]).entries()) {
        sequence += 1;
        const extras = delivery.extras ?? {};

        // The printed ball number counts legal deliveries only. Wides and
        // no-balls do not advance it, so it repeats within an over. It is a
        // label, never an identifier. Cricsheet spells the no-ball key `noballs`.
        if (isLegalDelivery({ wides: extras.wides, noBalls: extras.noballs })) legalBalls += 1;

        pending.push({
          inningsId,
          overNumber: over.over,
          position,
          sequence,
          ballNumber: `${over.over}.${Math.max(legalBalls, 1)}`,
          delivery,
        });
      }
    }

    if (pending.length === 0) continue;

    const deliveryValues = pending.flatMap((item) => {
      const extras = item.delivery.extras ?? {};
      return [
        item.inningsId,
        item.overNumber,
        item.position,
        item.sequence,
        item.ballNumber,
        requirePerson(item.delivery.batter, 'batter'),
        requirePerson(item.delivery.non_striker, 'non-striker'),
        requirePerson(item.delivery.bowler, 'bowler'),
        item.delivery.runs.batter,
        item.delivery.runs.extras,
        item.delivery.runs.total,
        Boolean(item.delivery.runs.non_boundary),
        extras.wides ?? null,
        extras.noballs ?? null,
        extras.byes ?? null,
        extras.legbyes ?? null,
        extras.penalty ?? null,
        submissionId,
      ];
    });

    // The natural key is returned alongside the identifier because the conflict
    // clause may skip rows, so the returned set cannot be matched to the input
    // by position.
    const insertedDeliveries = await client.query(
      `INSERT INTO delivery (
          innings_id, over_number, position_in_over, innings_sequence,
          ball_number, striker_id, non_striker_id, bowler_id,
          runs_off_bat, runs_extras, runs_total, non_boundary,
          extra_wides, extra_noballs, extra_byes, extra_legbyes, extra_penalty,
          submission_id)
       VALUES ${placeholders(pending.length, 18)}
       ON CONFLICT (innings_id, over_number, position_in_over)
         WHERE superseded_at IS NULL
       DO NOTHING
       RETURNING delivery_id, over_number, position_in_over`,
      deliveryValues,
    );

    deliveryCount += insertedDeliveries.rows.length;

    const deliveryIdByKey = new Map<string, number>();
    for (const row of insertedDeliveries.rows) {
      deliveryIdByKey.set(`${row.over_number}:${row.position_in_over}`, row.delivery_id as number);
    }

    // Only deliveries actually inserted receive dependent rows. A delivery that
    // was already present is skipped entirely, as it was one row at a time.
    const inserted = pending.flatMap((item) => {
      const deliveryId = deliveryIdByKey.get(`${item.overNumber}:${item.position}`);
      return deliveryId === undefined ? [] : [{ ...item, deliveryId }];
    });

    for (const item of inserted) {
      insertedEvents.push({
        strikerId: String(requirePerson(item.delivery.batter, 'batter')),
        nonStrikerId: String(requirePerson(item.delivery.non_striker, 'non-striker')),
        bowlerId: String(requirePerson(item.delivery.bowler, 'bowler')),
        wickets: (item.delivery.wickets ?? []).map((wicket) => ({
          playerOutId: String(requirePerson(wicket.player_out, 'dismissed player')),
          fielders: (wicket.fielders ?? []).map((fielder) => {
            const fielderId = fielder.name ? personId.get(fielder.name) : undefined;
            return fielderId === undefined ? {} : { participantId: String(fielderId) };
          }),
        })),
      });
    }

    const wicketRows = inserted.flatMap((item) =>
      (item.delivery.wickets ?? []).map((wicket, wicketOrdinal) => ({
        deliveryId: item.deliveryId,
        ordinal: wicketOrdinal,
        wicket,
      })),
    );

    if (wicketRows.length > 0) {
      const insertedWickets = await client.query(
        `INSERT INTO delivery_wicket
           (delivery_id, ordinal, kind, source_kind, player_out_id)
         VALUES ${placeholders(wicketRows.length, 5)}
         RETURNING wicket_id, delivery_id, ordinal`,
        wicketRows.flatMap((row) => [
          row.deliveryId,
          row.ordinal,
          row.wicket.kind,
          row.wicket.kind,
          requirePerson(row.wicket.player_out, 'dismissed player'),
        ]),
      );

      const wicketIdByKey = new Map<string, number>();
      for (const row of insertedWickets.rows) {
        wicketIdByKey.set(`${row.delivery_id}:${row.ordinal}`, row.wicket_id as number);
      }

      const fielderRows: unknown[][] = [];
      for (const row of wicketRows) {
        const wicketId = wicketIdByKey.get(`${row.deliveryId}:${row.ordinal}`);
        if (wicketId === undefined) continue;

        for (const [fielderOrdinal, fielder] of (row.wicket.fielders ?? []).entries()) {
          fielderRows.push([
            wicketId,
            fielderOrdinal,
            fielder.name ? (personId.get(fielder.name) ?? null) : null,
            Boolean(fielder.substitute),
          ]);
        }
      }

      if (fielderRows.length > 0) {
        await client.query(
          `INSERT INTO delivery_wicket_fielder
             (wicket_id, ordinal, person_id, is_substitute)
           VALUES ${placeholders(fielderRows.length, 4)}`,
          fielderRows.flat(),
        );
      }
    }

    const reviewed = inserted.filter((item) => item.delivery.review);

    if (reviewed.length > 0) {
      // Umpires are resolved by name in one query rather than one per review.
      const umpireNames = [
        ...new Set(
          reviewed.flatMap((item) =>
            item.delivery.review?.umpire ? [item.delivery.review.umpire] : [],
          ),
        ),
      ];

      const umpireIdByName = new Map<string, number>();
      if (umpireNames.length > 0) {
        const officials = await client.query(
          'SELECT official_id, display_name FROM official WHERE display_name = ANY($1::text[])',
          [umpireNames],
        );
        for (const row of officials.rows) {
          umpireIdByName.set(row.display_name as string, row.official_id as number);
        }
      }

      await client.query(
        `INSERT INTO delivery_review
           (delivery_id, by_team_id, umpire_id, batter_id, decision, type)
         VALUES ${placeholders(reviewed.length, 6)}`,
        reviewed.flatMap((item) => {
          const review = item.delivery.review!;
          return [
            item.deliveryId,
            teamId.get(review.by),
            review.umpire ? (umpireIdByName.get(review.umpire) ?? null) : null,
            review.batter ? (personId.get(review.batter) ?? null) : null,
            review.decision,
            review.type ?? null,
          ];
        }),
      );
    }

    const replacementRows: unknown[][] = [];
    for (const item of inserted) {
      for (const kind of ['role', 'player'] as const) {
        for (const replacement of item.delivery.replacements?.[kind] ?? []) {
          replacementRows.push([
            item.deliveryId,
            kind,
            requirePerson(replacement.in, 'incoming replacement'),
            replacement.out ? (personId.get(replacement.out) ?? null) : null,
            replacement.reason ?? null,
            (replacement as { role?: string }).role ?? null,
          ]);
        }
      }
    }

    if (replacementRows.length > 0) {
      await client.query(
        `INSERT INTO delivery_replacement
           (delivery_id, replacement_type, in_person_id, out_person_id, reason, role)
         VALUES ${placeholders(replacementRows.length, 6)}`,
        replacementRows.flat(),
      );
    }
  }

  await advanceStatisticsDataVersions(client, {
    fixtureIds: [String(fixtureId)],
    participantIds: affectedParticipantIds({
      events: insertedEvents,
      squadParticipantIds: addedSquadParticipantIds,
    }),
  });

  return {
    sourceRef,
    fixtureId: String(fixtureId),
    peopleResolved: personId.size,
    deliveriesAdded: deliveryCount,
  };
}
