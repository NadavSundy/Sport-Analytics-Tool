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

interface SubmitterScopeRequestRecord {
  accountId: string;
  requestedCompetition: { competitionId: string; name: string };
}

export interface SubmitterAccessRepository {
  requestAccess(accountId: string, competitionId: string): Promise<SubmitterAccessRequestRecord>;
  requestAdditionalScope(
    accountId: string,
    competitionId: string,
  ): Promise<SubmitterScopeRequestRecord>;
}

interface SubmitterAccessRow {
  accountId: string;
  role?: string;
  approvalState: string;
  disabledAt: Date | null;
  competitionExists?: boolean;
  scopeAlreadyGranted?: boolean;
  requestedCompetitionId?: string | null;
  requestedCompetitionAlreadyGranted?: boolean;
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
              AND (
                account.submitter_approval_state IN ('not_requested', 'rejected')
                OR (
                  account.application_role = 'viewer'
                  AND account.submitter_approval_state = 'approved'
                )
              )
              AND account.disabled_at IS NULL
            RETURNING
              account.app_user_id::text AS "accountId",
              account.submitter_approval_state AS "approvalState",
              account.disabled_at AS "disabledAt",
              requested_competition.competition_id::text AS "requestedCompetitionId",
              requested_competition.name AS "requestedCompetitionName"
          ),
          recorded_request AS (
            INSERT INTO submitter_access_history (app_user_id, action, competition_id)
            SELECT "accountId"::bigint, 'requested', "requestedCompetitionId"::bigint
            FROM updated_account
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

    async requestAdditionalScope(accountId, competitionId) {
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
            SET submitter_requested_competition_id = requested_competition.competition_id
            FROM requested_competition
            WHERE account.app_user_id = $1
              AND account.application_role = 'submitter'
              AND account.submitter_approval_state = 'approved'
              AND account.disabled_at IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM submitter_competition_scope existing_scope
                WHERE existing_scope.app_user_id = account.app_user_id
                  AND existing_scope.competition_id = requested_competition.competition_id
              )
              AND (
                account.submitter_requested_competition_id IS NULL
                OR EXISTS (
                  SELECT 1
                  FROM submitter_competition_scope stale_request_scope
                  WHERE stale_request_scope.app_user_id = account.app_user_id
                    AND stale_request_scope.competition_id = account.submitter_requested_competition_id
                )
              )
            RETURNING
              account.app_user_id::text AS "accountId",
              account.submitter_approval_state AS "approvalState",
              account.disabled_at AS "disabledAt",
              requested_competition.competition_id::text AS "requestedCompetitionId",
              requested_competition.name AS "requestedCompetitionName"
          ),
          recorded_request AS (
            INSERT INTO submitter_access_history (app_user_id, action, competition_id)
            SELECT "accountId"::bigint, 'requested', "requestedCompetitionId"::bigint
            FROM updated_account
          )
          SELECT * FROM updated_account
        `,
        [accountId, competitionId],
      );

      const created = updated.rows[0];
      if (created) {
        return {
          accountId: created.accountId,
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
            account.app_user_id::text AS "accountId",
            account.application_role AS role,
            account.submitter_approval_state AS "approvalState",
            account.disabled_at AS "disabledAt",
            account.submitter_requested_competition_id::text AS "requestedCompetitionId",
            EXISTS (
              SELECT 1 FROM competition WHERE competition_id = $2
            ) AS "competitionExists",
            EXISTS (
              SELECT 1
              FROM submitter_competition_scope scope
              WHERE scope.app_user_id = account.app_user_id
                AND scope.competition_id = $2
            ) AS "scopeAlreadyGranted",
            CASE
              WHEN account.submitter_requested_competition_id IS NULL THEN false
              ELSE EXISTS (
                SELECT 1
                FROM submitter_competition_scope pending_scope
                WHERE pending_scope.app_user_id = account.app_user_id
                  AND pending_scope.competition_id = account.submitter_requested_competition_id
              )
            END AS "requestedCompetitionAlreadyGranted"
          FROM app_user account
          WHERE account.app_user_id = $1
        `,
        [accountId, competitionId],
      );

      const account = current.rows[0];
      if (!account) throw new Error('Authenticated application account no longer exists');
      if (account.disabledAt) throw new Error('Authenticated application account became disabled');

      if (account.role !== 'submitter' || account.approvalState !== 'approved') {
        throw new SubmitterAccessConflictError(
          'ADDITIONAL_SCOPE_REQUIRES_APPROVED_SUBMITTER',
          'Only an approved submitter can request an additional competition scope.',
        );
      }

      if (account.scopeAlreadyGranted) {
        throw new SubmitterAccessConflictError(
          'SCOPE_ALREADY_GRANTED',
          'The authenticated account already has submission access for this competition.',
        );
      }

      if (account.requestedCompetitionId && !account.requestedCompetitionAlreadyGranted) {
        throw new SubmitterAccessConflictError(
          'ADDITIONAL_SCOPE_REQUEST_PENDING',
          'An additional competition scope request is already awaiting administrator review.',
        );
      }

      if (!account.competitionExists) throw new InvalidRequestedCompetitionError();
      throw new Error('Additional submitter scope request state changed unexpectedly');
    },
  };
}
