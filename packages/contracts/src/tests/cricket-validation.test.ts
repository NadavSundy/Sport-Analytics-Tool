import { describe, expect, test } from 'vitest';

import {
  CRICKET_VALIDATION_RULE_VERSION,
  createCricketValidationState,
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
    sequenceNumber: 1,
    overNumber: 0,
    ballNumber: '0.1',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '22',
    extras: {},
    wickets: [],
    ...overrides,
  };
}

describe('versioned cricket business-rule validation', () => {
  test('does not require a display ball number for canonical validation', () => {
    const event = validEvent();
    delete (event as Partial<CricketValidationEvent>).ballNumber;

    expect(validateCricketBusinessRules([event], context)).toEqual([]);
  });

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
          sequenceNumber: 2,
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
          sequenceNumber: 2,
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

  test('does not treat dismissals in separate innings as duplicates', () => {
    const multiInningsContext: CricketValidationContext = {
      ...context,
      inningsById: {
        ...context.inningsById,
        '11': {
          battingTeamId: '100',
          bowlingTeamId: '200',
        },
      },
    };

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
          inningsId: '11',
          wickets: [
            {
              kind: 'caught',
              playerOutId: '20',
            },
          ],
        }),
      ],
      multiInningsContext,
    );

    expect(results).toEqual([]);
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
          sequenceNumber: 2,
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

  test('allows a printed ball number to repeat after an illegal delivery', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          overNumber: 5,
          ballNumber: '5.1',
          extras: { noBalls: 1 },
        }),
        validEvent({
          sequenceNumber: 2,
          overNumber: 5,
          ballNumber: '5.1',
        }),
        validEvent({
          sequenceNumber: 3,
          overNumber: 5,
          ballNumber: '5.2',
        }),
      ],
      context,
    );

    expect(results).toEqual([]);
  });

  test('rejects a repeated printed ball after a legal delivery', () => {
    const results = validateCricketBusinessRules(
      [
        validEvent({
          overNumber: 5,
          ballNumber: '5.1',
        }),
        validEvent({
          sequenceNumber: 2,
          overNumber: 5,
          ballNumber: '5.1',
        }),
      ],
      context,
    );

    expect(results.map((item) => item.code)).toContain('BALL_NUMBER_PROGRESSION_INVALID');
  });

  test('does not assume six legal balls ends an over', () => {
    const events = Array.from({ length: 7 }, (_, index) =>
      validEvent({
        sequenceNumber: index + 1,
        overNumber: 12,
        ballNumber: `12.${String(index + 1)}`,
      }),
    );

    expect(validateCricketBusinessRules(events, context)).toEqual([]);
  });

  test('keeps sequence validation state across chunks', () => {
    const state = createCricketValidationState();

    expect(
      validateCricketBusinessRules(
        [
          validEvent({
            sequenceNumber: 10,
            overNumber: 5,
            ballNumber: '5.3',
          }),
        ],
        context,
        { state, eventIndexOffset: 40 },
      ),
    ).toEqual([]);

    const results = validateCricketBusinessRules(
      [
        validEvent({
          sequenceNumber: 9,
          overNumber: 5,
          ballNumber: '5.4',
        }),
      ],
      context,
      { state, eventIndexOffset: 41 },
    );

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SEQUENCE_NOT_INCREASING',
          eventIndex: 41,
          fieldPath: 'sequenceNumber',
        }),
      ]),
    );
  });

  test('keeps legal-ball progression state across chunks', () => {
    const state = createCricketValidationState();

    expect(
      validateCricketBusinessRules(
        [
          validEvent({
            sequenceNumber: 1,
            overNumber: 8,
            ballNumber: '8.4',
          }),
        ],
        context,
        { state, eventIndexOffset: 100 },
      ),
    ).toEqual([]);

    expect(
      validateCricketBusinessRules(
        [
          validEvent({
            sequenceNumber: 2,
            overNumber: 8,
            ballNumber: '8.5',
          }),
        ],
        context,
        { state, eventIndexOffset: 101 },
      ),
    ).toEqual([]);
  });

  test('keeps wicket validation state across chunks', () => {
    const state = createCricketValidationState();

    expect(
      validateCricketBusinessRules(
        [
          validEvent({
            wickets: [
              {
                kind: 'bowled',
                playerOutId: '20',
              },
            ],
          }),
        ],
        context,
        { state, eventIndexOffset: 200 },
      ),
    ).toEqual([]);

    const results = validateCricketBusinessRules(
      [
        validEvent({
          sequenceNumber: 2,
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
      { state, eventIndexOffset: 201 },
    );

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DUPLICATE_WICKET',
          eventIndex: 201,
        }),
      ]),
    );
  });
});
