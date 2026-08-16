import {
  submitterAccessRequestResponseSchema,
  type SubmitterAccessRequestResponse,
} from '@sport-analytics/contracts';
import type { AuthenticatedApiClient } from '../../api/client';

export class SubmitterAccessContractError extends Error {
  constructor() {
    super('The API returned an unexpected submitter access response. Please try again.');
    this.name = 'SubmitterAccessContractError';
  }
}

export async function requestSubmitterAccess(
  client: AuthenticatedApiClient,
): Promise<SubmitterAccessRequestResponse> {
  const response = await client.request<unknown>('/submitter-access-requests', {
    method: 'POST',
  });
  const parsed = submitterAccessRequestResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new SubmitterAccessContractError();
  }

  return parsed.data;
}
