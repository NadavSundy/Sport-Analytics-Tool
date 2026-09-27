import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { advanceParticipantStatisticsVersions } from '@sport-analytics/batch-processing';
import { correctionRequestSchema, submissionRequestSchema } from '@sport-analytics/contracts';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { createBatchRepository } from '../../src/modules/batches/batch.repository';
import { createSeasonId } from '../../src/modules/public-read/season-id';
import { deriveParticipantAggregates } from '../../src/modules/statistics/participant-aggregates.derivation';
import { loadParticipantAggregatesSource } from '../../src/modules/statistics/participant-aggregates.repository';
import { createParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import {
  createParticipantAggregateSnapshotStore,
  refreshParticipantAggregateSnapshots,
} from '../../src/modules/statistics/participant-aggregates.snapshot';
import { createSubmissionRepository } from '../../src/modules/submissions/submission.repository';

/**
 * Selective, idempotent and retryable refresh of stored participant aggregates
 * (issue #592).
 *
 * Selective means: a change recomputes each affected participant's query once
 * and rewrites only the affected scope rows; unaffected participants are not
 * recomputed and their rows stay byte-identical.
 *
 * Each test builds the same world inside a transaction that is rolled back: two
 * competitions, each with one fixture in its own season, and participants who
 * share a fixture without sharing an event. Every stored row is captured as
 * text after a full refresh, one write is made through one write path, and the
 * refresh is run again for everyone. The test then requires:
 *
 * - the query ran again only for the affected participants;
 * - each affected participant's state row advanced its refresh count by one;
 * - exactly the listed scope rows changed, each with its refresh count up by
 *   one, and every other scope row, including an affected participant's
 *   unchanged rows, is byte-identical;
 * - every unaffected participant's state and scope rows are byte-identical;
 * - every participant's served figures equal live derivation.
 */

const sourcePrefix = `selective-refresh-${process.pid}`;
const seedMatchPath = resolve(__dirname, '../../../../database/seeds/matches/423788.json');

const PEOPLE = [
  'striker',
  'nonStriker',
  'bowler',
  'fielder',
  'replacement',
  'bystander',
  'secondStriker',
  'secondBowler',
  'noFixture',
] as const;
type Person = (typeof PEOPLE)[number];

interface World {
  accountId: string;
  firstCompetitionId: string;
  secondCompetitionId: string;
  firstFixtureId: string;
  secondFixtureId: string;
  firstInningsId: string;
  secondInningsId: string;
  people: Record<Person, string>;
  sourceRefs: Record<Person, string>;
  firstFixtureEvents: Array<{ eventId: string; deliveryId: string }>;
}

interface StoredRows {
  state: string | null;
  stateRefreshCount: number;
  scopes: Map<string, { text: string; payload: unknown; refreshCount: number }>;
}

describe.sequential('selective participant aggregate refresh', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }
    return pool;
  }

  async function withRolledBackTransaction(
    operation: (client: PoolClient) => Promise<void>,
  ): Promise<void> {
    const client = await databasePool().connect();
    try {
      await client.query('BEGIN');
      await operation(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  /** A pool whose connections are the test's client and whose transactions are savepoints. */
  function savepointPool(client: PoolClient, intercept?: (text: string) => void): Pool {
    const statements: Record<string, string> = {
      BEGIN: 'SAVEPOINT world_transaction',
      COMMIT: 'RELEASE SAVEPOINT world_transaction',
      ROLLBACK: 'ROLLBACK TO SAVEPOINT world_transaction',
    };
    const query = (text: string, values?: unknown[]) => {
      intercept?.(text);
      return client.query(statements[text] ?? text, values);
    };
    return {
      connect: async () => ({ query, release: () => undefined }),
      query,
    } as unknown as Pool;
  }

  async function seedWorld(client: PoolClient, label: string): Promise<World> {
    const key = `${sourcePrefix}-${label}`;
    const one = async <Row extends Record<string, string>>(text: string, values: unknown[] = []) =>
      (await client.query<Row>(text, values)).rows[0]!;

    const { accountId } = await one<{ accountId: string }>(
      `INSERT INTO app_user (
         auth_provider, auth_subject, display_name, application_role, submitter_approval_state
       )
       VALUES ('test', $1, 'Selective Refresh Test', 'admin', 'approved')
       RETURNING app_user_id::text AS "accountId"`,
      [key],
    );
    const competition = async (name: string) =>
      (
        await one<{ id: string }>(
          `INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text AS id`,
          [`${key}-${name}`],
        )
      ).id;
    const firstCompetitionId = await competition('first-competition');
    const secondCompetitionId = await competition('second-competition');
    const team = async (name: string) =>
      (
        await one<{ id: string }>(
          `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS id`,
          [`${key}-${name}`],
        )
      ).id;
    const battingTeamId = await team('batting');
    const bowlingTeamId = await team('bowling');

    const people = {} as Record<Person, string>;
    const sourceRefs = {} as Record<Person, string>;
    for (const person of PEOPLE) {
      sourceRefs[person] = `${key}-${person}`;
      people[person] = (
        await one<{ id: string }>(
          `INSERT INTO person (source_ref, display_name) VALUES ($1, $1)
           RETURNING person_id::text AS id`,
          [sourceRefs[person]],
        )
      ).id;
    }

    const fixture = async (name: string, competitionId: string, season: string) => {
      const fixtureId = (
        await one<{ id: string }>(
          `INSERT INTO fixture (
             source_ref, competition_id, season, match_type, team_type, gender, balls_per_over,
             start_date, end_date, outcome, source_version, source_revision
           )
           VALUES ($1, $2, $3, 'T20', 'club', 'mixed', 6, CURRENT_DATE, CURRENT_DATE,
                   'tie', '1.0', 1)
           RETURNING fixture_id::text AS id`,
          [`${key}-${name}`, competitionId, season],
        )
      ).id;
      await client.query(
        `INSERT INTO fixture_team (fixture_id, team_id, ordinal) VALUES ($1, $2, 1), ($1, $3, 2)`,
        [fixtureId, battingTeamId, bowlingTeamId],
      );
      const inningsId = (
        await one<{ id: string }>(
          `INSERT INTO innings (fixture_id, ordinal, batting_team_id) VALUES ($1, 0, $2)
           RETURNING innings_id::text AS id`,
          [fixtureId, battingTeamId],
        )
      ).id;
      return { fixtureId, inningsId };
    };
    const first = await fixture('first-fixture', firstCompetitionId, '2025');
    const second = await fixture('second-fixture', secondCompetitionId, '2026');

    const squad: Array<[string, Person, string]> = [
      [first.fixtureId, 'striker', battingTeamId],
      [first.fixtureId, 'nonStriker', battingTeamId],
      [first.fixtureId, 'replacement', battingTeamId],
      [first.fixtureId, 'bystander', battingTeamId],
      [first.fixtureId, 'bowler', bowlingTeamId],
      [first.fixtureId, 'fielder', bowlingTeamId],
      [second.fixtureId, 'secondStriker', battingTeamId],
      [second.fixtureId, 'striker', battingTeamId],
      [second.fixtureId, 'secondBowler', bowlingTeamId],
    ];
    for (const [fixtureId, person, teamId] of squad) {
      await client.query(
        `INSERT INTO fixture_squad (fixture_id, person_id, team_id) VALUES ($1, $2, $3)`,
        [fixtureId, people[person], teamId],
      );
    }

    const world: World = {
      accountId,
      firstCompetitionId,
      secondCompetitionId,
      firstFixtureId: first.fixtureId,
      secondFixtureId: second.fixtureId,
      firstInningsId: first.inningsId,
      secondInningsId: second.inningsId,
      people,
      sourceRefs,
      firstFixtureEvents: [],
    };

    const repository = createSubmissionRepository(savepointPool(client));
    const submit = async (
      fixtureId: string,
      inningsId: string,
      events: Array<Record<string, unknown>>,
    ) => {
      const submission = await repository.storeAcceptedSubmission(
        submissionRequestSchema.parse({
          fixtureId,
          schemaVersion: '1.0',
          events: events.map((event) => ({ inningsId, overNumber: 0, ...event })),
        }),
        accountId,
        undefined,
        'a'.repeat(64),
      );
      await client.query(
        `UPDATE fixture SET first_seen_in = COALESCE(first_seen_in, $2::bigint)
         WHERE fixture_id = $1::bigint`,
        [fixtureId, submission.submissionId],
      );
    };

    // First fixture: the striker and non-striker face the bowler twice.
    const firstEvents = [1, 2].map((sequenceNumber) => ({
      eventId: randomUUID(),
      sequenceNumber,
      positionInOver: sequenceNumber - 1,
      ballNumber: `0.${sequenceNumber}`,
      strikerId: people.striker,
      nonStrikerId: people.nonStriker,
      bowlerId: people.bowler,
      runs:
        sequenceNumber === 1
          ? { offBat: 1, extras: 0, total: 1 }
          : { offBat: 0, extras: 0, total: 0 },
    }));
    await submit(first.fixtureId, first.inningsId, firstEvents);
    for (const event of firstEvents) {
      const delivery = await one<{ id: string }>(
        `SELECT delivery_id::text AS id FROM delivery_current WHERE source_event_id = $1::uuid`,
        [event.eventId],
      );
      world.firstFixtureEvents.push({ eventId: event.eventId, deliveryId: delivery.id });
    }

    // Second fixture, in the other competition and season: the first fixture's
    // striker is the non-striker here, so they have rows in both competitions.
    await submit(second.fixtureId, second.inningsId, [
      {
        eventId: randomUUID(),
        sequenceNumber: 1,
        positionInOver: 0,
        ballNumber: '0.1',
        strikerId: people.secondStriker,
        nonStrikerId: people.striker,
        bowlerId: people.secondBowler,
        runs: { offBat: 2, extras: 0, total: 2 },
      },
    ]);

    // Every participant has a statistics version, as an earlier tracked write
    // would have given them, so everyone has stored rows before the write under
    // test. That includes squad members no event names, and a participant with
    // no fixture at all, whose query returns only an all-zero career row.
    await advanceParticipantStatisticsVersions(client, Object.values(people));

    return world;
  }

  function store(client: PoolClient) {
    return createParticipantAggregateSnapshotStore(savepointPool(client));
  }

  async function refreshEveryone(client: PoolClient, world: World) {
    const recomputed: string[] = [];
    const outcomes = await refreshParticipantAggregateSnapshots(Object.values(world.people), {
      store: store(client),
      loadSource: (participantId) => {
        recomputed.push(participantId);
        return loadParticipantAggregatesSource(participantId, client);
      },
    });
    return { outcomes, recomputed };
  }

  async function storedRows(client: PoolClient, world: World): Promise<Map<Person, StoredRows>> {
    const result = new Map<Person, StoredRows>();
    for (const person of PEOPLE) {
      const participantId = world.people[person];
      const state = await client.query<{ text: string; refreshCount: string }>(
        `SELECT to_jsonb(state)::text AS text, state.refresh_count::text AS "refreshCount"
         FROM participant_aggregate_snapshot_state state WHERE participant_id = $1::bigint`,
        [participantId],
      );
      const scopes = await client.query<{
        scopeKey: string;
        text: string;
        payload: unknown;
        refreshCount: string;
      }>(
        `SELECT scope_key AS "scopeKey", to_jsonb(snapshot)::text AS text, payload,
                refresh_count::text AS "refreshCount"
         FROM participant_aggregate_snapshot snapshot WHERE participant_id = $1::bigint`,
        [participantId],
      );
      result.set(person, {
        state: state.rows[0]?.text ?? null,
        stateRefreshCount: Number(state.rows[0]?.refreshCount ?? 0),
        scopes: new Map(
          scopes.rows.map((row) => [
            row.scopeKey,
            { text: row.text, payload: row.payload, refreshCount: Number(row.refreshCount) },
          ]),
        ),
      });
    }
    return result;
  }

  function scopeKeys(world: World, competition: 'first' | 'second' | string, season?: string) {
    const competitionId =
      competition === 'first'
        ? world.firstCompetitionId
        : competition === 'second'
          ? world.secondCompetitionId
          : competition;
    const label =
      season ?? (competition === 'first' ? '2025' : competition === 'second' ? '2026' : '');
    return [`season:${competitionId}:${label}`, `competition:${competitionId}`];
  }

  /**
   * Requires exactly the expected refresh: affected participants' state rows
   * advanced by one, exactly the listed scope rows changed (or were added),
   * and every other row is byte-identical.
   */
  function expectSelectiveRefresh(
    before: Map<Person, StoredRows>,
    after: Map<Person, StoredRows>,
    affected: readonly Person[],
    changedScopes: Partial<Record<Person, readonly string[]>>,
  ) {
    for (const person of PEOPLE) {
      const previous = before.get(person)!;
      const current = after.get(person)!;
      const changed = changedScopes[person] ?? [];

      if (!affected.includes(person)) {
        expect(current.state, `${person} state row`).toBe(previous.state);
        expect([...current.scopes.entries()].map(([key, row]) => [key, row.text]).sort()).toEqual(
          [...previous.scopes.entries()].map(([key, row]) => [key, row.text]).sort(),
        );
        continue;
      }

      expect(current.stateRefreshCount, `${person} state refresh count`).toBe(
        previous.stateRefreshCount + 1,
      );
      const keys = new Set([...previous.scopes.keys(), ...current.scopes.keys()]);
      const actuallyChanged = [...keys]
        .filter((key) => previous.scopes.get(key)?.text !== current.scopes.get(key)?.text)
        .sort();
      expect(actuallyChanged, `${person} changed scope rows`).toEqual([...changed].sort());
      for (const key of changed) {
        const previousRow = previous.scopes.get(key);
        const currentRow = current.scopes.get(key);
        expect(currentRow, `${person} ${key} still stored`).toBeDefined();
        expect(currentRow!.payload, `${person} ${key} figures changed`).not.toEqual(
          previousRow?.payload,
        );
        expect(currentRow!.refreshCount, `${person} ${key} refresh count`).toBe(
          (previousRow?.refreshCount ?? 0) + 1,
        );
      }
    }
  }

  /** Every participant's served figures equal live derivation, without deriving. */
  async function expectServedEqualsLive(client: PoolClient, world: World) {
    for (const person of PEOPLE) {
      const participantId = world.people[person];
      let derived = 0;
      const service = createParticipantAggregatesService(async (id) => {
        derived += 1;
        return loadParticipantAggregatesSource(id, client);
      }, store(client));
      const served = await service.getParticipantAggregates(participantId, {});
      const live = await loadParticipantAggregatesSource(participantId, client);

      expect(derived, `${person} served without deriving`).toBe(0);
      expect(served, `${person} served figures`).toEqual(
        deriveParticipantAggregates(live!, { createSeasonId }),
      );
    }
  }

  /** Builds the world, refreshes everyone, performs one write, refreshes again. */
  async function afterOneWrite(
    client: PoolClient,
    label: string,
    write: (world: World) => Promise<void>,
  ) {
    const world = await seedWorld(client, label);
    const baseline = await refreshEveryone(client, world);
    expect([...baseline.outcomes.values()].every((outcome) => outcome === 'refreshed')).toBe(true);
    const before = await storedRows(client, world);

    await write(world);
    const { recomputed } = await refreshEveryone(client, world);
    const after = await storedRows(client, world);
    return { world, before, after, recomputed };
  }

  function idsOf(world: World, people: readonly Person[]) {
    return people.map((person) => world.people[person]).sort();
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

  test('a direct submission refreshes only its participants, and only their changed rows', async () => {
    await withRolledBackTransaction(async (client) => {
      const { world, before, after, recomputed } = await afterOneWrite(
        client,
        'direct-submission',
        async (world) => {
          const repository = createSubmissionRepository(savepointPool(client));
          await repository.storeAcceptedSubmission(
            submissionRequestSchema.parse({
              fixtureId: world.firstFixtureId,
              schemaVersion: '1.0',
              events: [
                {
                  eventId: randomUUID(),
                  inningsId: world.firstInningsId,
                  sequenceNumber: 3,
                  overNumber: 0,
                  positionInOver: 2,
                  ballNumber: '0.3',
                  strikerId: world.people.striker,
                  nonStrikerId: world.people.nonStriker,
                  bowlerId: world.people.bowler,
                  runs: { offBat: 4, extras: 0, total: 4 },
                },
              ],
            }),
            world.accountId,
            undefined,
            'a'.repeat(64),
          );
        },
      );

      const affected: Person[] = ['striker', 'nonStriker', 'bowler'];
      expect(recomputed.sort()).toEqual(idsOf(world, affected));
      // The non-striker is affected, but was already the non-striker in this
      // innings, so none of their figures change. The striker's rows for the
      // second competition are untouched.
      expectSelectiveRefresh(before, after, affected, {
        striker: [...scopeKeys(world, 'first'), 'career'],
        bowler: [...scopeKeys(world, 'first'), 'career'],
      });
      await expectServedEqualsLive(client, world);
    });
  });

  test('a direct correction refreshes the previous and replacement participants only', async () => {
    await withRolledBackTransaction(async (client) => {
      const { world, before, after, recomputed } = await afterOneWrite(
        client,
        'direct-correction',
        async (world) => {
          const repository = createSubmissionRepository(savepointPool(client));
          // The non-striker is removed from the event and replaced, and the
          // striker is run out by the fielder.
          await repository.storeAcceptedCorrection(
            world.firstFixtureEvents[1]!.eventId,
            correctionRequestSchema.parse({
              fixtureId: world.firstFixtureId,
              schemaVersion: '1.0',
              reason: 'Correct the non-striker and record the run out.',
              event: {
                inningsId: world.firstInningsId,
                overNumber: 0,
                positionInOver: 1,
                ballNumber: '0.2',
                strikerId: world.people.striker,
                nonStrikerId: world.people.replacement,
                bowlerId: world.people.bowler,
                runs: { offBat: 0, extras: 0, total: 0 },
                wickets: [
                  {
                    kind: 'run out',
                    playerOutId: world.people.striker,
                    fielders: [{ participantId: world.people.fielder }],
                  },
                ],
              },
            }),
            world.accountId,
          );
        },
      );

      const affected: Person[] = ['striker', 'nonStriker', 'replacement', 'bowler', 'fielder'];
      expect(recomputed.sort()).toEqual(idsOf(world, affected));
      // The removed non-striker keeps an innings through the other delivery, and
      // a run out is not the bowler's, so neither's figures change.
      expectSelectiveRefresh(before, after, affected, {
        striker: [...scopeKeys(world, 'first'), 'career'],
        replacement: [...scopeKeys(world, 'first'), 'career'],
        fielder: [...scopeKeys(world, 'first'), 'career'],
      });
      await expectServedEqualsLive(client, world);
    });
  });

  test('batch publication refreshes only the participants of the published events', async () => {
    await withRolledBackTransaction(async (client) => {
      const { world, before, after, recomputed } = await afterOneWrite(
        client,
        'batch-publication',
        async (world) => {
          const repository = createBatchRepository(client);
          const batch = await repository.createBatch({
            batchReference: randomUUID(),
            submitterId: world.accountId,
            competitionId: world.secondCompetitionId,
            idempotencyKey: `${sourcePrefix}-batch-publication`,
            source: {
              checksum: 'a'.repeat(64),
              uri: `stored-object:${randomUUID()}`,
              sizeBytes: 64,
            },
            state: 'publishing',
          });
          await repository.insertBatchItems(batch.batchId, [
            {
              ordinal: 0,
              inningsId: world.secondInningsId,
              overNumber: 0,
              positionInOver: 1,
              state: 'accepted',
              sourceIdentity: `${sourcePrefix}:batch-publication`,
              payload: {
                eventId: randomUUID(),
                sequenceNumber: 2,
                ballNumber: '0.2',
                strikerId: world.people.secondStriker,
                nonStrikerId: world.people.striker,
                bowlerId: world.people.secondBowler,
                runs: { offBat: 6, extras: 0, total: 6, nonBoundary: false },
                extras: {},
                wickets: [],
              },
            },
          ]);
          await expect(
            repository.publishAcceptedItems(batch.batchId, 'selective-refresh-worker'),
          ).resolves.toMatchObject({ published: 1 });
        },
      );

      const affected: Person[] = ['secondStriker', 'striker', 'secondBowler'];
      expect(recomputed.sort()).toEqual(idsOf(world, affected));
      expectSelectiveRefresh(before, after, affected, {
        secondStriker: [...scopeKeys(world, 'second'), 'career'],
        secondBowler: [...scopeKeys(world, 'second'), 'career'],
      });
      await expectServedEqualsLive(client, world);
    });
  });

  test('a batch correction refreshes only the participants of the corrected event', async () => {
    await withRolledBackTransaction(async (client) => {
      const { world, before, after, recomputed } = await afterOneWrite(
        client,
        'batch-correction',
        async (world) => {
          const repository = createBatchRepository(client);
          const batch = await repository.createBatch({
            batchReference: randomUUID(),
            submitterId: world.accountId,
            competitionId: world.firstCompetitionId,
            idempotencyKey: `${sourcePrefix}-batch-correction`,
            source: {
              checksum: 'b'.repeat(64),
              uri: `stored-object:${randomUUID()}`,
              sizeBytes: 64,
            },
            state: 'awaiting_review',
          });
          await repository.insertBatchItems(batch.batchId, [
            {
              ordinal: 0,
              inningsId: world.firstInningsId,
              overNumber: 0,
              positionInOver: 0,
              state: 'accepted',
              sourceIdentity: `${sourcePrefix}:batch-correction`,
              operation: 'correction',
              correctsSourceIdentity: `${sourcePrefix}:first-delivery`,
              correctionTargetDeliveryId: world.firstFixtureEvents[0]!.deliveryId,
              payload: {
                eventId: randomUUID(),
                sequenceNumber: 1,
                ballNumber: '0.1',
                strikerId: world.people.striker,
                nonStrikerId: world.people.nonStriker,
                bowlerId: world.people.bowler,
                runs: { offBat: 3, extras: 0, total: 3, nonBoundary: false },
                extras: {},
                wickets: [],
              },
            },
          ]);
          await repository.applyReviewDecision({
            batchId: batch.batchId,
            actorId: world.accountId,
            decision: 'approved',
            reason: 'Verified the corrected runs.',
          });
          await expect(
            repository.publishAcceptedItems(batch.batchId, 'selective-refresh-worker'),
          ).resolves.toMatchObject({ published: 1 });
        },
      );

      const affected: Person[] = ['striker', 'nonStriker', 'bowler'];
      expect(recomputed.sort()).toEqual(idsOf(world, affected));
      expectSelectiveRefresh(before, after, affected, {
        striker: [...scopeKeys(world, 'first'), 'career'],
        bowler: [...scopeKeys(world, 'first'), 'career'],
      });
      await expectServedEqualsLive(client, world);
    });
  });

  test('a match ingest refreshes its squad and delivery participants only', async () => {
    await withRolledBackTransaction(async (client) => {
      let ingestedCompetitionId = '';
      const { world, before, after, recomputed } = await afterOneWrite(
        client,
        'ingest',
        async (world) => {
          // A Cricsheet match built from a seed file: the bystander is only added
          // to a squad, and three participants are named by its one delivery.
          const template = JSON.parse(await readFile(seedMatchPath, 'utf8')) as {
            info: Record<string, unknown>;
            meta: unknown;
          };
          // Teams, venue and officials are this test's own, so the ingest does not
          // lock reference rows that parallel test files ingest from the seed.
          const home = `${sourcePrefix}-home`;
          const away = `${sourcePrefix}-away`;
          const name = (person: Person) => `Selective ${person}`;
          const match = {
            meta: template.meta,
            info: {
              ...template.info,
              teams: [home, away],
              venue: `${sourcePrefix}-venue`,
              city: `${sourcePrefix}-city`,
              officials: {},
              toss: { winner: home, decision: 'bat' },
              outcome: { winner: home, by: { runs: 1 } },
              event: { name: `${sourcePrefix}-ingest-competition` },
              season: '2024',
              players: {
                [home]: [name('secondStriker'), name('striker'), name('bystander')],
                [away]: [name('secondBowler')],
              },
              registry: {
                people: Object.fromEntries(
                  (['secondStriker', 'striker', 'bystander', 'secondBowler'] as const).map(
                    (person) => [name(person), world.sourceRefs[person]],
                  ),
                ),
              },
              player_of_match: [],
              supersubs: undefined,
            },
            innings: [
              {
                team: home,
                overs: [
                  {
                    over: 0,
                    deliveries: [
                      {
                        batter: name('secondStriker'),
                        non_striker: name('striker'),
                        bowler: name('secondBowler'),
                        runs: { batter: 1, extras: 0, total: 1 },
                      },
                    ],
                  },
                ],
              },
            ],
          };
          const directory = await mkdtemp(join(tmpdir(), 'selective-refresh-ingest-'));
          const path = join(directory, 'match.json');
          await writeFile(path, JSON.stringify(match));
          const { fixtureId } = await ingestMatchData(client, path, {
            sourceRef: `${sourcePrefix}-ingest-match`,
          });
          ingestedCompetitionId = (
            await client.query<{ id: string }>(
              `SELECT competition_id::text AS id FROM fixture WHERE fixture_id = $1::bigint`,
              [fixtureId],
            )
          ).rows[0]!.id;
        },
      );

      const affected: Person[] = ['secondStriker', 'striker', 'bystander', 'secondBowler'];
      expect(recomputed.sort()).toEqual(idsOf(world, affected));
      const ingestedScopes = scopeKeys(world, ingestedCompetitionId, '2024');
      expectSelectiveRefresh(before, after, affected, {
        secondStriker: [...ingestedScopes, 'career'],
        striker: [...ingestedScopes, 'career'],
        bystander: [...ingestedScopes, 'career'],
        secondBowler: [...ingestedScopes, 'career'],
      });
      await expectServedEqualsLive(client, world);
    });
  });

  test('a second refresh recomputes and rewrites nothing', async () => {
    await withRolledBackTransaction(async (client) => {
      const world = await seedWorld(client, 'idempotent');
      await refreshEveryone(client, world);
      const before = await storedRows(client, world);

      const { outcomes, recomputed } = await refreshEveryone(client, world);

      expect(recomputed).toEqual([]);
      expect([...outcomes.values()].every((outcome) => outcome === 'current')).toBe(true);
      expectSelectiveRefresh(before, await storedRows(client, world), [], {});
    });
  });

  test('a participant with a version but no fixture stores one all-zero row and publishes nothing', async () => {
    await withRolledBackTransaction(async (client) => {
      const world = await seedWorld(client, 'no-fixture');
      await refreshEveryone(client, world);
      const rows = (await storedRows(client, world)).get('noFixture')!;

      expect(rows.stateRefreshCount).toBe(1);
      expect([...rows.scopes.keys()]).toEqual(['career']);
      const served = await createParticipantAggregatesService(async () => {
        throw new Error('Expected stored rows to be served.');
      }, store(client)).getParticipantAggregates(world.people.noFixture, {});
      expect(served?.statistics).toEqual([]);
    });
  });

  test('a stored empty row set is current, served and not rewritten', async () => {
    // The unchanged query always returns a career row, so no participant can
    // reach an empty set through it today. The state row still vouches for an
    // empty set should the query ever return one.
    await withRolledBackTransaction(async (client) => {
      const world = await seedWorld(client, 'empty-set');
      const snapshots = store(client);
      const participantId = world.people.noFixture;
      const read = await snapshots.read(participantId);

      expect(await snapshots.write(participantId, read!.dataVersion!, [])).toBe('refreshed');
      expect((await snapshots.read(participantId))?.rows).toEqual([]);
      expect(await snapshots.write(participantId, read!.dataVersion!, [])).toBe('current');
      const rows = (await storedRows(client, world)).get('noFixture')!;
      expect(rows.stateRefreshCount).toBe(1);
      expect(rows.scopes.size).toBe(0);
    });
  });

  test('a refresh that fails partway leaves stored rows intact and is retried successfully', async () => {
    await withRolledBackTransaction(async (client) => {
      const world = await seedWorld(client, 'retry');
      await refreshEveryone(client, world);
      await createSubmissionRepository(savepointPool(client)).storeAcceptedSubmission(
        submissionRequestSchema.parse({
          fixtureId: world.firstFixtureId,
          schemaVersion: '1.0',
          events: [
            {
              eventId: randomUUID(),
              inningsId: world.firstInningsId,
              sequenceNumber: 3,
              overNumber: 0,
              positionInOver: 2,
              ballNumber: '0.3',
              strikerId: world.people.striker,
              nonStrikerId: world.people.nonStriker,
              bowlerId: world.people.bowler,
              runs: { offBat: 4, extras: 0, total: 4 },
            },
          ],
        }),
        world.accountId,
        undefined,
        'a'.repeat(64),
      );
      const before = await storedRows(client, world);

      // The striker's refresh fails after its state row and deletions, while
      // inserting scope rows; the bowler's live derivation fails outright.
      const failingStore = createParticipantAggregateSnapshotStore(
        savepointPool(client, (text) => {
          if (text.includes('INSERT INTO participant_aggregate_snapshot AS snapshot')) {
            throw new Error('Simulated failure while writing scope rows.');
          }
        }),
      );
      const failed = await refreshParticipantAggregateSnapshots(Object.values(world.people), {
        store: failingStore,
        loadSource: async (participantId) => {
          if (participantId === world.people.bowler) {
            throw new Error('Simulated failure while deriving.');
          }
          return loadParticipantAggregatesSource(participantId, client);
        },
      });

      expect(failed.get(world.people.striker)).toBe('failed');
      expect(failed.get(world.people.bowler)).toBe('failed');
      expect(failed.get(world.people.nonStriker)).toBe('failed');
      expect(failed.get(world.people.bystander)).toBe('current');
      const afterFailure = await storedRows(client, world);
      for (const person of ['striker', 'nonStriker', 'bowler'] as const) {
        expect([...afterFailure.get(person)!.scopes.values()].map((row) => row.text)).toEqual(
          [...before.get(person)!.scopes.values()].map((row) => row.text),
        );
        expect(afterFailure.get(person)!.stateRefreshCount).toBe(
          before.get(person)!.stateRefreshCount,
        );
      }
      const attempts = await client.query<{ attempts: number; lastError: string }>(
        `SELECT attempt_count AS attempts, last_error AS "lastError"
         FROM participant_aggregate_snapshot_state WHERE participant_id = $1::bigint`,
        [world.people.bowler],
      );
      expect(attempts.rows).toEqual([
        { attempts: 1, lastError: 'Simulated failure while deriving.' },
      ]);
      // Stale rows are not served while the refresh has failed.
      expect((await store(client).read(world.people.striker))?.rows).toBeNull();

      const retried = await refreshEveryone(client, world);
      expect(retried.recomputed.sort()).toEqual(idsOf(world, ['striker', 'nonStriker', 'bowler']));
      expectSelectiveRefresh(
        before,
        await storedRows(client, world),
        ['striker', 'nonStriker', 'bowler'],
        {
          striker: [...scopeKeys(world, 'first'), 'career'],
          bowler: [...scopeKeys(world, 'first'), 'career'],
        },
      );
      const cleared = await client.query<{ attempts: number; lastError: string | null }>(
        `SELECT attempt_count AS attempts, last_error AS "lastError"
         FROM participant_aggregate_snapshot_state WHERE participant_id = $1::bigint`,
        [world.people.bowler],
      );
      expect(cleared.rows).toEqual([{ attempts: 0, lastError: null }]);
      await expectServedEqualsLive(client, world);
    });
  });
});
