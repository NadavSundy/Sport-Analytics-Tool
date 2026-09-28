import { consumerUsageResponseSchema } from '@sport-analytics/contracts';
import type { RequestHandler } from 'express';

import type { ActiveConsumer, ApiConsumerRepository } from './api-consumer.repository';
import { ConsumerUsageQueryError, resolveConsumerUsageQuery } from './consumer-usage-query';

function invalid(response: Parameters<RequestHandler>[1], field: string, message: string): void {
  response.status(400).json({
    error: {
      code: 'VALIDATION_FAILED',
      message: 'The request is invalid.',
      details: [{ code: 'INVALID_FIELD', field, message }],
    },
  });
}

export function createConsumerUsageController(
  repository: ApiConsumerRepository,
  now: () => Date = () => new Date(),
): RequestHandler {
  return (request, response, next) => {
    let query;
    try {
      query = resolveConsumerUsageQuery(request.query, now());
    } catch (error) {
      if (!(error instanceof ConsumerUsageQueryError)) throw error;
      invalid(response, error.field, error.message);
      return;
    }
    const consumer = response.locals.apiConsumer as ActiveConsumer;
    if (!repository.listUsage) {
      next(new Error('Consumer usage repository is unavailable.'));
      return;
    }
    void repository
      .listUsage(consumer.consumerId, query)
      .then((usage) =>
        response.status(200).json(
          consumerUsageResponseSchema.parse({
            data: {
              from: query.from,
              to: query.to,
              totalRequests: usage.totalRequests,
              quota: {
                limit: consumer.dailyQuota,
                used: Number(
                  response.getHeader('X-Quota-Remaining')
                    ? consumer.dailyQuota - Number(response.getHeader('X-Quota-Remaining'))
                    : 0,
                ),
                remaining: Number(response.getHeader('X-Quota-Remaining') ?? consumer.dailyQuota),
              },
              entries: usage.entries,
            },
          }),
        ),
      )
      .catch(next);
  };
}
