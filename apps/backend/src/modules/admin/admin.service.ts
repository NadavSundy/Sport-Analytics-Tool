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
  rejectSubmitterAccessRequest(
    administrator: ApplicationAccount,
    targetAccountId: string,
  ): Promise<AdministratorSubmitterAccessResponse>;
}

export function createAdminService(repository?: AdminRepository): AdminService {
  let resolvedRepository = repository;

  function getRepository(): AdminRepository {
    resolvedRepository ??= createAdminRepository();
    return resolvedRepository;
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
      return { data: await getRepository().listUserManagementData() };
    },

    async updateSubmitterAccess(administrator, targetAccountId, update) {
      prohibitSelfManagement(administrator, targetAccountId);

      const user = await getRepository().updateSubmitterAccess(
        targetAccountId,
        administrator.accountId,
        update,
      );

      return { data: user };
    },

    async rejectSubmitterAccessRequest(administrator, targetAccountId) {
      prohibitSelfManagement(administrator, targetAccountId);

      const user = await getRepository().rejectSubmitterAccessRequest(
        targetAccountId,
        administrator.accountId,
      );

      return { data: user };
    },
  };
}
