import { randomUUID } from 'node:crypto';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { createBatchRepository } from '../../src/modules/batches/batch.repository';
import { listParticipantFixtures } from '../../src/modules/participants/participant.repository';
import { createProvenanceRepository } from '../../src/modules/provenance/provenance.repository';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';
import { loadLeaderboardSource } from '../../src/modules/statistics/leaderboards.repository';

/**
 * Issue #708. Every public read path inner-joins the fixture to the submission
 * that first carried it:
 *
 *     JOIN submission publication ON publication.submission_id = f.first_seen_in
 *
 * `fixture.first_seen_in` is nullable. A fixture created by the reviewer
 * canonical-fixture path (#584) leaves it null, so until batch publication sets
 * it, the fixture and everything derived from it is absent from fixture
 * statistics, participant history, leaderboards and provenance.
 *
 * Three tests, doing different jobs:
 *
 *   1. `null first_seen_in hides a fixture from every public read` pins the
 *      mechanism. It seeds the column directly and holds before and after the
 *      fix, because a fixture that was never published still has nothing to
 *      point at.
 *   2. `publishing into a reviewer-created fixture makes it publicly visible`
 *      is the regression net. It publishes through the real chunk loop and
 *      fails until publication sets the column.
 *   3. `publication does not overwrite an existing first_seen_in` holds the
 *      line for existing known-fixture ingestion.
 */

const sourcePrefix = `reviewer-fixture-visibility-${process.pid}`;
const checksum = 'a'.repeat(64);

interface SeededFixture {
  accountId: string;
  competitionId: string;
  fixtureId: string;
  inningsId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  season: string;
}

interface Visibility {
  fixtureStatistics: boolean;
  participantHistory: boolean;
  leaderboard: boolean;
  provenanceContributorSources: boolean;
}

