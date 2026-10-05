import type {
  ApiAccessDecision,
  ApiAccessRequest,
  ApiAccessRequestCreate,
  ApiConsumer,
} from '@sport-analytics/contracts';
import type { Pool } from 'pg';

import { executeQuery, getDatabasePool, withTransaction, type QueryExecutor } from '../../database';

interface RequestRow {
  id: string;
  requesterAccountId: string;
  name: string;
  intendedUse: string;
  state: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  consumerId: string | null;
  requesterAuthSubject?: string;
  requesterDisplayName?: string | null;
}

type PendingApiAccessRequestRecord = ApiAccessRequest & {
  requesterAuthSubject: string;
  requesterDisplayName: string | null;
};

const requestSelect = `SELECT request.api_consumer_access_request_id::text AS id,
  request.requester_app_user_id::text AS "requesterAccountId", request.consumer_name AS name,
  request.intended_use AS "intendedUse", request.request_state AS state,
  request.created_at AS "createdAt", request.reviewed_at AS "reviewedAt",
  request.review_reason AS "reviewReason",
  reviewer.app_user_id::text AS "reviewedById", reviewer.display_name AS "reviewedByName",
  requester.auth_subject AS "requesterAuthSubject",
  requester.display_name AS "requesterDisplayName",
  request.api_consumer_id::text AS "consumerId"
 FROM api_consumer_access_request request
 JOIN app_user requester ON requester.app_user_id = request.requester_app_user_id
 LEFT JOIN app_user reviewer ON reviewer.app_user_id = request.reviewed_by_app_user_id`;

function mapRequest(row: RequestRow & { reviewReason?: string | null }): ApiAccessRequest {
  return {
    id: row.id,
    requesterAccountId: row.requesterAccountId,
    name: row.name,
    intendedUse: row.intendedUse,
    state: row.state,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedBy: row.reviewedById ? { id: row.reviewedById, displayName: row.reviewedByName } : null,
    reviewReason: row.reviewReason ?? null,
  };
}

async function readRequest(executor: QueryExecutor, id: string): Promise<ApiAccessRequest> {
  const result = await executeQuery<RequestRow & { reviewReason: string | null }>(
    executor,
    `${requestSelect} WHERE request.api_consumer_access_request_id = $1`,
    [id],
  );
  if (!result.rows[0]) throw new ApiAccessRequestNotFoundError();
  return mapRequest(result.rows[0]);
}

