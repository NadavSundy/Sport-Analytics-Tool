import { resolve } from 'node:path';

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { executeQuery, type QueryExecutor } from '../../src/database';
import { listParticipantFixtures } from '../../src/modules/participants/participant.repository';
import { deriveFixtureStatistics } from '../../src/modules/statistics/fixture-statistics.derivation';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';
import { loadParticipantAggregatesSource } from '../../src/modules/statistics/participant-aggregates.repository';
import { createParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';

/**
 * Season, competition-wide and career aggregate derivation against the
 * published reference fixture, under issue #285.
 *
 * Fixture 423788 is the reference case for super-over exclusion: the standard
 * innings were tied and the match was decided by a one-over eliminator, whose
 * deliveries are recorded as events. Published figures and the per-participant
 * inclusion deltas are in evidence/validation/423788-published-figures.md and
 * evidence/validation/issue-104-super-over-aggregates.md.
 *
 * Because this suite ingests a single match inside a transaction it rolls back,
 * a participant appearing only in that match has a career equal to their
 * published fixture figures. That is what makes the comparison meaningful: the
 * expected values come from the ESPNcricinfo scorecard, not from the file the
 * platform ingested.
 */

interface PersonRow {
  personId: string;
  displayName: string;
}

interface BowlerRow {
  personId: string;
}

interface DismissalCountRow {
  dismissals: number;
  credited: number;
}

const seedPath = resolve(__dirname, '../../../../database/seeds/matches/423788.json');
const sourceRef = `issue-285-423788-${process.pid}`;

/** Published scorecard figures for Brendon McCullum in this fixture. */
const publishedMcCullum = {
  runsScored: 116,
  ballsFaced: 56,
  fours: 12,
  sixes: 8,
  strikeRate: 207.14,
};

/** Published bowling figures for Tim Southee in this fixture. */
const publishedSouthee = {
  runsConceded: 44,
  wides: 1,
  noBalls: 0,
  legalBallsBowled: 24,
  wicketsTaken: 0,
  ballsPerOver: 6,
  oversBowled: '4.0',
  economyRate: 11,
};

/**
 * Counts the statements a repository issues.
 *
 * Issue #105 measured the fixture statistics endpoints at roughly 2,400 ms from
 * about thirteen sequential queries over a 173 ms link, for one fixture. The
 * count, not the elapsed time, is the property worth asserting: it is stable
 * across machines and it is what a per-fixture implementation would break.
 */
function countingExecutor(client: PoolClient): { executor: QueryExecutor; statements: string[] } {
  const statements: string[] = [];

  return {
    statements,
    executor: {
      query<Row extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: unknown[],
      ): Promise<QueryResult<Row>> {
        statements.push(text);
        return client.query<Row>(text, values);
      },
    },
  };
}

