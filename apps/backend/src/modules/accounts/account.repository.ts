import type { VerifiedIdentity } from '../../auth/supabase-auth';
import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import { isApplicationRole, isSubmitterApprovalState, type ApplicationAccount } from './account';

interface ApplicationAccountRow {
  accountId: string;
  subject: string;
  displayName: string | null;
  role: string;
  approvalState: string;
  competitionIds: string[];
  disabledAt: Date | null;
}

export async function synchronizeApplicationAccount(
  identity: VerifiedIdentity,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ApplicationAccount> {
  const result = await executeQuery<ApplicationAccountRow>(
    executor,
    `
      WITH synchronized_account AS (
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          display_name,
          last_authenticated_at
        )
        VALUES ($1, $2, $3, now())
        ON CONFLICT (auth_provider, auth_subject) DO UPDATE
        SET
          display_name = COALESCE(EXCLUDED.display_name, app_user.display_name),
          last_authenticated_at = now()
        RETURNING
          app_user_id,
          auth_subject,
          display_name,
          application_role,
          submitter_approval_state,
          disabled_at
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
        account.disabled_at AS "disabledAt"
      FROM synchronized_account account
      LEFT JOIN submitter_competition_scope scope
        ON scope.app_user_id = account.app_user_id
      GROUP BY
        account.app_user_id,
        account.auth_subject,
        account.display_name,
        account.application_role,
        account.submitter_approval_state,
        account.disabled_at
    `,
    ['supabase', identity.uid, identity.displayName ?? null],
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

  return {
    accountId: account.accountId,
    subject: account.subject,
    displayName: account.displayName,
    role: account.role,
    approvalState: account.approvalState,
    competitionIds: account.competitionIds,
    disabled: account.disabledAt !== null,
  };
}
