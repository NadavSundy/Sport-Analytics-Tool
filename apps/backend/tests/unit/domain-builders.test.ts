import { describe, expect, test } from 'vitest';

import { buildEvent } from '../fixtures/domain-builders';

describe('domain test builders', () => {
  test('allows event fixture fields to be overridden', () => {
    const event = buildEvent({
      sequenceNumber: 7,
      eventType: 'wicket',
    });

    expect(event.sequenceNumber).toBe(7);
    expect(event.eventType).toBe('wicket');
    expect(event.submissionId).toBe('submission-test-001');
  });
});
