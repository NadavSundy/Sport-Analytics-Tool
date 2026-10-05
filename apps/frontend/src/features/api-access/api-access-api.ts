import {
  administratorApiConsumerUsageResponseSchema,
  apiAccessOverviewResponseSchema,
  apiAccessRequestResponseSchema,
  apiConsumerRotateResponseSchema,
  type ApiAccessRequestCreate,
  type ApiConsumer,
} from '@sport-analytics/contracts';

import type { AuthenticatedApiClient } from '../../api/client';

export async function getApiAccess(client: AuthenticatedApiClient, signal?: AbortSignal) {
  return apiAccessOverviewResponseSchema.parse(
    await client.request('/account/api-access', signal ? { signal } : {}),
  ).data;
}
export async function requestApiAccess(
  client: AuthenticatedApiClient,
  input: ApiAccessRequestCreate,
) {
  return apiAccessRequestResponseSchema.parse(
    await client.request('/account/api-access/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  ).data;
}
async function keyAction(
  client: AuthenticatedApiClient,
  consumerId: string,
  rotate: boolean,
): Promise<ApiConsumer & { apiKey: string }> {
  const suffix = rotate ? '/rotate' : '';
  return apiConsumerRotateResponseSchema.parse(
    await client.request(`/account/api-consumers/${encodeURIComponent(consumerId)}/keys${suffix}`, {
      method: 'POST',
    }),
  ).data;
}
export const generateApiKey = (client: AuthenticatedApiClient, id: string) =>
  keyAction(client, id, false);
export const rotateApiKey = (client: AuthenticatedApiClient, id: string) =>
  keyAction(client, id, true);
export async function revokeApiKey(
  client: AuthenticatedApiClient,
  consumerId: string,
  keyId: string,
) {
  await client.request(
    `/account/api-consumers/${encodeURIComponent(consumerId)}/keys/${encodeURIComponent(keyId)}`,
    { method: 'DELETE' },
  );
}
export async function getApiUsage(
  client: AuthenticatedApiClient,
  consumerId: string,
  query: { from: string; to: string; limit?: number },
) {
  const parameters = new URLSearchParams({ from: query.from, to: query.to });
  if (query.limit !== undefined) parameters.set('limit', String(query.limit));
  return administratorApiConsumerUsageResponseSchema.parse(
    await client.request(
      `/account/api-consumers/${encodeURIComponent(consumerId)}/usage?${parameters.toString()}`,
    ),
  ).data;
}
