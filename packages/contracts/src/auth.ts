import { z } from 'zod';

import { apiIdentifierSchema } from './api';

export const APPLICATION_ROLES = ['viewer', 'submitter', 'admin'] as const;

export const applicationRoleSchema = z.enum(APPLICATION_ROLES);

/** @deprecated Request-workflow state only. Use applicationRoleSchema for authorization. */
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

export const submitterAccessRequestResponseSchema = z
  .object({
    data: z
      .object({
        accountId: apiIdentifierSchema,
        approvalState: z.literal('pending'),
      })
      .strict(),
  })
  .strict();

export type ApplicationRole = z.infer<typeof applicationRoleSchema>;
/** @deprecated Request-workflow state only. Use ApplicationRole for authorization. */
export type SubmitterApprovalState = z.infer<typeof submitterApprovalStateSchema>;
export type CurrentUserProfile = z.infer<typeof currentUserProfileSchema>;
export type CurrentUserProfileResponse = z.infer<typeof currentUserProfileResponseSchema>;
export type SubmitterAccessRequestResponse = z.infer<typeof submitterAccessRequestResponseSchema>;
