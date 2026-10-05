import type {
  AdministratorApiConsumerUsageResponse,
  AdministratorApiAccessRequest,
  ApiAccessDecision,
  ApiAccessRequest,
  ApiAccessRequestCreate,
  ApiConsumer,
} from '@sport-analytics/contracts';

import { SupabaseAdminEmailLookupError, type ReadAuthUserEmail } from '../../auth/supabase-auth';
import { AdminEmailLookupUnavailableError } from '../admin/admin.errors';
import type { ApplicationAccount } from '../accounts/account';
import {
  createLazyApiAccessRepository,
  ApiAccessConflictError,
  type ApiAccessRepository,
} from './api-access.repository';
import { createApiConsumerService, type ApiConsumerService } from './api-consumer.service';
import { ApiConsumerNotFoundError } from './api-consumer.repository';

export interface ApiAccessService {
  requestAccess(
    account: ApplicationAccount,
    input: ApiAccessRequestCreate,
  ): Promise<ApiAccessRequest>;
  getOwnAccess(
    account: ApplicationAccount,
  ): Promise<{ request: ApiAccessRequest | null; consumer: ApiConsumer | null }>;
  listPending(): Promise<AdministratorApiAccessRequest[]>;
  decide(
    admin: ApplicationAccount,
    requestId: string,
    input: ApiAccessDecision,
  ): Promise<ApiAccessRequest>;
  generateKey(
    account: ApplicationAccount,
    consumerId: string,
  ): Promise<{ consumer: ApiConsumer; apiKey: string }>;
  rotateKey(
    account: ApplicationAccount,
    consumerId: string,
  ): Promise<{ consumer: ApiConsumer; apiKey: string }>;
  revokeOwnKey(account: ApplicationAccount, consumerId: string, keyId: string): Promise<void>;
  getOwnUsage(
    account: ApplicationAccount,
    consumerId: string,
    query: { from: string; to: string; limit: number },
  ): Promise<AdministratorApiConsumerUsageResponse['data']>;
  listConsumers(): Promise<ApiConsumer[]>;
  updateLimits(
    consumerId: string,
    limits: { rateLimitPerMinute: number; dailyQuota: number },
  ): Promise<ApiConsumer>;
  revokeAnyKey(consumerId: string, keyId: string): Promise<void>;
}

export function createApiAccessService(
  repository: ApiAccessRepository = createLazyApiAccessRepository(),
  consumers: ApiConsumerService = createApiConsumerService(),
  readAuthUserEmail?: ReadAuthUserEmail,
): ApiAccessService {
  return {
    requestAccess(account, input) {
      return repository.createRequest(account.accountId, input);
    },
    getOwnAccess(account) {
      return repository.getOwn(account.accountId);
    },
    async listPending() {
      if (!readAuthUserEmail) throw new AdminEmailLookupUnavailableError();
      const requests = await repository.listPending();
      return Promise.all(
        requests.map(async ({ requesterAuthSubject, requesterDisplayName, ...request }) => {
          try {
            return {
              ...request,
              requester: {
                displayName: requesterDisplayName,
                email: await readAuthUserEmail(requesterAuthSubject),
              },
            };
          } catch (error) {
            throw new AdminEmailLookupUnavailableError(
              error instanceof SupabaseAdminEmailLookupError ? error.failure : 'provider_error',
            );
          }
        }),
      );
    },
    decide(admin, requestId, input) {
      return repository.decide(admin.accountId, requestId, input);
    },
    async generateKey(account, consumerId) {
      const overview = await repository.getOwn(account.accountId);
      if (!overview.consumer || overview.consumer.id !== consumerId)
        throw new ApiConsumerNotFoundError();
      if (overview.consumer.keys.some((key) => key.revokedAt === null))
        throw new ApiAccessConflictError();
      const result = await consumers.rotate(account, consumerId);
      const { apiKey, ...consumer } = result;
      return { consumer, apiKey };
    },
    async rotateKey(account, consumerId) {
      const result = await consumers.rotate(account, consumerId);
      const { apiKey, ...consumer } = result;
      return { consumer, apiKey };
    },
    revokeOwnKey: (account, consumerId, keyId) => consumers.revoke(account, consumerId, keyId),
    getOwnUsage: (account, consumerId, query) => consumers.usage(account, consumerId, query),
    listConsumers: () => repository.listConsumers(),
    updateLimits: (consumerId, limits) =>
      repository.updateLimits(consumerId, limits.rateLimitPerMinute, limits.dailyQuota),
    revokeAnyKey: (consumerId, keyId) => repository.revokeAnyKey(consumerId, keyId),
  };
}
