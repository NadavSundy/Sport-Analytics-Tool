import request from 'supertest';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { executeQuery } from '../../src/database';
import type { SynchronizeAccount } from '../../src/modules/accounts/account.service';
import { listParticipantFixtures } from '../../src/modules/participants/participant.repository';
import { deriveFixtureStatistics } from '../../src/modules/statistics/fixture-statistics.derivation';
import { loadFixtureStatisticsSource } from '../../src/modules/statistics/fixture-statistics.repository';
import { loadParticipantAggregatesSource } from '../../src/modules/statistics/participant-aggregates.repository';
import { createParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import { createSubmissionRepository } from '../../src/modules/submissions/submission.repository';
import { createSubmissionService } from '../../src/modules/submissions/submission.service';
import { createTestAccount, createTestApp } from '../test-app';

/**
 * Byes and leg byes recorded on a wide, through every statistics path
 * (ADR-014, issue #623).
 *
 * Law 22.6 makes every run completed off a wide a wide run charged to the
 * bowler. Cricsheet records such runs as wides, but the submission contract
 * also accepts them as byes or leg byes beside a wide. The same over is
 * submitted through the direct submission API to two fixtures with different
 * players: once with those runs as byes and leg byes, once as wides. The stored
 * events keep what was submitted, and every statistics path must give both sets
 * of players the same figures.
 */

type Variant = 'byes' | 'wides';

interface VariantRecords {
  fixtureId: string;
  inningsId: string;
  batterId: string;
  nonStrikerId: string;
  bowlerId: string;
}

interface Extras {
  wides?: number;
  noBalls?: number;
  byes?: number;
  legByes?: number;
}

interface OverDelivery {
  sequenceNumber: number;
  ballNumber: string;
  offBat?: number;
  extras?: Extras;
  /** Extras that differ between the two variants, in place of `extras`. */
  extrasByVariant?: Record<Variant, Extras>;
}

const sourcePrefix = `issue-623-wide-runs-${process.pid}`;

// One over of nine deliveries, six of them legal. Printed ball numbers advance
// only on legal deliveries, as the business-rule validator requires.
const over: OverDelivery[] = [
  { sequenceNumber: 1, ballNumber: '0.1', offBat: 1 },
  {
    sequenceNumber: 2,
    ballNumber: '0.2',
    extrasByVariant: { byes: { wides: 1, byes: 4 }, wides: { wides: 5 } },
  },
  {
    sequenceNumber: 3,
    ballNumber: '0.2',
    extrasByVariant: { byes: { wides: 2, legByes: 1 }, wides: { wides: 3 } },
  },
  // Byes off a no-ball remain byes (Law 21) in both variants.
  { sequenceNumber: 4, ballNumber: '0.2', extras: { noBalls: 1, byes: 2 } },
  { sequenceNumber: 5, ballNumber: '0.2' },
  { sequenceNumber: 6, ballNumber: '0.3', offBat: 4 },
  { sequenceNumber: 7, ballNumber: '0.4' },
  { sequenceNumber: 8, ballNumber: '0.5' },
  { sequenceNumber: 9, ballNumber: '0.6' },
];

const expectedBatter = { runsScored: 5, ballsFaced: 7, fours: 1, sixes: 0, strikeRate: 71.43 };
const expectedAggregateBatter = {
  innings: 1,
  ...expectedBatter,
  dismissals: 0,
  notOuts: 1,
  battingAverage: null,
  fifties: 0,
  hundreds: 0,
  highestScore: 5,
  highestScoreNotOut: true,
};

// 5 off the bat + 8 wide runs + 1 no-ball. The 2 byes off the no-ball are team
// extras.
const expectedBowler = {
  innings: 1,
  runsConceded: 14,
  wides: 8,
  noBalls: 1,
  legalBallsBowled: 6,
  wicketsTaken: 0,
  bowlingAverage: null,
  bowlingStrikeRate: null,
  bestBowling: { wicketsTaken: 0, runsConceded: 14 },
  fourWicketHauls: 0,
  fiveWicketHauls: 0,
  ballsPerOver: 6,
  oversBowled: '1.0',
  economyRate: 14,
};

function variantExtras(variant: Variant, delivery: OverDelivery): Extras {
  return delivery.extrasByVariant?.[variant] ?? delivery.extras ?? {};
}

function eventId(variant: Variant, sequenceNumber: number): string {
  const variantDigit = variant === 'byes' ? '1' : '2';
  return `623e4567-e89b-42d3-a456-4266141${variantDigit}${String(sequenceNumber).padStart(4, '0')}`;
}

describe.sequential('byes and leg byes recorded on a wide across statistics paths', () => {
  let pool: Pool | undefined;
  let accountId: string | undefined;
  let competitionId: string | undefined;
  const variants = new Map<Variant, VariantRecords>();

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }
    return pool;
  }

  function records(variant: Variant): VariantRecords {
    const found = variants.get(variant);
    if (!found) {
      throw new Error(`Test records for the ${variant} variant have not been initialised.`);
    }
    return found;
  }

  function app() {
    if (!accountId || !competitionId) {
      throw new Error('Test account has not been initialised.');
    }
    const account = createTestAccount({
      accountId,
      role: 'admin',
      approvalState: 'approved',
      competitionIds: [competitionId],
    });
    const synchronizeAccount: SynchronizeAccount = async () => account;
    const service = createSubmissionService(createSubmissionRepository(databasePool()));

    return createTestApp(undefined, undefined, synchronizeAccount, undefined, service);
  }

  function submissionEvent(variant: Variant, delivery: OverDelivery) {
    const current = records(variant);
    const offBat = delivery.offBat ?? 0;
    const extras = variantExtras(variant, delivery);
    const extraRuns = Object.values(extras).reduce((total, value) => total + value, 0);

    return {
      eventId: eventId(variant, delivery.sequenceNumber),
      inningsId: current.inningsId,
      sequenceNumber: delivery.sequenceNumber,
      overNumber: 0,
      positionInOver: delivery.sequenceNumber - 1,
      ballNumber: delivery.ballNumber,
      strikerId: current.batterId,
      nonStrikerId: current.nonStrikerId,
      bowlerId: current.bowlerId,
      runs: { offBat, extras: extraRuns, total: offBat + extraRuns },
      extras,
    };
  }

  async function figuresFor(variant: Variant) {
    const current = records(variant);
    const source = await loadFixtureStatisticsSource(current.fixtureId, databasePool());
    if (!source) {
      throw new Error(`Expected the ${variant} fixture to be available for derivation.`);
    }
    const statistics = deriveFixtureStatistics(source).statistics;
    const fixtureParticipant = (participantId: string) => {
      const statistic = statistics.find(
        (candidate) =>
          candidate.scope === 'participant' && candidate.participantId === participantId,
      );
      return statistic?.scope === 'participant' ? statistic : undefined;
    };
    const innings = statistics.find((statistic) => statistic.scope === 'innings');

    const history = async (participantId: string) => {
      const page = await listParticipantFixtures({ participantId, limit: 10 }, databasePool());
      const record = page.records.find((candidate) => candidate.fixtureId === current.fixtureId);
      return {
        runsScored: record?.runsScored,
        ballsFaced: record?.ballsFaced,
        runsConceded: record?.runsConceded,
        wides: record?.wides,
        noBalls: record?.noBalls,
        legalBallsBowled: record?.legalBallsBowled,
      };
    };

    const aggregates = async (participantId: string) => {
      const service = createParticipantAggregatesService((id) =>
        loadParticipantAggregatesSource(id, databasePool()),
      );
      const result = await service.getParticipantAggregates(participantId, {});
      return (result?.statistics ?? []).map((statistic) => ({
        scope: statistic.scope,
        batting: statistic.batting,
        bowling: statistic.bowling,
      }));
    };

    return {
      team: innings?.scope === 'innings' ? innings.metrics : null,
      fixture: {
        batter: fixtureParticipant(current.batterId)?.batting,
        bowler: fixtureParticipant(current.bowlerId)?.bowling,
      },
      history: {
        batter: await history(current.batterId),
        bowler: await history(current.bowlerId),
      },
      aggregates: {
        batter: await aggregates(current.batterId),
        bowler: await aggregates(current.bowlerId),
      },
    };
  }

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.DATABASE_URL_TEST,
      process.env.DATABASE_URL,
      process.env.NODE_ENV,
    );
    pool = new Pool({ connectionString: databaseUrl.toString() });

    const account = await executeQuery<{ accountId: string }>(
      pool,
      `
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          display_name,
          application_role,
          submitter_approval_state
        )
        VALUES ('test', $1, 'Wide Runs Database Test', 'admin', 'approved')
        RETURNING app_user_id::text AS "accountId"
      `,
      [sourcePrefix],
    );
    accountId = account.rows[0].accountId;

    const competition = await executeQuery<{ competitionId: string }>(
      pool,
      `INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text AS "competitionId"`,
      [`${sourcePrefix}-competition`],
    );
    competitionId = competition.rows[0].competitionId;

    for (const variant of ['byes', 'wides'] as const) {
      const prefix = `${sourcePrefix}-${variant}`;
      const team = async (name: string) =>
        (
          await executeQuery<{ teamId: string }>(
            databasePool(),
            `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS "teamId"`,
            [`${prefix}-${name}`],
          )
        ).rows[0].teamId;
      const person = async (role: string) =>
        (
          await executeQuery<{ personId: string }>(
            databasePool(),
            `
              INSERT INTO person (source_ref, display_name)
              VALUES ($1, $2)
              RETURNING person_id::text AS "personId"
            `,
            [`${prefix}-${role}`, `${role} ${prefix}`],
          )
        ).rows[0].personId;

      const battingTeamId = await team('batting');
      const bowlingTeamId = await team('bowling');
      const batterId = await person('batter');
      const nonStrikerId = await person('non-striker');
      const bowlerId = await person('bowler');

      const fixture = await executeQuery<{ fixtureId: string }>(
        databasePool(),
        `
          INSERT INTO fixture (
            source_ref, competition_id, season, match_type, team_type, gender,
            balls_per_over, start_date, end_date, outcome, source_version, source_revision
          )
          VALUES ($1, $2, '2026', 'T20', 'club', 'mixed', 6, CURRENT_DATE,
                  CURRENT_DATE, 'tie', '1.0', 1)
          RETURNING fixture_id::text AS "fixtureId"
        `,
        [`${prefix}-fixture`, competitionId],
      );
      const fixtureId = fixture.rows[0].fixtureId;

      await executeQuery(
        databasePool(),
        `INSERT INTO fixture_team (fixture_id, team_id, ordinal) VALUES ($1, $2, 1), ($1, $3, 2)`,
        [fixtureId, battingTeamId, bowlingTeamId],
      );
      await executeQuery(
        databasePool(),
        `
          INSERT INTO fixture_squad (fixture_id, person_id, team_id)
          VALUES ($1, $2, $5), ($1, $3, $5), ($1, $4, $6)
        `,
        [fixtureId, batterId, nonStrikerId, bowlerId, battingTeamId, bowlingTeamId],
      );
      const innings = await executeQuery<{ inningsId: string }>(
        databasePool(),
        `
          INSERT INTO innings (fixture_id, ordinal, batting_team_id)
          VALUES ($1, 0, $2)
          RETURNING innings_id::text AS "inningsId"
        `,
        [fixtureId, battingTeamId],
      );

      variants.set(variant, {
        fixtureId,
        inningsId: innings.rows[0].inningsId,
        batterId,
        nonStrikerId,
        bowlerId,
      });

      await request(app())
        .post('/api/v1/submissions')
        .set('Authorization', 'Bearer database-test-token')
        .send({
          fixtureId,
          schemaVersion: '1.0',
          events: over.map((delivery) => submissionEvent(variant, delivery)),
        })
        .expect(201);

      await executeQuery(
        databasePool(),
        `
          UPDATE fixture
          SET first_seen_in = (
            SELECT submission_id FROM submission WHERE fixture_id = $1
            ORDER BY submission_id ASC LIMIT 1
          )
          WHERE fixture_id = $1
        `,
        [fixtureId],
      );
    }
  }, 60_000);

  afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  test('stores byes and leg byes on a wide as submitted', async () => {
    const stored = await executeQuery<{ wideRowsWithByes: number }>(
      databasePool(),
      `
        SELECT COUNT(*) FILTER (
          WHERE d.extra_wides > 0 AND (d.extra_byes > 0 OR d.extra_legbyes > 0)
        )::int AS "wideRowsWithByes"
        FROM delivery_current d
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id = $1
      `,
      [records('byes').fixtureId],
    );

    expect(stored.rows[0]).toEqual({ wideRowsWithByes: 2 });
  });

  test('gives identical figures at fixture, history, season, competition and career level', async () => {
    const withByes = await figuresFor('byes');
    const asWides = await figuresFor('wides');

    expect(withByes).toEqual(asWides);

    // Team figures are unchanged by where the runs off a wide are recorded.
    expect(withByes.team).toEqual({ deliveryRuns: 16, penaltyRuns: 0, totalRuns: 16 });
    expect(withByes.fixture.batter).toEqual(expectedBatter);
    expect(withByes.fixture.bowler).toEqual({
      runsConceded: expectedBowler.runsConceded,
      wides: expectedBowler.wides,
      noBalls: expectedBowler.noBalls,
      legalBallsBowled: expectedBowler.legalBallsBowled,
      wicketsTaken: expectedBowler.wicketsTaken,
      oversBowled: expectedBowler.oversBowled,
      economyRate: expectedBowler.economyRate,
    });
    expect(withByes.history.bowler).toEqual({
      runsScored: null,
      ballsFaced: null,
      runsConceded: 14,
      wides: 8,
      noBalls: 1,
      legalBallsBowled: 6,
    });
    expect(withByes.aggregates.batter).toEqual(
      ['season', 'competition', 'career'].map((scope) => ({
        scope,
        batting: expectedAggregateBatter,
        bowling: null,
      })),
    );
    expect(withByes.aggregates.bowler).toEqual(
      ['season', 'competition', 'career'].map((scope) => ({
        scope,
        batting: null,
        bowling: expectedBowler,
      })),
    );
  });
});
