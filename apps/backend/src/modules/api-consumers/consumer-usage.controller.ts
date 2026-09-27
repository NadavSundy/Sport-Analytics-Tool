import { consumerUsageQuerySchema, consumerUsageResponseSchema } from '@sport-analytics/contracts';
import type { RequestHandler } from 'express';

import type { ActiveConsumer, ApiConsumerRepository } from './api-consumer.repository';

const MAX_RANGE_DAYS = 31;
const DEFAULT_RANGE_DAYS = 7;

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

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
    const parsed = consumerUsageQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      invalid(response, parsed.error.issues[0]?.path.join('.') || 'query', 'Invalid usage query.');
      return;
    }
    const today = new Date(now());
    today.setUTCHours(0, 0, 0, 0);
    const defaultFrom = new Date(today);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));
    const from = parsed.data.from ?? isoDate(defaultFrom);
    const to = parsed.data.to ?? isoDate(today);
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);
    if (
      Number.isNaN(fromDate.getTime()) ||
      isoDate(fromDate) !== from ||
      Number.isNaN(toDate.getTime()) ||
      isoDate(toDate) !== to
    ) {
      invalid(response, 'from', 'Dates must be calendar dates in YYYY-MM-DD format.');
      return;
    }
    const rangeDays = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
    if (rangeDays < 1) {
      invalid(response, 'to', '`to` must be on or after `from`.');
      return;
    }
    if (rangeDays > MAX_RANGE_DAYS) {
      invalid(response, 'to', `Date ranges may not exceed ${MAX_RANGE_DAYS} days.`);
      return;
    }
    const consumer = response.locals.apiConsumer as ActiveConsumer;
    if (!repository.listUsage) {
      next(new Error('Consumer usage repository is unavailable.'));
      return;
    }
    void repository
      .listUsage(consumer.consumerId, { from, to, limit: parsed.data.limit })
      .then((usage) =>
        response.status(200).json(
          consumerUsageResponseSchema.parse({
            data: {
              from,
              to,
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
