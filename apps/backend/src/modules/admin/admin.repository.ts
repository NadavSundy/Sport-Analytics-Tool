import type {
  AdministratorCompetitionScope,
  AdministratorManagedUser,
  AdministratorSubmitterAccessUpdate,
  AdministratorRoleUpdate,
} from '@sport-analytics/contracts';
import type { Pool } from 'pg';

import { executeQuery, getDatabasePool, withTransaction, type QueryExecutor } from '../../database';
import { isApplicationRole, isSubmitterApprovalState } from '../accounts/account';
import {
  resolveSubmitterAccessTransition,
  type SubmitterAccessAction,
} from './admin-access-policy';
import {
  AdminManagementConflictError,
  AdminUserNotFoundError,
  InvalidCompetitionScopesError,
} from './admin.errors';

interface AdministratorUserRow {
  id: string;
  authSubject: string;
  displayName: string | null;
  role: string;
  approvalState: string;
  requestedCompetitionId: string | null;
  requestedCompetitionName: string | null;
  competitionIds: string[];
  competitionNames: string[];
  disabledAt: Date | null;
  updatedAt: Date;
  submitterAccessUpdatedAt: Date | null;
  submitterAccessUpdatedById: string | null;
  submitterAccessUpdatedByDisplayName: string | null;
  previouslyRevoked: boolean;
}

interface TargetAccountRow {
  role: string;
  approvalState: string;
  requestedCompetitionId: string | null;
  disabledAt: Date | null;
}

interface AdminUserManagementData {
  users: AdministratorManagedUserWithAuthSubject[];
  availableScopes: AdministratorCompetitionScope[];
}

export type AdministratorManagedUserWithAuthSubject = AdministratorManagedUser & {
  authSubject: string;
};

export interface AdminRepository {
  listUserManagementData(): Promise<AdminUserManagementData>;
  updateSubmitterAccess(
    targetAccountId: string,
    administratorAccountId: string,
    update: AdministratorSubmitterAccessUpdate,
  ): Promise<AdministratorManagedUserWithAuthSubject>;
  rejectSubmitterAccessRequest(
    targetAccountId: string,
    administratorAccountId: string,
  ): Promise<AdministratorManagedUserWithAuthSubject>;
  updateRole(
    targetAccountId: string,
    administratorAccountId: string,
    update: AdministratorRoleUpdate,
  ): Promise<AdministratorManagedUserWithAuthSubject>;
}

const administratorUserSelect = `
  SELECT
    managed.app_user_id::text AS id,
    managed.auth_subject AS "authSubject",
    managed.display_name AS "displayName",
    managed.application_role AS role,
    managed.submitter_approval_state AS "approvalState",
    requested_competition.competition_id::text AS "requestedCompetitionId",
    requested_competition.name AS "requestedCompetitionName",
    COALESCE(
      array_agg(competition.competition_id::text ORDER BY competition.name, competition.competition_id)
        FILTER (WHERE competition.competition_id IS NOT NULL),
      ARRAY[]::text[]
    ) AS "competitionIds",
    COALESCE(
      array_agg(competition.name ORDER BY competition.name, competition.competition_id)
        FILTER (WHERE competition.competition_id IS NOT NULL),
      ARRAY[]::text[]
    ) AS "competitionNames",
    managed.disabled_at AS "disabledAt",
    managed.updated_at AS "updatedAt",
    managed.submitter_access_updated_at AS "submitterAccessUpdatedAt",
    access_administrator.app_user_id::text AS "submitterAccessUpdatedById",
    access_administrator.display_name AS "submitterAccessUpdatedByDisplayName",
    EXISTS (
      SELECT 1
      FROM submitter_access_history history
      WHERE history.app_user_id = managed.app_user_id
        AND history.action = 'revoked'
    ) AS "previouslyRevoked"
  FROM app_user managed
  LEFT JOIN submitter_competition_scope scope
    ON scope.app_user_id = managed.app_user_id
  LEFT JOIN competition requested_competition
    ON requested_competition.competition_id = managed.submitter_requested_competition_id
  LEFT JOIN competition
    ON competition.competition_id = scope.competition_id
  LEFT JOIN app_user access_administrator
    ON access_administrator.app_user_id = managed.submitter_access_updated_by
`;

