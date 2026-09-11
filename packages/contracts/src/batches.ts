import { z } from 'zod';

import {
  apiDateTimeSchema,
  apiIdentifierSchema,
  createCollectionResponseSchema,
  createResourceResponseSchema,
  paginationQuerySchema,
} from './api';
import { sourceIdentifierSchema } from './season-upload';

export const BATCH_PACKAGE_VERSION = '1.0' as const;
export const BATCH_MEDIA_TYPES = ['application/json', 'text/csv', 'application/x-ndjson'] as const;
export const BATCH_STATES = [
  'received',
  'stored',
  'validating',
  'rejected',
  'awaiting_review',
  'correction_requested',
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

export const BATCH_REVIEW_DECISIONS = ['approved', 'rejected', 'returned_for_correction'] as const;

export const batchReviewDecisionSchema = z
  .object({
    decision: z.enum(BATCH_REVIEW_DECISIONS),
    actor: z
      .object({
        accountId: apiIdentifierSchema,
        displayName: z.string().nullable(),
      })
      .strict(),
    decidedAt: apiDateTimeSchema,
    reason: z.string().min(1),
  })
  .strict();

export const batchReviewRequestSchema = z
  .object({
    decision: z.enum(BATCH_REVIEW_DECISIONS),
    reason: z.string().trim().min(1).max(2000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision !== 'approved' && value.reason.length < 10) {
      context.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 10,
        type: 'string',
        inclusive: true,
        path: ['reason'],
        message: 'Explain the rejection or correction in at least 10 characters.',
      });
    }
  });

export const batchStatusSchema = z
  .object({
    batchReference: batchReferenceSchema,
    competitionId: apiIdentifierSchema,
    status: z.enum(BATCH_STATES),
    statusUrl: z.string().startsWith('/api/v1/batches/'),
    receivedAt: apiDateTimeSchema,
    updatedAt: apiDateTimeSchema,
    source: z
      .object({
        fileName: z.string().min(1).nullable(),
        checksum: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .nullable(),
        packageVersion: z.string().min(1),
        submitter: z
          .object({ accountId: apiIdentifierSchema, displayName: z.string().nullable() })
          .strict(),
      })
      .strict(),
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
    review: batchReviewDecisionSchema.nullable(),
  })
  .strict();

export const batchStatusResponseSchema = createResourceResponseSchema(batchStatusSchema);
export const batchReviewResponseSchema = createResourceResponseSchema(batchStatusSchema);

export const batchListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(BATCH_STATES).optional(),
});
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
    fixtureId: apiIdentifierSchema.nullable(),
    fixtureLabel: z.string().min(1).nullable(),
    inningsId: apiIdentifierSchema.nullable(),
    overNumber: z.number().int().nonnegative().nullable(),
    positionInOver: z.number().int().nonnegative().nullable(),
    description: z.string().min(1),
  })
  .strict();

export const batchReferenceEntityTypeSchema = z.enum([
  'competition',
  'team',
  'fixture',
  'innings',
  'participant',
]);

export const batchReferenceResolutionSchema = z
  .object({
    referencePath: z.string().min(1),
    entityType: batchReferenceEntityTypeSchema,
    state: z.enum(['ambiguous', 'unresolved', 'invalid']),
    submittedReference: z.unknown(),
    reason: z.string().min(1).nullable(),
    requiredAction: z.enum(['select_candidate', 'contact_reviewer']),
    candidates: z.array(
      z
        .object({
          candidateReference: z.string().uuid(),
          label: z.string().min(1),
        })
        .strict(),
    ),
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
    operation: z.enum(['upsert', 'correction']).default('upsert'),
    correctionTarget: z
      .object({
        sourceEventId: sourceIdentifierSchema,
        resolvedDeliveryId: apiIdentifierSchema.nullable(),
      })
      .strict()
      .nullable()
      .default(null),
    referenceResolutions: z.array(batchReferenceResolutionSchema),
    errors: z.array(batchReportErrorSchema),
  })
  .strict();

export const batchReportRuleGroupSchema = z
  .object({
    ruleCode: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    count: z.number().int().positive(),
  })
  .strict();

