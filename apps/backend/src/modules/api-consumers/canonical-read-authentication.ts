import { createHmac } from 'node:crypto';
import type { RequestHandler } from 'express';

import type { AnonymousAccessRepository } from './anonymous-access.repository';
import type { ApiConsumerRepository } from './api-consumer.repository';
import { createConsumerAuthentication } from './consumer-authentication';

export interface AnonymousAccessPolicy {
  sourceLimitPerMinute: number;
  globalLimitPerMinute: number;
  sourceKeySecret: string;
}

const canonicalReadPatterns = [
  /^\/competitions(?:\/[^/]+)?$/,
  /^\/seasons(?:\/[^/]+)?$/,
  /^\/fixtures$/,
  /^\/fixtures\/[^/]+$/,
  /^\/fixtures\/[^/]+\/events$/,
  /^\/fixtures\/[^/]+\/events\/export\.(?:json|csv)$/,
  /^\/fixtures\/[^/]+\/events\/[^/]+$/,
  /^\/fixtures\/[^/]+\/statistics$/,
  /^\/fixtures\/[^/]+\/statistics\/[^/]+$/,
  /^\/fixtures\/[^/]+\/statistics\/[^/]+\/events\/export\.(?:json|csv)$/,
  /^\/competitors(?:\/[^/]+)?$/,
  /^\/participants$/,
  /^\/participants\/[^/]+$/,
  /^\/participants\/[^/]+\/fixtures$/,
  /^\/participants\/[^/]+\/statistics(?:\/[^/]+)?$/,
  /^\/statistics\/leaderboards$/,
] as const;

export function createCanonicalReadAuthentication(
  consumerRepository: ApiConsumerRepository,
  anonymousRepository: AnonymousAccessRepository,
  policy: AnonymousAccessPolicy,
  now: () => Date = () => new Date(),
): RequestHandler {
  const authenticateConsumer = createConsumerAuthentication(consumerRepository, now);

  return (request, response, next) => {
    if (
      request.method !== 'GET' ||
      !canonicalReadPatterns.some((pattern) => pattern.test(request.path))
    ) {
      next();
      return;
    }

    if (request.get('X-API-Key') !== undefined) {
      authenticateConsumer(request, response, next);
      return;
    }

    const sourceAddress = request.ip || request.socket.remoteAddress;
    if (!sourceAddress) {
      unavailable(response);
      return;
    }
    const requestTime = now();
    const sourceKey = createHmac('sha256', policy.sourceKeySecret)
      .update(sourceAddress)
      .digest('hex');

    void anonymousRepository
      .consume({
        sourceKey,
        sourceLimit: policy.sourceLimitPerMinute,
        globalLimit: policy.globalLimitPerMinute,
        at: requestTime,
      })
      .then((usage) => {
        const reset = Math.max(
          1,
          Math.ceil((usage.resetAt.getTime() - requestTime.getTime()) / 1000),
        );
        response.setHeader('RateLimit-Limit', policy.sourceLimitPerMinute);
        response.setHeader(
          'RateLimit-Remaining',
          usage.allowed ? Math.max(0, policy.sourceLimitPerMinute - usage.sourceUsed) : 0,
        );
        response.setHeader('RateLimit-Reset', reset);
        if (!usage.allowed) {
          response.setHeader('Retry-After', reset);
          response.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many anonymous requests. Retry after the current rate-limit window.',
            },
          });
          return;
        }
        next();
      })
      .catch(() => unavailable(response));
  };
}

function unavailable(response: Parameters<RequestHandler>[1]): void {
  response.status(503).json({
    error: {
      code: 'RATE_LIMIT_UNAVAILABLE',
      message: 'Anonymous rate limiting is temporarily unavailable. Please retry shortly.',
    },
  });
}
