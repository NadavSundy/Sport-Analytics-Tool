import type {
  AdministratorSubmitterAccessResponse,
  AdministratorSubmitterAccessUpdate,
  AdministratorUserManagementResponse,
} from '@sport-analytics/contracts';

import type { ApplicationAccount } from '../accounts/account';
import { AdminManagementConflictError } from './admin.errors';
import { createAdminRepository, type AdminRepository } from './admin.repository';

export interface AdminService {
  listUsers(): Promise<AdministratorUserManagementResponse>;
  updateSubmitterAccess(
    administrator: ApplicationAccount,
    targetAccountId: string,
    update: AdministratorSubmitterAccessUpdate,
  ): Promise<AdministratorSubmitterAccessResponse>;
}

export function createAdminService(repository?: AdminRepository): AdminService {
  let resolvedRepository = repository;

  function getRepository(): AdminRepository {
    resolvedRepository ??= createAdminRepository();
    return resolvedRepository;
  }

  return {
    async listUsers() {
      return { data: await getRepository().listUserManagementData() };
    },

    async updateSubmitterAccess(administrator, targetAccountId, update) {
      if (administrator.accountId === targetAccountId) {
        throw new AdminManagementConflictError(
          'SELF_MANAGEMENT_NOT_ALLOWED',
          'Administrators cannot change their own submitter access.',
        );
      }

      const user = await getRepository().updateSubmitterAccess(
        targetAccountId,
        administrator.accountId,
        update,
      );

      return { data: user };
    },
  };
}
