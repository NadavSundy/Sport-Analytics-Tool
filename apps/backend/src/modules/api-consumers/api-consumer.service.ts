import type {
  AdministratorApiConsumerUsageResponse,
  ApiConsumer,
  ApiConsumerIssue,
} from '@sport-analytics/contracts';
import { randomBytes } from 'node:crypto';

import type { ApplicationAccount } from '../accounts/account';
import {
  ApiConsumerNotFoundError,
  createApiConsumerRepository,
  hashApiKey,
  type ApiConsumerRepository,
} from './api-consumer.repository';

export interface ApiConsumerService {
  issue(
    owner: ApplicationAccount,
    issue: ApiConsumerIssue,
  ): Promise<ApiConsumer & { apiKey: string }>;
  list(owner: ApplicationAccount): Promise<ApiConsumer[]>;
  usage(
    owner: ApplicationAccount,
    consumerId: string,
    query: { from: string; to: string; limit: number },
  ): Promise<AdministratorApiConsumerUsageResponse['data']>;
  rotate(owner: ApplicationAccount, consumerId: string): Promise<ApiConsumer & { apiKey: string }>;
  revoke(owner: ApplicationAccount, consumerId: string, keyId: string): Promise<void>;
}

function generateKey() {
  const raw = `sat_live_${randomBytes(32).toString('base64url')}`;
  return { raw, prefix: raw.slice(0, 17), hash: hashApiKey(raw) };
}

export function createApiConsumerService(
  repository: ApiConsumerRepository = createApiConsumerRepository(),
): ApiConsumerService {
  return {
    async issue(owner, issue) {
      const key = generateKey();
      return { ...(await repository.issue(owner.accountId, issue, key)), apiKey: key.raw };
    },
    async list(owner) {
      return repository.list(owner.accountId);
    },
    async usage(owner, consumerId, query) {
      const consumer = await repository.findOwned(owner.accountId, consumerId);
      if (!consumer) throw new ApiConsumerNotFoundError();
      if (!repository.listUsage) throw new Error('Consumer usage repository is unavailable.');
      const usage = await repository.listUsage(consumerId, query);
      return {
        consumer: {
          id: consumer.id,
          name: consumer.name,
          rateLimitPerMinute: consumer.rateLimitPerMinute,
          dailyQuota: consumer.dailyQuota,
        },
        from: query.from,
        to: query.to,
        totalRequests: usage.totalRequests,
        entries: usage.entries,
      };
    },
    async rotate(owner, consumerId) {
      const key = generateKey();
      return { ...(await repository.rotate(owner.accountId, consumerId, key)), apiKey: key.raw };
    },
    async revoke(owner, consumerId, keyId) {
      await repository.revoke(owner.accountId, consumerId, keyId);
    },
  };
}
