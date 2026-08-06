export interface CompetitionFixture {
  id: string;
  name: string;
  season: string;
}

export interface MatchFixture {
  id: string;
  competitionId: string;
  startedAt: string;
}

export interface SubmissionFixture {
  id: string;
  matchId: string;
  submittedBy: string;
  submittedAt: string;
}

export interface EventFixture {
  id: string;
  matchId: string;
  submissionId: string;
  sequenceNumber: number;
  eventType: string;
  occurredAt: string;
}

export function buildCompetition(overrides: Partial<CompetitionFixture> = {}): CompetitionFixture {
  return {
    id: 'competition-test-001',
    name: 'Test T20 Competition',
    season: '2026',
    ...overrides,
  };
}

export function buildMatch(overrides: Partial<MatchFixture> = {}): MatchFixture {
  return {
    id: 'match-test-001',
    competitionId: 'competition-test-001',
    startedAt: '2026-08-06T15:00:00.000Z',
    ...overrides,
  };
}

export function buildSubmission(overrides: Partial<SubmissionFixture> = {}): SubmissionFixture {
  return {
    id: 'submission-test-001',
    matchId: 'match-test-001',
    submittedBy: 'approved-submitter-test-user',
    submittedAt: '2026-08-06T15:05:00.000Z',
    ...overrides,
  };
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
