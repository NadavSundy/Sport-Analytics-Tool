import {
  DIRECT_SUBMISSION_SCHEMA_VERSION,
  submissionRequestSchema,
  submissionResponseSchema,
  type Fixture,
  type SubmissionEvent,
  type SubmissionResponse,
} from '@sport-analytics/contracts';
import type { AuthenticatedApiClient } from '../../api/client';
import { publicReadApi } from '../../api/public-read';

class SubmissionInterfaceContractError extends Error {
  constructor() {
    super('The API returned an unexpected response. Please try again.');
    this.name = 'SubmissionInterfaceContractError';
  }
}

export class SubmissionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubmissionInputError';
  }
}

async function listCompetitionFixtures(
  competitionId: string,
  signal?: AbortSignal,
): Promise<Fixture[]> {
  const fixtures: Fixture[] = [];
  let cursor: string | null = null;

  do {
    const parameters = new URLSearchParams({ competitionId, limit: '100' });
    if (cursor) {
      parameters.set('cursor', cursor);
    }

    const response = await publicReadApi.listFixtures(`?${parameters.toString()}`, signal);
    fixtures.push(...response.data);
    cursor = response.pagination.nextCursor;
  } while (cursor);

  return fixtures;
}

export async function listAllFixtures(signal?: AbortSignal): Promise<Fixture[]> {
  const fixtures: Fixture[] = [];
  let cursor: string | null = null;

  do {
    const parameters = new URLSearchParams({ limit: '100' });
    if (cursor) {
      parameters.set('cursor', cursor);
    }

    const response = await publicReadApi.listFixtures(`?${parameters.toString()}`, signal);
    fixtures.push(...response.data);
    cursor = response.pagination.nextCursor;
  } while (cursor);

  return fixtures.sort(
    (left, right) =>
      left.startDate.localeCompare(right.startDate) ||
      left.fixtureId.localeCompare(right.fixtureId),
  );
}

export async function listScopedFixtures(
  competitionIds: string[],
  signal?: AbortSignal,
): Promise<Fixture[]> {
  const fixtureGroups = await Promise.all(
    competitionIds.map((competitionId) => listCompetitionFixtures(competitionId, signal)),
  );
  const fixturesById = new Map<string, Fixture>();

  for (const fixture of fixtureGroups.flat()) {
    if (fixture.competitionId && competitionIds.includes(fixture.competitionId)) {
      fixturesById.set(fixture.fixtureId, fixture);
    }
  }

  return [...fixturesById.values()].sort(
    (left, right) =>
      left.startDate.localeCompare(right.startDate) ||
      left.fixtureId.localeCompare(right.fixtureId),
  );
}

export async function submitEvents(
  client: AuthenticatedApiClient,
  fixtureId: string,
  eventJson: string,
): Promise<{ response: SubmissionResponse; events: SubmissionEvent[] }> {
  let events: unknown;

  try {
    events = JSON.parse(eventJson) as unknown;
  } catch {
    throw new SubmissionInputError('Enter valid JSON before submitting.');
  }

  if (!Array.isArray(events)) {
    throw new SubmissionInputError('The event JSON must be an array of delivery events.');
  }

  const payload = {
    fixtureId,
    schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
    events: events as SubmissionEvent[],
  };
  const response = await client.request<unknown>('/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const parsed = submissionResponseSchema.safeParse(response);
  const acceptedPayload = submissionRequestSchema.safeParse(payload);

  if (!parsed.success || !acceptedPayload.success) {
    throw new SubmissionInterfaceContractError();
  }

  return { response: parsed.data, events: acceptedPayload.data.events };
}

export async function submitSubmissionFile(
  client: AuthenticatedApiClient,
  file: File,
): Promise<SubmissionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await client.request<unknown>('/submissions/uploads', {
    method: 'POST',
    body: formData,
  });
  const parsed = submissionResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new SubmissionInterfaceContractError();
  }

  return parsed.data;
}
