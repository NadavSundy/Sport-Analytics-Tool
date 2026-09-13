import {
  BATCH_PACKAGE_VERSION,
  batchReceiptResponseSchema,
  batchReferenceMappingResponseSchema,
  batchListResponseSchema,
  batchReportDownloadResponseSchema,
  batchReportResponseSchema,
  batchReviewResponseSchema,
  batchStatusResponseSchema,
  type BatchListResponse,
  type BatchReceiptResponse,
  type BatchReferenceMappingRequest,
  type BatchCanonicalFixtureRequest,
  type BatchReferenceMappingResponse,
  type BatchReportResponse,
  type BatchReviewRequest,
  type BatchReviewResponse,
  type BatchConflictResolutionRequest,
  type BatchStatusResponse,
} from '@sport-analytics/contracts';

import type { AuthenticatedApiClient } from '../../api/client';

export const MAX_BATCH_BYTES = 50 * 1024 * 1024;

/** Stable for the same bytes and authorised competition, including after a page refresh. */
export async function batchUploadIdempotencyKey(
  competitionId: string,
  file: File,
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new BatchUploadInputError('This browser cannot securely identify the upload for retry.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const checksum = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `batch-upload:${competitionId}:${checksum}`;
}

const mediaTypesByExtension = {
  csv: 'text/csv',
  json: 'application/json',
  ndjson: 'application/x-ndjson',
} as const;

export class BatchUploadInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BatchUploadInputError';
  }
}

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

export async function listAdminBatches(
  client: AuthenticatedApiClient,
  cursor?: string,
  status?: string,
  signal?: AbortSignal,
): Promise<BatchListResponse> {
  const parameters = new URLSearchParams();
  if (cursor) parameters.set('cursor', cursor);
  if (status) parameters.set('status', status);
  const query = parameters.size > 0 ? `?${parameters.toString()}` : '';
  return parse(
    await client.request<unknown>(`/admin/batches${query}`, signal ? { signal } : {}),
    batchListResponseSchema,
  );
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

export async function createBatchCanonicalFixture(
  client: AuthenticatedApiClient,
  batchReference: string,
  request: BatchCanonicalFixtureRequest,
) {
  return parse(
    await client.request<unknown>(
      `/batches/${encodeURIComponent(batchReference)}/canonical-fixtures`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
    ),
    batchReferenceMappingResponseSchema,
  );
}

export async function uploadBatch(
  client: AuthenticatedApiClient,
  competitionId: string,
  file: File,
  idempotencyKey: string,
): Promise<BatchReceiptResponse> {
  const extension = file.name.split('.').pop()?.toLowerCase() as
    keyof typeof mediaTypesByExtension | undefined;
  const mediaType = extension ? mediaTypesByExtension[extension] : undefined;

  if (!mediaType) {
    throw new BatchUploadInputError('Choose a JSON, CSV, or NDJSON package.');
  }
  if (file.size > MAX_BATCH_BYTES) {
    throw new BatchUploadInputError('The package is larger than the 50 MB upload limit.');
  }

  return parse(
    await client.request<unknown>('/batches', {
      method: 'POST',
      headers: {
        'Content-Type': mediaType,
        'Idempotency-Key': idempotencyKey,
        'X-Batch-Package-Version': BATCH_PACKAGE_VERSION,
        'X-Competition-Id': competitionId,
        'X-File-Name': file.name,
      },
      body: file,
    }),
    batchReceiptResponseSchema,
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

export async function resolvePublishedConflict(
  client: AuthenticatedApiClient,
  batchReference: string,
  resolution: BatchConflictResolutionRequest,
): Promise<BatchStatusResponse> {
  return parse(
    await client.request<unknown>(
      `/batches/${encodeURIComponent(batchReference)}/conflicts/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolution),
      },
    ),
    batchStatusResponseSchema,
  );
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
