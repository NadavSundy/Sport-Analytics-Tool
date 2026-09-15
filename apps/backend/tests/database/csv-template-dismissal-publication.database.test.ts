import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { normalisedBatchCandidates } from '../../../worker/src/batch-package';
import { prepareItem } from '../../../worker/src/batch-validation-job';
import { executeQuery } from '../../src/database';
import { createBatchRepository } from '../../src/modules/batches/batch.repository';
import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

interface TestRecords {
  accountId: string;
  competitionId: string;
  fixtureId: string;
  inningsId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  fielderId: string;
}

const sourcePrefix = `csv-template-dismissal-test-${process.pid}`;
const checksum = 'a'.repeat(64);

/**
 * The shipped CSV template's example row with its dismissal columns completed. Every
 * column set must exist in the template header, so a template change cannot quietly
 * make this test vacuous.
 */
function shippedCsvTemplateWithDismissal(): string {
  const text = readFileSync(
    new URL('../../../frontend/public/season-upload-template.csv', import.meta.url),
    'utf8',
  );
  const [headerLine = '', rowLine = ''] = text.split(/\r?\n/);
  const columns = headerLine.split(',');
  const cells = rowLine.split(',');
  expect(cells).toHaveLength(columns.length);

  const dismissal: Record<string, string> = {
    wicketKind: 'caught',
    playerOutName: 'Striker',
    fielder1Name: 'Fielder',
  };
  for (const [column, value] of Object.entries(dismissal)) {
    const index = columns.indexOf(column);
    expect(index, `template column ${column}`).toBeGreaterThanOrEqual(0);
    cells[index] = value;
  }

  return `${headerLine}\n${cells.join(',')}\n`;
}