function mapAdministratorUser(row: AdministratorUserRow): AdministratorManagedUserWithAuthSubject {
  if (!isApplicationRole(row.role)) {
    throw new Error('Managed application account has an unsupported role');
  }

  if (!isSubmitterApprovalState(row.approvalState)) {
    throw new Error('Managed application account has an unsupported approval state');
  }

  if (row.competitionIds.length !== row.competitionNames.length) {
    throw new Error('Managed application account has inconsistent competition scope data');
  }

  if ((row.requestedCompetitionId === null) !== (row.requestedCompetitionName === null)) {
    throw new Error('Managed application account has inconsistent requested competition data');
  }

  return {
    id: row.id,
    authSubject: row.authSubject,
    displayName: row.displayName,
    role: row.role,
    approvalState: row.approvalState,
    requestedCompetition:
      row.requestedCompetitionId && row.requestedCompetitionName
        ? {
            competitionId: row.requestedCompetitionId,
            name: row.requestedCompetitionName,
          }
        : null,
    competitionScopes: row.competitionIds.map((competitionId, index) => ({
      competitionId,
      name: row.competitionNames[index]!,
    })),
    disabled: row.disabledAt !== null,
    updatedAt: row.updatedAt.toISOString(),
    submitterAccessUpdatedAt: row.submitterAccessUpdatedAt?.toISOString() ?? null,
    submitterAccessUpdatedBy: row.submitterAccessUpdatedById
      ? {
          id: row.submitterAccessUpdatedById,
          displayName: row.submitterAccessUpdatedByDisplayName,
        }
      : null,
    previouslyRevoked: row.previouslyRevoked,
  };
}

async function listUsers(
  executor: QueryExecutor,
): Promise<AdministratorManagedUserWithAuthSubject[]> {
  const result = await executeQuery<AdministratorUserRow>(
    executor,
    `${administratorUserSelect}
      GROUP BY
        managed.app_user_id,
        requested_competition.competition_id,
        access_administrator.app_user_id
      ORDER BY
        CASE managed.submitter_approval_state WHEN 'pending' THEN 0 ELSE 1 END,
        lower(COALESCE(managed.display_name, '')),
        managed.app_user_id
    `,
  );

  return result.rows.map(mapAdministratorUser);
}

async function findUserById(
  accountId: string,
  executor: QueryExecutor,
): Promise<AdministratorManagedUserWithAuthSubject> {
  const result = await executeQuery<AdministratorUserRow>(
    executor,
    `${administratorUserSelect}
      WHERE managed.app_user_id = $1
      GROUP BY
        managed.app_user_id,
        requested_competition.competition_id,
        access_administrator.app_user_id
    `,
    [accountId],
  );

  const account = result.rows[0];

  if (!account) {
    throw new AdminUserNotFoundError();
  }

  return mapAdministratorUser(account);
}

async function listCompetitionScopes(
  executor: QueryExecutor,
): Promise<AdministratorCompetitionScope[]> {
  const result = await executeQuery<AdministratorCompetitionScope>(
    executor,
    `
      SELECT
        competition_id::text AS "competitionId",
        name
      FROM competition
      ORDER BY name, competition_id
    `,
  );

  return result.rows;
}

