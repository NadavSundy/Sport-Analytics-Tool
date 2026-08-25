import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import { isSubmitterApprovalState } from '../accounts/account';
import { SubmitterAccessConflictError } from './submitter-access.errors';

interface SubmitterAccessRequestRecord {
  accountId: string;
  approvalState: 'pending';
}

export interface SubmitterAccessRepository {
  requestAccess(accountId: string): Promise<SubmitterAccessRequestRecord>;
}

interface SubmitterAccessRow {
  accountId: string;
  approvalState: string;
  disabledAt: Date | null;
}

export function createSubmitterAccessRepository(
  executor: QueryExecutor = getDatabasePool(),
): SubmitterAccessRepository {
  return {
    async requestAccess(accountId) {
      const updated = await executeQuery<SubmitterAccessRow>(
        executor,
        `
          UPDATE app_user
          SET submitter_approval_state = 'pending'
          WHERE app_user_id = $1
            AND submitter_approval_state IN ('not_requested', 'rejected')
            AND disabled_at IS NULL
          RETURNING
            app_user_id::text AS "accountId",
            submitter_approval_state AS "approvalState",
            disabled_at AS "disabledAt"
        `,
        [accountId],
      );

      const created = updated.rows[0];

      if (created) {
        return {
          accountId: created.accountId,
          approvalState: 'pending',
        };
      }

      const current = await executeQuery<SubmitterAccessRow>(
        executor,
        `
          SELECT
            app_user_id::text AS "accountId",
            submitter_approval_state AS "approvalState",
            disabled_at AS "disabledAt"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId],
      );

      const account = current.rows[0];

      if (!account) {
        throw new Error('Authenticated application account no longer exists');
      }

      if (account.disabledAt) {
        throw new Error('Authenticated application account became disabled');
      }

      if (!isSubmitterApprovalState(account.approvalState)) {
        throw new Error('Application account has an unsupported approval state');
      }

      if (account.approvalState === 'pending') {
        throw new SubmitterAccessConflictError(
          'REQUEST_ALREADY_PENDING',
          'A submitter access request is already pending.',
        );
      }

      if (account.approvalState === 'approved') {
        throw new SubmitterAccessConflictError(
          'SUBMITTER_ALREADY_APPROVED',
          'The authenticated account is already an approved submitter.',
        );
      }

      throw new Error('Submitter access request state changed unexpectedly');
    },
  };
}
