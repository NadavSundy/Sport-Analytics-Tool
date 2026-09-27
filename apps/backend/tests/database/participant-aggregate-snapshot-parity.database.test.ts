import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { submissionRequestSchema } from '@sport-analytics/contracts';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { ingestMatchData } from '../../scripts/ingest-match-data';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';
import { createSeasonId } from '../../src/modules/public-read/season-id';
import { deriveParticipantAggregates } from '../../src/modules/statistics/participant-aggregates.derivation';
import { loadParticipantAggregatesSource } from '../../src/modules/statistics/participant-aggregates.repository';
import { createParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import {
  createParticipantAggregateSnapshotStore,
  refreshParticipantAggregateSnapshots,
} from '../../src/modules/statistics/participant-aggregates.snapshot';
import { createSubmissionRepository } from '../../src/modules/submissions/submission.repository';
import { withExplicitZeroExtras } from './explicit-zero-extras';
import { isolatedMatchCopy } from './isolated-match-copy';

/**
 * Served stored aggregates equal live derivation (issue #592) for the
 * reference fixtures, the same fixtures with explicit zero extras (#590), and
 * submitted deliveries with byes and leg byes run off a wide (#623). The
 * correction that removes a participant from an event and the fixture whose
 * squad changes only through ingest are covered by the selective refresh tests.
 */

const REFERENCE_MATCHES = ['1399114', '1462921', '423788', '729307'] as const;
const sourcePrefix = `snapshot-parity-${process.pid}`;

describe.sequential('participant aggregate snapshot parity', () => {
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
  function savepointPool(client: PoolClient): Pool {
    const statements: Record<string, string> = {
      BEGIN: 'SAVEPOINT parity_transaction',
      COMMIT: 'RELEASE SAVEPOINT parity_transaction',
      ROLLBACK: 'ROLLBACK TO SAVEPOINT parity_transaction',
    };
    const query = (text: string, values?: unknown[]) =>
      client.query(statements[text] ?? text, values);
    return {
      connect: async () => ({ query, release: () => undefined }),
      query,
    } as unknown as Pool;
  }

  /**
   * Refreshes each participant, then requires the served response to come from
   * stored rows and to equal live derivation at every level and for each scope
   * filter.
   */
  async function expectServedEqualsLive(client: PoolClient, participantIds: readonly string[]) {
    const store = createParticipantAggregateSnapshotStore(savepointPool(client));
    const outcomes = await refreshParticipantAggregateSnapshots(participantIds, {
      store,
      loadSource: (id) => loadParticipantAggregatesSource(id, client),
    });
    expect([...outcomes.values()].every((outcome) => outcome === 'refreshed')).toBe(true);

    const service = createParticipantAggregatesService(async () => {
      throw new Error('Expected stored rows to be served.');
    }, store);
    for (const participantId of participantIds) {
      const live = await loadParticipantAggregatesSource(participantId, client);
      for (const scope of [undefined, 'season', 'competition', 'career'] as const) {
        const query = scope === undefined ? {} : { scope };
        expect(
          await service.getParticipantAggregates(participantId, query),
          `participant ${participantId} ${scope ?? 'all levels'}`,
        ).toEqual(
          deriveParticipantAggregates(live!, {
            ...(scope === undefined ? {} : { scope }),
            createSeasonId,
          }),
        );
      }
    }
  }

  async function squadOf(client: PoolClient, fixtureIds: readonly string[]): Promise<string[]> {
    const result = await client.query<{ personId: string }>(
      `SELECT DISTINCT person_id::text AS "personId" FROM fixture_squad
       WHERE fixture_id = ANY($1::bigint[]) ORDER BY 1`,
      [fixtureIds],
    );
    return result.rows.map((row) => row.personId);
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

  test('serves every reference fixture participant exactly as live derivation', async () => {
    await withRolledBackTransaction(async (client) => {
      const fixtureIds: string[] = [];
      for (const match of REFERENCE_MATCHES) {
        const seedPath = isolatedMatchCopy(
          resolve(__dirname, `../../../../database/seeds/matches/${match}.json`),
          sourcePrefix,
        );
        fixtureIds.push(
          (await ingestMatchData(client, seedPath, { sourceRef: `${sourcePrefix}-${match}` }))
            .fixtureId,
        );
      }
      const participants = await squadOf(client, fixtureIds);
      expect(participants.length).toBeGreaterThanOrEqual(80);

      await expectServedEqualsLive(client, participants);
    });
  }, 120_000);

  test('serves the reference fixtures with explicit zero extras exactly as live derivation', async () => {
    await withRolledBackTransaction(async (client) => {
      const fixtureIds: string[] = [];
      for (const match of REFERENCE_MATCHES) {
        const seedPath = isolatedMatchCopy(
          withExplicitZeroExtras(
            resolve(__dirname, `../../../../database/seeds/matches/${match}.json`),
          ),
          sourcePrefix,
        );
        fixtureIds.push(
          (
            await ingestMatchData(client, seedPath, {
              sourceRef: `${sourcePrefix}-explicit-zero-${match}`,
            })
          ).fixtureId,
        );
      }
      const zeroExtras = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM delivery d JOIN innings i ON i.innings_id = d.innings_id
         WHERE i.fixture_id = ANY($1::bigint[]) AND d.extra_wides = 0 AND d.extra_noballs = 0`,
        [fixtureIds],
      );
      expect(Number(zeroExtras.rows[0]!.count)).toBeGreaterThan(0);

      await expectServedEqualsLive(client, await squadOf(client, fixtureIds));
    });
  }, 120_000);

  test('serves wides with byes and leg byes and explicit zero extras exactly as live derivation', async () => {
    await withRolledBackTransaction(async (client) => {
      const key = `${sourcePrefix}-wide-runs`;
      const one = async (text: string, values: unknown[] = []) =>
        (await client.query<{ id: string }>(text, values)).rows[0]!.id;
      const accountId = await one(
        `INSERT INTO app_user (
           auth_provider, auth_subject, application_role, submitter_approval_state
         )
         VALUES ('test', $1, 'admin', 'approved') RETURNING app_user_id::text AS id`,
        [key],
      );
      const competitionId = await one(
        `INSERT INTO competition (name) VALUES ($1) RETURNING competition_id::text AS id`,
        [`${key}-competition`],
      );
      const battingTeamId = await one(
        `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS id`,
        [`${key}-batting`],
      );
      const bowlingTeamId = await one(
        `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS id`,
        [`${key}-bowling`],
      );
      const fixtureId = await one(
        `INSERT INTO fixture (
           source_ref, competition_id, season, match_type, team_type, gender, balls_per_over,
           start_date, end_date, outcome, source_version, source_revision
         )
         VALUES ($1, $2, '2026', 'T20', 'club', 'mixed', 6, CURRENT_DATE, CURRENT_DATE,
                 'tie', '1.0', 1)
         RETURNING fixture_id::text AS id`,
        [`${key}-fixture`, competitionId],
      );
      await client.query(
        `INSERT INTO fixture_team (fixture_id, team_id, ordinal) VALUES ($1, $2, 1), ($1, $3, 2)`,
        [fixtureId, battingTeamId, bowlingTeamId],
      );
      const inningsId = await one(
        `INSERT INTO innings (fixture_id, ordinal, batting_team_id) VALUES ($1, 0, $2)
         RETURNING innings_id::text AS id`,
        [fixtureId, battingTeamId],
      );
      const person = (role: string) =>
        one(
          `INSERT INTO person (source_ref, display_name) VALUES ($1, $1)
           RETURNING person_id::text AS id`,
          [`${key}-${role}`],
        );
      const striker = await person('striker');
      const nonStriker = await person('non-striker');
      const bowler = await person('bowler');
      await client.query(
        `INSERT INTO fixture_squad (fixture_id, person_id, team_id)
         VALUES ($1, $2, $5), ($1, $3, $5), ($1, $4, $6)`,
        [fixtureId, striker, nonStriker, bowler, battingTeamId, bowlingTeamId],
      );

      const zero = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 };
      const deliveries = [
        { ballNumber: '0.1', offBat: 1, extras: zero },
        { ballNumber: '0.2', offBat: 0, extras: { wides: 1, byes: 2 } },
        { ballNumber: '0.2', offBat: 0, extras: { ...zero, wides: 1, legByes: 1 } },
        { ballNumber: '0.2', offBat: 2, extras: { ...zero, noBalls: 1 } },
        { ballNumber: '0.2', offBat: 0, extras: { byes: 2 } },
      ];
      const submission = await createSubmissionRepository(
        savepointPool(client),
      ).storeAcceptedSubmission(
        submissionRequestSchema.parse({
          fixtureId,
          schemaVersion: '1.0',
          events: deliveries.map((delivery, index) => {
            const extraRuns = Object.values(delivery.extras).reduce((sum, value) => sum + value, 0);
            return {
              eventId: randomUUID(),
              inningsId,
              sequenceNumber: index + 1,
              overNumber: 0,
              positionInOver: index,
              ballNumber: delivery.ballNumber,
              strikerId: striker,
              nonStrikerId: nonStriker,
              bowlerId: bowler,
              runs: {
                offBat: delivery.offBat,
                extras: extraRuns,
                total: delivery.offBat + extraRuns,
              },
              extras: delivery.extras,
            };
          }),
        }),
        accountId,
        undefined,
        'a'.repeat(64),
      );
      await client.query(`UPDATE fixture SET first_seen_in = $2 WHERE fixture_id = $1`, [
        fixtureId,
        submission.submissionId,
      ]);

      await expectServedEqualsLive(client, [striker, nonStriker, bowler]);
      // The case is exercised: byes and leg byes off a wide are wide runs.
      const served = await createParticipantAggregatesService(
        async () => {
          throw new Error('Expected stored rows to be served.');
        },
        createParticipantAggregateSnapshotStore(savepointPool(client)),
      ).getParticipantAggregates(bowler, { scope: 'career' });
      expect(served?.statistics[0]?.bowling).toMatchObject({ wides: 5, noBalls: 1 });
    });
  });
});
