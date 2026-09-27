import { describe, expect, test } from 'vitest';

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
} from '../cricket-delivery-classification';

interface Extras {
  wides?: number | null | undefined;
  noBalls?: number | null | undefined;
  byes?: number | null | undefined;
  legByes?: number | null | undefined;
  penalty?: number | null | undefined;
}

interface Case {
  name: string;
  extras: Extras;
  wide: boolean;
  noBall: boolean;
  legal: boolean;
  ballFaced: boolean;
  bowlerExtras: number;
  /** Defaults to the bowler extras on a wide and to zero otherwise. */
  wideRuns?: number;
}

const plain = { wide: false, noBall: false, legal: true, ballFaced: true, bowlerExtras: 0 };

const cases: Case[] = [
  { name: 'extras absent', extras: {}, ...plain },
  { name: 'wides: 0', extras: { wides: 0 }, ...plain },
  { name: 'noBalls: 0', extras: { noBalls: 0 }, ...plain },
  { name: 'wides: 0 and noBalls: 0', extras: { wides: 0, noBalls: 0 }, ...plain },
  { name: 'wides and noBalls null', extras: { wides: null, noBalls: null }, ...plain },
  {
    name: 'wides and noBalls undefined',
    extras: { wides: undefined, noBalls: undefined },
    ...plain,
  },
  {
    name: 'all extras explicitly zero',
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    ...plain,
  },
  {
    name: 'wides: 1',
    extras: { wides: 1 },
    wide: true,
    noBall: false,
    legal: false,
    ballFaced: false,
    bowlerExtras: 1,
  },
  {
    name: 'wides: 5',
    extras: { wides: 5 },
    wide: true,
    noBall: false,
    legal: false,
    ballFaced: false,
    bowlerExtras: 5,
  },
  {
    name: 'noBalls: 1',
    extras: { noBalls: 1 },
    wide: false,
    noBall: true,
    legal: false,
    ballFaced: true,
    bowlerExtras: 1,
  },
  {
    name: 'noBalls: 1 with wides: 0',
    extras: { wides: 0, noBalls: 1 },
    wide: false,
    noBall: true,
    legal: false,
    ballFaced: true,
    bowlerExtras: 1,
  },
  { name: 'byes: 2', extras: { byes: 2 }, ...plain },
  { name: 'legByes: 1', extras: { legByes: 1 }, ...plain },
  { name: 'penalty: 5', extras: { penalty: 5 }, ...plain },
  {
    name: 'noBalls: 1 and byes: 2',
    extras: { noBalls: 1, byes: 2 },
    wide: false,
    noBall: true,
    legal: false,
    ballFaced: true,
    bowlerExtras: 1,
  },
  { name: 'wides: 0 and legByes: 1', extras: { wides: 0, legByes: 1 }, ...plain },
  { name: 'noBalls: 0 and penalty: 5', extras: { noBalls: 0, penalty: 5 }, ...plain },
  // Law 22.6: runs completed off a wide are wide runs, so byes and leg byes
  // recorded on a wide are charged to the bowler (ADR-014, issue #623).
  {
    name: 'wides: 1 and byes: 4',
    extras: { wides: 1, byes: 4 },
    wide: true,
    noBall: false,
    legal: false,
    ballFaced: false,
    bowlerExtras: 5,
  },
  {
    name: 'wides: 2 and legByes: 1',
    extras: { wides: 2, legByes: 1 },
    wide: true,
    noBall: false,
    legal: false,
    ballFaced: false,
    bowlerExtras: 3,
  },
  {
    name: 'wides: 1, byes: 2 and legByes: 1',
    extras: { wides: 1, byes: 2, legByes: 1 },
    wide: true,
    noBall: false,
    legal: false,
    ballFaced: false,
    bowlerExtras: 4,
  },
  {
    name: 'wides: 1 and penalty: 5',
    extras: { wides: 1, penalty: 5 },
    wide: true,
    noBall: false,
    legal: false,
    ballFaced: false,
    bowlerExtras: 1,
  },
  { name: 'wides: 0 and byes: 4', extras: { wides: 0, byes: 4 }, ...plain },
  {
    name: 'noBalls: 1 and legByes: 1',
    extras: { noBalls: 1, legByes: 1 },
    wide: false,
    noBall: true,
    legal: false,
    ballFaced: true,
    bowlerExtras: 1,
  },
  {
    name: 'wides: 3 with zero no-balls, byes and penalty',
    extras: { wides: 3, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    wide: true,
    noBall: false,
    legal: false,
    ballFaced: false,
    bowlerExtras: 3,
  },
];

describe('cricket delivery classification', () => {
  test.each(cases)('$name', (row) => {
    expect(isWide(row.extras)).toBe(row.wide);
    expect(isNoBall(row.extras)).toBe(row.noBall);
    expect(isLegalDelivery(row.extras)).toBe(row.legal);
    expect(countsAsBallFaced(row.extras)).toBe(row.ballFaced);
    expect(bowlerChargedExtras(row.extras)).toBe(row.bowlerExtras);
    expect(bowlerWideRuns(row.extras)).toBe(row.wideRuns ?? (row.wide ? row.bowlerExtras : 0));
  });

  test('classifies an omitted key and an explicit zero identically', () => {
    const functions = [
      isWide,
      isNoBall,
      isLegalDelivery,
      countsAsBallFaced,
      bowlerWideRuns,
      bowlerChargedExtras,
    ];
    const omitted: Extras = {};
    const explicit: Extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 };

    for (const classify of functions) {
      expect(classify(explicit)).toBe(classify(omitted));
    }
  });

  test('charges a wide recorded with byes or leg byes exactly as the equivalent wide', () => {
    const functions = [
      isWide,
      isNoBall,
      isLegalDelivery,
      countsAsBallFaced,
      bowlerWideRuns,
      bowlerChargedExtras,
    ];
    const pairs: Array<[Extras, Extras]> = [
      [{ wides: 1, byes: 4 }, { wides: 5 }],
      [{ wides: 1, legByes: 2 }, { wides: 3 }],
      [{ wides: 2, byes: 1, legByes: 1, noBalls: 0 }, { wides: 4 }],
    ];

    for (const [recordedWithByes, recordedAsWides] of pairs) {
      for (const classify of functions) {
        expect(classify(recordedWithByes)).toBe(classify(recordedAsWides));
      }
    }
  });

  test('does not let byes, leg byes or penalty runs change a classification', () => {
    const noBall: Extras = { noBalls: 1 };
    const noBallWithTeamExtras: Extras = { noBalls: 1, byes: 4, legByes: 2, penalty: 5 };

    expect(isLegalDelivery(noBallWithTeamExtras)).toBe(isLegalDelivery(noBall));
    expect(countsAsBallFaced(noBallWithTeamExtras)).toBe(countsAsBallFaced(noBall));
    expect(bowlerChargedExtras(noBallWithTeamExtras)).toBe(bowlerChargedExtras(noBall));
  });
});