describe.sequential('participant aggregate statistics database integration', () => {
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

  async function person(sourceReference: string): Promise<PersonRow> {
    const result = await executeQuery<PersonRow>(
      databaseClient(),
      `
        SELECT
          person_id::text AS "personId",
          display_name AS "displayName"
        FROM person
        WHERE source_ref = $1
      `,
      [sourceReference],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Expected the published-scorecard player ${sourceReference} to be ingested.`);
    }

    return row;
  }

  // Exercised through the service so that the assertions cover the wiring the
  // endpoint uses, including the opaque season identifier it injects.
  async function aggregatesFor(participantId: string, executor?: QueryExecutor) {
    const service = createParticipantAggregatesService((id) =>
      loadParticipantAggregatesSource(id, executor ?? databaseClient()),
    );
    const aggregates = await service.getParticipantAggregates(participantId, {});
    if (!aggregates) {
      throw new Error(`Expected participant ${participantId} to exist.`);
    }

    return aggregates;
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

  test('gives a participant seen in one fixture the published figures at every level', async () => {
    const mccullum = await person('b8a55852');
    const aggregates = await aggregatesFor(mccullum.personId);

    expect(aggregates.participantName).toBe('BB McCullum');
    expect(aggregates.status).toBe('complete');
    expect(aggregates.scope).toEqual({ superOversIncluded: false });
    expect(aggregates.statistics.map((statistic) => statistic.scope)).toEqual([
      'season',
      'competition',
      'career',
    ]);

    for (const statistic of aggregates.statistics) {
      expect(statistic.participantId).toBe(mccullum.personId);
      expect(statistic.fixtureCount).toBe(1);
      expect(statistic.batting).toEqual(publishedMcCullum);
      // He did not bowl. A zero would misrepresent that as an economy of none.
      expect(statistic.bowling).toBeNull();
    }

    const season = aggregates.statistics.find((statistic) => statistic.scope === 'season');
    expect(season).toMatchObject({
      statisticCode: 'participant_season',
      season: '2009/10',
      competitionName: 'Australia in New Zealand T20I Series',
    });
    expect(season?.scope === 'season' ? season.seasonId : null).toMatch(/^season_/);

    expect(
      aggregates.statistics.find((statistic) => statistic.scope === 'competition'),
    ).toMatchObject({
      statisticCode: 'participant_competition',
      competitionName: 'Australia in New Zealand T20I Series',
    });

    expect(aggregates.statistics.find((statistic) => statistic.scope === 'career')).toMatchObject({
      statisticCode: 'participant_career',
    });
  });

  test('holds the super-over exclusion at aggregate level: 116 runs and not 118', async () => {
    // The eliminator adds 2 runs from 1 ball to McCullum, already asserted at
    // fixture level in fixture-statistics.database.test.ts. Issue #104 excludes
    // it, so the same must be true once the figures are rolled up. This is the
    // assertion that proves the rollup respects that decision rather than
    // reaching past the standard-innings boundary.
    const mccullum = await person('b8a55852');
    const excluded = await executeQuery<{ runs: number; balls: number }>(
      databaseClient(),
      `
        SELECT
          COALESCE(SUM(d.runs_off_bat), 0)::int AS runs,
          COUNT(*) FILTER (WHERE d.extra_wides IS NULL)::int AS balls
        FROM delivery d
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id = $1
          AND i.is_super_over = true
          AND d.striker_id = $2
      `,
      [ingestedFixtureId(), mccullum.personId],
    );
    expect(excluded.rows[0]).toEqual({ runs: 2, balls: 1 });

    const aggregates = await aggregatesFor(mccullum.personId);
    const career = aggregates.statistics.find((statistic) => statistic.scope === 'career');

    expect(career?.batting?.runsScored).toBe(116);
    expect(career?.batting?.runsScored).not.toBe(118);
    expect(career?.batting?.ballsFaced).toBe(56);
    expect(career?.batting?.ballsFaced).not.toBe(57);
  });

  test('agrees with the fixture derivation and the fixture history for the same player', async () => {
    const mccullum = await person('b8a55852');
    const executor = databaseClient();

    const fixtureSource = await loadFixtureStatisticsSource(ingestedFixtureId(), executor);
    if (!fixtureSource) {
      throw new Error('Expected the ingested fixture to be available for derivation.');
    }
    const fixtureStatistic = deriveFixtureStatistics(fixtureSource).statistics.find(
      (statistic) =>
        statistic.scope === 'participant' && statistic.participantId === mccullum.personId,
    );
    const history = await listParticipantFixtures(
      { participantId: mccullum.personId, limit: 10 },
      executor,
    );
    const historyRecord = history.records.find(
      (record) => record.fixtureId === ingestedFixtureId(),
    );
    const career = (await aggregatesFor(mccullum.personId)).statistics.find(
      (statistic) => statistic.scope === 'career',
    );

    // Three independent paths through the same events must not disagree.
    expect(fixtureStatistic?.scope === 'participant' ? fixtureStatistic.batting : null).toEqual(
      publishedMcCullum,
    );
    expect({
      runsScored: historyRecord?.runsScored,
      ballsFaced: historyRecord?.ballsFaced,
      fours: historyRecord?.fours,
      sixes: historyRecord?.sixes,
    }).toEqual({
      runsScored: publishedMcCullum.runsScored,
      ballsFaced: publishedMcCullum.ballsFaced,
      fours: publishedMcCullum.fours,
      sixes: publishedMcCullum.sixes,
    });
    expect(career?.batting).toEqual(publishedMcCullum);
  });

  test('counts legal balls from delivery rows rather than assuming six an over', async () => {
    const southee = await person('13c35c9e');
    const aggregates = await aggregatesFor(southee.personId);

    for (const statistic of aggregates.statistics) {
      expect(statistic.bowling).toEqual(publishedSouthee);
    }

    // The eliminator would otherwise add 6 runs, six legal balls and a wicket.
    const excluded = await executeQuery<{ legalBalls: number; wickets: number }>(
      databaseClient(),
      `
        SELECT
          COUNT(*) FILTER (
            WHERE d.extra_wides IS NULL AND d.extra_noballs IS NULL
          )::int AS "legalBalls",
          COALESCE(SUM((
            SELECT COUNT(*)
            FROM delivery_wicket dw
            JOIN dismissal_kind dk ON dk.code = dw.kind
            WHERE dw.delivery_id = d.delivery_id
              AND dk.credits_bowler = true
          )), 0)::int AS wickets
        FROM delivery d
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id = $1
          AND i.is_super_over = true
          AND d.bowler_id = $2
      `,
      [ingestedFixtureId(), southee.personId],
    );
    expect(excluded.rows[0]).toEqual({ legalBalls: 6, wickets: 1 });
  });

  test('credits a bowler only for dismissals flagged credits_bowler', async () => {
    // Ten dismissals occur in the standard innings; the run outs of Ross Taylor
    // and Michael Clarke are not the bowler's. The published record puts the
    // credited total at eight, and hit wicket is among them.
    const dismissals = await executeQuery<DismissalCountRow>(
      databaseClient(),
      `
        SELECT
          COUNT(*)::int AS dismissals,
          COUNT(*) FILTER (WHERE dk.credits_bowler)::int AS credited
        FROM delivery_wicket dw
        JOIN dismissal_kind dk ON dk.code = dw.kind
        JOIN delivery d ON d.delivery_id = dw.delivery_id
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id = $1
          AND i.is_super_over = false
      `,
      [ingestedFixtureId()],
    );
    expect(dismissals.rows[0]).toEqual({ dismissals: 10, credited: 8 });

    const bowlers = await executeQuery<BowlerRow>(
      databaseClient(),
      `
        SELECT DISTINCT d.bowler_id::text AS "personId"
        FROM delivery_current d
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id = $1
          AND i.is_super_over = false
      `,
      [ingestedFixtureId()],
    );

    let creditedAcrossCareers = 0;
    for (const bowler of bowlers.rows) {
      const career = (await aggregatesFor(bowler.personId)).statistics.find(
        (statistic) => statistic.scope === 'career',
      );
      creditedAcrossCareers += career?.bowling?.wicketsTaken ?? 0;
    }

    expect(creditedAcrossCareers).toBe(8);
  });

  test('reconciles every batter career against the innings run totals', async () => {
    const strikers = await executeQuery<BowlerRow>(
      databaseClient(),
      `
        SELECT DISTINCT d.striker_id::text AS "personId"
        FROM delivery_current d
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id = $1
          AND i.is_super_over = false
      `,
      [ingestedFixtureId()],
    );

    let runsAcrossCareers = 0;
    for (const striker of strikers.rows) {
      const career = (await aggregatesFor(striker.personId)).statistics.find(
        (statistic) => statistic.scope === 'career',
      );
      runsAcrossCareers += career?.batting?.runsScored ?? 0;
    }

    // Published innings totals are 214 and 214 including 18 and 6 extras, so the
    // runs off the bat across both standard innings are 196 and 208.
    expect(runsAcrossCareers).toBe(196 + 208);
  });

  test('groups by person identifier and not by display name', async () => {
    const mccullum = await person('b8a55852');
    const impostor = await executeQuery<PersonRow>(
      databaseClient(),
      `
        INSERT INTO person (source_ref, display_name)
        VALUES ($1, $2)
        RETURNING person_id::text AS "personId", display_name AS "displayName"
      `,
      [`${sourceRef}-namesake`, mccullum.displayName],
    );

    const namesake = impostor.rows[0];
    if (!namesake) {
      throw new Error('Expected the namesake person row to be inserted.');
    }

    // Two people, one name. §10 records 166 such names in the corpus, so a
    // rollup keyed on the name would merge two careers into one.
    expect(namesake.displayName).toBe(mccullum.displayName);
    expect(namesake.personId).not.toBe(mccullum.personId);

    const namesakeAggregates = await aggregatesFor(namesake.personId);
    expect(namesakeAggregates.statistics).toEqual([]);
    expect(namesakeAggregates.warnings.map((warning) => warning.code)).toEqual([
      'NO_ACCEPTED_EVENTS',
    ]);

    const original = await aggregatesFor(mccullum.personId);
    expect(
      original.statistics.find((statistic) => statistic.scope === 'career')?.batting?.runsScored,
    ).toBe(116);
  });

  test('derives every level in a bounded number of statements', async () => {
    const mccullum = await person('b8a55852');
    const { executor, statements } = countingExecutor(databaseClient());

    const startedAt = process.hrtime.bigint();
    const aggregates = await aggregatesFor(mccullum.personId, executor);
    const elapsedMilliseconds = Number(process.hrtime.bigint() - startedAt) / 1e6;

    // One participant lookup and one grouped derivation, whatever the number of
    // fixtures played. A per-fixture implementation would grow with the career.
    expect(statements).toHaveLength(2);
    expect(aggregates.statistics).toHaveLength(3);

    console.log(
      `Participant aggregate derivation: ${statements.length} statements in ${elapsedMilliseconds.toFixed(1)} ms.`,
    );
  });

  test('reports an unknown participant as absent rather than empty', async () => {
    const missing = await loadParticipantAggregatesSource('999999999', databaseClient());

    expect(missing).toBeNull();
  });
});
