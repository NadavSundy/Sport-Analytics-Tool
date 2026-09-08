import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { executeQuery, type QueryExecutor } from '../../src/database';
import {
  listParticipantFixtures,
  type ParticipantFixtureListOptions,
  type ParticipantFixturePage,
  type ParticipantFixtureRecord,
} from '../../src/modules/participants/participant.repository';

interface PersonRow {
  personId: string;
}

interface IdRow {
  id: string;
}

const seedPath = resolve(__dirname, '../../../../database/seeds/matches/423788.json');
const sourceRef = `issue-410-423788-${process.pid}`;

/**
 * The superseded form of the participant-history statement, retained as the
 * equivalence oracle for issue #410.
 *
 * It differs from the shipped statement in `fixture_state` and nowhere else:
 * this derives `accepted_event_count` and `empty_standard_innings_ids` from two
 * correlated subqueries against `accepted_delivery`, where the shipped one
 * derives both from a single grouped pass. A `LEFT JOIN` and `SUM` do not have
 * the NULL behaviour of a scalar subquery and a `NOT EXISTS`, so the two forms
 * are compared row for row rather than reasoned about.
 *
 * This is deliberately a full copy rather than an assembly shared with the
 * repository. An oracle that shares the code under test proves nothing.
 */
async function legacyListParticipantFixtures(
  options: ParticipantFixtureListOptions,
  executor: QueryExecutor,
): Promise<ParticipantFixturePage> {
  const values: unknown[] = [options.participantId];
  const conditions: string[] = ['fs.person_id = $1::bigint'];

  if (options.after) {
    values.push(options.after.startDate);
    const dateParameter = values.length;
    values.push(options.after.fixtureId);
    const idParameter = values.length;
    conditions.push(
      `(f.start_date, f.fixture_id) < ($${dateParameter}::date, $${idParameter}::bigint)`,
    );
  }

  values.push(options.limit + 1);
  const limitParameter = values.length;

  const result = await executeQuery<ParticipantFixtureRecord>(
    executor,
    `
      WITH selected_fixture AS (
        SELECT
          f.fixture_id,
          f.competition_id,
          f.balls_per_over,
          f.scheduled_overs,
          f.missing_fields,
          f.season,
          f.match_type,
          f.team_type,
          f.gender,
          f.start_date,
          f.end_date,
          fs.team_id,
          fs.role
        FROM fixture_squad fs
        INNER JOIN fixture f
          ON f.fixture_id = fs.fixture_id
        INNER JOIN submission publication
          ON publication.submission_id = f.first_seen_in
         AND publication.status = 'accepted'
        WHERE ${conditions.join(' AND ')}
        ORDER BY f.start_date DESC, f.fixture_id DESC
        LIMIT $${limitParameter}
      ),
      accepted_delivery AS (
        SELECT d.*,
          i.fixture_id
        FROM delivery_current d
        JOIN innings i
          ON i.innings_id = d.innings_id
         AND i.is_super_over = false
        JOIN submission source_submission
          ON source_submission.submission_id = d.submission_id
         AND source_submission.status = 'accepted'
        WHERE i.fixture_id IN (SELECT fixture_id FROM selected_fixture)
      ),
      batting AS (
        SELECT
          d.fixture_id,
          SUM(d.runs_off_bat)::int AS runs_scored,
          COUNT(*) FILTER (WHERE d.extra_wides IS NULL)::int AS balls_faced,
          COUNT(*) FILTER (WHERE d.runs_off_bat = 4 AND NOT d.non_boundary)::int AS fours,
          COUNT(*) FILTER (WHERE d.runs_off_bat = 6 AND NOT d.non_boundary)::int AS sixes
        FROM accepted_delivery d
        WHERE d.striker_id = $1::bigint
        GROUP BY d.fixture_id
      ),
      bowling AS (
        SELECT
          d.fixture_id,
          SUM(
            d.runs_off_bat
            + COALESCE(d.extra_wides, 0)
            + COALESCE(d.extra_noballs, 0)
          )::int AS runs_conceded,
          COUNT(*) FILTER (
            WHERE d.extra_wides IS NULL AND d.extra_noballs IS NULL
          )::int AS legal_balls_bowled,
          COALESCE(SUM((
            SELECT COUNT(*)
            FROM delivery_wicket dw
            JOIN dismissal_kind dk ON dk.code = dw.kind
            WHERE dw.delivery_id = d.delivery_id
              AND dk.credits_bowler = true
          )), 0)::int AS wickets_taken
        FROM accepted_delivery d
        WHERE d.bowler_id = $1::bigint
        GROUP BY d.fixture_id
      ),
      fixture_state AS (
        SELECT
          sf.fixture_id,
          COUNT(i.innings_id)::int AS standard_innings_count,
          (
            SELECT COUNT(*)::int
            FROM accepted_delivery d
            WHERE d.fixture_id = sf.fixture_id
          ) AS accepted_event_count,
          COALESCE(
            ARRAY_AGG(i.innings_id::text ORDER BY i.ordinal) FILTER (
              WHERE i.innings_id IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM accepted_delivery d
                  WHERE d.innings_id = i.innings_id
                )
            ),
            ARRAY[]::text[]
          ) AS empty_standard_innings_ids
        FROM selected_fixture sf
        LEFT JOIN innings i
          ON i.fixture_id = sf.fixture_id
         AND i.is_super_over = false
        GROUP BY sf.fixture_id
      )
      SELECT
        sf.fixture_id::text AS "fixtureId",
        sf.competition_id::text AS "competitionId",
        c.name AS "competitionName",
        sf.balls_per_over AS "ballsPerOver",
        sf.scheduled_overs AS "scheduledOvers",
        sf.season AS "season",
        sf.match_type AS "matchType",
        sf.team_type AS "teamType",
        sf.gender AS "gender",
        to_char(sf.start_date, 'YYYY-MM-DD') AS "startDate",
        to_char(sf.end_date, 'YYYY-MM-DD') AS "endDate",
        sf.team_id::text AS "teamId",
        t.name AS "teamName",
        sf.role AS "role",
        sf.missing_fields AS "missingFields",
        state.standard_innings_count AS "standardInningsCount",
        state.accepted_event_count AS "acceptedEventCount",
        state.empty_standard_innings_ids AS "emptyStandardInningsIds",
        b.runs_scored AS "runsScored",
        b.balls_faced AS "ballsFaced",
        b.fours AS "fours",
        b.sixes AS "sixes",
        w.runs_conceded AS "runsConceded",
        w.legal_balls_bowled AS "legalBallsBowled",
        w.wickets_taken AS "wicketsTaken"
      FROM selected_fixture sf
      INNER JOIN team t
        ON t.team_id = sf.team_id
      LEFT JOIN competition c
        ON c.competition_id = sf.competition_id
      LEFT JOIN batting b
        ON b.fixture_id = sf.fixture_id
      LEFT JOIN bowling w
        ON w.fixture_id = sf.fixture_id
      INNER JOIN fixture_state state
        ON state.fixture_id = sf.fixture_id
      ORDER BY sf.start_date DESC, sf.fixture_id DESC
    `,
    values,
  );

  return {
    records: result.rows.slice(0, options.limit),
    hasMore: result.rows.length > options.limit,
  };
}