describe.sequential('publication of a dismissal from the CSV template', () => {
  let pool: Pool | undefined;
  let records: TestRecords | undefined;

  function databasePool(): Pool {
    if (!pool) {
      throw new Error('Test database pool has not been initialized.');
    }

    return pool;
  }

  function testRecords(): TestRecords {
    if (!records) {
      throw new Error('CSV dismissal test records have not been initialized.');
    }

    return records;
  }

  async function withRolledBackTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await databasePool().connect();

    try {
      await client.query('BEGIN');
      return await operation(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
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
        INSERT INTO app_user (auth_provider, auth_subject, application_role)
        VALUES ('test', $1, 'submitter')
        RETURNING app_user_id::text AS "accountId"
      `,
      [sourcePrefix],
    );
    const competition = await executeQuery<{ competitionId: string }>(
      pool,
      `
        INSERT INTO competition (name)
        VALUES ($1)
        RETURNING competition_id::text AS "competitionId"
      `,
      [`${sourcePrefix}-competition`],
    );
    const battingTeam = await executeQuery<{ teamId: string }>(
      pool,
      `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS "teamId"`,
      [`${sourcePrefix}-batting`],
    );
    const bowlingTeam = await executeQuery<{ teamId: string }>(
      pool,
      `INSERT INTO team (name) VALUES ($1) RETURNING team_id::text AS "teamId"`,
      [`${sourcePrefix}-bowling`],
    );

    async function insertPerson(role: string): Promise<string> {
      const result = await executeQuery<{ personId: string }>(
        databasePool(),
        `
          INSERT INTO person (source_ref, display_name)
          VALUES ($1, $2)
          RETURNING person_id::text AS "personId"
        `,
        [`${sourcePrefix}-${role}`, `${sourcePrefix} ${role}`],
      );
      return result.rows[0].personId;
    }

    const strikerId = await insertPerson('striker');
    const nonStrikerId = await insertPerson('non-striker');
    const bowlerId = await insertPerson('bowler');
    const fielderId = await insertPerson('fielder');
    const accountId = account.rows[0].accountId;
    const competitionId = competition.rows[0].competitionId;
    const battingTeamId = battingTeam.rows[0].teamId;
    const bowlingTeamId = bowlingTeam.rows[0].teamId;

    const fixture = await executeQuery<{ fixtureId: string }>(
      pool,
      `
        INSERT INTO fixture (
          source_ref,
          competition_id,
          season,
          match_type,
          team_type,
          gender,
          balls_per_over,
          start_date,
          end_date,
          outcome,
          source_version,
          source_revision
        )
        VALUES ($1, $2, '2026', 'T20', 'club', 'mixed', 6, CURRENT_DATE,
                CURRENT_DATE, 'tie', '1.0', 1)
        RETURNING fixture_id::text AS "fixtureId"
      `,
      [`${sourcePrefix}-fixture`, competitionId],
    );
    const fixtureId = fixture.rows[0].fixtureId;

    await executeQuery(
      pool,
      `
        INSERT INTO fixture_team (fixture_id, team_id, ordinal)
        VALUES ($1, $2, 1), ($1, $3, 2)
      `,
      [fixtureId, battingTeamId, bowlingTeamId],
    );
    const innings = await executeQuery<{ inningsId: string }>(
      pool,
      `
        INSERT INTO innings (fixture_id, ordinal, batting_team_id)
        VALUES ($1, 0, $2)
        RETURNING innings_id::text AS "inningsId"
      `,
      [fixtureId, battingTeamId],
    );

    records = {
      accountId,
      competitionId,
      fixtureId,
      inningsId: innings.rows[0].inningsId,
      strikerId,
      nonStrikerId,
      bowlerId,
      fielderId,
    };
  });

  afterAll(async () => {
    if (!pool || !records) {
      return;
    }

    await executeQuery(pool, 'DELETE FROM fixture WHERE fixture_id = $1', [records.fixtureId]);
    await executeQuery(pool, 'DELETE FROM app_user WHERE app_user_id = $1', [records.accountId]);
    await executeQuery(pool, 'DELETE FROM competition WHERE competition_id = $1', [
      records.competitionId,
    ]);
    await executeQuery(pool, 'DELETE FROM team WHERE name LIKE $1', [`${sourcePrefix}-%`]);
    await executeQuery(pool, 'DELETE FROM person WHERE source_ref LIKE $1', [`${sourcePrefix}-%`]);
    await pool.end();
  });

  test('publishes the dismissal and fielder recorded in a template CSV row', async () => {
    await withRolledBackTransaction(async (client) => {
      const current = testRecords();
      const repository = createBatchRepository(client);

      const source = shippedCsvTemplateWithDismissal();
      const candidates = [];
      for await (const candidate of normalisedBatchCandidates(
        async () => Readable.from(source),
        'text/csv',
      )) {
        candidates.push(candidate);
      }
      expect(candidates).toHaveLength(1);
      const candidate = candidates[0]!;

      // Name resolution has its own database tests. The resolved participants are
      // supplied here, keyed by the reference paths the worker records, so this test
      // isolates the CSV dismissal columns reaching published wicket rows.
      const prepared = prepareItem(
        candidate,
        {
          inningsId: current.inningsId,
          state: 'resolved',
          resolvedReferences: {
            participants: {
              striker: { canonicalId: current.strikerId },
              nonStriker: { canonicalId: current.nonStrikerId },
              bowler: { canonicalId: current.bowlerId },
              'wickets.0.playerOut': { canonicalId: current.strikerId },
              'wickets.0.fielders.0.participant': { canonicalId: current.fielderId },
            },
          },
        },
        {
          overNumber: candidate.event.overNumber ?? 0,
          positionInOver: candidate.event.positionInOver ?? 0,
        },
      );
      expect(prepared).toMatchObject({ state: 'accepted' });

      const batch = await repository.createBatch({
        batchReference: randomUUID(),
        submitterId: current.accountId,
        competitionId: current.competitionId,
        idempotencyKey: `${sourcePrefix}-csv-dismissal`,
        source: {
          checksum,
          uri: `stored-object:${randomUUID()}`,
          sizeBytes: 64,
        },
        state: 'publishing',
      });

      await repository.insertBatchItems(batch.batchId, [
        {
          ordinal: 0,
          inningsId: current.inningsId,
          overNumber: prepared!.overNumber,
          positionInOver: prepared!.positionInOver,
          sourceIdentity: prepared!.sourceIdentity,
          state: 'accepted',
          payload: prepared!.payload,
        },
      ]);

      await expect(
        repository.publishAcceptedItems(batch.batchId, 'worker-csv-dismissal'),
      ).resolves.toMatchObject({ published: 1, conflicts: 0 });

      const wickets = await client.query<{ kind: string; playerOutId: string }>(
        `
          SELECT dw.kind, dw.player_out_id::text AS "playerOutId"
          FROM batch_item bi
          JOIN delivery_wicket dw ON dw.delivery_id = bi.published_event_id
          WHERE bi.batch_id=$1::bigint
        `,
        [batch.batchId],
      );
      expect(wickets.rows).toEqual([{ kind: 'caught', playerOutId: current.strikerId }]);

      const fielders = await client.query<{ fielderId: string | null; substitute: boolean }>(
        `
          SELECT dwf.person_id::text AS "fielderId", dwf.is_substitute AS substitute
          FROM batch_item bi
          JOIN delivery_wicket dw ON dw.delivery_id = bi.published_event_id
          JOIN delivery_wicket_fielder dwf ON dwf.wicket_id = dw.wicket_id
          WHERE bi.batch_id=$1::bigint
        `,
        [batch.batchId],
      );
      expect(fielders.rows).toEqual([{ fielderId: current.fielderId, substitute: false }]);
    });
  });
});
