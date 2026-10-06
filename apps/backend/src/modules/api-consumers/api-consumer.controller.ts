import {
  administratorApiConsumerUsageResponseSchema,
  apiConsumerPathParametersSchema,
} from '@sport-analytics/contracts';
import type { RequestHandler, Response } from 'express';

import type { ApplicationAccount } from '../accounts/account';
import { ApiConsumerNotFoundError } from './api-consumer.repository';
import type { ApiConsumerService } from './api-consumer.service';
import { ConsumerUsageQueryError, resolveConsumerUsageQuery } from './consumer-usage-query';

function account(response: Response): ApplicationAccount {
  const authenticated = response.locals.authenticatedAccount as ApplicationAccount | undefined;
  if (!authenticated) throw new Error('API consumer controller requires an authenticated account');
  return authenticated;
}

function validationError(response: Response, message: string): void {
  response.status(422).json({ error: { code: 'VALIDATION_FAILED', message } });
}

export function createApiConsumerUsageController(
  service: ApiConsumerService,
  now: () => Date = () => new Date(),
): RequestHandler {
  return (request, response, next) => {
    const parameters = apiConsumerPathParametersSchema.safeParse(request.params);
    if (!parameters.success) {
      validationError(response, 'The API consumer identifier is invalid.');
      return;
    }
    let query;
    try {
      query = resolveConsumerUsageQuery(request.query, now());
    } catch (error) {
      if (!(error instanceof ConsumerUsageQueryError)) throw error;
      response.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The request is invalid.',
          details: [{ code: 'INVALID_FIELD', field: error.field, message: error.message }],
        },
      });
      return;
    }
    void service
      .usage(account(response), parameters.data.consumerId, query)
      .then((usage) => {
        response
          .status(200)
          .json(administratorApiConsumerUsageResponseSchema.parse({ data: usage }));
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
