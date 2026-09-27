import {
  datasetReleaseResponseSchema,
  datasetReleaseJobResponseSchema,
  type CreateDatasetRelease,
  type DatasetRelease,
  type DatasetReleaseJob,
} from '@sport-analytics/contracts';

import type { AuthenticatedApiClient } from '../../api/client';

export class AdminDatasetReleaseContractError extends Error {
  constructor() {
    super('The API returned an unexpected dataset release response. Please try again.');
    this.name = 'AdminDatasetReleaseContractError';
  }
}

export type AdministratorDatasetReleaseResult =
  | { kind: 'existing-release'; release: DatasetRelease }
  | { kind: 'generation-job'; job: DatasetReleaseJob };

export async function createAdministratorDatasetRelease(
  client: AuthenticatedApiClient,
  request: CreateDatasetRelease,
): Promise<AdministratorDatasetReleaseResult> {
  const response = await client.requestWithStatus<unknown>('/admin/dataset-releases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (response.status === 200) {
    const parsed = datasetReleaseResponseSchema.safeParse(response.body);
    if (parsed.success) return { kind: 'existing-release', release: parsed.data.data };
  } else if (response.status === 202) {
    const parsed = datasetReleaseJobResponseSchema.safeParse(response.body);
    if (parsed.success) return { kind: 'generation-job', job: parsed.data.data };
  }
  throw new AdminDatasetReleaseContractError();
}

export async function getAdministratorDatasetReleaseJob(
  client: AuthenticatedApiClient,
  jobId: string,
  signal?: AbortSignal,
): Promise<DatasetReleaseJob> {
  const response = await client.request<unknown>(
    `/admin/dataset-release-jobs/${encodeURIComponent(jobId)}`,
    signal ? { signal } : {},
  );
  const parsed = datasetReleaseJobResponseSchema.safeParse(response);
  if (!parsed.success) throw new AdminDatasetReleaseContractError();
  return parsed.data.data;
}
