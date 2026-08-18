import type { SubmitterAccessRequestResponse } from '@sport-analytics/contracts';
import type { ApplicationAccount } from '../accounts/account';
import { SubmitterAccessConflictError } from './submitter-access.errors';
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
      if (account.role === 'submitter' || account.role === 'admin') {
        throw new SubmitterAccessConflictError(
          'SUBMITTER_ALREADY_APPROVED',
          'The authenticated account already has submission access.',
        );
      }

      resolvedRepository ??= createSubmitterAccessRepository();
      const request = await resolvedRepository.requestAccess(account.accountId);

      return {
        data: request,
      };
    },
  };
}
