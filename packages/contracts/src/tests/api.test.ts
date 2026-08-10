import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import {
  apiDateSchema,
  apiDateTimeSchema,
  apiErrorResponseSchema,
  apiIdentifierSchema,
  createCollectionResponseSchema,
  createResourceResponseSchema,
  eventSequenceSchema,
  listQuerySchema,
} from '../api';

describe('shared identifier and ordering contracts', () => {
  test('accepts opaque string identifiers', () => {
    expect(apiIdentifierSchema.parse('12345678901234567890')).toBe('12345678901234567890');

    expect(apiIdentifierSchema.parse('fixture_01JABC')).toBe('fixture_01JABC');
  });

  test('rejects an empty identifier', () => {
    expect(apiIdentifierSchema.safeParse('').success).toBe(false);
  });

  test('requires positive event sequence numbers', () => {
    expect(eventSequenceSchema.parse(1)).toBe(1);

    expect(eventSequenceSchema.safeParse(0).success).toBe(false);
  });
});

describe('shared date and time contracts', () => {
  test('accepts ISO calendar dates and UTC timestamps', () => {
    expect(apiDateSchema.parse('2026-08-09')).toBe('2026-08-09');

    expect(apiDateTimeSchema.parse('2026-08-09T12:30:00.000Z')).toBe('2026-08-09T12:30:00.000Z');
  });

  test('rejects non-ISO date values', () => {
    expect(apiDateSchema.safeParse('09/08/2026').success).toBe(false);
  });
});

describe('listQuerySchema', () => {
  test('applies pagination and sorting defaults', () => {
    expect(listQuerySchema.parse({})).toEqual({
      limit: 50,
      direction: 'asc',
    });
  });

  test('coerces an HTTP limit query parameter', () => {
    expect(
      listQuerySchema.parse({
        limit: '25',
        direction: 'desc',
      }),
    ).toEqual({
      limit: 25,
      direction: 'desc',
    });
  });

  test('rejects an excessive page size', () => {
    expect(
      listQuerySchema.safeParse({
        limit: '101',
      }).success,
    ).toBe(false);
  });
});

describe('shared response schemas', () => {
  const itemSchema = z.object({
    id: apiIdentifierSchema,
    name: z.string().min(1),
  });

  test('validates a resource response', () => {
    const schema = createResourceResponseSchema(itemSchema);

    expect(
      schema.safeParse({
        data: {
          id: '42',
          name: 'Example',
        },
      }).success,
    ).toBe(true);
  });

  test('validates a cursor-paginated collection response', () => {
    const schema = createCollectionResponseSchema(itemSchema);

    expect(
      schema.safeParse({
        data: [
          {
            id: '42',
            name: 'Example',
          },
        ],
        pagination: {
          nextCursor: 'opaque-next-cursor',
        },
      }).success,
    ).toBe(true);
  });

  test('validates field-level and event-level errors', () => {
    expect(
      apiErrorResponseSchema.safeParse({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The request is invalid.',
          details: [
            {
              code: 'OUT_OF_RANGE',
              field: 'limit',
              message: 'limit must be between 1 and 100.',
            },
            {
              code: 'INVALID_EVENT',
              eventIndex: 3,
              field: 'runsTotal',
              message: 'runsTotal is inconsistent with the event.',
            },
          ],
        },
      }).success,
    ).toBe(true);
  });
});
