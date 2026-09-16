import {
  bowlerChargedExtras,
  bowlerChargedExtrasSql,
  bowlerWideRuns,
  bowlerWideRunsSql,
  countsAsBallFaced,
  countsAsBallFacedSql,
  isLegalDelivery,
  isLegalDeliverySql,
  isNoBall,
  isNoBallSql,
  isWide,
  isWideSql,
} from '@sport-analytics/contracts';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { assertSafeTestDatabase } from '../../scripts/test-database-safety';

/**
 * The TypeScript classification and the SQL fragments are two spellings of one
 * rule (issue #590). Fixture statistics use the first; the season, competition,
 * career and fixture-history queries use the second. Both are run over the same
 * table of stored extras, so the two can never disagree about a delivery.
 */

interface StoredExtras {
  wides: number | null;
  noBalls: number | null;
  byes: number | null;
  legByes: number | null;
  penalty: number | null;
}

interface Classification {
  wide: boolean;
  noBall: boolean;
  legal: boolean;
  ballFaced: boolean;
  bowlerExtras: number;
  wideRuns: number;
}

const none: StoredExtras = { wides: null, noBalls: null, byes: null, legByes: null, penalty: null };

const cases: Array<[string, StoredExtras]> = [
  ['extras absent', none],
  ['wides 0', { ...none, wides: 0 }],
  ['no-balls 0', { ...none, noBalls: 0 }],
  ['wides 0 and no-balls 0', { ...none, wides: 0, noBalls: 0 }],
  ['every extra 0', { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 }],
  ['wides 1', { ...none, wides: 1 }],
  ['wides 5', { ...none, wides: 5 }],
  ['no-balls 1', { ...none, noBalls: 1 }],
  ['no-balls 1 and wides 0', { ...none, wides: 0, noBalls: 1 }],
  ['wides 2 and no-balls 0', { ...none, wides: 2, noBalls: 0 }],
  ['byes 2', { ...none, byes: 2 }],
  ['leg byes 1', { ...none, legByes: 1 }],
  ['penalty 5', { ...none, penalty: 5 }],
  ['no-balls 1 and byes 2', { ...none, noBalls: 1, byes: 2 }],
  ['no-balls 1 and leg byes 1', { ...none, noBalls: 1, legByes: 1 }],
  ['wides 0 and leg byes 1', { ...none, wides: 0, legByes: 1 }],
  ['wides 0 and byes 4', { ...none, wides: 0, byes: 4 }],
  ['no-balls 0 and penalty 5', { ...none, noBalls: 0, penalty: 5 }],
  ['wides 1 and penalty 5', { ...none, wides: 1, penalty: 5 }],
  // Law 22.6: byes and leg byes run off a wide are wide runs (ADR-014, #623).
  ['wides 1 and byes 4', { ...none, wides: 1, byes: 4 }],
  ['wides 2 and leg byes 1', { ...none, wides: 2, legByes: 1 }],
  ['wides 1, byes 2 and leg byes 1', { ...none, wides: 1, byes: 2, legByes: 1 }],
  ['wides 1, byes 4 and no-balls 0', { ...none, wides: 1, noBalls: 0, byes: 4 }],
  ['wides 0, byes 4 and leg byes 1', { ...none, wides: 0, byes: 4, legByes: 1 }],
  // The contract and the delivery columns' CHECK constraints both reject
  // negative extras, but both spellings must still agree on one.
  ['wides -1 (not accepted by the contract)', { ...none, wides: -1 }],
];

function typescriptClassification(extras: StoredExtras): Classification {
  return {
    wide: isWide(extras),
    noBall: isNoBall(extras),
    legal: isLegalDelivery(extras),
    ballFaced: countsAsBallFaced(extras),
    bowlerExtras: bowlerChargedExtras(extras),
    wideRuns: bowlerWideRuns(extras),
  };
}

describe.sequential('delivery classification parity between TypeScript and SQL', () => {
  let pool: Pool | undefined;

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

  test('classifies every case identically', async () => {
    if (!pool) {
      throw new Error('Test database pool has not been initialised.');
    }

    const result = await pool.query<Classification & { name: string }>(
      `
        SELECT
          c.name,
          ${isWideSql('c')} AS wide,
          ${isNoBallSql('c')} AS "noBall",
          ${isLegalDeliverySql('c')} AS legal,
          ${countsAsBallFacedSql('c')} AS "ballFaced",
          ${bowlerChargedExtrasSql('c')}::int AS "bowlerExtras",
          ${bowlerWideRunsSql('c')}::int AS "wideRuns"
        FROM unnest(
          $1::text[],
          $2::smallint[],
          $3::smallint[],
          $4::smallint[],
          $5::smallint[],
          $6::smallint[]
        ) WITH ORDINALITY AS c(
          name, extra_wides, extra_noballs, extra_byes, extra_legbyes, extra_penalty, ordinal
        )
        ORDER BY c.ordinal
      `,
      [
        cases.map(([name]) => name),
        cases.map(([, extras]) => extras.wides),
        cases.map(([, extras]) => extras.noBalls),
        cases.map(([, extras]) => extras.byes),
        cases.map(([, extras]) => extras.legByes),
        cases.map(([, extras]) => extras.penalty),
      ],
    );

    expect(result.rows).toHaveLength(cases.length);

    for (const [index, [name, extras]] of cases.entries()) {
      const { name: sqlName, ...sql } = result.rows[index]!;
      expect(sqlName).toBe(name);
      expect(sql, name).toEqual(typescriptClassification(extras));
    }
  });
});
