import {
  administratorSubmitterAccessResponseSchema,
  administratorUserManagementResponseSchema,
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
