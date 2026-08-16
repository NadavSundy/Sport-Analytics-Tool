import {
  applicationRoleSchema,
  submitterApprovalStateSchema,
  type ApplicationRole,
  type SubmitterApprovalState,
} from '@sport-analytics/contracts';

export type { ApplicationRole, SubmitterApprovalState } from '@sport-analytics/contracts';

export interface ApplicationAccount {
  accountId: string;
  subject: string;
  displayName: string | null;
  role: ApplicationRole;
  approvalState: SubmitterApprovalState;
  competitionIds: string[];
  disabled: boolean;
}

export function isApplicationRole(value: string): value is ApplicationRole {
  return applicationRoleSchema.safeParse(value).success;
}

export function isSubmitterApprovalState(value: string): value is SubmitterApprovalState {
  return submitterApprovalStateSchema.safeParse(value).success;
}