describe.sequential('participant fixture history database integration', () => {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  let referenceFixtureId: string | undefined;
  let mccullumId: string | undefined;
  let teamId: string | undefined;
  let acceptedSubmissionId: string | undefined;

  // Fixtures constructed for the completeness paths, newest first by start date.
  let emptyInningsFixtureId: string | undefined;
  let rejectedEventsFixtureId: string | undefined;
  let noInningsFixtureId: string | undefined;
  let addedInningsId: string | undefined;

  function databaseClient(): PoolClient {
    if (!client) {
      throw new Error('Test database client has not been initialised.');
    }
    return client;
  }

  function required(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`${name} was not prepared.`);
    }
    return value;
  }

  /**
   * A fixture carrying the reference fixture's competition, team and squad, so
   * that only its innings and delivery state differ from the ingested one.
   */
  async function createFixture(
    executor: PoolClient,
    suffix: string,
    startDate: string,
    submissionId: string,
  ): Promise<string> {
    const inserted = await executeQuery<IdRow>(
      executor,
      `
        INSERT INTO fixture (
          source_ref, competition_id, season, match_type, team_type, gender, balls_per_over,
          start_date, end_date, outcome, source_version, source_revision, first_seen_in
        )
        SELECT
          $2, f.competition_id, f.season, f.match_type, f.team_type, f.gender, f.balls_per_over,
          $3::date, $3::date, 'no result', f.source_version, f.source_revision, $4::bigint
        FROM fixture f
        WHERE f.fixture_id = $1::bigint
        RETURNING fixture_id::text AS id
      `,
      [
        required(referenceFixtureId, 'referenceFixtureId'),
        `${sourceRef}-${suffix}`,
        startDate,
        submissionId,
      ],
    );
    const createdId = inserted.rows[0]?.id;
    if (!createdId) {
      throw new Error(`Could not create the ${suffix} fixture.`);
    }

    await executeQuery(
      executor,
      `INSERT INTO fixture_squad (fixture_id, person_id, team_id) VALUES ($1::bigint, $2::bigint, $3::bigint)`,
      [createdId, required(mccullumId, 'mccullumId'), required(teamId, 'teamId')],
    );

    return createdId;
  }

  async function addInnings(
    executor: PoolClient,
    fixtureId: string,
    ordinal: number,
    isSuperOver: boolean,
  ): Promise<string> {
    const inserted = await executeQuery<IdRow>(
      executor,
      `
        INSERT INTO innings (fixture_id, ordinal, batting_team_id, is_super_over)
        VALUES ($1::bigint, $2, $3::bigint, $4)
        RETURNING innings_id::text AS id
      `,
      [fixtureId, ordinal, required(teamId, 'teamId'), isSuperOver],
    );
    const createdId = inserted.rows[0]?.id;
    if (!createdId) {
      throw new Error('Could not create an innings.');
    }
    return createdId;
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
      referenceFixtureId = ingestion.fixtureId;

      const person = await executeQuery<PersonRow>(
        client,
        `SELECT person_id::text AS "personId" FROM person WHERE source_ref = $1`,
        ['b8a55852'],
      );
      mccullumId = person.rows[0]?.personId;

      const squad = await executeQuery<IdRow>(
        client,
        `SELECT team_id::text AS id FROM fixture_squad WHERE fixture_id = $1::bigint AND person_id = $2::bigint`,
        [referenceFixtureId, required(mccullumId, 'mccullumId')],
      );
      teamId = squad.rows[0]?.id;

      const publication = await executeQuery<IdRow>(
        client,
        `SELECT first_seen_in::text AS id FROM fixture WHERE fixture_id = $1::bigint`,
        [referenceFixtureId],
      );
      acceptedSubmissionId = publication.rows[0]?.id;

      // A standard innings carrying no accepted delivery, alongside two that do.
      // The reference fixture's own start date is 2010-02-28.
      emptyInningsFixtureId = await createFixture(
        client,
        'empty-innings',
        '2011-01-01',
        required(acceptedSubmissionId, 'acceptedSubmissionId'),
      );
      addedInningsId = await addInnings(client, emptyInningsFixtureId, 0, false);
      // A super-over innings that is equally empty, to prove the exclusion still
      // applies to the completeness fields and not only to the figures.
      await addInnings(client, emptyInningsFixtureId, 1, true);

      // Deliveries exist but their submission was rejected, so no accepted event
      // is visible. This is the case where the scalar subquery returned 0 and the
      // grouped pass must return 0 rather than NULL.
      const rejected = await executeQuery<IdRow>(
        client,
        `
          INSERT INTO submission (status, rejection_detail)
          VALUES ('rejected', '{"reason": "issue-410 fixture"}'::jsonb)
          RETURNING submission_id::text AS id
        `,
      );
      const rejectedSubmissionId = rejected.rows[0]?.id;
      if (!rejectedSubmissionId) {
        throw new Error('Could not create the rejected submission.');
      }
      rejectedEventsFixtureId = await createFixture(
        client,
        'rejected-events',
        '2012-01-01',
        required(acceptedSubmissionId, 'acceptedSubmissionId'),
      );
      const rejectedInningsId = await addInnings(client, rejectedEventsFixtureId, 0, false);
      await executeQuery(
        client,
        `
          INSERT INTO delivery (
            innings_id, over_number, position_in_over, innings_sequence, ball_number,
            striker_id, non_striker_id, bowler_id, runs_off_bat, runs_extras, runs_total,
            submission_id
          )
          SELECT
            $1::bigint, 0, 0, 0, '0.1',
            $2::bigint, other.person_id, other.person_id, 4, 0, 4,
            $3::bigint
          FROM person other
          WHERE other.person_id <> $2::bigint
          ORDER BY other.person_id
          LIMIT 1
        `,
        [rejectedInningsId, required(mccullumId, 'mccullumId'), rejectedSubmissionId],
      );

      // No standard innings at all: COUNT over the outer LEFT JOIN is 0 and the
      // join to the grouped counts has nothing to match.
      noInningsFixtureId = await createFixture(
        client,
        'no-innings',
        '2013-01-01',
        required(acceptedSubmissionId, 'acceptedSubmissionId'),
      );
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

  test('returns exactly what the superseded correlated form returned, at every page size', async () => {
    const executor = databaseClient();
    const participantId = required(mccullumId, 'mccullumId');

    for (const limit of [1, 2, 3, 4, 10]) {
      const current = await listParticipantFixtures({ participantId, limit }, executor);
      const legacy = await legacyListParticipantFixtures({ participantId, limit }, executor);

      expect(current.records, `limit ${limit}`).toEqual(legacy.records);
      expect(current.hasMore, `limit ${limit}`).toBe(legacy.hasMore);
    }
  });

  test('returns exactly what the superseded correlated form returned, across cursor pages', async () => {
    const executor = databaseClient();
    const participantId = required(mccullumId, 'mccullumId');

    let after: ParticipantFixtureListOptions['after'];
    const visited: string[] = [];

    // Four fixtures at a page size of one walks every cursor boundary, including
    // the final page whose hasMore is false.
    for (let page = 0; page < 4; page += 1) {
      const options: ParticipantFixtureListOptions = {
        participantId,
        limit: 1,
        ...(after ? { after } : {}),
      };
      const current = await listParticipantFixtures(options, executor);
      const legacy = await legacyListParticipantFixtures(options, executor);

      expect(current.records, `page ${page}`).toEqual(legacy.records);
      expect(current.hasMore, `page ${page}`).toBe(legacy.hasMore);

      const record = current.records[0];
      expect(record, `page ${page}`).toBeDefined();
      if (!record) {
        break;
      }
      visited.push(record.fixtureId);
      after = { startDate: record.startDate, fixtureId: record.fixtureId };
    }

    expect(visited).toEqual([
      required(noInningsFixtureId, 'noInningsFixtureId'),
      required(rejectedEventsFixtureId, 'rejectedEventsFixtureId'),
      required(emptyInningsFixtureId, 'emptyInningsFixtureId'),
      required(referenceFixtureId, 'referenceFixtureId'),
    ]);
  });

  test('reports a standard innings holding no accepted delivery', async () => {
    const executor = databaseClient();
    const page = await listParticipantFixtures(
      { participantId: required(mccullumId, 'mccullumId'), limit: 10 },
      executor,
    );
    const record = page.records.find((candidate) => candidate.fixtureId === emptyInningsFixtureId);

    // One standard innings and one super-over innings were added. Only the
    // standard one is counted or named.
    expect(record).toMatchObject({
      standardInningsCount: 1,
      acceptedEventCount: 0,
      emptyStandardInningsIds: [required(addedInningsId, 'addedInningsId')],
    });
  });

  test('reports zero accepted events when the only deliveries were rejected', async () => {
    const executor = databaseClient();
    const page = await listParticipantFixtures(
      { participantId: required(mccullumId, 'mccullumId'), limit: 10 },
      executor,
    );
    const record = page.records.find(
      (candidate) => candidate.fixtureId === rejectedEventsFixtureId,
    );

    // SUM over no matching grouped row is NULL, not zero. The count must still
    // be the number 0, because a null would be published as a missing figure
    // rather than as the NO_ACCEPTED_EVENTS warning.
    expect(record?.acceptedEventCount).toBe(0);
    expect(record?.acceptedEventCount).not.toBeNull();
    expect(record).toMatchObject({
      standardInningsCount: 1,
      acceptedEventCount: 0,
      runsScored: null,
      ballsFaced: null,
    });
    expect(record?.emptyStandardInningsIds).toHaveLength(1);
  });

  test('reports a fixture with no standard innings at all', async () => {
    const executor = databaseClient();
    const page = await listParticipantFixtures(
      { participantId: required(mccullumId, 'mccullumId'), limit: 10 },
      executor,
    );
    const record = page.records.find((candidate) => candidate.fixtureId === noInningsFixtureId);

    expect(record).toMatchObject({
      standardInningsCount: 0,
      acceptedEventCount: 0,
      emptyStandardInningsIds: [],
    });
  });

  test('still excludes the super over from the reference fixture figures', async () => {
    const executor = databaseClient();
    const page = await listParticipantFixtures(
      { participantId: required(mccullumId, 'mccullumId'), limit: 10 },
      executor,
    );
    const record = page.records.find((candidate) => candidate.fixtureId === referenceFixtureId);

    // Published figures for 423788 are recorded in
    // evidence/validation/423788-published-figures.md. Including the super over
    // would report 118 off 57.
    expect(record).toMatchObject({
      runsScored: 116,
      ballsFaced: 56,
      fours: 12,
      sixes: 8,
      standardInningsCount: 2,
      emptyStandardInningsIds: [],
    });
    expect(record?.acceptedEventCount).toBeGreaterThan(0);
  });
});
