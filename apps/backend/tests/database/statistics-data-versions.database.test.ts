import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { advanceStatisticsDataVersions } from '@sport-analytics/batch-processing';
import { correctionRequestSchema, submissionRequestSchema } from '@sport-analytics/contracts';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { createBatchRepository } from '../../src/modules/batches/batch.repository';
import { createSubmissionRepository } from '../../src/modules/submissions/submission.repository';

/**
 * Issue #592. Every write path that can change a participant's season,
 * competition or career aggregates advances that participant's statistics data
 * version in its own transaction, and advances no one else's.
 *
 * Each test seeds its own fixture and people inside a transaction that is
 * rolled back, performs one write, and compares versions of test-owned people
 * only, so parallel database test files cannot disturb the comparison. The
 * squad holds people who share the fixture with the written event but are not
 * named by it, and a second fixture holds a person the write cannot affect.
 */

const sourcePrefix = `statistics-data-versions-${process.pid}`;
const seedMatchPath = resolve(__dirname, '../../../../database/seeds/matches/423788.json');

interface SeededFixture {
  accountId: string;
  competitionId: string;
  fixtureId: string;
  inningsId: string;
  /** Batting team. */
  strikerId: string;
  nonStrikerId: string;
  replacementNonStrikerId: string;
  battingBystanderId: string;
  /** Bowling team. */
  bowlerId: string;
  fielderId: string;
  /** Squad member of a different fixture in the same competition. */
  otherFixturePlayerId: string;
}

type Role = Exclude<keyof SeededFixture, 'accountId' | 'competitionId' | 'fixtureId' | 'inningsId'>;

const ROLES: Role[] = [
  'strikerId',
  'nonStrikerId',
  'replacementNonStrikerId',
  'battingBystanderId',
  'bowlerId',
  'fielderId',
  'otherFixturePlayerId',
];

