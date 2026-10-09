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

/**
 * Canonical reads that are expressed as a POST because they carry a body.
 *
 * `POST /query-definitions/evaluate` (issue #924) answers a structured query
 * definition from the statistics the platform already publishes. It is a read in
 * everything but method: it computes nothing, stores nothing and mutates
 * nothing. What it does do is resolve every name hint and call the published
 * statistics services, so it costs database work on every anonymous request —
 * and the documentation tells clients that answering a suggestion through it
 * makes no provider call, which is an invitation to send traffic here. It
 * therefore belongs under the same bounds as the reads it is built on.
 *
 * Held separately from the list above rather than relaxing that list's method
 * check, so admitting one POST cannot start metering a POST to any of the
 * sixteen read paths.
 */
const canonicalReadPostPatterns = [/^\/query-definitions\/evaluate$/] as const;

export function createCanonicalReadAuthentication(
  consumerRepository: ApiConsumerRepository,
  anonymousRepository: AnonymousAccessRepository,
  policy: AnonymousAccessPolicy,
  now: () => Date = () => new Date(),
): RequestHandler {
  const authenticateConsumer = createConsumerAuthentication(consumerRepository, now);

  return (request, response, next) => {
    const patterns =
      request.method === 'GET'
        ? canonicalReadPatterns
        : request.method === 'POST'
          ? canonicalReadPostPatterns
          : undefined;

    if (!patterns?.some((pattern) => pattern.test(request.path))) {
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
