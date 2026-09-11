import {
  datasetReleaseResponseSchema,
  type CreateDatasetRelease,
  type DatasetRelease,
} from '@sport-analytics/contracts';

import type { AuthenticatedApiClient } from '../../api/client';

export class AdminDatasetReleaseContractError extends Error {
  constructor() {
    super('The API returned an unexpected dataset release response. Please try again.');
    this.name = 'AdminDatasetReleaseContractError';
  }
}

export async function createAdministratorDatasetRelease(
  client: AuthenticatedApiClient,
  request: CreateDatasetRelease,
): Promise<DatasetRelease> {
  const response = await client.request<unknown>('/admin/dataset-releases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const parsed = datasetReleaseResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new AdminDatasetReleaseContractError();
  }

  return parsed.data.data;
}
