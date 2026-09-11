import { describe, expect, it } from 'vitest';

import {
  formatApiValidationLocation,
  formatApiValidationMessage,
  formatBatchValidationMessage,
  formatSchemaValidationFailure,
  formatValidationField,
  validationRuleLabel,
} from './submission-validation-copy';

describe('submission validation copy', () => {
  it('turns schema field paths into readable cricket labels', () => {
    expect(formatValidationField('events.0.runs.total')).toBe('Total runs');
    expect(formatValidationField('events.1.eventId')).toBe('Event identifier');
    expect(formatValidationField('events.2.wickets.0.playerOutId')).toBe('Dismissed player');
    expect(formatValidationField('fixtures.0.innings.0.events.0.runs.total')).toBe('Total runs');
    expect(formatValidationField('events.3.custom_metric')).toBe('Custom metric');
  });

  it('describes immediate validation locations without exposing raw field paths', () => {
    expect(
      formatApiValidationLocation(
        {
          code: 'INVALID_FIELD',
          message: 'Expected number, received string',
          field: 'events.0.runs.total',
          eventIndex: 0,
        },
        false,
      ),
    ).toBe('Event 1 — Total runs');

    expect(
      formatApiValidationLocation(
        {
          code: 'INVALID_FILE_ROW',
          message: 'Expected number, received string',
          field: 'events.1.overNumber',
          eventIndex: 1,
        },
        true,
      ),
    ).toBe('Row 2 — Over number');
  });

  it('turns local UUID schema failures into a readable field instruction', () => {
    expect(formatSchemaValidationFailure('Invalid uuid', 'events.0.eventId')).toBe(
      'Event identifier: This identifier is not in the expected format.',
    );
    expect(
      formatSchemaValidationFailure(
        'Event identifiers must be UUIDs so retries and accidental duplicates can be detected.',
        'events.0.eventId',
      ),
    ).toBe('Event identifier: This identifier is not in the expected format.');
  });

  it('rewrites common schema diagnostics as plain instructions', () => {
    expect(
      formatApiValidationMessage({
        code: 'INVALID_FIELD',
        message: 'Expected number, received string',
        field: 'events.0.runs.total',
        eventIndex: 0,
      }),
    ).toBe('Use a number here instead of text.');

    expect(
      formatApiValidationMessage({
        code: 'INVALID_FIELD',
        message: 'Required',
        field: 'events.0.ballNumber',
        eventIndex: 0,
      }),
    ).toBe('This value is required.');
  });

  it('gives batch rule codes readable labels and actionable next steps', () => {
    expect(validationRuleLabel('EVENT_SCHEMA_INVALID')).toBe('Event data needs correction');
    expect(validationRuleLabel('REFERENCE_AMBIGUOUS')).toBe('More than one match was found');
    expect(validationRuleLabel('SOME_NEW_RULE')).toBe('Validation problem');

    expect(
      formatBatchValidationMessage(
        'EVENT_SCHEMA_INVALID',
        'Runs total does not match its components.',
      ),
    ).toBe(
      'Runs total does not match its components. Check this source value and correct it before resubmitting.',
    );
    expect(
      formatBatchValidationMessage(
        'REFERENCE_AMBIGUOUS',
        'More than one participant is named A. Smith.',
      ),
    ).toBe(
      'More than one participant is named A. Smith. Choose the correct match before continuing.',
    );
  });
});
