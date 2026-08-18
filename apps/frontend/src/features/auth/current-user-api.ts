import {
  currentUserProfileResponseSchema,
  type CurrentUserProfile,
} from '@sport-analytics/contracts';
import type { AuthenticatedApiClient } from '../../api/client';

export class CurrentUserContractError extends Error {
  constructor() {
    super('The API returned an unexpected account response. Please try again.');
    this.name = 'CurrentUserContractError';
  }
}

export async function getCurrentUserProfile(
  client: AuthenticatedApiClient,
  signal?: AbortSignal,
): Promise<CurrentUserProfile> {
  const response = await client.request<unknown>('/auth/me', signal ? { signal } : {});
  const parsed = currentUserProfileResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new CurrentUserContractError();
  }

  return parsed.data.user;
}
