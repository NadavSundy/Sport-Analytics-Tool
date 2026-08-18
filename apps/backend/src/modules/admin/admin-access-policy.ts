import type { AdministratorSubmitterAccessUpdate } from '@sport-analytics/contracts';

import type { ApplicationRole, SubmitterApprovalState } from '../accounts/account';
import { AdminManagementConflictError } from './admin.errors';

interface SubmitterAccessTarget {
  role: ApplicationRole;
  approvalState: SubmitterApprovalState;
}

export type SubmitterAccessTransition = 'approve' | 'reject' | 'scope' | 'revoke';

export function resolveSubmitterAccessTransition(
  target: SubmitterAccessTarget,
  update: AdministratorSubmitterAccessUpdate,
): SubmitterAccessTransition {
  const hasPendingRequest = target.role === 'viewer' && target.approvalState === 'pending';
  const isApprovedSubmitter = target.role === 'submitter' && target.approvalState === 'approved';

  if (hasPendingRequest) {
    return update.approved ? 'approve' : 'reject';
  }

  if (isApprovedSubmitter) {
    return update.approved ? 'scope' : 'revoke';
  }

  throw new AdminManagementConflictError(
    'SUBMITTER_REQUEST_NOT_PENDING',
    'This account does not have a pending submitter access request.',
  );
}
