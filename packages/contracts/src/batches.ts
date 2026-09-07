import { z } from 'zod';

import { apiDateTimeSchema, apiIdentifierSchema, createResourceResponseSchema } from './api';

export const BATCH_PACKAGE_VERSION = '1.0' as const;
export const BATCH_MEDIA_TYPES = ['application/json', 'text/csv', 'application/x-ndjson'] as const;
export const BATCH_STATES = [
  'received',
  'stored',
  'validating',
  'rejected',
  'awaiting_review',
  'publishing',
  'published',
  'partially_published',
  'failed',
  'superseded',
] as const;

export const batchReferenceSchema = z.string().uuid();
export const batchMetadataSchema = z
  .object({
    competitionId: apiIdentifierSchema.regex(/^[1-9]\d*$/, 'Expected a positive competition ID.'),
    idempotencyKey: z.string().trim().min(1).max(255),
    packageVersion: z.literal(BATCH_PACKAGE_VERSION),
    fileName: z.string().trim().min(1).max(255),
    mediaType: z.enum(BATCH_MEDIA_TYPES),
  })
  .strict();

export const batchReceiptSchema = z
  .object({
    batchReference: batchReferenceSchema,
    status: z.enum(['stored', 'received']),
    statusUrl: z.string().startsWith('/api/v1/batches/'),
    receivedAt: apiDateTimeSchema,
  })
  .strict();

export const batchReceiptResponseSchema = createResourceResponseSchema(batchReceiptSchema);

export const batchStatusSchema = z
  .object({
    batchReference: batchReferenceSchema,
    status: z.enum(BATCH_STATES),
    statusUrl: z.string().startsWith('/api/v1/batches/'),
    receivedAt: apiDateTimeSchema,
    updatedAt: apiDateTimeSchema,
    progress: z
      .object({
        total: z.number().int().nonnegative(),
        processed: z.number().int().nonnegative(),
        accepted: z.number().int().nonnegative(),
        rejected: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const batchStatusResponseSchema = createResourceResponseSchema(batchStatusSchema);

export type BatchMetadata = z.infer<typeof batchMetadataSchema>;
export type BatchReceiptResponse = z.infer<typeof batchReceiptResponseSchema>;
export type BatchStatusResponse = z.infer<typeof batchStatusResponseSchema>;
