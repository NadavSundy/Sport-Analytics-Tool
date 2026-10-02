import { createHash } from 'node:crypto';

/**
 * The durable limits in front of the natural-language query endpoint.
 *
 * The endpoint is answered for anonymous visitors and every admitted request
 * triggers a paid provider call, so the limits are the whole of its protection
 * and they have three properties worth stating.
 *
 * **They are durable, not process-local.** Every counter lives in PostgreSQL, so
 * a restart or a second replica cannot hand out a fresh allowance.
 *
 * **They count attempts, not successes.** A request is counted before the
 * provider is called, so a failing request cannot be used to bypass the budget.
 * The accepted cost is that a request which fails after admission still spends
 * one attempt.
 *
 * **They fail closed.** If a counter or the salt cannot be read, the request is
 * refused rather than admitted, matching `consumer-authentication.ts`. An
 * unmetered anonymous endpoint in front of a paid provider is the outcome worth
 * avoiding.
 *
 * A client is identified by a salted digest of its address and never by the
 * address, because an IP address is personal information and this limiter needs
 * only to tell one client from another. The salt is generated and held by the
 * database, one per UTC date, so a client cannot be followed from one day to the
 * next.
 */

/** Which allowance a counter belongs to. The global bucket has no client key. */
export type NaturalLanguageQueryBucket = 'client_minute' | 'client_day' | 'global_day';

export interface NaturalLanguageQueryUsageRepository {
  /** The salt for one UTC date, generated on first use and never changed after. */
  readClientSalt(usageDate: string): Promise<Buffer>;
  /**
   * Admits one request into a bucket, returning `allowed: false` once the bucket
   * is full. The counter stops at the limit, so an exhausted bucket cannot be
   * driven higher by further attempts.
   */
  consume(
    bucket: NaturalLanguageQueryBucket,
    bucketKey: string,
    windowStart: Date,
    limit: number,
  ): Promise<{ allowed: boolean; used: number }>;
}

export interface NaturalLanguageQueryLimits {
  rateLimitPerMinute: number;
  dailyQuotaPerClient: number;
  globalDailyLimit: number;
}

export interface NaturalLanguageQueryDecision {
  outcome: 'admitted' | 'rate_limited' | 'quota_exceeded' | 'global_limited' | 'unavailable';
  /** The response headers this decision implies, ready to be set verbatim. */
  headers: Record<string, number>;
}

export interface NaturalLanguageQueryLimiter {
  admit(clientAddress: string, now: Date): Promise<NaturalLanguageQueryDecision>;
}

function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function startOfMinute(now: Date): Date {
  const window = new Date(now);
  window.setUTCSeconds(0, 0);
  return window;
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Never zero: a reset of zero reads as "retry immediately", which is never true. */
function secondsUntil(deadline: number, now: Date): number {
  return Math.max(1, Math.ceil((deadline - now.getTime()) / 1000));
}

export function createNaturalLanguageQueryLimiter(
  repository: NaturalLanguageQueryUsageRepository,
  limits: NaturalLanguageQueryLimits,
): NaturalLanguageQueryLimiter {
  // One salt read per date rather than per request. A salt that changed between
  // requests would give every request its own bucket and no limit would bind.
  // A failed read is deliberately not cached, so a transient fault does not
  // disable the endpoint until the next midnight.
  let cached: { usageDate: string; salt: Buffer } | undefined;

  async function saltFor(usageDate: string): Promise<Buffer> {
    if (cached?.usageDate === usageDate) {
      return cached.salt;
    }

    const salt = await repository.readClientSalt(usageDate);
    cached = { usageDate, salt };
    return salt;
  }

  return {
    async admit(clientAddress, now) {
      const usageDate = utcDate(now);
      const minuteWindow = startOfMinute(now);
      const dayWindow = startOfUtcDay(now);
      const minuteReset = secondsUntil(minuteWindow.getTime() + 60_000, now);
      const dayReset = secondsUntil(dayWindow.getTime() + 86_400_000, now);

      try {
        const salt = await saltFor(usageDate);
        const clientKey = createHash('sha256')
          .update(salt)
          .update(clientAddress, 'utf8')
          .digest('base64url');

        const rateLimit = await repository.consume(
          'client_minute',
          clientKey,
          minuteWindow,
          limits.rateLimitPerMinute,
        );
        const rateLimitHeaders = {
          'RateLimit-Limit': limits.rateLimitPerMinute,
          'RateLimit-Remaining': Math.max(0, limits.rateLimitPerMinute - rateLimit.used),
          'RateLimit-Reset': minuteReset,
        };
        if (!rateLimit.allowed) {
          return {
            outcome: 'rate_limited',
            headers: { ...rateLimitHeaders, 'Retry-After': minuteReset },
          };
        }

        const quota = await repository.consume(
          'client_day',
          clientKey,
          dayWindow,
          limits.dailyQuotaPerClient,
        );
        const quotaHeaders = {
          ...rateLimitHeaders,
          'X-Quota-Limit': limits.dailyQuotaPerClient,
          'X-Quota-Remaining': Math.max(0, limits.dailyQuotaPerClient - quota.used),
          'X-Quota-Reset': dayReset,
        };
        if (!quota.allowed) {
          return { outcome: 'quota_exceeded', headers: quotaHeaders };
        }

        const global = await repository.consume(
          'global_day',
          '',
          dayWindow,
          limits.globalDailyLimit,
        );
        if (!global.allowed) {
          // The global cap is not this caller's own allowance. Reporting it
          // through RateLimit-* or X-Quota-* would tell a client it is exhausted
          // when it is not, so only Retry-After is sent.
          return { outcome: 'global_limited', headers: { 'Retry-After': dayReset } };
        }

        return { outcome: 'admitted', headers: quotaHeaders };
      } catch {
        // `cached` is only assigned after a successful read, so a failed read
        // leaves nothing cached and the next request retries it.
        return { outcome: 'unavailable', headers: {} };
      }
    },
  };
}
