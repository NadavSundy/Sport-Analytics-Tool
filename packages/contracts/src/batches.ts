import { z } from 'zod';

import {
  apiDateTimeSchema,
  apiIdentifierSchema,
  createCollectionResponseSchema,
  createResourceResponseSchema,
  paginationQuerySchema,
} from './api';

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
    counts: z
      .object({
        accepted: z.number().int().nonnegative(),
        rejected: z.number().int().nonnegative(),
        unresolved: z.number().int().nonnegative(),
        duplicate: z.number().int().nonnegative(),
        conflicting: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const batchStatusResponseSchema = createResourceResponseSchema(batchStatusSchema);

export const batchListQuerySchema = paginationQuerySchema;
export const batchListResponseSchema = createCollectionResponseSchema(batchStatusSchema);

export const batchReportQuerySchema = paginationQuerySchema;

export const batchReportLocationSchema = z
  .object({
    filePath: z.string().nullable(),
    sheetName: z.string().nullable(),
    rowNumber: z.number().int().positive().nullable(),
    jsonPath: z.string().nullable(),
    ordinal: z.number().int().nonnegative(),
  })
  .strict();

export const batchReportContextSchema = z
  .object({
    eventReference: z.string().nullable(),
    inningsId: apiIdentifierSchema.nullable(),
    overNumber: z.number().int().nonnegative().nullable(),
    positionInOver: z.number().int().positive().nullable(),
    description: z.string().min(1),
  })
  .strict();

export const batchReportErrorSchema = z
  .object({
    ruleCode: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    message: z.string().min(1),
    location: batchReportLocationSchema,
    context: batchReportContextSchema,
  })
  .strict();

export const batchReportItemSchema = z
  .object({
    ordinal: z.number().int().nonnegative(),
    outcome: z.enum(['pending', 'accepted', 'rejected', 'unresolved', 'duplicate', 'conflicting']),
    location: batchReportLocationSchema,
    context: batchReportContextSchema,
    stagedRecordId: apiIdentifierSchema.nullable(),
    acceptedRecordId: apiIdentifierSchema.nullable(),
    errors: z.array(batchReportErrorSchema),
  })
  .strict();

export const batchReportRuleGroupSchema = z
  .object({
    ruleCode: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    count: z.number().int().positive(),
  })
  .strict();

export const batchReportSchema = z
  .object({
    batch: batchStatusSchema,
    errorGroups: z.array(batchReportRuleGroupSchema),
    items: z.array(batchReportItemSchema),
    pagination: z.object({ nextCursor: z.string().min(1).nullable() }).strict(),
    downloadUrl: z.string().startsWith('/api/v1/batches/'),
  })
  .strict();

export const batchReportResponseSchema = createResourceResponseSchema(batchReportSchema);

export const batchReportDownloadSchema = batchReportSchema.omit({
  pagination: true,
  downloadUrl: true,
});
export const batchReportDownloadResponseSchema =
  createResourceResponseSchema(batchReportDownloadSchema);

export type BatchMetadata = z.infer<typeof batchMetadataSchema>;
export type BatchReceiptResponse = z.infer<typeof batchReceiptResponseSchema>;
export type BatchStatusResponse = z.infer<typeof batchStatusResponseSchema>;
export type BatchStatus = z.infer<typeof batchStatusSchema>;
export type BatchListQuery = z.infer<typeof batchListQuerySchema>;
export type BatchListResponse = z.infer<typeof batchListResponseSchema>;
export type BatchReportQuery = z.infer<typeof batchReportQuerySchema>;
export type BatchReportItem = z.infer<typeof batchReportItemSchema>;
export type BatchReportRuleGroup = z.infer<typeof batchReportRuleGroupSchema>;
export type BatchReportResponse = z.infer<typeof batchReportResponseSchema>;
export type BatchReportDownloadResponse = z.infer<typeof batchReportDownloadResponseSchema>;
