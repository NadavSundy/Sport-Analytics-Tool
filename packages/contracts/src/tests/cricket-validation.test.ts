import { describe, expect, test } from 'vitest';

import {
  CRICKET_VALIDATION_RULE_VERSION,
  validateCricketBusinessRules,
  type CricketValidationContext,
  type CricketValidationEvent,
} from '../cricket-validation';

const context: CricketValidationContext = {
  inningsById: {
    '10': {
      battingTeamId: '100',
      bowlingTeamId: '200',
    },
  },
  participantTeamById: {
    '20': '100',
    '21': '100',
    '22': '200',
    '23': '200',
    '24': '100',
  },
  dismissalKinds: ['bowled', 'caught', 'run out', 'retired hurt'],
};

function validEvent(overrides: Partial<CricketValidationEvent> = {}): CricketValidationEvent {
  return {
    inningsId: '10',
    overNumber: 0,
    ballNumber: '0.1',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '22',
    wickets: [],
    ...overrides,
  };
}

describe('versioned cricket business-rule validation', () => {
  test('returns stable rule metadata and accumulates team-context errors', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          strikerId: '23',
          nonStrikerId: '22',
          bowlerId: '20',
        }),
      ],
      context,
    );

    expect(results.map((item) => item.code)).toEqual([
      'STRIKER_TEAM_INVALID',
      'NON_STRIKER_TEAM_INVALID',
      'BOWLER_TEAM_INVALID',
    ]);

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleVersion: CRICKET_VALIDATION_RULE_VERSION,
          severity: 'error',
          eventIndex: 0,
          fieldPath: 'strikerId',
        }),
      ]),
    );
  });

  test('checks dismissed-player team membership and dismissal vocabulary together', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          wickets: [
            {
              kind: 'made up dismissal',
              playerOutId: '23',
            },
          ],
        }),
      ],
      context,
    );

    expect(results.map((item) => item.code)).toEqual([
      'DISMISSED_PLAYER_INVALID',
      'UNKNOWN_DISMISSAL_KIND',
    ]);

    expect(results[0]?.fieldPath).toBe('wickets.0.playerOutId');

    expect(results[1]?.fieldPath).toBe('wickets.0.kind');
  });

  test('distinguishes duplicate terminal wickets', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          wickets: [
            {
              kind: 'bowled',
              playerOutId: '20',
            },
          ],
        }),
        validEvent({
          ballNumber: '0.2',
          wickets: [
            {
              kind: 'bowled',
              playerOutId: '20',
            },
          ],
        }),
      ],
      context,
    );

    expect(results.map((item) => item.code)).toContain('DUPLICATE_WICKET');

    expect(results.map((item) => item.code)).not.toContain('CONTRADICTORY_WICKET');
  });

  test('distinguishes contradictory terminal wickets', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          wickets: [
            {
              kind: 'bowled',
              playerOutId: '20',
            },
          ],
        }),
        validEvent({
          ballNumber: '0.2',
          wickets: [
            {
              kind: 'caught',
              playerOutId: '20',
            },
          ],
        }),
      ],
      context,
    );

    expect(results.map((item) => item.code)).toContain('CONTRADICTORY_WICKET');
  });

  test('allows a batter to resume after retired hurt', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          wickets: [
            {
              kind: 'retired hurt',
              playerOutId: '20',
            },
          ],
        }),
        validEvent({
          ballNumber: '0.2',
          wickets: [
            {
              kind: 'bowled',
              playerOutId: '20',
            },
          ],
        }),
      ],
      context,
    );

    expect(results).toEqual([]);
  });

  test('rejects a printed ball number whose over disagrees with overNumber', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          overNumber: 4,
          ballNumber: '5.1',
        }),
      ],
      context,
    );

    expect(results).toEqual([
      expect.objectContaining({
        code: 'BALL_NUMBER_OVER_MISMATCH',
        fieldPath: 'ballNumber',
      }),
    ]);
  });

  test('does not treat a repeated printed ball number as a duplicate delivery', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          ballNumber: '5.1',
          overNumber: 5,
        }),
        validEvent({
          ballNumber: '5.1',
          overNumber: 5,
        }),
      ],
      context,
    );

    expect(results).toEqual([]);
  });
});
