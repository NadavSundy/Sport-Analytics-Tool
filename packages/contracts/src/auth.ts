import { z } from 'zod';

import { apiIdentifierSchema } from './api';

export const applicationRoleSchema = z.enum(['viewer', 'administrator']);

export const submitterApprovalStateSchema = z.enum([
  'not_requested',
  'pending',
  'approved',
  'rejected',
]);

export const currentUserProfileSchema = z
  .object({
    id: apiIdentifierSchema,
    subject: z.string().min(1),
    displayName: z.string().min(1).nullable(),
    role: applicationRoleSchema,
    approvalState: submitterApprovalStateSchema,
    competitionIds: z
      .array(apiIdentifierSchema)
      .refine((competitionIds) => new Set(competitionIds).size === competitionIds.length, {
        message: 'Competition identifiers must be unique.',
      }),
  })
  .strict();

export const currentUserProfileResponseSchema = z
  .object({
    user: currentUserProfileSchema,
  })
  .strict();

export const accountDeletionRequestSchema = z
  .object({
    confirmation: z.literal('DELETE'),
  })
  .strict();

export const accountDeletionResponseSchema = z
  .object({
    data: z
      .object({
        status: z.literal('deleted'),
        retainedCricketData: z.literal(true),
      })
      .strict(),
  })
  .strict();

export type ApplicationRole = z.infer<typeof applicationRoleSchema>;
export type SubmitterApprovalState = z.infer<typeof submitterApprovalStateSchema>;
export type CurrentUserProfile = z.infer<typeof currentUserProfileSchema>;
export type CurrentUserProfileResponse = z.infer<typeof currentUserProfileResponseSchema>;
export type AccountDeletionRequest = z.infer<typeof accountDeletionRequestSchema>;
export type AccountDeletionResponse = z.infer<typeof accountDeletionResponseSchema>;
