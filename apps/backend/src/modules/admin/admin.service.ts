import type {
  AdministratorSubmitterAccessResponse,
  AdministratorSubmitterAccessUpdate,
  AdministratorRoleUpdate,
  AdministratorUserManagementResponse,
} from '@sport-analytics/contracts';

import type { ApplicationAccount } from '../accounts/account';
import { SupabaseAdminEmailLookupError, type ReadAuthUserEmail } from '../../auth/supabase-auth';
import { AdminEmailLookupUnavailableError, AdminManagementConflictError } from './admin.errors';
import { createAdminRepository, type AdminRepository } from './admin.repository';

export interface AdminService {
  listUsers(): Promise<AdministratorUserManagementResponse>;
  updateSubmitterAccess(
    administrator: ApplicationAccount,
    targetAccountId: string,
    update: AdministratorSubmitterAccessUpdate,
  ): Promise<AdministratorSubmitterAccessResponse>;
  rejectSubmitterAccessRequest(
    administrator: ApplicationAccount,
    targetAccountId: string,
  ): Promise<AdministratorSubmitterAccessResponse>;
  updateRole(
    administrator: ApplicationAccount,
    targetAccountId: string,
    update: AdministratorRoleUpdate,
  ): Promise<AdministratorSubmitterAccessResponse>;
}

export function createAdminService(
  repository?: AdminRepository,
  readAuthUserEmail?: ReadAuthUserEmail,
): AdminService {
  let resolvedRepository = repository;

  function getRepository(): AdminRepository {
    resolvedRepository ??= createAdminRepository();
    return resolvedRepository;
  }

  async function withEmail<T extends { authSubject: string }>(user: T) {
    if (!readAuthUserEmail) {
      throw new AdminEmailLookupUnavailableError();
    }

    const { authSubject, ...safeUser } = user;
    try {
      return { ...safeUser, email: await readAuthUserEmail(authSubject) };
    } catch (error) {
      throw new AdminEmailLookupUnavailableError(
        error instanceof SupabaseAdminEmailLookupError ? error.failure : 'provider_error',
      );
    }
  }

  function prohibitSelfManagement(
    administrator: ApplicationAccount,
    targetAccountId: string,
  ): void {
    if (administrator.accountId === targetAccountId) {
      throw new AdminManagementConflictError(
        'SELF_MANAGEMENT_NOT_ALLOWED',
        'Administrators cannot change their own submitter access.',
      );
    }
  }

  return {
    async listUsers() {
      const managementData = await getRepository().listUserManagementData();
      const users = await Promise.all(managementData.users.map(withEmail));

      return { data: { users, availableScopes: managementData.availableScopes } };
    },

    async updateSubmitterAccess(administrator, targetAccountId, update) {
      prohibitSelfManagement(administrator, targetAccountId);

      const user = await getRepository().updateSubmitterAccess(
        targetAccountId,
        administrator.accountId,
        update,
      );

      return { data: await withEmail(user) };
    },

    async rejectSubmitterAccessRequest(administrator, targetAccountId) {
      prohibitSelfManagement(administrator, targetAccountId);

      const user = await getRepository().rejectSubmitterAccessRequest(
        targetAccountId,
        administrator.accountId,
      );

      return { data: await withEmail(user) };
    },
    async updateRole(administrator, targetAccountId, update) {
      prohibitSelfManagement(administrator, targetAccountId);
      const user = await getRepository().updateRole(
        targetAccountId,
        administrator.accountId,
        update,
      );
      return { data: await withEmail(user) };
    },
  };
}
