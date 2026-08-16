import type { VerifiedIdentity } from '../../auth/supabase-auth';
import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import {
  isAccountDeletionState,
  isApplicationRole,
  isSubmitterApprovalState,
  type ApplicationAccount,
} from './account';
import { hashAuthenticationSubject } from './account-subject';

interface ApplicationAccountRow {
  accountId: string;
  subject: string;
  displayName: string | null;
  role: string;
  approvalState: string;
  competitionIds: string[];
  disabledAt: Date | null;
  deletionState: string;
}

export async function synchronizeApplicationAccount(
  identity: VerifiedIdentity,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ApplicationAccount> {
  const subjectHash = hashAuthenticationSubject(identity.uid);
  const result = await executeQuery<ApplicationAccountRow>(
    executor,
    `
      WITH deleted_account AS (
        SELECT
          app_user_id,
          auth_subject,
          display_name,
          application_role,
          submitter_approval_state,
          disabled_at,
          deletion_state
        FROM app_user
        WHERE auth_provider = $1
          AND deleted_auth_subject_hash = $4
      ),
      synchronized_account AS (
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          display_name,
          last_authenticated_at
        )
        SELECT $1, $2, $3, now()
        WHERE NOT EXISTS (SELECT 1 FROM deleted_account)
        ON CONFLICT (auth_provider, auth_subject) DO UPDATE
        SET
          display_name = CASE
            WHEN app_user.deletion_state = 'active' AND app_user.disabled_at IS NULL
              THEN COALESCE(EXCLUDED.display_name, app_user.display_name)
            ELSE app_user.display_name
          END,
          last_authenticated_at = CASE
            WHEN app_user.deletion_state = 'active' AND app_user.disabled_at IS NULL
              THEN now()
            ELSE app_user.last_authenticated_at
          END
        RETURNING
          app_user_id,
          auth_subject,
          display_name,
          application_role,
          submitter_approval_state,
          disabled_at,
          deletion_state
      ),
      resolved_account AS (
        SELECT * FROM deleted_account
        UNION ALL
        SELECT * FROM synchronized_account
      )
      SELECT
        account.app_user_id::text AS "accountId",
        account.auth_subject AS subject,
        account.display_name AS "displayName",
        account.application_role AS role,
        account.submitter_approval_state AS "approvalState",
        COALESCE(
          array_agg(scope.competition_id::text ORDER BY scope.competition_id)
            FILTER (WHERE scope.competition_id IS NOT NULL),
          ARRAY[]::text[]
        ) AS "competitionIds",
        account.disabled_at AS "disabledAt",
        account.deletion_state AS "deletionState"
      FROM resolved_account account
      LEFT JOIN submitter_competition_scope scope
        ON scope.app_user_id = account.app_user_id
      GROUP BY
        account.app_user_id,
        account.auth_subject,
        account.display_name,
        account.application_role,
        account.submitter_approval_state,
        account.disabled_at,
        account.deletion_state
    `,
    ['supabase', identity.uid, identity.displayName ?? null, subjectHash],
  );

  const account = result.rows[0];

  if (!account) {
    throw new Error('Application account synchronization returned no account');
  }

  if (!isApplicationRole(account.role)) {
    throw new Error('Application account has an unsupported role');
  }

  if (!isSubmitterApprovalState(account.approvalState)) {
    throw new Error('Application account has an unsupported approval state');
  }

  if (!isAccountDeletionState(account.deletionState)) {
    throw new Error('Application account has an unsupported deletion state');
  }

  return {
    accountId: account.accountId,
    subject: account.subject,
    displayName: account.displayName,
    role: account.role,
    approvalState: account.approvalState,
    competitionIds: account.competitionIds,
    disabled: account.disabledAt !== null,
    deletionState: account.deletionState,
  };
}
