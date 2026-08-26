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
  requestedCompetitionId: string | null;
  requestedCompetitionName: string | null;
  competitionIds: string[];
  disabledAt: Date | null;
  deletionState: string;
}

export async function synchronizeApplicationAccount(
  identity: VerifiedIdentity,
  executor: QueryExecutor = getDatabasePool(),
): Promise<ApplicationAccount> {
  const subjectHash = hashAuthenticationSubject(identity.uid);

  // Optional rollout columns are read through the row JSON representation so
  // account status remains resolvable while the ordered migrations are applied.
  // The role constraint distinguishes the legacy approval-based model from the
  // current authoritative viewer | submitter | admin model.
  const result = await executeQuery<ApplicationAccountRow>(
    executor,
    `
      WITH account_schema AS (
        SELECT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'app_user'::regclass
            AND conname = 'app_user_application_role_ck'
            AND pg_get_constraintdef(oid) LIKE '%submitter%'
            AND pg_get_constraintdef(oid) LIKE '%admin%'
        ) AS "usesCurrentRoleModel"
      ),
      deleted_account AS (
        SELECT
          app_user_id,
          auth_subject,
          display_name,
          application_role,
          submitter_approval_state,
          to_jsonb(app_user) ->> 'submitter_requested_competition_id'
            AS submitter_requested_competition_id,
          disabled_at,
          COALESCE(to_jsonb(app_user) ->> 'deletion_state', 'active') AS deletion_state
        FROM app_user
        WHERE auth_provider = $1
          AND to_jsonb(app_user) ->> 'deleted_auth_subject_hash' = $4
      ),
      synchronized_account AS (
        INSERT INTO app_user (
          auth_provider,
          auth_subject,
          display_name,
          application_role,
          last_authenticated_at
        )
        SELECT $1, $2, $3, 'viewer', now()
        WHERE NOT EXISTS (SELECT 1 FROM deleted_account)
        ON CONFLICT (auth_provider, auth_subject) DO UPDATE
        SET
          display_name = CASE
            WHEN COALESCE(to_jsonb(app_user) ->> 'deletion_state', 'active') = 'active'
              AND app_user.disabled_at IS NULL
              THEN COALESCE(EXCLUDED.display_name, app_user.display_name)
            ELSE app_user.display_name
          END,
          last_authenticated_at = CASE
            WHEN COALESCE(to_jsonb(app_user) ->> 'deletion_state', 'active') = 'active'
              AND app_user.disabled_at IS NULL
              THEN now()
            ELSE app_user.last_authenticated_at
          END
        RETURNING
          app_user_id,
          auth_subject,
          display_name,
          application_role,
          submitter_approval_state,
          to_jsonb(app_user) ->> 'submitter_requested_competition_id'
            AS submitter_requested_competition_id,
          disabled_at,
          COALESCE(to_jsonb(app_user) ->> 'deletion_state', 'active') AS deletion_state
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
        CASE
          WHEN account_schema."usesCurrentRoleModel" THEN account.application_role
          WHEN account.application_role = 'administrator' THEN 'admin'
          WHEN account.application_role = 'viewer'
            AND account.submitter_approval_state = 'approved' THEN 'submitter'
          ELSE account.application_role
        END AS role,
        account.submitter_approval_state AS "approvalState",
        requested_competition.competition_id::text AS "requestedCompetitionId",
        requested_competition.name AS "requestedCompetitionName",
        COALESCE(
          array_agg(scope.competition_id::text ORDER BY scope.competition_id)
            FILTER (WHERE scope.competition_id IS NOT NULL),
          ARRAY[]::text[]
        ) AS "competitionIds",
        account.disabled_at AS "disabledAt",
        account.deletion_state AS "deletionState"
      FROM resolved_account account
      CROSS JOIN account_schema
      LEFT JOIN submitter_competition_scope scope
        ON scope.app_user_id = account.app_user_id
      LEFT JOIN competition requested_competition
        ON requested_competition.competition_id::text = account.submitter_requested_competition_id
      GROUP BY
        account.app_user_id,
        account.auth_subject,
        account.display_name,
        account.application_role,
        account.submitter_approval_state,
        requested_competition.competition_id,
        account.disabled_at,
        account.deletion_state,
        account_schema."usesCurrentRoleModel"
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

  if ((account.requestedCompetitionId === null) !== (account.requestedCompetitionName === null)) {
    throw new Error('Application account has inconsistent requested competition data');
  }

  return {
    accountId: account.accountId,
    subject: account.subject,
    displayName: account.displayName,
    role: account.role,
    approvalState: account.approvalState,
    requestedCompetition:
      account.requestedCompetitionId && account.requestedCompetitionName
        ? {
            competitionId: account.requestedCompetitionId,
            name: account.requestedCompetitionName,
          }
        : null,
    competitionIds: account.competitionIds,
    disabled: account.disabledAt !== null,
    deletionState: account.deletionState,
  };
}
