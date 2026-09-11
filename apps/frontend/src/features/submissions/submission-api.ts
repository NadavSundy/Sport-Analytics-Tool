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
import { formatSchemaValidationFailure } from './submission-validation-copy';

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

  return fixtures
    .filter((fixture) => fixture.competitionId !== null)
    .sort(
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

export function createTechnicalBatchFile(
  fixture: Fixture,
  eventJson: string,
  packageKey: string,
): File {
  let events: unknown;

  try {
    events = JSON.parse(eventJson) as unknown;
  } catch {
    throw new SubmissionInputError('Enter valid JSON before submitting.');
  }

  const acceptedPayload = submissionRequestSchema.safeParse({
    fixtureId: fixture.fixtureId,
    schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
    events,
  });

  if (!acceptedPayload.success) {
    const issue = acceptedPayload.error.issues[0];
    throw new SubmissionInputError(
      issue
        ? formatSchemaValidationFailure(issue.message, issue.path.join('.'))
        : 'The technical JSON is invalid.',
    );
  }

  if (!fixture.competitionId || !fixture.competitionName) {
    throw new SubmissionInputError('Select an available fixture before submitting.');
  }

  const innings = new Map<string, SubmissionEvent[]>();
  for (const event of acceptedPayload.data.events) {
    const group = innings.get(event.inningsId) ?? [];
    group.push(event);
    innings.set(event.inningsId, group);
  }

  const participant = (participantId: string) => ({
    sourceId: `app:participant:${participantId}`,
  });

  const packagePayload = {
    contractVersion: '1.0',
    packageId: `app:package:${packageKey}`,
    competition: { context: { name: fixture.competitionName } },
    season: { context: { name: fixture.season } },
    fixtures: [
      {
        sourceId: `app:fixture:${fixture.fixtureId}`,
        innings: [...innings.entries()].map(([inningsId, inningsEvents]) => ({
          sourceId: `app:innings:${inningsId}`,
          events: inningsEvents.map((event) => ({
            eventId: `app:delivery:${event.eventId}`,
            occurrenceSequence: event.sequenceNumber,
            overNumber: event.overNumber,
            positionInOver: event.positionInOver,
            ballLabel: event.ballNumber,
            operation: 'upsert' as const,
            striker: participant(event.strikerId),
            nonStriker: participant(event.nonStrikerId),
            bowler: participant(event.bowlerId),
            runs: event.runs,
            extras: event.extras,
            wickets: event.wickets.map((wicket) => ({
              kind: wicket.kind,
              playerOut: participant(wicket.playerOutId),
              fielders: wicket.fielders.map((fielder) => ({
                ...(fielder.participantId
                  ? { participant: participant(fielder.participantId) }
                  : {}),
                substitute: fielder.substitute,
              })),
            })),
          })),
        })),
      },
    ],
  };

  return new File([JSON.stringify(packagePayload)], `technical-${fixture.fixtureId}.json`, {
    type: 'application/json',
  });
}

export async function submitLegacyAdminEvents(
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

  const payload = {
    fixtureId,
    schemaVersion: DIRECT_SUBMISSION_SCHEMA_VERSION,
    events,
  };
  const acceptedPayload = submissionRequestSchema.safeParse(payload);
  if (!acceptedPayload.success) {
    const issue = acceptedPayload.error.issues[0];
    throw new SubmissionInputError(
      issue
        ? formatSchemaValidationFailure(issue.message, issue.path.join('.'))
        : 'The technical JSON is invalid.',
    );
  }

  const response = await client.request<unknown>('/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(acceptedPayload.data),
  });
  const parsed = submissionResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error('The direct submission API returned an invalid response.');
  }

  return { response: parsed.data, events: acceptedPayload.data.events };
}
