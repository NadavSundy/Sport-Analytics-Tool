import { z } from 'zod';

import {
  apiDateTimeSchema,
  apiIdentifierSchema,
  createCollectionResponseSchema,
  createResourceResponseSchema,
  paginationQuerySchema,
} from './api';
import { submissionEventIdSchema } from './submissions';

export const provenanceSubmissionKindSchema = z.enum(['direct', 'file', 'batch']);

export const provenanceActorSchema = z
  .object({
    accountId: apiIdentifierSchema.nullable(),
    displayName: z.string().nullable(),
  })
  .strict();

export const provenanceSourceSchema = z
  .object({
    fileName: z.string().min(1).nullable(),
    mediaType: z.string().min(1).nullable(),
    sizeBytes: z.number().int().positive().nullable(),
    checksum: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    packageVersion: z.string().min(1).nullable(),
  })
  .strict();

export const provenanceLifecycleEntrySchema = z
  .object({
    fromState: z.string().min(1).nullable(),
    toState: z.string().min(1),
    at: apiDateTimeSchema,
    actorKind: z.string().min(1),
    actorIdentifier: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

export const provenanceDecisionSchema = z
  .object({
    decision: z.enum(['accepted', 'rejected', 'approved', 'returned_for_correction']),
    actor: provenanceActorSchema.nullable(),
    decidedAt: apiDateTimeSchema,
    reason: z.string().min(1).nullable(),
  })
  .strict();

export const provenanceSubmissionSchema = z
  .object({
    kind: provenanceSubmissionKindSchema,
    reference: z.string().min(1),
    submissionId: apiIdentifierSchema.nullable(),
    batchReference: z.string().uuid().nullable(),
    fixtureId: apiIdentifierSchema.nullable(),
    competitionId: apiIdentifierSchema.nullable(),
    submitter: provenanceActorSchema,
    status: z.string().min(1),
    receivedAt: apiDateTimeSchema,
    updatedAt: apiDateTimeSchema,
    eventCount: z.number().int().nonnegative(),
    source: provenanceSourceSchema,
  })
  .strict();

export const provenanceSubmissionDetailSchema = provenanceSubmissionSchema.extend({
  lifecycle: z.array(provenanceLifecycleEntrySchema),
  decisions: z.array(provenanceDecisionSchema),
});

export const provenanceSubmissionListQuerySchema = paginationQuerySchema.extend({
  kind: provenanceSubmissionKindSchema.optional(),
});

export const provenanceSubmissionListResponseSchema = createCollectionResponseSchema(
  provenanceSubmissionSchema,
);
export const provenanceSubmissionDetailResponseSchema = createResourceResponseSchema(
  provenanceSubmissionDetailSchema,
);

export const provenanceEventSourceSchema = z
  .object({
    kind: provenanceSubmissionKindSchema,
    reference: z.string().min(1),
    submissionId: apiIdentifierSchema,
    batchReference: z.string().uuid().nullable(),
    batchItemId: apiIdentifierSchema.nullable(),
    submissionEventOrdinal: z.number().int().nonnegative().nullable(),
    submitter: provenanceActorSchema,
    checksum: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    decision: provenanceDecisionSchema.nullable(),
  })
  .strict();

export const provenanceCorrectionSchema = z
  .object({
    correctionId: apiIdentifierSchema,
    requester: provenanceActorSchema,
    correctedAt: apiDateTimeSchema,
    reason: z.string().min(1),
    review: provenanceDecisionSchema.nullable(),
  })
  .strict();

export const eventProvenanceRevisionSchema = z
  .object({
    deliveryId: apiIdentifierSchema,
    revision: z.number().int().positive(),
    recordedAt: apiDateTimeSchema,
    supersededAt: apiDateTimeSchema.nullable(),
    current: z.boolean(),
    source: provenanceEventSourceSchema,
    correction: provenanceCorrectionSchema.nullable(),
  })
  .strict();

export const eventProvenanceSchema = z
  .object({
    eventId: apiIdentifierSchema,
    sourceEventId: submissionEventIdSchema.nullable(),
    fixtureId: apiIdentifierSchema,
    competitionId: apiIdentifierSchema.nullable(),
    currentDeliveryId: apiIdentifierSchema,
    revisions: z.array(eventProvenanceRevisionSchema).min(1),
  })
  .strict();

export const eventProvenanceResponseSchema = createResourceResponseSchema(eventProvenanceSchema);

export const statisticProvenanceContributorSchema = z
  .object({
    deliveryId: apiIdentifierSchema,
    revision: z.number().int().positive(),
    sourceEventId: submissionEventIdSchema.nullable(),
    source: provenanceEventSourceSchema,
  })
  .strict();

export const statisticProvenanceSchema = z
  .object({
    statisticId: apiIdentifierSchema,
    fixtureId: apiIdentifierSchema.nullable(),
    participantId: apiIdentifierSchema.nullable(),
    statisticCode: z.string().min(1),
    scope: z.string().min(1),
    sourceEventCount: z.number().int().nonnegative(),
    contributors: z.array(statisticProvenanceContributorSchema),
    pagination: z.object({ nextCursor: z.string().min(1).nullable() }).strict(),
  })
  .strict();

export const statisticProvenanceResponseSchema =
  createResourceResponseSchema(statisticProvenanceSchema);

export type ProvenanceSubmissionKind = z.infer<typeof provenanceSubmissionKindSchema>;
export type ProvenanceSubmission = z.infer<typeof provenanceSubmissionSchema>;
export type ProvenanceSubmissionDetail = z.infer<typeof provenanceSubmissionDetailSchema>;
export type ProvenanceSubmissionListQuery = z.infer<typeof provenanceSubmissionListQuerySchema>;
export type ProvenanceSubmissionListResponse = z.infer<
  typeof provenanceSubmissionListResponseSchema
>;
export type ProvenanceSubmissionDetailResponse = z.infer<
  typeof provenanceSubmissionDetailResponseSchema
>;
export type ProvenanceEventSource = z.infer<typeof provenanceEventSourceSchema>;
export type EventProvenanceResponse = z.infer<typeof eventProvenanceResponseSchema>;
export type StatisticProvenanceContributor = z.infer<typeof statisticProvenanceContributorSchema>;
export type StatisticProvenanceResponse = z.infer<typeof statisticProvenanceResponseSchema>;

export type ProvenanceDecision = z.infer<typeof provenanceDecisionSchema>;
