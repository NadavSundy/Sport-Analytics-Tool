import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import { isSubmitterApprovalState } from '../accounts/account';
import {
  InvalidRequestedCompetitionError,
  SubmitterAccessConflictError,
} from './submitter-access.errors';

interface SubmitterAccessRequestRecord {
  accountId: string;
  approvalState: 'pending';
  requestedCompetition: { competitionId: string; name: string };
}

export interface SubmitterAccessRepository {
  requestAccess(accountId: string, competitionId: string): Promise<SubmitterAccessRequestRecord>;
}

interface SubmitterAccessRow {
  accountId: string;
  approvalState: string;
  disabledAt: Date | null;
  competitionExists?: boolean;
  requestedCompetitionId?: string;
  requestedCompetitionName?: string;
}

export function createSubmitterAccessRepository(
  executor: QueryExecutor = getDatabasePool(),
): SubmitterAccessRepository {
  return {
    async requestAccess(accountId, competitionId) {
      const updated = await executeQuery<SubmitterAccessRow>(
        executor,
        `
          WITH requested_competition AS (
            SELECT competition_id, name
            FROM competition
            WHERE competition_id = $2
          ),
          updated_account AS (
            UPDATE app_user account
            SET
              submitter_approval_state = 'pending',
              submitter_requested_competition_id = requested_competition.competition_id
            FROM requested_competition
            WHERE account.app_user_id = $1
              AND account.submitter_approval_state IN ('not_requested', 'rejected')
              AND account.disabled_at IS NULL
            RETURNING
              account.app_user_id::text AS "accountId",
              account.submitter_approval_state AS "approvalState",
              account.disabled_at AS "disabledAt",
              requested_competition.competition_id::text AS "requestedCompetitionId",
              requested_competition.name AS "requestedCompetitionName"
          )
          SELECT * FROM updated_account
        `,
        [accountId, competitionId],
      );

      const created = updated.rows[0];

      if (created) {
        return {
          accountId: created.accountId,
          approvalState: 'pending',
          requestedCompetition: {
            competitionId: created.requestedCompetitionId!,
            name: created.requestedCompetitionName!,
          },
        };
      }

      const current = await executeQuery<SubmitterAccessRow>(
        executor,
        `
          SELECT
            app_user_id::text AS "accountId",
            submitter_approval_state AS "approvalState",
            disabled_at AS "disabledAt",
            EXISTS (
              SELECT 1
              FROM competition
              WHERE competition_id = $2
            ) AS "competitionExists"
          FROM app_user
          WHERE app_user_id = $1
        `,
        [accountId, competitionId],
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

      if (!account.competitionExists) {
        throw new InvalidRequestedCompetitionError();
      }

      throw new Error('Submitter access request state changed unexpectedly');
    },
  };
}
