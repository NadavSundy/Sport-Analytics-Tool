import type { SubmitterAccessRequestResponse } from '@sport-analytics/contracts';
import type { ApplicationAccount } from '../accounts/account';
import {
  createSubmitterAccessRepository,
  type SubmitterAccessRepository,
} from './submitter-access.repository';

export interface SubmitterAccessService {
  requestAccess(account: ApplicationAccount): Promise<SubmitterAccessRequestResponse>;
}

export function createSubmitterAccessService(
  repository?: SubmitterAccessRepository,
): SubmitterAccessService {
  let resolvedRepository = repository;

  return {
    async requestAccess(account) {
      resolvedRepository ??= createSubmitterAccessRepository();
      const request = await resolvedRepository.requestAccess(account.accountId);

      return {
        data: request,
      };
    },
  };
}
