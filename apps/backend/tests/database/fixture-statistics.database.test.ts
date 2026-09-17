import { resolve } from 'node:path';
import { advanceFixtureStatisticsCacheVersions } from '@sport-analytics/batch-processing';
import { fixtureStatisticsSchema } from '@sport-analytics/contracts';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { withExplicitZeroExtras } from './explicit-zero-extras';
import { executeQuery } from '../../src/database';
import {
  listCompetitorsForFixtures,
  listParticipantFixtures,
} from '../../src/modules/participants/participant.repository';
import { createFixtureStatisticsCache } from '../../src/modules/statistics/fixture-statistics.cache';
import { deriveFixtureStatistics } from '../../src/modules/statistics/fixture-statistics.derivation';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';
import { createFixtureStatisticsService } from '../../src/modules/statistics/fixture-statistics.service';

interface InningsScopeRow {
  ordinal: number;
  isSuperOver: boolean;
}

interface PersonRow {
  personId: string;
}

interface BattingDeltaRow {
  runs: number;
  balls: number;
}

interface BowlingDeltaRow {
  runsConceded: number;
  legalBalls: number;
  wickets: number;
}

const seedPath = withExplicitZeroExtras(
  resolve(__dirname, '../../../../database/seeds/matches/423788.json'),
);
const miscountedSeedPath = withExplicitZeroExtras(
  resolve(__dirname, '../../../../database/seeds/matches/1462921.json'),
);
const sourceRef = `issue-104-423788-${process.pid}`;
const miscountedSourceRef = `issue-631-1462921-${process.pid}`;

