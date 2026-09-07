import { describe, expect, test } from 'vitest';

import {
  classifyPublishedCricketDelivery,
  type PublishedCricketDelivery,
} from '../cricket-delivery-comparison';
import type { SubmissionEvent } from '../submissions';

function submitted(overrides: Partial<SubmissionEvent> = {}): SubmissionEvent {
  return {
    eventId: '11111111-1111-4111-8111-111111111111',
    inningsId: '10',
    sequenceNumber: 7,
    overNumber: 1,
    positionInOver: 2,
    ballNumber: '1.3',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '30',
    runs: {
      offBat: 0,
      extras: 1,
      total: 1,
      nonBoundary: false,
    },
    extras: {
      wides: 1,
    },
    wickets: [
      {
        kind: 'run out',
        playerOutId: '20',
        fielders: [
          {
            participantId: '31',
            substitute: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function published(overrides: Partial<PublishedCricketDelivery> = {}): PublishedCricketDelivery {
  return {
    inningsId: '10',
    sequenceNumber: 7,
    overNumber: 1,
    positionInOver: 2,
    ballNumber: '1.3',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '30',
    runs: {
      offBat: 0,
      extras: 1,
      total: 1,
      nonBoundary: false,
    },
    extras: {
      wides: 1,
      noBalls: null,
      byes: null,
      legByes: null,
      penalty: null,
    },
    wickets: [
      {
        kind: 'run out',
        playerOutId: '20',
        fielders: [
          {
            participantId: '31',
            substitute: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('published cricket delivery comparison', () => {
  test('classifies absence as a new delivery', () => {
    expect(classifyPublishedCricketDelivery(submitted(), null)).toBe('new');
  });

  test('classifies all canonical cricket content as an exact duplicate', () => {
    expect(classifyPublishedCricketDelivery(submitted(), published())).toBe('exact-duplicate');
  });

  test('treats absent and zero-valued extras as equivalent', () => {
    expect(
      classifyPublishedCricketDelivery(
        submitted({
          runs: {
            offBat: 1,
            extras: 0,
            total: 1,
            nonBoundary: false,
          },
          extras: {},
          wickets: [],
        }),
        published({
          runs: {
            offBat: 1,
            extras: 0,
            total: 1,
            nonBoundary: false,
          },
          extras: {
            wides: 0,
            noBalls: null,
            byes: null,
            legByes: null,
            penalty: null,
          },
          wickets: [],
        }),
      ),
    ).toBe('exact-duplicate');
  });

  test('detects changed delivery content as a conflict', () => {
    expect(
      classifyPublishedCricketDelivery(
        submitted({
          runs: {
            offBat: 1,
            extras: 0,
            total: 1,
            nonBoundary: false,
          },
          extras: {},
        }),
        published(),
      ),
    ).toBe('conflict');
  });

  test('detects a wicket disagreement as a conflict', () => {
    expect(
      classifyPublishedCricketDelivery(
        submitted({
          wickets: [
            {
              kind: 'caught',
              playerOutId: '20',
              fielders: [
                {
                  participantId: '31',
                  substitute: false,
                },
              ],
            },
          ],
        }),
        published(),
      ),
    ).toBe('conflict');
  });

  test('detects a fielder disagreement as a conflict', () => {
    expect(
      classifyPublishedCricketDelivery(
        submitted({
          wickets: [
            {
              kind: 'run out',
              playerOutId: '20',
              fielders: [
                {
                  participantId: '32',
                  substitute: false,
                },
              ],
            },
          ],
        }),
        published(),
      ),
    ).toBe('conflict');
  });

  test('includes the natural delivery position in equality', () => {
    expect(classifyPublishedCricketDelivery(submitted({ positionInOver: 3 }), published())).toBe(
      'conflict',
    );
  });
});
