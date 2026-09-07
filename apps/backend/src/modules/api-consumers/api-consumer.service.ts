import type { ApiConsumer, ApiConsumerIssue } from '@sport-analytics/contracts';
import { randomBytes } from 'node:crypto';

import type { ApplicationAccount } from '../accounts/account';
import {
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
    async rotate(owner, consumerId) {
      const key = generateKey();
      return { ...(await repository.rotate(owner.accountId, consumerId, key)), apiKey: key.raw };
    },
    async revoke(owner, consumerId, keyId) {
      await repository.revoke(owner.accountId, consumerId, keyId);
    },
  };
}
