import {
  apiConsumerIssueResponseSchema,
  apiConsumerIssueSchema,
  apiConsumerListResponseSchema,
  apiConsumerRotateResponseSchema,
} from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import type { ApplicationAccount } from '../accounts/account';
import { ApiConsumerNotFoundError } from './api-consumer.repository';
import type { ApiConsumerService } from './api-consumer.service';

function account(response: Response): ApplicationAccount {
  const authenticated = response.locals.authenticatedAccount as ApplicationAccount | undefined;
  if (!authenticated) throw new Error('API consumer controller requires an authenticated account');
  return authenticated;
}

function validId(value: string | undefined): value is string {
  return value !== undefined && /^\d+$/.test(value);
}

function validationError(response: Response, message: string): void {
  response.status(422).json({ error: { code: 'VALIDATION_FAILED', message } });
}

export function createApiConsumerIssueController(service: ApiConsumerService): RequestHandler {
  return (request, response, next) => {
    const parsed = apiConsumerIssueSchema.safeParse(request.body);
    if (!parsed.success) {
      validationError(response, 'The API consumer request is invalid.');
      return;
    }
    void service
      .issue(account(response), parsed.data)
      .then((result) => {
        response.status(201).json(apiConsumerIssueResponseSchema.parse({ data: result }));
      })
      .catch(next);
  };
}

export function createApiConsumerListController(service: ApiConsumerService): RequestHandler {
  return (_request, response, next) => {
    void service
      .list(account(response))
      .then((consumers) => {
        response.status(200).json(apiConsumerListResponseSchema.parse({ data: { consumers } }));
      })
      .catch(next);
  };
}

export function createApiConsumerRotateController(service: ApiConsumerService): RequestHandler {
  return (request, response, next) => {
    if (!validId(request.params.consumerId)) {
      validationError(response, 'The API consumer identifier is invalid.');
      return;
    }
    void service
      .rotate(account(response), request.params.consumerId)
      .then((result) => {
        response.status(200).json(apiConsumerRotateResponseSchema.parse({ data: result }));
      })
      .catch((error: unknown) => {
        if (error instanceof ApiConsumerNotFoundError) {
          response
            .status(404)
            .json({ error: { code: 'API_CONSUMER_NOT_FOUND', message: error.message } });
          return;
        }
        next(error);
      });
  };
}

export function createApiConsumerRevokeController(service: ApiConsumerService): RequestHandler {
  return (request, response, next) => {
    if (!validId(request.params.consumerId) || !validId(request.params.keyId)) {
      validationError(response, 'The API consumer key identifier is invalid.');
      return;
    }
    void service
      .revoke(account(response), request.params.consumerId, request.params.keyId)
      .then(() => {
        response.status(204).end();
      })
      .catch((error: unknown) => {
        if (error instanceof ApiConsumerNotFoundError) {
          response
            .status(404)
            .json({ error: { code: 'API_CONSUMER_KEY_NOT_FOUND', message: error.message } });
          return;
        }
        next(error);
      });
  };
}
