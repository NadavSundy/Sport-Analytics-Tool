import { describe, expect, test } from 'vitest';

import { healthResponseSchema } from '../health';

describe('healthResponseSchema', () => {
  test('accepts a valid health response', () => {
    const input = {
      status: 'ok' as const,
      service: 'sport-analytics-api',
      timestamp: '2026-08-06T15:00:00.000Z',
    };

    const result = healthResponseSchema.safeParse(input);

    expect(result).toEqual({
      success: true,
      data: input,
    });
  });

  test('rejects an invalid health response', () => {
    const result = healthResponseSchema.safeParse({
      status: 123,
    });

    expect(result.success).toBe(false);
  });
});
