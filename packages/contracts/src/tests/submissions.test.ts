import { describe, expect, test } from 'vitest';

import {
  correctionHistoryResponseSchema,
  correctionRequestSchema,
  DIRECT_SUBMISSION_SCHEMA_VERSION,
  submissionRequestSchema,
  submissionResponseSchema,
} from '../submissions';

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
  test('accepts source-file provenance only within the documented upload limits', () => {
    const response = {
      data: {
        submissionId: '30',
        fixtureId: '7',
        submitterId: '1',
        status: 'accepted',
        receivedAt: '2026-08-28T12:00:00.000Z',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        eventCount: 1,
        sourceFile: { fileName: 'events.csv', mediaType: 'text/csv', sizeBytes: 512 },
      },
    };

    expect(submissionResponseSchema.safeParse(response).success).toBe(true);
    expect(
      submissionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          sourceFile: { ...response.data.sourceFile, sizeBytes: 1_000_001 },
        },
      }).success,
    ).toBe(false);
  });

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
  test('accepts a wide and a no-ball, which are legal deliveries that do not advance the over', () => {
    const wide = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [
        {
          ...validEvent(),
          runs: { offBat: 0, extras: 1, total: 1 },
          extras: { wides: 1 },
        },
      ],
    });
    expect(wide.success).toBe(true);

    const noBall = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [
        {
          ...validEvent(),
          runs: { offBat: 4, extras: 1, total: 5 },
          extras: { noBalls: 1 },
        },
      ],
    });
    expect(noBall.success).toBe(true);
  });

  test('accepts extras types that co-occur on one delivery', () => {
    // A wide with byes. The schema records a run count per type rather than a
    // type and a count, because more than one type can apply to a delivery.
    const result = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [
        {
          ...validEvent(),
          runs: { offBat: 0, extras: 5, total: 5 },
          extras: { wides: 1, byes: 4 },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test('accepts a wicket naming several fielders and one unnamed substitute', () => {
    const result = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [
        {
          ...validEvent(),
          wickets: [
            {
              kind: 'run out',
              playerOutId: '20',
              fielders: [{ participantId: '30' }, { participantId: '31' }, { substitute: true }],
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test('rejects a fielder who is neither identified nor marked as a substitute', () => {
    const result = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [
        {
          ...validEvent(),
          wickets: [{ kind: 'caught', playerOutId: '20', fielders: [{}] }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test('treats a super-over delivery as any other delivery', () => {
    // The super-over flag belongs to the innings, not the delivery. A submission
    // references an innings by identifier, so the contract is deliberately
    // agnostic: the same delivery is valid whichever innings it belongs to, and
    // whether that innings is a super over is resolved server-side.
    const result = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [{ ...validEvent(), inningsId: '99' }],
    });

    expect(result.success).toBe(true);
  });

  test('rejects each missing required field for the field that is missing', () => {
    const required = [
      'eventId',
      'inningsId',
      'sequenceNumber',
      'overNumber',
      'positionInOver',
      'ballNumber',
      'strikerId',
      'nonStrikerId',
      'bowlerId',
      'runs',
    ] as const;

    for (const field of required) {
      const event: Record<string, unknown> = validEvent();
      delete event[field];

      const result = submissionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        events: [event],
      });

      expect(result.success, `omitting ${field} should fail`).toBe(false);
      expect(
        result.error?.issues.some((issue) => issue.path.includes(field)),
        `the failure for ${field} should name that field`,
      ).toBe(true);
    }
  });

  test('rejects identifiers that are not positive database identifiers', () => {
    const invalidIdentifiers = ['0', '-1', 'abc', '1.5', '', '9223372036854775808'];

    for (const identifier of invalidIdentifiers) {
      const result = submissionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        events: [{ ...validEvent(), strikerId: identifier }],
      });

      expect(result.success, `"${identifier}" should be rejected`).toBe(false);
    }
  });

  test('rejects an event identifier that is not a UUID', () => {
    const result = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [{ ...validEvent(), eventId: 'event-1' }],
    });

    expect(result.success).toBe(false);
  });

  test('rejects fields supplied with the wrong type', () => {
    const wrongTypes = [
      { overNumber: '0' },
      { positionInOver: null },
      { sequenceNumber: 1.5 },
      { ballNumber: 1 },
      { wickets: {} },
      { runs: { offBat: '4', extras: 0, total: 4 } },
    ];

    for (const override of wrongTypes) {
      const result = submissionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        events: [{ ...validEvent(), ...override }],
      });

      expect(result.success, `${JSON.stringify(override)} should be rejected`).toBe(false);
    }
  });

  test('rejects values beyond the supported ranges', () => {
    const oversized = [
      { overNumber: 32_768 },
      { positionInOver: 32_768 },
      { sequenceNumber: 2_147_483_648 },
      { ballNumber: '1'.repeat(40) },
      { runs: { offBat: 32_768, extras: 0, total: 32_768 } },
    ];

    for (const override of oversized) {
      const result = submissionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        events: [{ ...validEvent(), ...override }],
      });

      expect(result.success, `${JSON.stringify(override)} should be rejected`).toBe(false);
    }
  });

  test('rejects a submission carrying more events than the contract permits', () => {
    const events = Array.from({ length: 1_001 }, (_unused, index) => ({
      ...validEvent(),
      eventId: `123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`,
      sequenceNumber: index + 1,
      positionInOver: index % 6,
      overNumber: Math.floor(index / 6),
    }));

    const result = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events,
    });

    expect(result.success).toBe(false);
  });
  test('rejects fielders on a dismissal kind that cannot involve one', () => {
    for (const kind of ['bowled', 'lbw', 'hit wicket', 'timed out', 'retired out']) {
      const result = submissionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        events: [
          {
            ...validEvent(),
            wickets: [{ kind, playerOutId: '20', fielders: [{ participantId: '30' }] }],
          },
        ],
      });

      expect(result.success, `${kind} should not accept a fielder`).toBe(false);
    }
  });

  test('rejects a caught or stumped dismissal naming no fielder', () => {
    for (const kind of ['caught', 'stumped']) {
      const result = submissionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        events: [
          {
            ...validEvent(),
            wickets: [{ kind, playerOutId: '20', fielders: [] }],
          },
        ],
      });

      expect(result.success, `${kind} should require a fielder`).toBe(false);
    }
  });

  test('accepts a caught dismissal whose fielder is an unidentified substitute', () => {
    // 127 fielder records in the corpus identify a substitute with no name.
    // Requiring a fielder must not require a named one.
    const result = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [
        {
          ...validEvent(),
          wickets: [{ kind: 'caught', playerOutId: '20', fielders: [{ substitute: true }] }],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test('leaves a dismissal kind outside both lists unconstrained', () => {
    // The vocabulary is held in dismissal_kind, not the contract. A kind the
    // contract does not name is neither required to have a fielder nor forbidden
    // one; it is resolved against the lookup table server-side.
    const withFielder = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [
        {
          ...validEvent(),
          wickets: [{ kind: 'run out', playerOutId: '20', fielders: [{ participantId: '30' }] }],
        },
      ],
    });
    expect(withFielder.success).toBe(true);

    const withoutFielder = submissionRequestSchema.safeParse({
      fixtureId: '7',
      schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
      events: [
        {
          ...validEvent(),
          wickets: [{ kind: 'obstructing the field', playerOutId: '20', fielders: [] }],
        },
      ],
    });
    expect(withoutFielder.success).toBe(true);
  });
});

