import {
  applicationRoleSchema,
  submitterApprovalStateSchema,
  type ApplicationRole,
  type SubmitterApprovalState,
} from '@sport-analytics/contracts';

export type { ApplicationRole, SubmitterApprovalState } from '@sport-analytics/contracts';

export type AccountDeletionState =
  | 'active'
  | 'auth_pending'
  | 'auth_failed'
  | 'finalization_pending'
  | 'finalization_failed'
  | 'deleted';

export interface ApplicationAccount {
  accountId: string;
  subject: string;
  displayName: string | null;
  role: ApplicationRole;
  approvalState: SubmitterApprovalState;
  requestedCompetition: { competitionId: string; name: string } | null;
  competitionIds: string[];
  disabled: boolean;
  deletionState: AccountDeletionState;
}

export function isAccountDeletionState(value: string): value is AccountDeletionState {
  return [
    'active',
    'auth_pending',
    'auth_failed',
    'finalization_pending',
    'finalization_failed',
    'deleted',
  ].includes(value);
}

export function isApplicationRole(value: string): value is ApplicationRole {
  return applicationRoleSchema.safeParse(value).success;
}

export function isSubmitterApprovalState(value: string): value is SubmitterApprovalState {
  return submitterApprovalStateSchema.safeParse(value).success;
}
