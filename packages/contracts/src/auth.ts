import { z } from 'zod';

import { apiDateTimeSchema, apiIdentifierSchema } from './api';

export const APPLICATION_ROLES = ['viewer', 'submitter', 'admin'] as const;

export const applicationRoleSchema = z.enum(APPLICATION_ROLES);

/** @deprecated Request-workflow state only. Use applicationRoleSchema for authorization. */
export const submitterApprovalStateSchema = z.enum([
  'not_requested',
  'pending',
  'approved',
  'rejected',
]);

const competitionScopeSchema = z
  .object({
    competitionId: apiIdentifierSchema,
    name: z.string().min(1),
  })
  .strict();

export const currentUserProfileSchema = z
  .object({
    id: apiIdentifierSchema,
    subject: z.string().min(1),
    displayName: z.string().min(1).nullable(),
    role: applicationRoleSchema,
    approvalState: submitterApprovalStateSchema,
    requestedCompetition: competitionScopeSchema.nullable(),
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

export const submitterAccessRequestSchema = z
  .object({
    competitionId: apiIdentifierSchema,
  })
  .strict();

export const submitterAccessRequestResponseSchema = z
  .object({
    data: z
      .object({
        accountId: apiIdentifierSchema,
        approvalState: z.literal('pending'),
        requestedCompetition: competitionScopeSchema,
      })
      .strict(),
  })
  .strict();

export const administratorCompetitionScopeSchema = competitionScopeSchema;

export const administratorAuditActorSchema = z
  .object({
    id: apiIdentifierSchema,
    displayName: z.string().min(1).nullable(),
  })
  .strict();

export const administratorManagedUserSchema = z
  .object({
    id: apiIdentifierSchema,
    displayName: z.string().min(1).nullable(),
    role: applicationRoleSchema,
    approvalState: submitterApprovalStateSchema,
    requestedCompetition: competitionScopeSchema.nullable(),
    competitionScopes: z
      .array(administratorCompetitionScopeSchema)
      .refine(
        (scopes) => new Set(scopes.map((scope) => scope.competitionId)).size === scopes.length,
        { message: 'Competition scopes must be unique.' },
      ),
    disabled: z.boolean(),
    updatedAt: apiDateTimeSchema,
    submitterAccessUpdatedAt: apiDateTimeSchema.nullable(),
    submitterAccessUpdatedBy: administratorAuditActorSchema.nullable(),
    previouslyRevoked: z.boolean().default(false),
  })
  .strict();

export const administratorUserManagementResponseSchema = z
  .object({
    data: z
      .object({
        users: z.array(administratorManagedUserSchema),
        availableScopes: z
          .array(administratorCompetitionScopeSchema)
          .refine(
            (scopes) => new Set(scopes.map((scope) => scope.competitionId)).size === scopes.length,
            { message: 'Available competition scopes must be unique.' },
          ),
      })
      .strict(),
  })
  .strict();

export const administratorSubmitterAccessUpdateSchema = z
  .object({
    approved: z.boolean(),
    competitionIds: z
      .array(apiIdentifierSchema)
      .refine((competitionIds) => new Set(competitionIds).size === competitionIds.length, {
        message: 'Competition identifiers must be unique.',
      }),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.approved && value.competitionIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['competitionIds'],
        message: 'Select at least one competition scope before approving a submitter.',
      });
    }

    if (!value.approved && value.competitionIds.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['competitionIds'],
        message: 'Revoked submitters cannot retain competition scopes.',
      });
    }
  });

export const administratorSubmitterAccessResponseSchema = z
  .object({
    data: administratorManagedUserSchema,
  })
  .strict();

export type ApplicationRole = z.infer<typeof applicationRoleSchema>;
/** @deprecated Request-workflow state only. Use ApplicationRole for authorization. */
export type SubmitterApprovalState = z.infer<typeof submitterApprovalStateSchema>;
export type CurrentUserProfile = z.infer<typeof currentUserProfileSchema>;
export type CurrentUserProfileResponse = z.infer<typeof currentUserProfileResponseSchema>;
export type AccountDeletionRequest = z.infer<typeof accountDeletionRequestSchema>;
export type AccountDeletionResponse = z.infer<typeof accountDeletionResponseSchema>;
export type CompetitionScope = z.infer<typeof competitionScopeSchema>;
export type SubmitterAccessRequest = z.infer<typeof submitterAccessRequestSchema>;
export type SubmitterAccessRequestResponse = z.infer<typeof submitterAccessRequestResponseSchema>;
export type AdministratorCompetitionScope = z.infer<typeof administratorCompetitionScopeSchema>;
export type AdministratorManagedUser = z.infer<typeof administratorManagedUserSchema>;
export type AdministratorUserManagementResponse = z.infer<
  typeof administratorUserManagementResponseSchema
>;
export type AdministratorSubmitterAccessUpdate = z.infer<
  typeof administratorSubmitterAccessUpdateSchema
>;
export type AdministratorSubmitterAccessResponse = z.infer<
  typeof administratorSubmitterAccessResponseSchema
>;