describe('event correction contract', () => {
  test('requires a non-blank reason and excludes occurrence sequence from corrected content', () => {
    const event = validEvent();
    const { eventId: _eventId, sequenceNumber: _sequenceNumber, ...correctedEvent } = event;
    void _eventId;
    void _sequenceNumber;

    expect(
      correctionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        reason: 'Correct scorer transcription.',
        event: correctedEvent,
      }).success,
    ).toBe(true);
    expect(
      correctionRequestSchema.safeParse({
        fixtureId: '7',
        schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
        reason: '   ',
        event: correctedEvent,
      }).success,
    ).toBe(false);
  });

  test('validates traceable correction-history entries', () => {
    const state = validEvent();
    expect(
      correctionHistoryResponseSchema.safeParse({
        data: {
          eventId: state.eventId,
          fixtureId: '7',
          corrections: [
            {
              correctionId: '40',
              previousDeliveryId: '30',
              replacementDeliveryId: '31',
              previousRevision: 1,
              resultingRevision: 2,
              requester: { accountId: '2', displayName: 'Scorer' },
              correctedAt: '2026-09-04T10:00:00.000Z',
              reason: 'Correct scorer transcription.',
              source: { submissionId: '20', submissionEventOrdinal: 0, batchItemId: null },
              previousState: state,
              resultingState: { ...state, runs: { ...state.runs, offBat: 2, total: 2 } },
              review: null,
            },
          ],
        },
      }).success,
    ).toBe(true);
  });
});
