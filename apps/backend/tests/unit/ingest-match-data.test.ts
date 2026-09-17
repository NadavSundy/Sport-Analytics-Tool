import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  assertValidCricsheetExtras,
  assertValidCricsheetPowerplays,
  ingestMatchData,
} from '../../scripts/ingest-match-data';
import type { QueryExecutor } from '../../src/database';

type Extras = Record<string, number>;

function inningsWith(...extras: Array<Extras | undefined>) {
  return [
    {
      overs: [
        {
          over: 0,
          deliveries: extras.map((deliveryExtras) => ({
            batter: 'A',
            bowler: 'B',
            non_striker: 'C',
            runs: { batter: 0, extras: 0, total: 0 },
            ...(deliveryExtras ? { extras: deliveryExtras } : {}),
          })),
        },
      ],
    },
  ];
}

describe('Cricsheet extras validation (issue #623)', () => {
  test('accepts absent, zero and positive extras under their Cricsheet keys', () => {
    expect(() =>
      assertValidCricsheetExtras(
        inningsWith(
          undefined,
          {},
          { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0 },
          { wides: 5 },
          { noballs: 1, byes: 2 },
          { legbyes: 1 },
          { penalty: 5 },
        ),
      ),
    ).not.toThrow();
  });

  test.each([
    [{ wides: -1 }, 'extras.wides'],
    [{ noballs: -1 }, 'extras.noBalls'],
    [{ byes: -1 }, 'extras.byes'],
    [{ legbyes: -1 }, 'extras.legByes'],
    [{ penalty: -1 }, 'extras.penalty'],
    [{ wides: 1.5 }, 'extras.wides'],
    [{ byes: 32_768 }, 'extras.byes'],
  ])('rejects %j, reporting %s', (extras, field) => {
    expect(() => assertValidCricsheetExtras(inningsWith({}, extras))).toThrow(
      new RegExp(`innings 1, over 0, delivery 2: ${field.replace('.', '\\.')}: `),
    );
  });

  test('rejects a key Cricsheet does not define instead of dropping it', () => {
    expect(() => assertValidCricsheetExtras(inningsWith({ bonus: 1 }))).toThrow(
      /extras: Unrecognized key\(s\) in object: 'bonus'/,
    );
  });

  test('reports every invalid delivery, capped with a count of the rest', () => {
    const invalid = Array.from({ length: 7 }, () => ({ wides: -1 }));

    expect(() => assertValidCricsheetExtras(inningsWith(...invalid))).toThrow(
      /delivery 5: extras\.wides: .*; and 2 more$/,
    );
  });

  test('rejects a file with a negative extra before issuing any database statement', async () => {
    const statements: string[] = [];
    const executor: QueryExecutor = {
      query(text: string) {
        statements.push(text);
        throw new Error('No statement may run for a file with invalid extras.');
      },
    };
    const invalidPath = resolve(
      __dirname,
      '../../../../database/seeds/invalid/negative-extra.json',
    );

    await expect(ingestMatchData(executor, invalidPath)).rejects.toThrow(
      /Invalid delivery extras; nothing was ingested\. innings 1, over 0, delivery 1: extras\.wides: /,
    );
    expect(statements).toEqual([]);
  });
});

describe('Cricsheet powerplay validation (issue #633)', () => {
  test('accepts absent and valid metadata without inventing a default', () => {
    expect(() => assertValidCricsheetPowerplays([{}, { powerplays: [] }])).not.toThrow();
    expect(() =>
      assertValidCricsheetPowerplays([{ powerplays: [{ from: 0.1, to: 5.6, type: 'mandatory' }] }]),
    ).not.toThrow();
  });

  test('rejects malformed and overlapping ranges with the innings location', () => {
    expect(() =>
      assertValidCricsheetPowerplays([{ powerplays: [{ from: 5.6, to: 0.1, type: 'mandatory' }] }]),
    ).toThrow(/Invalid powerplay metadata at innings 1.*must not precede/);
    expect(() =>
      assertValidCricsheetPowerplays([
        {
          powerplays: [
            { from: 0.1, to: 5.6, type: 'mandatory' },
            { from: 5.6, to: 6.6, type: 'batting' },
          ],
        },
      ]),
    ).toThrow(/Invalid powerplay metadata at innings 1.*must not overlap/);
  });
});
