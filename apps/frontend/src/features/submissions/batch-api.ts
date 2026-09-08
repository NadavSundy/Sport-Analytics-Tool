import {
  batchListResponseSchema,
  batchReferenceMappingResponseSchema,
  batchReportDownloadResponseSchema,
  batchReportResponseSchema,
  batchReviewResponseSchema,
  type BatchListResponse,
  type BatchReportResponse,
  type BatchReviewRequest,
  type BatchReviewResponse,
  type BatchReferenceMappingRequest,
  type BatchReferenceMappingResponse,
} from '@sport-analytics/contracts';

import type { AuthenticatedApiClient } from '../../api/client';

function parse<T>(
  value: unknown,
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success || parsed.data === undefined) {
    throw new Error('The batch API returned an invalid response.');
  }
  return parsed.data;
}

export async function listBatches(
  client: AuthenticatedApiClient,
  cursor?: string,
  status?: string,
): Promise<BatchListResponse> {
  const parameters = new URLSearchParams();
  if (cursor) parameters.set('cursor', cursor);
  if (status) parameters.set('status', status);
  const query = parameters.size > 0 ? `?${parameters.toString()}` : '';
  return parse(await client.request<unknown>(`/batches${query}`), batchListResponseSchema);
}

export async function mapBatchReference(
  client: AuthenticatedApiClient,
  batchReference: string,
  request: BatchReferenceMappingRequest,
): Promise<BatchReferenceMappingResponse> {
  return parse(
    await client.request<unknown>(
      `/batches/${encodeURIComponent(batchReference)}/reference-mappings`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
    ),
    batchReferenceMappingResponseSchema,
  );
}

export async function getBatchReport(
  client: AuthenticatedApiClient,
  batchReference: string,
  cursor?: string,
): Promise<BatchReportResponse> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return parse(
    await client.request<unknown>(`/batches/${encodeURIComponent(batchReference)}/report${query}`),
    batchReportResponseSchema,
  );
}

export async function downloadBatchReport(
  client: AuthenticatedApiClient,
  batchReference: string,
): Promise<void> {
  const response = parse(
    await client.request<unknown>(`/batches/${encodeURIComponent(batchReference)}/report/download`),
    batchReportDownloadResponseSchema,
  );
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `batch-${batchReference}-report.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function reviewBatch(
  client: AuthenticatedApiClient,
  batchReference: string,
  review: BatchReviewRequest,
): Promise<BatchReviewResponse> {
  return parse(
    await client.request<unknown>(`/batches/${encodeURIComponent(batchReference)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    }),
    batchReviewResponseSchema,
  );
}
