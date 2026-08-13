import { describe, expect, test } from 'vitest';

import { DIRECT_SUBMISSION_SCHEMA_VERSION, submissionRequestSchema } from '../submissions';

function validEvent() {
  return {
    eventId: '123e4567-e89b-42d3-a456-426614174000',
    inningsId: '10',
    sequenceNumber: 1,
    overNumber: 0,
    positionInOver: 0,
    ballNumber: '0.1',
    strikerId: '20',
    nonStrikerId: '21',
    bowlerId: '22',
    runs: {
      offBat: 4,
      extras: 0,
      total: 4,
    },
  };
}

describe('direct submission contract', () => {
  test('accepts a complete delivery event and applies safe optional defaults', () => {
    const result = submissionRequestSchema.parse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [validEvent()],
    });

    expect(result.events[0]).toMatchObject({
      extras: {},
      wickets: [],
      runs: { nonBoundary: false },
    });
  });

  test('rejects final totals and inconsistent delivery runs', () => {
    expect(
      submissionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        statistics: { totalRuns: 4 },
        events: [
          {
            ...validEvent(),
            runs: { offBat: 4, extras: 1, total: 4 },
          },
        ],
      }).success,
    ).toBe(false);
  });

  test('rejects duplicate event identifiers and unsupported schema versions', () => {
    const duplicate = {
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [validEvent(), { ...validEvent(), sequenceNumber: 2, positionInOver: 1 }],
    };

    expect(submissionRequestSchema.safeParse(duplicate).success).toBe(false);
    expect(submissionRequestSchema.safeParse({ ...duplicate, schemaVersion: '2.0' }).success).toBe(
      false,
    );
  });

  test('rejects events that are out of order within an innings', () => {
    expect(
      submissionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        events: [
          { ...validEvent(), sequenceNumber: 2 },
          {
            ...validEvent(),
            eventId: '123e4567-e89b-42d3-a456-426614174001',
            sequenceNumber: 1,
            positionInOver: 1,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
