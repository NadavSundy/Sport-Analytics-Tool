import { executeQuery, getDatabasePool, type QueryExecutor } from '../../database';
import { isAccountDeletionState, type AccountDeletionState } from '../accounts/account';

interface PreparedAccountDeletion {
  authSubject: string;
  state: AccountDeletionState;
}

export interface AccountDeletionRepository {
  prepare(accountId: string): Promise<PreparedAccountDeletion>;
  markAuthDeletionFailed(accountId: string): Promise<void>;
  markAuthDeleted(accountId: string): Promise<void>;
  markFinalizationFailed(accountId: string): Promise<void>;
  finalize(accountId: string, tombstoneSubject: string, deletedSubjectHash: string): Promise<void>;
}

interface DeletionStateRow {
  authSubject: string;
  state: string;
}

function readDeletionState(row: DeletionStateRow | undefined): PreparedAccountDeletion {
  if (!row) {
    throw new Error('Authenticated application account no longer exists');
  }

  if (!isAccountDeletionState(row.state)) {
    throw new Error('Application account has an unsupported deletion state');
  }

  return {
    authSubject: row.authSubject,
    state: row.state,
  };
}

export function createAccountDeletionRepository(
  executor: QueryExecutor = getDatabasePool(),
): AccountDeletionRepository {
  return {
    async prepare(accountId) {
      const result = await executeQuery<DeletionStateRow>(
        executor,
        `
          WITH prepared_account AS (
            UPDATE app_user
            SET
              disabled_at = COALESCE(disabled_at, now()),
              application_role = 'viewer',
              submitter_approval_state = 'not_requested',
              submitter_requested_competition_id = NULL,
              deletion_state = CASE
                WHEN deletion_state IN ('active', 'auth_failed') THEN 'auth_pending'
                ELSE deletion_state
              END,
              deletion_requested_at = CASE
                WHEN deletion_state = 'active' THEN now()
                ELSE deletion_requested_at
              END,
              deletion_failed_at = CASE
                WHEN deletion_state = 'auth_failed' THEN NULL
                ELSE deletion_failed_at
              END
            WHERE app_user_id = $1
            RETURNING
              app_user_id,
              auth_subject AS "authSubject",
              deletion_state AS state
          ),
          removed_scopes AS (
            DELETE FROM submitter_competition_scope
            WHERE app_user_id IN (SELECT app_user_id FROM prepared_account)
            RETURNING app_user_id
          )
          SELECT "authSubject", state
          FROM prepared_account
        `,
        [accountId],
      );

      return readDeletionState(result.rows[0]);
    },

    async markAuthDeletionFailed(accountId) {
      const result = await executeQuery(
        executor,
        `
          UPDATE app_user
          SET
            deletion_state = 'auth_failed',
            deletion_failed_at = now()
          WHERE app_user_id = $1
            AND deletion_state IN ('auth_pending', 'auth_failed')
          RETURNING app_user_id
        `,
        [accountId],
      );

      if (result.rowCount !== 1) {
        throw new Error('Application account could not record Auth deletion failure');
      }
    },

    async markAuthDeleted(accountId) {
      const result = await executeQuery(
        executor,
        `
          UPDATE app_user
          SET
            deletion_state = CASE
              WHEN deletion_state IN ('auth_pending', 'auth_failed') THEN 'finalization_pending'
              ELSE deletion_state
            END,
            auth_deleted_at = CASE
              WHEN deletion_state IN ('auth_pending', 'auth_failed')
                THEN COALESCE(auth_deleted_at, now())
              ELSE auth_deleted_at
            END,
            deletion_failed_at = CASE
              WHEN deletion_state IN ('auth_pending', 'auth_failed') THEN NULL
              ELSE deletion_failed_at
            END
          WHERE app_user_id = $1
            AND deletion_state <> 'active'
          RETURNING app_user_id
        `,
        [accountId],
      );

      if (result.rowCount !== 1) {
        throw new Error('Application account could not record Auth deletion');
      }
    },

    async markFinalizationFailed(accountId) {
      const result = await executeQuery(
        executor,
        `
          UPDATE app_user
          SET
            deletion_state = 'finalization_failed',
            deletion_failed_at = now()
          WHERE app_user_id = $1
            AND deletion_state IN ('finalization_pending', 'finalization_failed')
          RETURNING app_user_id
        `,
        [accountId],
      );

      if (result.rowCount !== 1) {
        throw new Error('Application account could not record finalization failure');
      }
    },

    async finalize(accountId, tombstoneSubject, deletedSubjectHash) {
      const result = await executeQuery<{ state: string }>(
        executor,
        `
          WITH finalized_account AS (
            UPDATE app_user
            SET
              auth_subject = $2,
              display_name = NULL,
              application_role = 'viewer',
              submitter_approval_state = 'not_requested',
              submitter_requested_competition_id = NULL,
              disabled_at = COALESCE(disabled_at, now()),
              deletion_state = 'deleted',
              deletion_failed_at = NULL,
              deleted_at = COALESCE(deleted_at, now()),
              deleted_auth_subject_hash = $3
            WHERE app_user_id = $1
              AND deletion_state IN ('finalization_pending', 'finalization_failed')
            RETURNING app_user_id, deletion_state AS state
          ),
          removed_scopes AS (
            DELETE FROM submitter_competition_scope
            WHERE app_user_id IN (SELECT app_user_id FROM finalized_account)
            RETURNING app_user_id
          )
          SELECT state FROM finalized_account
          UNION ALL
          SELECT deletion_state AS state
          FROM app_user
          WHERE app_user_id = $1
            AND deletion_state = 'deleted'
            AND NOT EXISTS (SELECT 1 FROM finalized_account)
        `,
        [accountId, tombstoneSubject, deletedSubjectHash],
      );

      if (result.rows[0]?.state !== 'deleted') {
        throw new Error('Application account could not be finalized as deleted');
      }
    },
  };
}