export const batchFixtureSummarySchema = z
  .object({
    fixtureId: apiIdentifierSchema.nullable(),
    label: z.string().min(1),
    total: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    unresolved: z.number().int().nonnegative(),
  })
  .strict();

export const batchReviewSummarySchema = z
  .object({
    validation: z
      .object({
        accepted: z.number().int().nonnegative(),
        rejected: z.number().int().nonnegative(),
        blockingErrors: z.number().int().nonnegative(),
        duplicate: z.number().int().nonnegative(),
        conflicting: z.number().int().nonnegative(),
      })
      .strict(),
    resolution: z
      .object({
        resolved: z.number().int().nonnegative(),
        ambiguous: z.number().int().nonnegative(),
        unresolved: z.number().int().nonnegative(),
        invalid: z.number().int().nonnegative(),
        proposed: z.number().int().nonnegative(),
      })
      .strict(),
    approvalBlocked: z.boolean(),
    blockingReasons: z.array(z.string().min(1)),
  })
  .strict();

export const batchReportSchema = z
  .object({
    batch: batchStatusSchema,
    errorGroups: z.array(batchReportRuleGroupSchema),
    reviewSummary: batchReviewSummarySchema,
    fixtureSummaries: z.array(batchFixtureSummarySchema),
    acceptedSamples: z.array(batchReportItemSchema).max(15),
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

export const batchReferenceMappingRequestSchema = z
  .object({
    itemOrdinal: z.number().int().nonnegative(),
    referencePath: z.string().trim().min(1).max(1_000),
    candidateReference: z.string().uuid(),
    decisionKey: z.string().trim().min(1).max(255),
  })
  .strict();

export const batchCanonicalFixtureRequestSchema = z
  .object({
    itemOrdinal: z.number().int().nonnegative(),
    referencePath: z.string().trim().min(1).max(1_000),
    decisionKey: z.string().trim().min(1).max(255),
  })
  .strict();

export const batchReferenceMappingReceiptSchema = z
  .object({
    batchReference: batchReferenceSchema,
    decisionReference: z.string().uuid(),
    status: z.enum(['queued', 'applied']),
    statusUrl: z.string().startsWith('/api/v1/batches/'),
    submittedAt: apiDateTimeSchema,
  })
  .strict();

export const batchReferenceMappingResponseSchema = createResourceResponseSchema(
  batchReferenceMappingReceiptSchema,
);

export type BatchMetadata = z.infer<typeof batchMetadataSchema>;
export type BatchReceiptResponse = z.infer<typeof batchReceiptResponseSchema>;
export type BatchStatusResponse = z.infer<typeof batchStatusResponseSchema>;
export type BatchReviewDecision = z.infer<typeof batchReviewDecisionSchema>;
export type BatchReviewRequest = z.infer<typeof batchReviewRequestSchema>;
export type BatchReviewResponse = z.infer<typeof batchReviewResponseSchema>;
export type BatchStatus = z.infer<typeof batchStatusSchema>;
export type BatchListQuery = z.infer<typeof batchListQuerySchema>;
export type BatchListResponse = z.infer<typeof batchListResponseSchema>;
export type BatchReportQuery = z.infer<typeof batchReportQuerySchema>;
export type BatchReportItem = z.infer<typeof batchReportItemSchema>;
export type BatchReportRuleGroup = z.infer<typeof batchReportRuleGroupSchema>;
export type BatchFixtureSummary = z.infer<typeof batchFixtureSummarySchema>;
export type BatchReportResponse = z.infer<typeof batchReportResponseSchema>;
export type BatchReportDownloadResponse = z.infer<typeof batchReportDownloadResponseSchema>;
export type BatchReferenceEntityType = z.infer<typeof batchReferenceEntityTypeSchema>;
export type BatchReferenceMappingRequest = z.infer<typeof batchReferenceMappingRequestSchema>;
export type BatchCanonicalFixtureRequest = z.infer<typeof batchCanonicalFixtureRequestSchema>;
export type BatchReferenceMappingResponse = z.infer<typeof batchReferenceMappingResponseSchema>;