async function readConsumer(executor: QueryExecutor, id: string): Promise<ApiConsumer> {
  const result = await executeQuery<{
    id: string;
    name: string;
    rateLimitPerMinute: number;
    dailyQuota: number;
    createdAt: Date;
  }>(
    executor,
    `SELECT api_consumer_id::text AS id, name,
    rate_limit_per_minute AS "rateLimitPerMinute", daily_quota AS "dailyQuota", created_at AS "createdAt"
    FROM api_consumer WHERE api_consumer_id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new ApiAccessRequestNotFoundError();
  const keys = await executeQuery<{
    id: string;
    prefix: string;
    createdAt: Date;
    revokedAt: Date | null;
  }>(
    executor,
    `SELECT api_consumer_key_id::text AS id, key_prefix AS prefix, created_at AS "createdAt",
      revoked_at AS "revokedAt" FROM api_consumer_key WHERE api_consumer_id = $1 ORDER BY api_consumer_key_id`,
    [id],
  );
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    keys: keys.rows.map((key) => ({
      ...key,
      createdAt: key.createdAt.toISOString(),
      revokedAt: key.revokedAt?.toISOString() ?? null,
    })),
  };
}

export interface ApiAccessRepository {
  createRequest(accountId: string, input: ApiAccessRequestCreate): Promise<ApiAccessRequest>;
  getOwn(
    accountId: string,
  ): Promise<{ request: ApiAccessRequest | null; consumer: ApiConsumer | null }>;
  listPending(): Promise<PendingApiAccessRequestRecord[]>;
  decide(adminId: string, requestId: string, input: ApiAccessDecision): Promise<ApiAccessRequest>;
  listConsumers(): Promise<ApiConsumer[]>;
  updateLimits(
    consumerId: string,
    rateLimitPerMinute: number,
    dailyQuota: number,
  ): Promise<ApiConsumer>;
  revokeAnyKey(consumerId: string, keyId: string): Promise<void>;
}

export function createApiAccessRepository(pool: Pool = getDatabasePool()): ApiAccessRepository {
  return {
    async createRequest(accountId, input) {
      try {
        return await withTransaction(pool, async (client) => {
          await executeQuery(client, `SELECT pg_advisory_xact_lock($1::bigint)`, [accountId]);
          const existing = await executeQuery(
            client,
            `SELECT 1 FROM api_consumer_access_request
             WHERE requester_app_user_id = $1 AND request_state IN ('pending', 'approved') LIMIT 1`,
            [accountId],
          );
          if (existing.rows[0]) throw new ApiAccessConflictError();
          const inserted = await executeQuery<{ id: string }>(
            client,
            `INSERT INTO api_consumer_access_request (requester_app_user_id, consumer_name, intended_use)
             VALUES ($1, $2, $3) RETURNING api_consumer_access_request_id::text AS id`,
            [accountId, input.name, input.intendedUse],
          );
          return readRequest(client, inserted.rows[0]!.id);
        });
      } catch (error: unknown) {
        if (error instanceof ApiAccessConflictError) throw error;
        if ((error as { code?: string }).code === '23505') throw new ApiAccessConflictError();
        throw error;
      }
    },
    async getOwn(accountId) {
      const result = await executeQuery<RequestRow & { reviewReason: string | null }>(
        pool,
        `${requestSelect} WHERE request.requester_app_user_id = $1
         ORDER BY request.api_consumer_access_request_id DESC LIMIT 1`,
        [accountId],
      );
      const row = result.rows[0];
      return {
        request: row ? mapRequest(row) : null,
        consumer: row?.consumerId ? await readConsumer(pool, row.consumerId) : null,
      };
    },
    async listPending() {
      const result = await executeQuery<RequestRow & { reviewReason: string | null }>(
        pool,
        `${requestSelect} WHERE request.request_state = 'pending'
         ORDER BY request.created_at, request.api_consumer_access_request_id`,
      );
      return result.rows.map((row) => ({
        ...mapRequest(row),
        requesterAuthSubject: row.requesterAuthSubject!,
        requesterDisplayName: row.requesterDisplayName ?? null,
      }));
    },
    async decide(adminId, requestId, input) {
      return withTransaction(pool, async (client) => {
        const locked = await executeQuery<RequestRow>(
          client,
          `SELECT api_consumer_access_request_id::text AS id,
            requester_app_user_id::text AS "requesterAccountId", consumer_name AS name,
            intended_use AS "intendedUse", request_state AS state, created_at AS "createdAt",
            reviewed_at AS "reviewedAt", null::text AS "reviewedById",
            null::text AS "reviewedByName", api_consumer_id::text AS "consumerId"
           FROM api_consumer_access_request WHERE api_consumer_access_request_id = $1 FOR UPDATE`,
          [requestId],
        );
        const request = locked.rows[0];
        if (!request) throw new ApiAccessRequestNotFoundError();
        if (request.state !== 'pending') throw new ApiAccessConflictError();
        let consumerId: string | null = null;
        if (input.decision === 'approved') {
          const inserted = await executeQuery<{ id: string }>(
            client,
            `INSERT INTO api_consumer (owner_app_user_id, name, rate_limit_per_minute, daily_quota)
             VALUES ($1, $2, $3, $4) RETURNING api_consumer_id::text AS id`,
            [request.requesterAccountId, request.name, input.rateLimitPerMinute, input.dailyQuota],
          );
          consumerId = inserted.rows[0]!.id;
        }
        await executeQuery(
          client,
          `UPDATE api_consumer_access_request SET request_state = $2, api_consumer_id = $3,
            reviewed_by_app_user_id = $4, reviewed_at = now(), review_reason = $5
           WHERE api_consumer_access_request_id = $1`,
          [requestId, input.decision, consumerId, adminId, input.reviewReason ?? null],
        );
        return readRequest(client, requestId);
      });
    },
    async listConsumers() {
      const result = await executeQuery<{ id: string }>(
        pool,
        `SELECT api_consumer_id::text AS id FROM api_consumer ORDER BY api_consumer_id`,
      );
      return Promise.all(result.rows.map(({ id }) => readConsumer(pool, id)));
    },
    async updateLimits(consumerId, rateLimitPerMinute, dailyQuota) {
      const updated = await executeQuery(
        pool,
        `UPDATE api_consumer SET rate_limit_per_minute = $2, daily_quota = $3 WHERE api_consumer_id = $1`,
        [consumerId, rateLimitPerMinute, dailyQuota],
      );
      if (updated.rowCount !== 1) throw new ApiAccessRequestNotFoundError();
      return readConsumer(pool, consumerId);
    },
    async revokeAnyKey(consumerId, keyId) {
      const result = await executeQuery(
        pool,
        `UPDATE api_consumer_key SET revoked_at = now()
         WHERE api_consumer_id = $1 AND api_consumer_key_id = $2 AND revoked_at IS NULL`,
        [consumerId, keyId],
      );
      if (result.rowCount !== 1) throw new ApiAccessRequestNotFoundError();
    },
  };
}

export function createLazyApiAccessRepository(): ApiAccessRepository {
  let repository: ApiAccessRepository | undefined;
  const resolved = () => (repository ??= createApiAccessRepository());
  return {
    createRequest: (...args) => resolved().createRequest(...args),
    getOwn: (...args) => resolved().getOwn(...args),
    listPending: (...args) => resolved().listPending(...args),
    decide: (...args) => resolved().decide(...args),
    listConsumers: (...args) => resolved().listConsumers(...args),
    updateLimits: (...args) => resolved().updateLimits(...args),
    revokeAnyKey: (...args) => resolved().revokeAnyKey(...args),
  };
}

export class ApiAccessConflictError extends Error {
  constructor() {
    super('An active API access request or approval already exists.');
  }
}
export class ApiAccessRequestNotFoundError extends Error {
  constructor() {
    super('The API access request or consumer was not found.');
  }
}