describe('cricket delivery classification SQL fragments', () => {
  test('classify by value rather than by nullness', () => {
    expect(isWideSql('d')).toBe('(COALESCE(d.extra_wides, 0) > 0)');
    expect(isNoBallSql('d')).toBe('(COALESCE(d.extra_noballs, 0) > 0)');
    expect(isLegalDeliverySql('pd')).toBe(
      '(COALESCE(pd.extra_wides, 0) <= 0 AND COALESCE(pd.extra_noballs, 0) <= 0)',
    );
    expect(countsAsBallFacedSql('pd')).toBe('(COALESCE(pd.extra_wides, 0) <= 0)');
    expect(bowlerWideRunsSql('d')).toBe(
      '(CASE WHEN COALESCE(d.extra_wides, 0) > 0 ' +
        'THEN COALESCE(d.extra_wides, 0) + GREATEST(COALESCE(d.extra_byes, 0), 0) + ' +
        'GREATEST(COALESCE(d.extra_legbyes, 0), 0) ELSE 0 END)',
    );
    expect(bowlerChargedExtrasSql('d')).toBe(
      `(${bowlerWideRunsSql('d')} + GREATEST(COALESCE(d.extra_noballs, 0), 0))`,
    );

    for (const fragment of [
      isWideSql('d'),
      isNoBallSql('d'),
      isLegalDeliverySql('d'),
      countsAsBallFacedSql('d'),
    ]) {
      expect(fragment).not.toMatch(/IS (NOT )?NULL/i);
    }
  });

  test.each(['d; DROP TABLE delivery', 'D', '1d', 'd.extra', ''])(
    'rejects the unsafe alias %j',
    (alias) => {
      expect(() => isWideSql(alias)).toThrow(/Invalid SQL alias/);
    },
  );
});