describe.sequential('statistics data versions on every write path', () => {
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

  /**
   * A pool whose transactions are savepoints inside the test's transaction, so
   * the submission repository's own BEGIN and COMMIT are rolled back with it.
   */
  function savepointPool(client: PoolClient): Pool {
    const statements: Record<string, string> = {
      BEGIN: 'SAVEPOINT repository_transaction',
      COMMIT: 'RELEASE SAVEPOINT repository_transaction',
      ROLLBACK: 'ROLLBACK TO SAVEPOINT repository_transaction',
    };
    const transactionClient = {
      query: (text: string, values?: unknown[]) => client.query(statements[text] ?? text, values),
      release: () => undefined,
    };
    return { connect: async () => transactionClient } as unknown as Pool;
  }

  async function seedFixture(client: PoolClient, label: string): Promise<SeededFixture> {
    const key = `${sourcePrefix}-${label}`;
    const one = async <Row extends Record<string, string>>(text: string, values: unknown[]) =>
      (await client.query<Row>(text, values)).rows[0]!;

    const { accountId } = await one<{ accountId: string }>(
      `INSERT INTO app_user (
         auth_provider, auth_subject, display_name, application_role, submitter_approval_state
       )
       VALUES ('test', $1, 'Statistics Data Versions Test', 'submitter', 'approved')
       RETURNING app_user_id::text AS "accountId"`,
      [key],
    );
    const { competitionId } = await one<{ competitionId: string }>(
      `INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text AS "competitionId"`,
      [`${key}-competition`],
    );
    await client.query(
      `INSERT INTO submitter_competition_scope (app_user_id, competition_id) VALUES ($1, $2)`,
      [accountId, competitionId],
    );
    const insertTeam = async (name: string) =>
      (
        await one<{ teamId: string }>(
          `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS "teamId"`,
          [`${key}-${name}`],
        )
      ).teamId;
    const battingTeamId = await insertTeam('batting');
    const bowlingTeamId = await insertTeam('bowling');
    const insertFixture = async (name: string) =>
      (
        await one<{ fixtureId: string }>(
          `INSERT INTO fixture (
             source_ref, competition_id, season, match_type, team_type, gender, balls_per_over,
             start_date, end_date, outcome, source_version, source_revision
           )
           VALUES ($1, $2, '2026', 'T20', 'club', 'mixed', 6, CURRENT_DATE, CURRENT_DATE,
                   'tie', '1.0', 1)
           RETURNING fixture_id::text AS "fixtureId"`,
          [`${key}-${name}`, competitionId],
        )
      ).fixtureId;
    const fixtureId = await insertFixture('fixture');
    const otherFixtureId = await insertFixture('other-fixture');
    for (const id of [fixtureId, otherFixtureId]) {
      await client.query(
        `INSERT INTO fixture_team (fixture_id, team_id, ordinal) VALUES ($1, $2, 1), ($1, $3, 2)`,
        [id, battingTeamId, bowlingTeamId],
      );
    }
    const { inningsId } = await one<{ inningsId: string }>(
      `INSERT INTO innings (fixture_id, ordinal, batting_team_id)
       VALUES ($1, 0, $2)
       RETURNING innings_id::text AS "inningsId"`,
      [fixtureId, battingTeamId],
    );

    const people = {} as Record<Role, string>;
    for (const role of ROLES) {
      people[role] = (
        await one<{ personId: string }>(
          `INSERT INTO person (source_ref, display_name)
           VALUES ($1, $1)
           RETURNING person_id::text AS "personId"`,
          [`${key}-${role}`],
        )
      ).personId;
    }
    const squad: Array<[string, Role, string]> = [
      [fixtureId, 'strikerId', battingTeamId],
      [fixtureId, 'nonStrikerId', battingTeamId],
      [fixtureId, 'replacementNonStrikerId', battingTeamId],
      [fixtureId, 'battingBystanderId', battingTeamId],
      [fixtureId, 'bowlerId', bowlingTeamId],
      [fixtureId, 'fielderId', bowlingTeamId],
      [otherFixtureId, 'otherFixturePlayerId', battingTeamId],
    ];
    for (const [squadFixtureId, role, teamId] of squad) {
      await client.query(
        `INSERT INTO fixture_squad (fixture_id, person_id, team_id) VALUES ($1, $2, $3)`,
        [squadFixtureId, people[role], teamId],
      );
    }

    return { accountId, competitionId, fixtureId, inningsId, ...people };
  }

  /** Each person's current version; a person with no row has version 0. */
  async function versions(client: PoolClient, personIds: readonly string[]) {
    const result = await client.query<{ participantId: string; dataVersion: string }>(
      `SELECT person.person_id::text AS "participantId",
              COALESCE(version.data_version, 0)::text AS "dataVersion"
       FROM unnest($1::bigint[]) AS person(person_id)
       LEFT JOIN participant_statistics_version version
         ON version.participant_id = person.person_id`,
      [personIds],
    );
    return new Map(result.rows.map((row) => [row.participantId, Number(row.dataVersion)]));
  }

  async function fixtureVersion(client: PoolClient, fixtureId: string): Promise<number> {
    const result = await client.query<{ dataVersion: string }>(
      `SELECT data_version::text AS "dataVersion"
       FROM fixture_statistics_cache_version WHERE fixture_id = $1::bigint`,
      [fixtureId],
    );
    return Number(result.rows[0]?.dataVersion ?? 0);
  }

  /** Every listed person advanced by exactly one version and everyone else is unchanged. */
  function expectAdvancedExactly(
    before: Map<string, number>,
    after: Map<string, number>,
    advanced: readonly string[],
  ) {
    const expected = new Map(
      [...before].map(([participantId, version]) => [
        participantId,
        advanced.includes(participantId) ? version + 1 : version,
      ]),
    );
    expect(after).toEqual(expected);
  }

  const peopleOf = (seeded: SeededFixture) => ROLES.map((role) => seeded[role]);

  function submissionEvent(seeded: SeededFixture) {
    return {
      eventId: randomUUID(),
      inningsId: seeded.inningsId,
      sequenceNumber: 1,
      overNumber: 0,
      positionInOver: 0,
      ballNumber: '0.1',
      strikerId: seeded.strikerId,
      nonStrikerId: seeded.nonStrikerId,
      bowlerId: seeded.bowlerId,
      runs: { offBat: 1, extras: 0, total: 1 },
    };
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

  test('a direct submission advances only the participants its events name', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seedFixture(client, 'direct-submission');
      const repository = createSubmissionRepository(savepointPool(client));
      const submission = submissionRequestSchema.parse({
        fixtureId: seeded.fixtureId,
        schemaVersion: '1.0',
        events: [
          {
            ...submissionEvent(seeded),
            wickets: [
              {
                kind: 'run out',
                playerOutId: seeded.nonStrikerId,
                fielders: [{ participantId: seeded.fielderId }],
              },
            ],
          },
        ],
      });
      const before = await versions(client, peopleOf(seeded));
      const fixtureBefore = await fixtureVersion(client, seeded.fixtureId);

      await repository.storeAcceptedSubmission(
        submission,
        seeded.accountId,
        undefined,
        'a'.repeat(64),
      );

      expectAdvancedExactly(before, await versions(client, peopleOf(seeded)), [
        seeded.strikerId,
        seeded.nonStrikerId,
        seeded.bowlerId,
        seeded.fielderId,
      ]);
      expect(await fixtureVersion(client, seeded.fixtureId)).toBe(fixtureBefore + 1);
    });
  });

  test('a direct correction advances only the previous and replacement participants', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seedFixture(client, 'direct-correction');
      const repository = createSubmissionRepository(savepointPool(client));
      const original = submissionEvent(seeded);
      await repository.storeAcceptedSubmission(
        submissionRequestSchema.parse({
          fixtureId: seeded.fixtureId,
          schemaVersion: '1.0',
          events: [original],
        }),
        seeded.accountId,
        undefined,
        'a'.repeat(64),
      );
      const correction = correctionRequestSchema.parse({
        fixtureId: seeded.fixtureId,
        schemaVersion: '1.0',
        reason: 'Correct the non-striker and record the run out.',
        event: {
          inningsId: seeded.inningsId,
          overNumber: 0,
          positionInOver: 0,
          ballNumber: '0.1',
          strikerId: seeded.strikerId,
          nonStrikerId: seeded.replacementNonStrikerId,
          bowlerId: seeded.bowlerId,
          runs: { offBat: 1, extras: 0, total: 1 },
          wickets: [
            {
              kind: 'run out',
              playerOutId: seeded.strikerId,
              fielders: [{ participantId: seeded.fielderId }],
            },
          ],
        },
      });
      const before = await versions(client, peopleOf(seeded));
      const fixtureBefore = await fixtureVersion(client, seeded.fixtureId);

      await repository.storeAcceptedCorrection(original.eventId, correction, seeded.accountId);

      expectAdvancedExactly(before, await versions(client, peopleOf(seeded)), [
        seeded.strikerId,
        seeded.nonStrikerId,
        seeded.replacementNonStrikerId,
        seeded.bowlerId,
        seeded.fielderId,
      ]);
      expect(await fixtureVersion(client, seeded.fixtureId)).toBe(fixtureBefore + 1);
    });
  });

  function batchPayload(seeded: SeededFixture, sequenceNumber: number) {
    return {
      eventId: randomUUID(),
      sequenceNumber,
      ballNumber: `0.${sequenceNumber}`,
      strikerId: seeded.strikerId,
      nonStrikerId: seeded.nonStrikerId,
      bowlerId: seeded.bowlerId,
      runs: { offBat: 0, extras: 0, total: 0, nonBoundary: false },
      extras: {},
      wickets: [] as unknown[],
    };
  }

  async function publishBatch(
    client: PoolClient,
    seeded: SeededFixture,
    label: string,
    item: Record<string, unknown>,
    state: 'publishing' | 'awaiting_review',
  ) {
    const repository = createBatchRepository(client);
    const batch = await repository.createBatch({
      batchReference: randomUUID(),
      submitterId: seeded.accountId,
      competitionId: seeded.competitionId,
      idempotencyKey: `${sourcePrefix}-${label}`,
      source: { checksum: 'a'.repeat(64), uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
      state,
    });
    await repository.insertBatchItems(batch.batchId, [
      {
        ordinal: 0,
        inningsId: seeded.inningsId,
        overNumber: 0,
        positionInOver: 0,
        state: 'accepted',
        ...item,
      } as Parameters<typeof repository.insertBatchItems>[1][number],
    ]);
    if (state === 'awaiting_review') {
      await repository.applyReviewDecision({
        batchId: batch.batchId,
        actorId: seeded.accountId,
        decision: 'approved',
        reason: 'Verified against the source.',
      });
    }
    await expect(
      repository.publishAcceptedItems(batch.batchId, `worker-${label}`),
    ).resolves.toMatchObject({ published: 1 });
    return (await repository.listBatchItems(batch.batchId, { limit: 1 }))[0]!.publishedEventId!;
  }

  test('batch publication advances only the participants its published events name', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seedFixture(client, 'batch-publication');
      const before = await versions(client, peopleOf(seeded));
      const fixtureBefore = await fixtureVersion(client, seeded.fixtureId);

      await publishBatch(
        client,
        seeded,
        'batch-publication',
        {
          sourceIdentity: `${sourcePrefix}:batch-publication`,
          payload: {
            ...batchPayload(seeded, 1),
            wickets: [
              {
                kind: 'caught',
                playerOutId: seeded.strikerId,
                fielders: [{ participantId: seeded.fielderId, substitute: false }],
              },
            ],
          },
        },
        'publishing',
      );

      expectAdvancedExactly(before, await versions(client, peopleOf(seeded)), [
        seeded.strikerId,
        seeded.nonStrikerId,
        seeded.bowlerId,
        seeded.fielderId,
      ]);
      expect(await fixtureVersion(client, seeded.fixtureId)).toBe(fixtureBefore + 1);
    });
  });

  test('a batch correction advances only the previous and replacement participants', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seedFixture(client, 'batch-correction');
      const sourceIdentity = `${sourcePrefix}:batch-correction-target`;
      const original = batchPayload(seeded, 1);
      const originalDeliveryId = await publishBatch(
        client,
        seeded,
        'batch-correction-original',
        { sourceIdentity, payload: original },
        'publishing',
      );
      const before = await versions(client, peopleOf(seeded));
      const fixtureBefore = await fixtureVersion(client, seeded.fixtureId);

      await publishBatch(
        client,
        seeded,
        'batch-correction-replacement',
        {
          sourceIdentity: `${sourcePrefix}:batch-correction-replacement`,
          operation: 'correction',
          correctsSourceIdentity: sourceIdentity,
          correctionTargetDeliveryId: originalDeliveryId,
          payload: {
            ...original,
            eventId: randomUUID(),
            nonStrikerId: seeded.replacementNonStrikerId,
            wickets: [
              {
                kind: 'caught',
                playerOutId: seeded.strikerId,
                fielders: [{ participantId: seeded.fielderId, substitute: false }],
              },
            ],
          },
        },
        'awaiting_review',
      );

      expectAdvancedExactly(before, await versions(client, peopleOf(seeded)), [
        seeded.strikerId,
        seeded.nonStrikerId,
        seeded.replacementNonStrikerId,
        seeded.bowlerId,
        seeded.fielderId,
      ]);
      expect(await fixtureVersion(client, seeded.fixtureId)).toBe(fixtureBefore + 1);
    });
  });

  /** Everyone in a fixture's squad or named by one of its deliveries, read back from the database. */
  async function fixtureParticipants(client: PoolClient, fixtureId: string): Promise<string[]> {
    const result = await client.query<{ personId: string }>(
      `SELECT person_id::text AS "personId" FROM fixture_squad WHERE fixture_id = $1::bigint
       UNION
       SELECT unnest(ARRAY[d.striker_id, d.non_striker_id, d.bowler_id])::text
       FROM delivery d JOIN innings i ON i.innings_id = d.innings_id
       WHERE i.fixture_id = $1::bigint
       UNION
       SELECT w.player_out_id::text
       FROM delivery_wicket w
       JOIN delivery d ON d.delivery_id = w.delivery_id
       JOIN innings i ON i.innings_id = d.innings_id
       WHERE i.fixture_id = $1::bigint
       UNION
       SELECT f.person_id::text
       FROM delivery_wicket_fielder f
       JOIN delivery_wicket w ON w.wicket_id = f.wicket_id
       JOIN delivery d ON d.delivery_id = w.delivery_id
       JOIN innings i ON i.innings_id = d.innings_id
       WHERE i.fixture_id = $1::bigint AND f.person_id IS NOT NULL`,
      [fixtureId],
    );
    return result.rows.map((row) => row.personId).sort();
  }

  test('a match ingest advances only its added squad members and delivery participants', async () => {
    await withRolledBackTransaction(async (client) => {
      const seeded = await seedFixture(client, 'ingest');
      const match = JSON.parse(await readFile(seedMatchPath, 'utf8')) as {
        info: { registry: { people: Record<string, string> } };
      };

      // A first ingest guarantees every registry person exists. The match
      // registry also names its officials, who are neither in the squad nor
      // named by a delivery, so they share the ingest without being affected.
      await ingestMatchData(client, seedMatchPath, { sourceRef: `${sourcePrefix}-ingest-first` });
      const registryPeople = (
        await client.query<{ personId: string }>(
          `SELECT person_id::text AS "personId" FROM person WHERE source_ref = ANY($1::text[])`,
          [Object.values(match.info.registry.people)],
        )
      ).rows.map((row) => row.personId);
      const watched = [...registryPeople, ...peopleOf(seeded)];
      const before = await versions(client, watched);

      // A fresh source reference creates a new fixture, so every squad row and
      // delivery of this ingest is newly inserted.
      const sourceRef = `${sourcePrefix}-ingest-second`;
      const { fixtureId } = await ingestMatchData(client, seedMatchPath, { sourceRef });
      const participants = await fixtureParticipants(client, fixtureId);
      // The match's officials are in the registry but unaffected.
      expect(registryPeople.filter((id) => !participants.includes(id))).toHaveLength(5);
      // TR Birt is in the squad but named by no delivery, so only the squad
      // membership the ingest adds can make them affected.
      const squadOnly = await client.query<{ personId: string; named: boolean }>(
        `SELECT person.person_id::text AS "personId",
                EXISTS (
                  SELECT 1 FROM delivery d JOIN innings i ON i.innings_id = d.innings_id
                  WHERE i.fixture_id = $2::bigint
                    AND person.person_id IN (d.striker_id, d.non_striker_id, d.bowler_id)
                ) AS named
         FROM person WHERE person.source_ref = $1`,
        [match.info.registry.people['TR Birt'], fixtureId],
      );
      expect(squadOnly.rows).toEqual([{ personId: expect.any(String), named: false }]);
      expect(participants).toContain(squadOnly.rows[0]!.personId);

      expectAdvancedExactly(before, await versions(client, watched), participants);
      expect(await fixtureVersion(client, fixtureId)).toBe(1);

      // A re-ingest of the same source inserts nothing, so it affects no
      // participant, but the fixture version still advances.
      const afterIngest = await versions(client, watched);
      await ingestMatchData(client, seedMatchPath, { sourceRef });
      expect(await versions(client, watched)).toEqual(afterIngest);
      expect(await fixtureVersion(client, fixtureId)).toBe(2);
    });
  }, 30_000);

  test('concurrent writers with overlapping participants in opposite orders neither deadlock nor lose a bump', async () => {
    // Two sessions pass the same fifty participants in opposite orders. Without
    // the identifier-ordered upsert this deadlocked in every one of five local
    // runs. The people are committed because the writers need separate
    // sessions. They are left in place, as other database tests leave theirs:
    // deleting them could race a parallel test that reads committed people.
    const people = (
      await databasePool().query<{ personId: string }>(
        `INSERT INTO person (source_ref, display_name)
         SELECT $1 || ordinal, $1 || ordinal FROM generate_series(1, 50) AS ordinal
         RETURNING person_id::text AS "personId"`,
        [`${sourcePrefix}-concurrent-`],
      )
    ).rows.map((row) => row.personId);
    const rounds = 20;

    for (let round = 0; round < rounds; round += 1) {
      const writers = [people, [...people].reverse()].map(async (participantIds) => {
        const client = await databasePool().connect();
        try {
          await client.query('BEGIN');
          await advanceStatisticsDataVersions(client, { fixtureIds: [], participantIds });
          // Hold the locks briefly so the writers overlap.
          await client.query('SELECT pg_sleep(0.02)');
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      });
      await Promise.all(writers);
    }

    const final = await databasePool().connect();
    try {
      expect(await versions(final, people)).toEqual(
        new Map(people.map((participantId) => [participantId, rounds * 2])),
      );
    } finally {
      final.release();
    }
  });
});
