import type {
  SubmitterAccessRequest,
  SubmitterAccessRequestResponse,
  SubmitterScopeRequestResponse,
} from '@sport-analytics/contracts';
import type { ApplicationAccount } from '../accounts/account';
import { SubmitterAccessConflictError } from './submitter-access.errors';
import {
  createSubmitterAccessRepository,
  type SubmitterAccessRepository,
} from './submitter-access.repository';

export interface SubmitterAccessService {
  requestAccess(
    account: ApplicationAccount,
    request: SubmitterAccessRequest,
  ): Promise<SubmitterAccessRequestResponse>;
  requestAdditionalScope(
    account: ApplicationAccount,
    request: SubmitterAccessRequest,
  ): Promise<SubmitterScopeRequestResponse>;
}

export function createSubmitterAccessService(
  repository?: SubmitterAccessRepository,
): SubmitterAccessService {
  let resolvedRepository = repository;

  function getRepository(): SubmitterAccessRepository {
    resolvedRepository ??= createSubmitterAccessRepository();
    return resolvedRepository;
  }

  return {
    async requestAccess(account, request) {
      if (account.role === 'submitter' || account.role === 'admin') {
        throw new SubmitterAccessConflictError(
          'SUBMITTER_ALREADY_APPROVED',
          'The authenticated account already has submission access.',
        );
      }

      const persistedRequest = await getRepository().requestAccess(
        account.accountId,
        request.competitionId,
      );

      return {
        data: persistedRequest,
      };
    },

    async requestAdditionalScope(account, request) {
      if (account.role !== 'submitter') {
        throw new SubmitterAccessConflictError(
          'ADDITIONAL_SCOPE_REQUIRES_APPROVED_SUBMITTER',
          'Only an approved submitter can request an additional competition scope.',
        );
      }

      if (account.competitionIds.includes(request.competitionId)) {
        throw new SubmitterAccessConflictError(
          'SCOPE_ALREADY_GRANTED',
          'The authenticated account already has submission access for this competition.',
        );
      }

      const pendingRequest = account.requestedCompetition;
      if (pendingRequest && !account.competitionIds.includes(pendingRequest.competitionId)) {
        throw new SubmitterAccessConflictError(
          'ADDITIONAL_SCOPE_REQUEST_PENDING',
          `A request for ${pendingRequest.name} is already awaiting administrator review.`,
        );
      }

      const persistedRequest = await getRepository().requestAdditionalScope(
        account.accountId,
        request.competitionId,
      );

      return { data: persistedRequest };
    },
  };
}