describe.sequential('fixture statistics database integration', () => {
  let pool: Pool | undefined;
  let client: PoolClient | undefined;
  let fixtureId: string | undefined;
  let miscountedFixtureId: string | undefined;

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
      const miscountedIngestion = await ingestMatchData(client, miscountedSeedPath, {
        sourceRef: miscountedSourceRef,
      });
      miscountedFixtureId = miscountedIngestion.fixtureId;
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

  test('matches the published standard scorecard while excluding super-over contributions', async () => {
    // Published sources and the expected inclusion deltas are recorded in
    // evidence/validation/issue-104-super-over-aggregates.md.
    const executor = databaseClient();
    const currentFixtureId = ingestedFixtureId();
    const rawInnings = await executeQuery<InningsScopeRow>(
      executor,
      `
        SELECT
          ordinal,
          is_super_over AS "isSuperOver"
        FROM innings
        WHERE fixture_id = $1
        ORDER BY ordinal ASC
      `,
      [currentFixtureId],
    );
    expect(rawInnings.rows).toEqual([
      { ordinal: 0, isSuperOver: false },
      { ordinal: 1, isSuperOver: false },
      { ordinal: 2, isSuperOver: true },
      { ordinal: 3, isSuperOver: true },
    ]);

    const source = await loadFixtureStatisticsSource(currentFixtureId, executor);
    expect(source).not.toBeNull();
    if (!source) {
      throw new Error('Expected the ingested fixture to be available for derivation.');
    }

    const result = deriveFixtureStatistics(source, {
      includeContributors: true,
    });
    expect(source.innings).toHaveLength(2);
    expect(source.innings.map((innings) => innings.battingCompetitorName)).toEqual([
      'New Zealand',
      'Australia',
    ]);
    expect(result.scope).toEqual({ superOversIncluded: false });
    expect(
      result.statistics.flatMap((statistic) =>
        statistic.scope === 'innings'
          ? [
              {
                inningsOrdinal: statistic.inningsOrdinal,
                totalRuns: statistic.metrics.totalRuns,
                wicketsLost: statistic.metrics.wicketsLost,
                legalBalls: statistic.metrics.legalBalls,
                overs: statistic.metrics.overs,
                runRate: statistic.metrics.runRate,
                extras: statistic.metrics.extras,
              },
            ]
          : [],
      ),
    ).toEqual([
      {
        inningsOrdinal: 0,
        totalRuns: 214,
        wicketsLost: 6,
        legalBalls: 120,
        overs: '20.0',
        runRate: 10.7,
        extras: {
          total: 18,
          wides: 5,
          noBalls: 1,
          byes: 0,
          legByes: 12,
          penaltyRuns: 0,
        },
      },
      {
        inningsOrdinal: 1,
        totalRuns: 214,
        wicketsLost: 4,
        legalBalls: 120,
        overs: '20.0',
        runRate: 10.7,
        extras: {
          total: 6,
          wides: 2,
          noBalls: 3,
          byes: 0,
          legByes: 1,
          penaltyRuns: 0,
        },
      },
    ]);

    const people = await executeQuery<PersonRow>(
      executor,
      `
        SELECT person_id::text AS "personId"
        FROM person
        WHERE source_ref = ANY($1::text[])
        ORDER BY source_ref ASC
      `,
      [['13c35c9e', 'b8a55852']],
    );
    const [southee, mccullum] = people.rows;
    if (!southee || !mccullum) {
      throw new Error('Expected the published-scorecard players to be ingested.');
    }

    const mccullumStatistic = result.statistics.find(
      (statistic) =>
        statistic.scope === 'participant' && statistic.participantId === mccullum.personId,
    );
    expect(mccullumStatistic).toMatchObject({
      participantName: 'BB McCullum',
      competitorName: 'New Zealand',
      batting: {
        runsScored: 116,
        ballsFaced: 56,
        strikeRate: 207.14,
        fours: 12,
        sixes: 8,
      },
    });

    const southeeStatistic = result.statistics.find(
      (statistic) =>
        statistic.scope === 'participant' && statistic.participantId === southee.personId,
    );
    expect(southeeStatistic).toMatchObject({
      participantName: 'TG Southee',
      competitorName: 'New Zealand',
      bowling: {
        runsConceded: 44,
        wides: 1,
        noBalls: 0,
        legalBallsBowled: 24,
        oversBowled: '4.0',
        economyRate: 11,
        wicketsTaken: 0,
      },
    });

    const mccullumHistory = await listParticipantFixtures(
      { participantId: mccullum.personId, limit: 10 },
      executor,
    );
    const mccullumFixture = mccullumHistory.records.find(
      (record) => record.fixtureId === currentFixtureId,
    );
    expect(mccullumFixture).toMatchObject({
      runsScored: 116,
      ballsFaced: 56,
      fours: 12,
      sixes: 8,
      missingFields: source.missingFields,
      standardInningsCount: 2,
      acceptedEventCount: source.events.length,
      emptyStandardInningsIds: [],
    });

    const southeeHistory = await listParticipantFixtures(
      { participantId: southee.personId, limit: 10 },
      executor,
    );
    expect(
      southeeHistory.records.find((record) => record.fixtureId === currentFixtureId),
    ).toMatchObject({
      runsConceded: 44,
      legalBallsBowled: 24,
      wicketsTaken: 0,
    });

    const readableCompetitors = await listCompetitorsForFixtures([currentFixtureId], executor);
    expect(readableCompetitors).toHaveLength(2);
    expect(readableCompetitors.every((competitor) => competitor.name.length > 0)).toBe(true);

    const mccullumSuperOver = await executeQuery<BattingDeltaRow>(
      executor,
      `
        SELECT
          COALESCE(SUM(d.runs_off_bat), 0)::int AS runs,
          COUNT(*) FILTER (WHERE COALESCE(d.extra_wides, 0) = 0)::int AS balls
        FROM delivery d
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id = $1
          AND i.is_super_over = true
          AND d.striker_id = $2
      `,
      [currentFixtureId, mccullum.personId],
    );
    expect(mccullumSuperOver.rows[0]).toEqual({ runs: 2, balls: 1 });

    const southeeSuperOver = await executeQuery<BowlingDeltaRow>(
      executor,
      `
        WITH super_over_delivery AS (
          SELECT
            d.*,
            (
              SELECT COUNT(*)::int
              FROM delivery_wicket dw
              JOIN dismissal_kind dk ON dk.code = dw.kind
              WHERE dw.delivery_id = d.delivery_id
                AND dk.credits_bowler = true
            ) AS credited_wickets
          FROM delivery d
          JOIN innings i ON i.innings_id = d.innings_id
          WHERE i.fixture_id = $1
            AND i.is_super_over = true
            AND d.bowler_id = $2
        )
        SELECT
          COALESCE(
            SUM(runs_off_bat + COALESCE(extra_wides, 0) + COALESCE(extra_noballs, 0)),
            0
          )::int AS "runsConceded",
          COUNT(*) FILTER (
            WHERE COALESCE(extra_wides, 0) = 0 AND COALESCE(extra_noballs, 0) = 0
          )::int AS "legalBalls",
          COALESCE(SUM(credited_wickets), 0)::int AS wickets
        FROM super_over_delivery
      `,
      [currentFixtureId, southee.personId],
    );
    expect(southeeSuperOver.rows[0]).toEqual({
      runsConceded: 6,
      legalBalls: 6,
      wickets: 1,
    });

    expect(result.outcome).toMatchObject({
      kind: 'tie',
      winnerCompetitorId: null,
      winnerCompetitorName: null,
      eliminatorCompetitorName: 'New Zealand',
    });
    expect(result.outcome.eliminatorCompetitorId).not.toBeNull();

    const inningsStatistic = result.statistics.find(
      (statistic) => statistic.scope === 'innings' && statistic.inningsOrdinal === 0,
    );

    if (!inningsStatistic || inningsStatistic.scope !== 'innings') {
      throw new Error('Expected the first standard innings statistic.');
    }

    expect(inningsStatistic.competitorName).toBe('New Zealand');
    expect(inningsStatistic.contributingEvents?.length).toBeGreaterThan(0);

    for (const event of inningsStatistic.contributingEvents ?? []) {
      expect(event.strikerParticipantName.length).toBeGreaterThan(0);
      expect(event.bowlerParticipantName.length).toBeGreaterThan(0);
    }
  });

  test('preserves a reference five-ball miscount when presenting innings progress', async () => {
    if (!miscountedFixtureId) {
      throw new Error('Expected the miscounted-over reference fixture to be ingested.');
    }
    const source = await loadFixtureStatisticsSource(miscountedFixtureId, databaseClient());
    expect(source).not.toBeNull();
    expect(source?.innings[0]?.miscountedOvers).toEqual([{ overNumber: 16, balls: 5 }]);

    const firstInnings = deriveFixtureStatistics(source!).statistics.find(
      (statistic) => statistic.scope === 'innings' && statistic.inningsOrdinal === 0,
    );
    expect(firstInnings?.scope === 'innings' ? firstInnings.metrics : null).toMatchObject({
      legalBalls: 107,
      overs: '18.0',
    });
  });

  // The cache-aside path was previously only exercised through an injected
  // fake, so its SQL, its cold-miss fall-through, and the shape of the value a
  // hit returns to the public contract were never executed against a database.
  test('serves the same published contract from a cold cache miss and from a hit', async () => {
    const executor = databaseClient();
    const currentFixtureId = ingestedFixtureId();
    const cache = createFixtureStatisticsCache(executor);

    const coldRead = await cache.read(currentFixtureId);
    expect(coldRead).not.toBeNull();
    // A miss must report the authoritative version and no value, so that the
    // caller derives rather than publishing an empty result.
    expect(coldRead?.value).toBeNull();

    const derivations: string[] = [];
    const service = createFixtureStatisticsService(async (id) => {
      derivations.push(id);
      return await loadFixtureStatisticsSource(id, executor);
    }, cache);

    const missResponse = await service.getFixtureStatistics(currentFixtureId, {
      includeContributors: false,
    });
    const hitResponse = await service.getFixtureStatistics(currentFixtureId, {
      includeContributors: false,
    });

    expect(derivations).toEqual([currentFixtureId]);
    expect(missResponse).not.toBeNull();

    // The value a hit returns has been through jsonb, so assert the published
    // contract against it rather than assuming the round trip is lossless.
    expect(fixtureStatisticsSchema.safeParse(missResponse).success).toBe(true);
    expect(fixtureStatisticsSchema.safeParse(hitResponse).success).toBe(true);
    expect(hitResponse).toEqual(missResponse);
    expect((hitResponse?.statistics ?? []).length).toBeGreaterThan(0);

    // An accepted event write advances the authoritative version in the same
    // transaction, which must make the stored entry unreachable.
    await advanceFixtureStatisticsCacheVersions(executor, [currentFixtureId]);

    const readAfterAdvance = await cache.read(currentFixtureId);
    expect(readAfterAdvance?.value).toBeNull();
    expect(readAfterAdvance?.dataVersion).toBe((coldRead?.dataVersion ?? 0) + 1);

    const afterAdvance = await service.getFixtureStatistics(currentFixtureId, {
      includeContributors: false,
    });
    expect(derivations).toEqual([currentFixtureId, currentFixtureId]);
    expect(afterAdvance).toEqual(missResponse);
  });
});
