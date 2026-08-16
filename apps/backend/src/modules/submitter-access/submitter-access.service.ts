import type { ApplicationAccount } from '../accounts/account';
import {
  createSubmitterAccessRepository,
  type SubmitterAccessRepository,
} from './submitter-access.repository';

export interface SubmitterAccessResponse {
  data: {
    accountId: string;
    approvalState: 'pending';
  };
}

export interface SubmitterAccessService {
  requestAccess(account: ApplicationAccount): Promise<SubmitterAccessResponse>;
}

export function createSubmitterAccessService(
  repository: SubmitterAccessRepository = createSubmitterAccessRepository(),
): SubmitterAccessService {
  return {
    async requestAccess(account) {
      const request = await repository.requestAccess(account.accountId);

      return {
        data: request,
      };
    },
  };
}
