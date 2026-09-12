import type { ApplicationRole, SubmitterApprovalState } from '../accounts/account';
import { AdminManagementConflictError } from './admin.errors';

interface SubmitterAccessTarget {
  role: ApplicationRole;
  approvalState: SubmitterApprovalState;
  hasPendingAdditionalScopeRequest?: boolean;
}

export type SubmitterAccessTransition = 'approve' | 'reject' | 'scope' | 'reject_scope' | 'revoke';
export type SubmitterAccessAction = 'grant' | 'reject' | 'revoke';

export function resolveSubmitterAccessTransition(
  target: SubmitterAccessTarget,
  action: SubmitterAccessAction,
): SubmitterAccessTransition {
  const hasPendingRequest = target.role === 'viewer' && target.approvalState === 'pending';
  const isApprovedSubmitter = target.role === 'submitter' && target.approvalState === 'approved';

  if (action === 'grant' && hasPendingRequest) {
    return 'approve';
  }

  if (action === 'grant' && isApprovedSubmitter) {
    return 'scope';
  }

  if (action === 'reject' && hasPendingRequest) {
    return 'reject';
  }

  if (action === 'reject' && isApprovedSubmitter && target.hasPendingAdditionalScopeRequest) {
    return 'reject_scope';
  }

  if (action === 'revoke' && isApprovedSubmitter) {
    return 'revoke';
  }

  throw new AdminManagementConflictError(
    'INVALID_SUBMITTER_ACCESS_TRANSITION',
    "The requested submitter access transition is not valid for the account's current state.",
  );
}
