import type {
  AdministratorCompetitionScope,
  AdministratorManagedUser,
  AdministratorSubmitterAccessUpdate,
} from '@sport-analytics/contracts';
import type { Pool } from 'pg';

import { executeQuery, getDatabasePool, withTransaction, type QueryExecutor } from '../../database';
import { isApplicationRole, isSubmitterApprovalState } from '../accounts/account';
import {
  AdminManagementConflictError,
  AdminUserNotFoundError,
  InvalidCompetitionScopesError,
} from './admin.errors';

interface AdministratorUserRow {
  id: string;
  displayName: string | null;
  role: string;
  approvalState: string;
  competitionIds: string[];
  competitionNames: string[];
  disabledAt: Date | null;
  updatedAt: Date;
  submitterAccessUpdatedAt: Date | null;
  submitterAccessUpdatedById: string | null;
  submitterAccessUpdatedByDisplayName: string | null;
}

interface TargetAccountRow {
  role: string;
  disabledAt: Date | null;
}

export interface AdminUserManagementData {
  users: AdministratorManagedUser[];
  availableScopes: AdministratorCompetitionScope[];
}

export interface AdminRepository {
  listUserManagementData(): Promise<AdminUserManagementData>;
  updateSubmitterAccess(
    targetAccountId: string,
    administratorAccountId: string,
    update: AdministratorSubmitterAccessUpdate,
  ): Promise<AdministratorManagedUser>;
}

const administratorUserSelect = `
  SELECT
    managed.app_user_id::text AS id,
    managed.display_name AS "displayName",
    managed.application_role AS role,
    managed.submitter_approval_state AS "approvalState",
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
    access_administrator.display_name AS "submitterAccessUpdatedByDisplayName"
  FROM app_user managed
  LEFT JOIN submitter_competition_scope scope
    ON scope.app_user_id = managed.app_user_id
  LEFT JOIN competition
    ON competition.competition_id = scope.competition_id
  LEFT JOIN app_user access_administrator
    ON access_administrator.app_user_id = managed.submitter_access_updated_by
`;

function mapAdministratorUser(row: AdministratorUserRow): AdministratorManagedUser {
  if (!isApplicationRole(row.role)) {
    throw new Error('Managed application account has an unsupported role');
  }

  if (!isSubmitterApprovalState(row.approvalState)) {
    throw new Error('Managed application account has an unsupported approval state');
  }

  if (row.competitionIds.length !== row.competitionNames.length) {
    throw new Error('Managed application account has inconsistent competition scope data');
  }

  return {
    id: row.id,
    displayName: row.displayName,
    role: row.role,
    approvalState: row.approvalState,
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
  };
}

async function listUsers(executor: QueryExecutor): Promise<AdministratorManagedUser[]> {
  const result = await executeQuery<AdministratorUserRow>(
    executor,
    `${administratorUserSelect}
      GROUP BY
        managed.app_user_id,
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
): Promise<AdministratorManagedUser> {
  const result = await executeQuery<AdministratorUserRow>(
    executor,
    `${administratorUserSelect}
      WHERE managed.app_user_id = $1
      GROUP BY
        managed.app_user_id,
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
      return withTransaction(pool, async (client) => {
        const targetResult = await executeQuery<TargetAccountRow>(
          client,
          `
            SELECT
              application_role AS role,
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

        const requestedCompetitionIds = [...new Set(update.competitionIds)];

        if (update.approved) {
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
            update.approved ? 'submitter' : 'viewer',
            update.approved ? 'approved' : 'rejected',
            administratorAccountId,
          ],
        );

        await executeQuery(
          client,
          'DELETE FROM submitter_competition_scope WHERE app_user_id = $1',
          [targetAccountId],
        );

        if (update.approved) {
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
    },
  };
}
