import { consumerUsageQuerySchema, type ConsumerUsageQuery } from '@sport-analytics/contracts';

export const MAX_CONSUMER_USAGE_RANGE_DAYS = 31;
export const DEFAULT_CONSUMER_USAGE_RANGE_DAYS = 7;

export interface ResolvedConsumerUsageQuery {
  from: string;
  to: string;
  limit: number;
}

export class ConsumerUsageQueryError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function resolveConsumerUsageQuery(input: unknown, now: Date): ResolvedConsumerUsageQuery {
  const parsed = consumerUsageQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new ConsumerUsageQueryError(
      parsed.error.issues[0]?.path.join('.') || 'query',
      'Invalid usage query.',
    );
  }

  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_CONSUMER_USAGE_RANGE_DAYS - 1));
  const from = parsed.data.from ?? isoDate(defaultFrom);
  const to = parsed.data.to ?? isoDate(today);
  validateDateWindow({ ...parsed.data, from, to });
  return { from, to, limit: parsed.data.limit };
}

function validateDateWindow(query: ConsumerUsageQuery & { from: string; to: string }): void {
  const fromDate = new Date(`${query.from}T00:00:00.000Z`);
  const toDate = new Date(`${query.to}T00:00:00.000Z`);
  if (
    Number.isNaN(fromDate.getTime()) ||
    isoDate(fromDate) !== query.from ||
    Number.isNaN(toDate.getTime()) ||
    isoDate(toDate) !== query.to
  ) {
    throw new ConsumerUsageQueryError('from', 'Dates must be calendar dates in YYYY-MM-DD format.');
  }
  const rangeDays = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (rangeDays < 1) {
    throw new ConsumerUsageQueryError('to', '`to` must be on or after `from`.');
  }
  if (rangeDays > MAX_CONSUMER_USAGE_RANGE_DAYS) {
    throw new ConsumerUsageQueryError(
      'to',
      `Date ranges may not exceed ${MAX_CONSUMER_USAGE_RANGE_DAYS} days.`,
    );
  }
}
