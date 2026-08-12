export const APPLICATION_ROLES = ['viewer', 'administrator'] as const;
export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

export const SUBMITTER_APPROVAL_STATES = [
  'not_requested',
  'pending',
  'approved',
  'rejected',
] as const;
export type SubmitterApprovalState = (typeof SUBMITTER_APPROVAL_STATES)[number];

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
  return APPLICATION_ROLES.some((role) => role === value);
}

export function isSubmitterApprovalState(value: string): value is SubmitterApprovalState {
  return SUBMITTER_APPROVAL_STATES.some((state) => state === value);
}
