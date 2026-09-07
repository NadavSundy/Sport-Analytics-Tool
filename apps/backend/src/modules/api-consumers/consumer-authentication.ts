import type { RequestHandler } from 'express';

import {
  hashApiKey,
  type ApiConsumerRepository,
  type ActiveConsumer,
} from './api-consumer.repository';

interface Window {
  startedAt: number;
  count: number;
}

function unauthorized(response: Parameters<RequestHandler>[1]): void {
  response.setHeader('WWW-Authenticate', 'ApiKey');
  response.status(401).json({
    error: { code: 'API_KEY_UNAUTHORIZED', message: 'A valid active API key is required.' },
  });
}

function secondsToUtcMidnight(now = new Date()): number {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

export function createConsumerAuthentication(repository: ApiConsumerRepository): RequestHandler {
  const windows = new Map<string, Window>();
  return (request, response, next) => {
    const rawKey = request.get('X-API-Key');
    if (!rawKey || !/^sat_live_[A-Za-z0-9_-]{43}$/.test(rawKey)) {
      unauthorized(response);
      return;
    }
    void repository
      .findActiveConsumer(hashApiKey(rawKey))
      .then(async (consumer) => {
        if (!consumer) {
          unauthorized(response);
          return;
        }
        if (!withinRateLimit(consumer, windows, response)) return;
        const quota = await repository.consumeDailyQuota(consumer.consumerId, consumer.dailyQuota);
        response.setHeader('X-Quota-Limit', consumer.dailyQuota);
        response.setHeader('X-Quota-Remaining', Math.max(0, consumer.dailyQuota - quota.used));
        response.setHeader('X-Quota-Reset', secondsToUtcMidnight());
        if (!quota.allowed) {
          response.status(429).json({
            error: {
              code: 'QUOTA_EXCEEDED',
              message: 'The daily consumer quota has been reached.',
            },
          });
          return;
        }
        response.locals.apiConsumer = consumer;
        next();
      })
      .catch(next);
  };
}

function withinRateLimit(
  consumer: ActiveConsumer,
  windows: Map<string, Window>,
  response: Parameters<RequestHandler>[1],
): boolean {
  const now = Date.now();
  const existing = windows.get(consumer.consumerId);
  const window =
    !existing || now - existing.startedAt >= 60_000 ? { startedAt: now, count: 0 } : existing;
  window.count += 1;
  windows.set(consumer.consumerId, window);
  const reset = Math.max(1, Math.ceil((window.startedAt + 60_000 - now) / 1000));
  response.setHeader('RateLimit-Limit', consumer.rateLimitPerMinute);
  response.setHeader(
    'RateLimit-Remaining',
    Math.max(0, consumer.rateLimitPerMinute - window.count),
  );
  response.setHeader('RateLimit-Reset', reset);
  if (window.count <= consumer.rateLimitPerMinute) return true;
  response.setHeader('Retry-After', reset);
  response.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Retry after the current rate-limit window.',
    },
  });
  return false;
}