describe.sequential('issue #708: visibility of reviewer-created fixtures', () => {
  let pool: Pool | undefined;

  function databasePool(): Pool {
    if (!pool) throw new Error('Test database pool has not been initialised.');
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
    await pool?.end();
  });

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
   * Seeds a competition, two teams, a fixture, its innings and a three-person
   * squad. `firstSeenIn` chooses the creation path being imitated: an accepted
   * submission is what the corpus importer records, and null is what the
   * reviewer canonical-fixture path leaves behind.
   */
  async function seedFixture(
    client: PoolClient,
    label: string,
    firstSeenIn: 'accepted-submission' | 'null',
  ): Promise<SeededFixture> {
    const key = `${sourcePrefix}-${label}-${randomUUID().slice(0, 8)}`;
    const one = async <Row extends Record<string, string>>(text: string, values: unknown[]) =>
      (await client.query<Row>(text, values)).rows[0]!;

    const { accountId } = await one<{ accountId: string }>(
      `INSERT INTO app_user (
         auth_provider, auth_subject, display_name, application_role, submitter_approval_state
       )
       VALUES ('test', $1, 'Issue 708 Test', 'submitter', 'approved')
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

    const { submissionId } = await one<{ submissionId: string }>(
      `INSERT INTO submission (submitted_by, status) VALUES ($1::bigint, 'accepted')
       RETURNING submission_id::text AS "submissionId"`,
      [accountId],
    );

    const season = `${key}-season`;
    const { fixtureId } = await one<{ fixtureId: string }>(
      `INSERT INTO fixture (
         source_ref, competition_id, season, match_type, team_type, gender, balls_per_over,
         start_date, end_date, outcome, source_version, source_revision, first_seen_in
       )
       VALUES ($1, $2::bigint, $3, 'T20', 'club', 'mixed', 6, CURRENT_DATE, CURRENT_DATE,
               'tie', '1.0', 1, $4)
       RETURNING fixture_id::text AS "fixtureId"`,
      [
        `${key}-fixture`,
        competitionId,
        season,
        firstSeenIn === 'accepted-submission' ? submissionId : null,
      ],
    );
    await client.query(
      `INSERT INTO fixture_team (fixture_id, team_id, ordinal) VALUES ($1, $2, 1), ($1, $3, 2)`,
      [fixtureId, battingTeamId, bowlingTeamId],
    );
    const { inningsId } = await one<{ inningsId: string }>(
      `INSERT INTO innings (fixture_id, ordinal, batting_team_id)
       VALUES ($1::bigint, 0, $2::bigint)
       RETURNING innings_id::text AS "inningsId"`,
      [fixtureId, battingTeamId],
    );

    const insertPerson = async (role: string) =>
      (
        await one<{ personId: string }>(
          `INSERT INTO person (source_ref, display_name) VALUES ($1, $1)
           RETURNING person_id::text AS "personId"`,
          [`${key}-${role}`],
        )
      ).personId;
    const strikerId = await insertPerson('striker');
    const nonStrikerId = await insertPerson('non-striker');
    const bowlerId = await insertPerson('bowler');
    for (const [personId, teamId] of [
      [strikerId, battingTeamId],
      [nonStrikerId, battingTeamId],
      [bowlerId, bowlingTeamId],
    ] as const) {
      await client.query(
        `INSERT INTO fixture_squad (fixture_id, person_id, team_id)
         VALUES ($1::bigint, $2::bigint, $3::bigint)`,
        [fixtureId, personId, teamId],
      );
    }

    return {
      accountId,
      competitionId,
      fixtureId,
      inningsId,
      strikerId,
      nonStrikerId,
      bowlerId,
      season,
    };
  }

  /** Writes one delivery directly, without going through batch publication. */
  async function seedDeliveryDirectly(client: PoolClient, fixture: SeededFixture): Promise<void> {
    const existing = await client.query<{ submissionId: string | null }>(
      `SELECT first_seen_in::text AS "submissionId" FROM fixture WHERE fixture_id = $1::bigint`,
      [fixture.fixtureId],
    );
    const submissionId =
      existing.rows[0]?.submissionId ??
      (
        await client.query<{ submissionId: string }>(
          `INSERT INTO submission (submitted_by, status) VALUES ($1::bigint, 'accepted')
           RETURNING submission_id::text AS "submissionId"`,
          [fixture.accountId],
        )
      ).rows[0]!.submissionId;

    await client.query(
      `INSERT INTO delivery (
         innings_id, over_number, position_in_over, innings_sequence, ball_number,
         striker_id, non_striker_id, bowler_id, runs_off_bat, runs_extras, runs_total, submission_id
       )
       VALUES ($1::bigint, 0, 0, 1, '0.1', $2::bigint, $3::bigint, $4::bigint, 4, 0, 4, $5::bigint)`,
      [fixture.inningsId, fixture.strikerId, fixture.nonStrikerId, fixture.bowlerId, submissionId],
    );
  }

  /** Publishes one accepted delivery through the real batch publication path. */
  async function publishThroughBatch(client: PoolClient, fixture: SeededFixture): Promise<void> {
    const repository = createBatchRepository(client);
    const batch = await repository.createBatch({
      batchReference: randomUUID(),
      submitterId: fixture.accountId,
      competitionId: fixture.competitionId,
      idempotencyKey: `${sourcePrefix}-${randomUUID()}`,
      source: { checksum, uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
      state: 'publishing',
    });
    await repository.insertBatchItems(batch.batchId, [
      {
        ordinal: 0,
        inningsId: fixture.inningsId,
        overNumber: 0,
        positionInOver: 0,
        sourceIdentity: `${sourcePrefix}:delivery:${randomUUID()}`,
        state: 'accepted',
        payload: {
          sequenceNumber: 1,
          ballNumber: '0.1',
          strikerId: fixture.strikerId,
          nonStrikerId: fixture.nonStrikerId,
          bowlerId: fixture.bowlerId,
          runs: { offBat: 4, extras: 0, total: 4, nonBoundary: false },
          extras: {},
          wickets: [],
        },
      },
    ]);
    const result = await repository.publishAcceptedItems(batch.batchId, 'worker-issue-708');
    expect(result.published).toBe(1);
  }

  async function visibility(client: PoolClient, fixture: SeededFixture): Promise<Visibility> {
    const statistics = await loadFixtureStatisticsSource(fixture.fixtureId, client);
    const history = await listParticipantFixtures(
      { participantId: fixture.strikerId, limit: 50 },
      client,
    );
    const leaderboard = await loadLeaderboardSource(
      { competitionId: fixture.competitionId, season: null },
      'most_runs',
      10,
      client,
    );
    // `listParticipantContributorSources` is one of the two provenance reads
    // that join through `first_seen_in`; `findFixtureCompetition` does not, so
    // it would not exercise this at all.
    const provenance = createProvenanceRepository({
      query: (text: string, values?: unknown[]) => client.query(text, values),
    } as unknown as Pool);
    const contributors = await provenance.listParticipantContributorSources(
      fixture.strikerId,
      { scope: 'career', metric: 'runsScored' } as never,
      10,
    );

    return {
      fixtureStatistics: statistics !== null,
      participantHistory: history.records.some(
        (record) => String(record.fixtureId) === fixture.fixtureId,
      ),
      leaderboard: (leaderboard?.rows ?? []).some(
        (row) => String(row.participantId) === fixture.strikerId,
      ),
      provenanceContributorSources: contributors.length > 0,
    };
  }

  const visibleEverywhere: Visibility = {
    fixtureStatistics: true,
    participantHistory: true,
    leaderboard: true,
    provenanceContributorSources: true,
  };
  const visibleNowhere: Visibility = {
    fixtureStatistics: false,
    participantHistory: false,
    leaderboard: false,
    provenanceContributorSources: false,
  };

  test('null first_seen_in hides a fixture from every public read', async () => {
    await withRolledBackTransaction(async (client) => {
      const imported = await seedFixture(client, 'imported', 'accepted-submission');
      const reviewerCreated = await seedFixture(client, 'reviewer', 'null');
      await seedDeliveryDirectly(client, imported);
      await seedDeliveryDirectly(client, reviewerCreated);

      // The control. If this fails the seed is wrong, not the behaviour.
      expect(await visibility(client, imported)).toEqual(visibleEverywhere);

      // Two fixtures identical but for `first_seen_in`, so any difference is
      // attributable to that column alone.
      expect(await visibility(client, reviewerCreated)).toEqual(visibleNowhere);
    });
  }, 60_000);

  test('publishing into a reviewer-created fixture makes it publicly visible', async () => {
    await withRolledBackTransaction(async (client) => {
      const fixture = await seedFixture(client, 'published', 'null');
      expect(await visibility(client, fixture)).toEqual(visibleNowhere);

      await publishThroughBatch(client, fixture);

      const { rows } = await client.query<{ firstSeenIn: string | null }>(
        `SELECT first_seen_in::text AS "firstSeenIn" FROM fixture WHERE fixture_id = $1::bigint`,
        [fixture.fixtureId],
      );
      expect(rows[0]?.firstSeenIn ?? null).not.toBeNull();

      expect(await visibility(client, fixture)).toEqual(visibleEverywhere);
    });
  }, 60_000);

  test('publication does not overwrite an existing first_seen_in', async () => {
    await withRolledBackTransaction(async (client) => {
      const fixture = await seedFixture(client, 'imported-republished', 'accepted-submission');
      const read = async () =>
        (
          await client.query<{ firstSeenIn: string }>(
            `SELECT first_seen_in::text AS "firstSeenIn" FROM fixture WHERE fixture_id = $1::bigint`,
            [fixture.fixtureId],
          )
        ).rows[0]!.firstSeenIn;

      const before = await read();
      await publishThroughBatch(client, fixture);

      // An imported fixture keeps the submission that first carried it, so
      // existing known-fixture ingestion is unchanged.
      expect(await read()).toBe(before);
    });
  }, 60_000);
});
