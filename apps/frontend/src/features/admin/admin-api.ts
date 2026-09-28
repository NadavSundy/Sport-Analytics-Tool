import {
  administratorApiConsumerUsageResponseSchema,
  administratorSubmitterAccessResponseSchema,
  administratorUserManagementResponseSchema,
  apiConsumerIssueResponseSchema,
  apiConsumerListResponseSchema,
  apiConsumerRotateResponseSchema,
  type ApiConsumer,
  type ApiConsumerIssue,
  type AdministratorApiConsumerUsageResponse,
  type AdministratorManagedUser,
  type AdministratorRoleUpdate,
  type AdministratorSubmitterAccessUpdate,
  type AdministratorUserManagementResponse,
} from '@sport-analytics/contracts';

import type { AuthenticatedApiClient } from '../../api/client';

export class AdminUserManagementContractError extends Error {
  constructor() {
    super('The API returned an unexpected administrator response. Please try again.');
    this.name = 'AdminUserManagementContractError';
  }
}

export class AdminApiConsumerContractError extends Error {
  constructor() {
    super('The API returned an unexpected API consumer response. Please try again.');
    this.name = 'AdminApiConsumerContractError';
  }
}

export async function getAdministratorApiConsumers(
  client: AuthenticatedApiClient,
  signal?: AbortSignal,
): Promise<ApiConsumer[]> {
  const response = await client.request<unknown>('/admin/api-consumers', signal ? { signal } : {});
  const parsed = apiConsumerListResponseSchema.safeParse(response);
  if (!parsed.success) throw new AdminApiConsumerContractError();
  return parsed.data.data.consumers;
}

export async function getAdministratorApiConsumerUsage(
  client: AuthenticatedApiClient,
  consumerId: string,
  query: { from?: string; to?: string; limit?: number } = {},
  signal?: AbortSignal,
): Promise<AdministratorApiConsumerUsageResponse['data']> {
  const parameters = new URLSearchParams();
  if (query.from) parameters.set('from', query.from);
  if (query.to) parameters.set('to', query.to);
  if (query.limit !== undefined) parameters.set('limit', String(query.limit));
  const suffix = parameters.size > 0 ? `?${parameters.toString()}` : '';
  const response = await client.request<unknown>(
    `/admin/api-consumers/${encodeURIComponent(consumerId)}/usage${suffix}`,
    signal ? { signal } : {},
  );
  const parsed = administratorApiConsumerUsageResponseSchema.safeParse(response);
  if (!parsed.success) throw new AdminApiConsumerContractError();
  return parsed.data.data;
}

export async function createAdministratorApiConsumer(
  client: AuthenticatedApiClient,
  issue: ApiConsumerIssue,
): Promise<ApiConsumer & { apiKey: string }> {
  const response = await client.request<unknown>('/admin/api-consumers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issue),
  });
  const parsed = apiConsumerIssueResponseSchema.safeParse(response);
  if (!parsed.success) throw new AdminApiConsumerContractError();
  return parsed.data.data;
}

export async function rotateAdministratorApiConsumerKey(
  client: AuthenticatedApiClient,
  consumerId: string,
): Promise<ApiConsumer & { apiKey: string }> {
  const response = await client.request<unknown>(
    `/admin/api-consumers/${encodeURIComponent(consumerId)}/keys/rotate`,
    { method: 'POST' },
  );
  const parsed = apiConsumerRotateResponseSchema.safeParse(response);
  if (!parsed.success) throw new AdminApiConsumerContractError();
  return parsed.data.data;
}

export async function revokeAdministratorApiConsumerKey(
  client: AuthenticatedApiClient,
  consumerId: string,
  keyId: string,
): Promise<void> {
  await client.request<void>(
    `/admin/api-consumers/${encodeURIComponent(consumerId)}/keys/${encodeURIComponent(keyId)}`,
    { method: 'DELETE' },
  );
}

export async function updateAdministratorUserRole(
  client: AuthenticatedApiClient,
  userId: string,
  update: AdministratorRoleUpdate,
): Promise<AdministratorManagedUser> {
  const response = await client.request<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    },
  );
  const parsed = administratorSubmitterAccessResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new AdminUserManagementContractError();
  }

  return parsed.data.data;
}

export async function getAdministratorUserManagement(
  client: AuthenticatedApiClient,
  signal?: AbortSignal,
): Promise<AdministratorUserManagementResponse['data']> {
  const response = await client.request<unknown>('/admin/users', signal ? { signal } : {});
  const parsed = administratorUserManagementResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new AdminUserManagementContractError();
  }

  return parsed.data.data;
}

export async function updateAdministratorSubmitterAccess(
  client: AuthenticatedApiClient,
  userId: string,
  update: AdministratorSubmitterAccessUpdate,
): Promise<AdministratorManagedUser> {
  const response = await client.request<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/submitter-access`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    },
  );
  const parsed = administratorSubmitterAccessResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new AdminUserManagementContractError();
  }

  return parsed.data.data;
}

export async function rejectAdministratorSubmitterAccessRequest(
  client: AuthenticatedApiClient,
  userId: string,
): Promise<AdministratorManagedUser> {
  const response = await client.request<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/submitter-access/rejection`,
    { method: 'POST' },
  );
  const parsed = administratorSubmitterAccessResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new AdminUserManagementContractError();
  }

  return parsed.data.data;
}
