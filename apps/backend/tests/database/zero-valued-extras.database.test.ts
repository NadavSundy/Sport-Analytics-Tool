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
 * Explicit zero extras through every statistics path (issue #590).
 *
 * The same over is submitted through the direct submission API to two fixtures
 * with different players: once with zero extras omitted and once with every
 * zero written out. The API stores the explicit zeros as zeros, so the fixture
 * derivation, the fixture history and the season, competition and career
 * aggregates must classify by value to give both sets of players the same
 * figures. A correction through the same API then checks that the selective
 * refresh after a revision is classified the same way.
 */

type Variant = 'omitted' | 'explicit';

interface VariantRecords {
  fixtureId: string;
  inningsId: string;
  firstBatterId: string;
  secondBatterId: string;
  bowlerId: string;
}

interface OverDelivery {
  sequenceNumber: number;
  ballNumber: string;
  secondBatterOnStrike?: boolean;
  offBat?: number;
  extras?: { wides?: number; noBalls?: number; byes?: number; legByes?: number; penalty?: number };
}

const sourcePrefix = `issue-590-zero-extras-${process.pid}`;

// One over of nine deliveries, six of them legal. Printed ball numbers advance
// only on legal deliveries, as the business-rule validator requires.
const over: OverDelivery[] = [
  { sequenceNumber: 1, ballNumber: '0.1', offBat: 1 },
  { sequenceNumber: 2, ballNumber: '0.2', secondBatterOnStrike: true, extras: { wides: 1 } },
  {
    sequenceNumber: 3,
    ballNumber: '0.2',
    secondBatterOnStrike: true,
    offBat: 4,
    extras: { noBalls: 1 },
  },
  { sequenceNumber: 4, ballNumber: '0.2', secondBatterOnStrike: true },
  { sequenceNumber: 5, ballNumber: '0.3', secondBatterOnStrike: true, extras: { legByes: 1 } },
  { sequenceNumber: 6, ballNumber: '0.4', extras: { byes: 2 } },
  { sequenceNumber: 7, ballNumber: '0.5', extras: { noBalls: 1, byes: 2 } },
  { sequenceNumber: 8, ballNumber: '0.5', extras: { penalty: 5 } },
  { sequenceNumber: 9, ballNumber: '0.6', offBat: 6 },
];

const zeroExtras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 };

const expectedFirstBatter = {
  runsScored: 7,
  ballsFaced: 5,
  fours: 0,
  sixes: 1,
  strikeRate: 140,
};

const expectedSecondBatter = {
  runsScored: 4,
  ballsFaced: 3,
  fours: 1,
  sixes: 0,
  strikeRate: 133.33,
};

// 11 off the bat + 1 wide + 2 no-balls. Byes, the leg bye and the penalty runs
// are team extras and are not charged to the bowler.
const expectedBowler = {
  runsConceded: 14,
  wides: 1,
  noBalls: 2,
  legalBallsBowled: 6,
  wicketsTaken: 0,
  ballsPerOver: 6,
  oversBowled: '1.0',
  economyRate: 14,
};

function eventId(variant: Variant, sequenceNumber: number): string {
  const variantDigit = variant === 'omitted' ? '1' : '2';
  return `590e4567-e89b-42d3-a456-4266141${variantDigit}${String(sequenceNumber).padStart(4, '0')}`;
}

