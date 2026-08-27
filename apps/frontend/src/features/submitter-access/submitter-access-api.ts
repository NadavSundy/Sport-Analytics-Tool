import {
  submitterAccessRequestResponseSchema,
  type Competition,
  type SubmitterAccessRequestResponse,
} from '@sport-analytics/contracts';
import type { AuthenticatedApiClient } from '../../api/client';
import { publicReadApi } from '../../api/public-read';

export class SubmitterAccessContractError extends Error {
  constructor() {
    super('The API returned an unexpected submitter access response. Please try again.');
    this.name = 'SubmitterAccessContractError';
  }
}

export class SubmitterAccessCompetitionOptionsError extends Error {
  constructor() {
    super('Available competitions could not be loaded. Please try again.');
    this.name = 'SubmitterAccessCompetitionOptionsError';
  }
}

export async function listRequestableCompetitions(signal?: AbortSignal): Promise<Competition[]> {
  const competitions: Competition[] = [];
  let cursor: string | null = null;

  try {
    do {
      const parameters = new URLSearchParams({ limit: '100' });
      if (cursor) {
        parameters.set('cursor', cursor);
      }

      const response = await publicReadApi.listCompetitions(`?${parameters.toString()}`, signal);
      competitions.push(...response.data);
      cursor = response.pagination.nextCursor;
    } while (cursor);
  } catch {
    throw new SubmitterAccessCompetitionOptionsError();
  }

  return competitions.sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.competitionId.localeCompare(right.competitionId),
  );
}

export async function requestSubmitterAccess(
  client: AuthenticatedApiClient,
  competitionId: string,
): Promise<SubmitterAccessRequestResponse> {
  const response = await client.request<unknown>('/submitter-access-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ competitionId }),
  });
  const parsed = submitterAccessRequestResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new SubmitterAccessContractError();
  }

  return parsed.data;
}
