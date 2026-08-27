export interface EventFixture {
  id: string;
  matchId: string;
  submissionId: string;
  sequenceNumber: number;
  eventType: string;
  occurredAt: string;
}

export function buildEvent(overrides: Partial<EventFixture> = {}): EventFixture {
  return {
    id: 'event-test-001',
    matchId: 'match-test-001',
    submissionId: 'submission-test-001',
    sequenceNumber: 1,
    eventType: 'delivery',
    occurredAt: '2026-08-06T15:06:00.000Z',
    ...overrides,
  };
}
