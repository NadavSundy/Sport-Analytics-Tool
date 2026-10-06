import {
  administratorApiConsumerUsageResponseSchema,
  apiAccessDecisionSchema,
  apiAccessOverviewResponseSchema,
  apiAccessRequestCreateSchema,
  apiAccessRequestListResponseSchema,
  apiAccessRequestResponseSchema,
  apiConsumerLimitsSchema,
  apiConsumerListResponseSchema,
  apiConsumerRotateResponseSchema,
} from '@sport-analytics/contracts';
import { Router, type RequestHandler, type Response } from 'express';

import type { VerifyAccessToken } from '../../auth/supabase-auth';
import { requireAuthentication } from '../../middleware/require-authentication';
import { requireAdministrator } from '../../middleware/require-authorization';
import type { ApplicationAccount } from '../accounts/account';
import type { SynchronizeAccount } from '../accounts/account.service';
import { ApiAccessConflictError, ApiAccessRequestNotFoundError } from './api-access.repository';
import type { ApiAccessService } from './api-access.service';
import { ApiConsumerNotFoundError } from './api-consumer.repository';
import { ConsumerUsageQueryError, resolveConsumerUsageQuery } from './consumer-usage-query';

function account(response: Response): ApplicationAccount {
  return response.locals.authenticatedAccount as ApplicationAccount;
}

function numeric(value: string | undefined): value is string {
  return value !== undefined && /^\d+$/.test(value);
}
function invalid(response: Response) {
  response
    .status(422)
    .json({ error: { code: 'VALIDATION_FAILED', message: 'The API access request is invalid.' } });
}
function handle(error: unknown, response: Response, next: (error?: unknown) => void) {
  if (error instanceof ApiAccessConflictError) {
    response.status(409).json({ error: { code: 'API_ACCESS_CONFLICT', message: error.message } });
    return;
  }
  if (error instanceof ApiAccessRequestNotFoundError || error instanceof ApiConsumerNotFoundError) {
    response.status(404).json({ error: { code: 'API_ACCESS_NOT_FOUND', message: error.message } });
    return;
  }
  next(error);
}

export function createApiAccessRouter(
  verify: VerifyAccessToken,
  synchronize: SynchronizeAccount,
  service: ApiAccessService,
): Router {
  const router = Router();
  const authenticate = requireAuthentication(verify, synchronize);
  const admin = requireAdministrator();
  const wrap =
    (work: (response: Response) => Promise<void>): RequestHandler =>
    (_request, response, next) => {
      void work(response).catch((error) => handle(error, response, next));
    };

  router.post('/account/api-access/requests', authenticate, (request, response, next) => {
    const parsed = apiAccessRequestCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      invalid(response);
      return;
    }
    void service
      .requestAccess(account(response), parsed.data)
      .then((result) =>
        response.status(201).json(apiAccessRequestResponseSchema.parse({ data: result })),
      )
      .catch((error) => handle(error, response, next));
  });
  router.get(
    '/account/api-access',
    authenticate,
    wrap(async (response) => {
      response.json(
        apiAccessOverviewResponseSchema.parse({
          data: await service.getOwnAccess(account(response)),
        }),
      );
    }),
  );
  router.get(
    '/admin/api-access-requests',
    authenticate,
    admin,
    wrap(async (response) => {
      response.json(
        apiAccessRequestListResponseSchema.parse({
          data: { requests: await service.listPending() },
        }),
      );
    }),
  );
  router.patch(
    '/admin/api-access-requests/:requestId',
    authenticate,
    admin,
    (request, response, next) => {
      const parsed = apiAccessDecisionSchema.safeParse(request.body);
      if (!numeric(request.params.requestId) || !parsed.success) {
        invalid(response);
        return;
      }
      void service
        .decide(account(response), request.params.requestId, parsed.data)
        .then((result) => response.json(apiAccessRequestResponseSchema.parse({ data: result })))
        .catch((error) => handle(error, response, next));
    },
  );

  const keyAction =
    (rotate: boolean): RequestHandler =>
    (request, response, next) => {
      if (!numeric(request.params.consumerId)) {
        invalid(response);
        return;
      }
      const action = rotate
        ? service.rotateKey(account(response), request.params.consumerId)
        : service.generateKey(account(response), request.params.consumerId);
      void action
        .then(({ consumer, apiKey }) =>
          response
            .status(rotate ? 200 : 201)
            .json(apiConsumerRotateResponseSchema.parse({ data: { ...consumer, apiKey } })),
        )
        .catch((error) => handle(error, response, next));
    };
  router.post('/account/api-consumers/:consumerId/keys', authenticate, keyAction(false));
  router.post('/account/api-consumers/:consumerId/keys/rotate', authenticate, keyAction(true));
  router.delete(
    '/account/api-consumers/:consumerId/keys/:keyId',
    authenticate,
    (request, response, next) => {
      if (!numeric(request.params.consumerId) || !numeric(request.params.keyId)) {
        invalid(response);
        return;
      }
      void service
        .revokeOwnKey(account(response), request.params.consumerId, request.params.keyId)
        .then(() => response.status(204).end())
        .catch((error) => handle(error, response, next));
    },
  );
  router.get(
    '/account/api-consumers/:consumerId/usage',
    authenticate,
    (request, response, next) => {
      if (!numeric(request.params.consumerId)) {
        invalid(response);
        return;
      }
      let query;
      try {
        query = resolveConsumerUsageQuery(request.query, new Date());
      } catch (error) {
        if (error instanceof ConsumerUsageQueryError) {
          response
            .status(400)
            .json({ error: { code: 'VALIDATION_FAILED', message: error.message } });
          return;
        }
        throw error;
      }
      void service
        .getOwnUsage(account(response), request.params.consumerId, query)
        .then((usage) =>
          response.json(administratorApiConsumerUsageResponseSchema.parse({ data: usage })),
        )
        .catch((error) => handle(error, response, next));
    },
  );

  router.get(
    '/admin/api-consumers/all',
    authenticate,
    admin,
    wrap(async (response) => {
      response.json(
        apiConsumerListResponseSchema.parse({ data: { consumers: await service.listConsumers() } }),
      );
    }),
  );
  router.patch(
    '/admin/api-consumers/:consumerId/limits',
    authenticate,
    admin,
    (request, response, next) => {
      const parsed = apiConsumerLimitsSchema.safeParse(request.body);
      if (!numeric(request.params.consumerId) || !parsed.success) {
        invalid(response);
        return;
      }
      void service
        .updateLimits(request.params.consumerId, parsed.data)
        .then((consumer) => response.json({ data: consumer }))
        .catch((error) => handle(error, response, next));
    },
  );
  router.delete(
    '/admin/api-consumers/:consumerId/keys/:keyId',
    authenticate,
    admin,
    (request, response, next) => {
      if (!numeric(request.params.consumerId) || !numeric(request.params.keyId)) {
        invalid(response);
        return;
      }
      void service
        .revokeAnyKey(request.params.consumerId, request.params.keyId)
        .then(() => response.status(204).end())
        .catch((error) => handle(error, response, next));
    },
  );
  return router;
}