async function applySubmitterAccessTransition(
  pool: Pool,
  targetAccountId: string,
  administratorAccountId: string,
  action: SubmitterAccessAction,
  competitionIds: string[],
): Promise<AdministratorManagedUserWithAuthSubject> {
  return withTransaction(pool, async (client) => {
    const targetResult = await executeQuery<TargetAccountRow>(
      client,
      `
        SELECT
          application_role AS role,
          submitter_approval_state AS "approvalState",
          submitter_requested_competition_id::text AS "requestedCompetitionId",
          disabled_at AS "disabledAt"
        FROM app_user
        WHERE app_user_id = $1
        FOR UPDATE
      `,
      [targetAccountId],
    );
    const target = targetResult.rows[0];

    if (!target) {
      throw new AdminUserNotFoundError();
    }

    if (!isApplicationRole(target.role)) {
      throw new Error('Managed application account has an unsupported role');
    }

    if (!isSubmitterApprovalState(target.approvalState)) {
      throw new Error('Managed application account has an unsupported approval state');
    }

    if (target.role === 'admin') {
      throw new AdminManagementConflictError(
        'ADMIN_ACCOUNT_NOT_MANAGEABLE',
        'Administrator accounts cannot be changed through submitter access management.',
      );
    }

    if (target.disabledAt) {
      throw new AdminManagementConflictError(
        'DISABLED_ACCOUNT_NOT_MANAGEABLE',
        'Disabled accounts cannot be changed through submitter access management.',
      );
    }

    const transition = resolveSubmitterAccessTransition(
      { role: target.role, approvalState: target.approvalState },
      action,
    );
    const grantsAccess = transition === 'approve' || transition === 'scope';
    let requestedCompetitionIds = [...new Set(competitionIds)];

    if (transition === 'approve') {
      if (!target.requestedCompetitionId) {
        throw new AdminManagementConflictError(
          'REQUESTED_COMPETITION_SCOPE_MISSING',
          'The pending request does not identify a competition and cannot be approved.',
        );
      }

      if (
        requestedCompetitionIds.length !== 1 ||
        requestedCompetitionIds[0] !== target.requestedCompetitionId
      ) {
        throw new AdminManagementConflictError(
          'REQUESTED_COMPETITION_SCOPE_MISMATCH',
          'Approval must grant the competition stored on the pending request.',
        );
      }

      requestedCompetitionIds = [target.requestedCompetitionId];
    }

    if (grantsAccess && requestedCompetitionIds.length === 0) {
      throw new InvalidCompetitionScopesError([]);
    }

    if (grantsAccess) {
      const validScopes = await executeQuery<{ competitionId: string }>(
        client,
        `
          SELECT competition_id::text AS "competitionId"
          FROM competition
          WHERE competition_id = ANY($1::bigint[])
        `,
        [requestedCompetitionIds],
      );
      const validIds = new Set(validScopes.rows.map((scope) => scope.competitionId));
      const invalidIds = requestedCompetitionIds.filter(
        (competitionId) => !validIds.has(competitionId),
      );

      if (invalidIds.length > 0) {
        throw new InvalidCompetitionScopesError(invalidIds);
      }
    }

    await executeQuery(
      client,
      `
        UPDATE app_user
        SET
          application_role = $2,
          submitter_approval_state = $3,
          submitter_access_updated_at = now(),
          submitter_access_updated_by = $4
        WHERE app_user_id = $1
      `,
      [
        targetAccountId,
        grantsAccess ? 'submitter' : 'viewer',
        transition === 'reject' ? 'rejected' : 'approved',
        administratorAccountId,
      ],
    );

    if (transition === 'approve' || transition === 'reject' || transition === 'revoke') {
      await executeQuery(
        client,
        `
          INSERT INTO submitter_access_history (
            app_user_id, action, competition_id, administrator_app_user_id
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          targetAccountId,
          transition === 'approve' ? 'approved' : transition === 'reject' ? 'rejected' : 'revoked',
          target.requestedCompetitionId,
          administratorAccountId,
        ],
      );
    }

    await executeQuery(client, 'DELETE FROM submitter_competition_scope WHERE app_user_id = $1', [
      targetAccountId,
    ]);

    if (grantsAccess) {
      await executeQuery(
        client,
        `
          INSERT INTO submitter_competition_scope (app_user_id, competition_id)
          SELECT $1, requested.competition_id
          FROM unnest($2::bigint[]) AS requested(competition_id)
        `,
        [targetAccountId, requestedCompetitionIds],
      );
    }

    return findUserById(targetAccountId, client);
  });
}

export function createAdminRepository(pool: Pool = getDatabasePool()): AdminRepository {
  return {
    async listUserManagementData() {
      const [users, availableScopes] = await Promise.all([
        listUsers(pool),
        listCompetitionScopes(pool),
      ]);

      return { users, availableScopes };
    },

    async updateSubmitterAccess(targetAccountId, administratorAccountId, update) {
      return applySubmitterAccessTransition(
        pool,
        targetAccountId,
        administratorAccountId,
        update.approved ? 'grant' : 'revoke',
        update.competitionIds,
      );
    },

    async rejectSubmitterAccessRequest(targetAccountId, administratorAccountId) {
      return applySubmitterAccessTransition(
        pool,
        targetAccountId,
        administratorAccountId,
        'reject',
        [],
      );
    },
    async updateRole(targetAccountId, administratorAccountId, update) {
      return withTransaction(pool, async (client) => {
        const targetResult = await executeQuery<TargetAccountRow>(
          client,
          `
            SELECT application_role AS role, submitter_approval_state AS "approvalState",
              submitter_requested_competition_id::text AS "requestedCompetitionId", disabled_at AS "disabledAt"
            FROM app_user WHERE app_user_id = $1 FOR UPDATE
          `,
          [targetAccountId],
        );
        const target = targetResult.rows[0];
        if (!target) throw new AdminUserNotFoundError();
        if (target.disabledAt) {
          throw new AdminManagementConflictError(
            'DISABLED_ACCOUNT_NOT_MANAGEABLE',
            'Disabled accounts cannot be changed through role management.',
          );
        }
        if (target.role === 'admin') {
          throw new AdminManagementConflictError(
            'ADMIN_ACCOUNT_NOT_MANAGEABLE',
            'Administrator accounts cannot be changed through role management.',
          );
        }
        if (update.role !== 'admin') {
          throw new AdminManagementConflictError(
            'ROLE_TRANSITION_MANAGED_BY_SUBMITTER_ACCESS',
            'Viewer and submitter transitions must use the submitter access management endpoints.',
          );
        }
        await executeQuery(
          client,
          `UPDATE app_user SET application_role = 'admin', submitter_access_updated_at = now(), submitter_access_updated_by = $2 WHERE app_user_id = $1`,
          [targetAccountId, administratorAccountId],
        );
        return findUserById(targetAccountId, client);
      });
    },
  };
}