describe.sequential('zero-valued extras across statistics paths', () => {
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
    const extras =
      variant === 'explicit' ? { ...zeroExtras, ...delivery.extras } : { ...delivery.extras };
    const extraRuns = Object.values(extras).reduce((total, value) => total + value, 0);

    return {
      eventId: eventId(variant, delivery.sequenceNumber),
      inningsId: current.inningsId,
      sequenceNumber: delivery.sequenceNumber,
      overNumber: 0,
      positionInOver: delivery.sequenceNumber - 1,
      ballNumber: delivery.ballNumber,
      strikerId: delivery.secondBatterOnStrike ? current.secondBatterId : current.firstBatterId,
      nonStrikerId: delivery.secondBatterOnStrike ? current.firstBatterId : current.secondBatterId,
      bowlerId: current.bowlerId,
      runs: { offBat, extras: extraRuns, total: offBat + extraRuns },
      extras,
    };
  }

  async function aggregatesFor(participantId: string) {
    const service = createParticipantAggregatesService((id) =>
      loadParticipantAggregatesSource(id, databasePool()),
    );
    const aggregates = await service.getParticipantAggregates(participantId, {});
    if (!aggregates) {
      throw new Error(`Expected participant ${participantId} to exist.`);
    }
    return aggregates;
  }

  async function fixtureParticipant(variant: Variant, participantId: string) {
    const source = await loadFixtureStatisticsSource(records(variant).fixtureId, databasePool());
    if (!source) {
      throw new Error(`Expected the ${variant} fixture to be available for derivation.`);
    }
    const statistic = deriveFixtureStatistics(source).statistics.find(
      (candidate) => candidate.scope === 'participant' && candidate.participantId === participantId,
    );
    return statistic?.scope === 'participant' ? statistic : undefined;
  }

  async function historyFor(variant: Variant, participantId: string) {
    const history = await listParticipantFixtures({ participantId, limit: 10 }, databasePool());
    const record = history.records.find(
      (candidate) => candidate.fixtureId === records(variant).fixtureId,
    );
    if (!record) {
      throw new Error(`Expected a ${variant} fixture history record for ${participantId}.`);
    }
    return record;
  }

  async function figuresFor(variant: Variant) {
    const current = records(variant);
    const level = async (participantId: string) =>
      (await aggregatesFor(participantId)).statistics.map((statistic) => ({
        scope: statistic.scope,
        batting: statistic.batting,
        bowling: statistic.bowling,
      }));
    const history = async (participantId: string) => {
      const record = await historyFor(variant, participantId);
      return {
        runsScored: record.runsScored,
        ballsFaced: record.ballsFaced,
        fours: record.fours,
        sixes: record.sixes,
        runsConceded: record.runsConceded,
        wides: record.wides,
        noBalls: record.noBalls,
        legalBallsBowled: record.legalBallsBowled,
        wicketsTaken: record.wicketsTaken,
      };
    };

    return {
      fixture: {
        firstBatter: (await fixtureParticipant(variant, current.firstBatterId))?.batting,
        secondBatter: (await fixtureParticipant(variant, current.secondBatterId))?.batting,
        bowler: (await fixtureParticipant(variant, current.bowlerId))?.bowling,
      },
      history: {
        firstBatter: await history(current.firstBatterId),
        secondBatter: await history(current.secondBatterId),
        bowler: await history(current.bowlerId),
      },
      aggregates: {
        firstBatter: await level(current.firstBatterId),
        secondBatter: await level(current.secondBatterId),
        bowler: await level(current.bowlerId),
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
        VALUES ('test', $1, 'Zero Extras Database Test', 'admin', 'approved')
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

    for (const variant of ['omitted', 'explicit'] as const) {
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
      const firstBatterId = await person('first-batter');
      const secondBatterId = await person('second-batter');
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
        [fixtureId, firstBatterId, secondBatterId, bowlerId, battingTeamId, bowlingTeamId],
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
        firstBatterId,
        secondBatterId,
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

  test('stores explicit zero extras as submitted', async () => {
    const stored = await executeQuery<{ variant: string; zeroWides: number; zeroNoBalls: number }>(
      databasePool(),
      `
        SELECT
          CASE i.fixture_id WHEN $1::bigint THEN 'omitted' ELSE 'explicit' END AS variant,
          COUNT(*) FILTER (WHERE d.extra_wides = 0)::int AS "zeroWides",
          COUNT(*) FILTER (WHERE d.extra_noballs = 0)::int AS "zeroNoBalls"
        FROM delivery_current d
        JOIN innings i ON i.innings_id = d.innings_id
        WHERE i.fixture_id IN ($1::bigint, $2::bigint)
        GROUP BY i.fixture_id
        ORDER BY variant DESC
      `,
      [records('omitted').fixtureId, records('explicit').fixtureId],
    );

    // Stored events stay faithful to the submission; only classification changes.
    expect(stored.rows).toEqual([
      { variant: 'omitted', zeroWides: 0, zeroNoBalls: 0 },
      { variant: 'explicit', zeroWides: 8, zeroNoBalls: 7 },
    ]);
  });

  test('gives identical figures at fixture, history, season, competition and career level', async () => {
    const omitted = await figuresFor('omitted');
    const explicit = await figuresFor('explicit');

    expect(explicit).toEqual(omitted);

    expect(omitted.fixture).toEqual({
      firstBatter: expectedFirstBatter,
      secondBatter: expectedSecondBatter,
      bowler: {
        runsConceded: expectedBowler.runsConceded,
        wides: expectedBowler.wides,
        noBalls: expectedBowler.noBalls,
        legalBallsBowled: expectedBowler.legalBallsBowled,
        wicketsTaken: expectedBowler.wicketsTaken,
        oversBowled: expectedBowler.oversBowled,
        economyRate: expectedBowler.economyRate,
      },
    });
    expect(omitted.history.firstBatter).toMatchObject({ runsScored: 7, ballsFaced: 5 });
    expect(omitted.history.secondBatter).toMatchObject({ runsScored: 4, ballsFaced: 3 });
    expect(omitted.history.bowler).toMatchObject({
      runsConceded: 14,
      wides: 1,
      noBalls: 2,
      legalBallsBowled: 6,
    });

    for (const [participant, batting, bowling] of [
      ['firstBatter', expectedFirstBatter, null],
      ['secondBatter', expectedSecondBatter, null],
      ['bowler', null, expectedBowler],
    ] as const) {
      expect(omitted.aggregates[participant]).toEqual(
        ['season', 'competition', 'career'].map((scope) => ({ scope, batting, bowling })),
      );
    }
  });

  test('classifies corrected revisions by value when their statistics are refreshed', async () => {
    const current = records('explicit');
    const lastDelivery = over.at(-1)!;

    async function correct(extras: typeof zeroExtras, offBat: number, reason: string) {
      const {
        eventId: _eventId,
        sequenceNumber: _sequenceNumber,
        ...event
      } = submissionEvent('explicit', lastDelivery);
      void _eventId;
      void _sequenceNumber;
      const extraRuns = Object.values(extras).reduce((total, value) => total + value, 0);

      return await request(app())
        .put(`/api/v1/submissions/events/${eventId('explicit', lastDelivery.sequenceNumber)}`)
        .set('Authorization', 'Bearer database-test-token')
        .send({
          fixtureId: current.fixtureId,
          schemaVersion: '1.0',
          reason,
          event: {
            ...event,
            runs: { offBat, extras: extraRuns, total: offBat + extraRuns },
            extras,
          },
        })
        .expect(200);
    }

    // Revision 2 restates the six with every zero extra written out. Nothing
    // about the delivery changes, so neither may any refreshed figure.
    const unchanged = await correct(zeroExtras, 6, 'Restate the delivery with explicit zeros.');
    expect(unchanged.body.data).toMatchObject({ revision: 2 });
    expect(await figuresFor('explicit')).toEqual(await figuresFor('omitted'));

    // Revision 3 turns the same delivery into a wide of one, still sending an
    // explicit zero for no-balls. The refresh must see a wide, not a no-ball.
    const wide = await correct({ ...zeroExtras, wides: 1 }, 0, 'The last delivery was a wide.');
    expect(wide.body.data).toMatchObject({ revision: 3 });

    const refreshed = await executeQuery<{ scope: string; participantId: string | null }>(
      databasePool(),
      `
        SELECT scope, participant_id::text AS "participantId"
        FROM statistics_refresh_dependency
        WHERE source_event_id = $1::uuid AND delivery_revision = 3
        ORDER BY scope, participant_id
      `,
      [eventId('explicit', lastDelivery.sequenceNumber)],
    );
    expect(refreshed.rows).toEqual(
      expect.arrayContaining([
        { scope: 'fixture', participantId: null },
        { scope: 'season', participantId: current.firstBatterId },
        { scope: 'competition', participantId: current.firstBatterId },
        { scope: 'career', participantId: current.firstBatterId },
        { scope: 'season', participantId: current.bowlerId },
        { scope: 'competition', participantId: current.bowlerId },
        { scope: 'career', participantId: current.bowlerId },
      ]),
    );

    const correctedFirstBatter = {
      runsScored: 1,
      ballsFaced: 4,
      fours: 0,
      sixes: 0,
      strikeRate: 25,
    };
    const correctedBowler = {
      ...expectedBowler,
      runsConceded: 9,
      wides: 2,
      legalBallsBowled: 5,
      oversBowled: '0.5',
      economyRate: 10.8,
    };
    const figures = await figuresFor('explicit');

    expect(figures.fixture.firstBatter).toEqual(correctedFirstBatter);
    expect(figures.fixture.secondBatter).toEqual(expectedSecondBatter);
    expect(figures.history.firstBatter).toMatchObject({ runsScored: 1, ballsFaced: 4 });
    expect(figures.history.bowler).toMatchObject({
      runsConceded: 9,
      wides: 2,
      noBalls: 2,
      legalBallsBowled: 5,
    });
    for (const scope of ['season', 'competition', 'career']) {
      expect(figures.aggregates.firstBatter).toContainEqual({
        scope,
        batting: correctedFirstBatter,
        bowling: null,
      });
      expect(figures.aggregates.bowler).toContainEqual({
        scope,
        batting: null,
        bowling: correctedBowler,
      });
    }

    // The fixture that was never corrected keeps its figures.
    expect((await figuresFor('omitted')).aggregates.bowler).toContainEqual({
      scope: 'career',
      batting: null,
      bowling: expectedBowler,
    });
  });
});
