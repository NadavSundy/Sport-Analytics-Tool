import { describe, expect, it, vi } from 'vitest';

import {
  createNaturalLanguageQueryLimiter,
  type NaturalLanguageQueryUsageRepository,
} from '../../src/modules/analytics-query/natural-language-query.limiter';

const LIMITS = { rateLimitPerMinute: 10, dailyQuotaPerClient: 100, globalDailyLimit: 300 };
const SALT = Buffer.alloc(32, 7);
const NOW = new Date('2026-10-01T12:34:56.789Z');

function repositoryWith(
  overrides: Partial<NaturalLanguageQueryUsageRepository> = {},
): NaturalLanguageQueryUsageRepository {
  return {
    readClientSalt: vi.fn(async () => SALT),
    consume: vi.fn(async () => ({ allowed: true, used: 1 })),
    ...overrides,
  };
}

describe('natural-language query limiter', () => {
  it('admits a request within every limit and reports the remaining allowances', async () => {
    const limiter = createNaturalLanguageQueryLimiter(repositoryWith(), LIMITS);

    const decision = await limiter.admit('203.0.113.9', NOW);

    expect(decision.outcome).toBe('admitted');
    expect(decision.headers).toEqual({
      'RateLimit-Limit': 10,
      'RateLimit-Remaining': 9,
      'RateLimit-Reset': 4,
      'X-Quota-Limit': 100,
      'X-Quota-Remaining': 99,
      'X-Quota-Reset': 41_104,
    });
  });

  // The address is the thing worth protecting, so it must never be what is
  // counted. Only a salted digest of it may reach the counter table.
  it('counts a keyed hash of the address and never the address itself', async () => {
    const consume = vi.fn(async () => ({ allowed: true, used: 1 }));
    const limiter = createNaturalLanguageQueryLimiter(repositoryWith({ consume }), LIMITS);

    await limiter.admit('203.0.113.9', NOW);

    const keys = consume.mock.calls.map(([, bucketKey]) => bucketKey);
    expect(keys).not.toContain('203.0.113.9');
    for (const key of keys) {
      expect(key).not.toContain('203.0.113');
      expect(key === '' || /^[A-Za-z0-9_-]{43}$/.test(key)).toBe(true);
    }
  });

  it('gives two addresses different buckets and one address a stable bucket', async () => {
    const consume = vi.fn(async () => ({ allowed: true, used: 1 }));
    const limiter = createNaturalLanguageQueryLimiter(repositoryWith({ consume }), LIMITS);

    await limiter.admit('203.0.113.9', NOW);
    await limiter.admit('198.51.100.4', NOW);
    await limiter.admit('203.0.113.9', NOW);

    const minuteKeys = consume.mock.calls
      .filter(([kind]) => kind === 'client_minute')
      .map(([, key]) => key);
    expect(minuteKeys[0]).toBe(minuteKeys[2]);
    expect(minuteKeys[0]).not.toBe(minuteKeys[1]);
  });

  // A salt that changed per request would give every request a fresh bucket and
  // the limits would never bind.
  it('reads the salt once per date rather than once per request', async () => {
    const readClientSalt = vi.fn(async () => SALT);
    const limiter = createNaturalLanguageQueryLimiter(repositoryWith({ readClientSalt }), LIMITS);

    await limiter.admit('203.0.113.9', NOW);
    await limiter.admit('203.0.113.9', NOW);
    await limiter.admit('203.0.113.9', new Date('2026-10-02T00:00:01.000Z'));

    expect(readClientSalt).toHaveBeenCalledTimes(2);
    expect(readClientSalt.mock.calls.map(([date]) => date)).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('rehashes a client when the daily salt rotates', async () => {
    const consume = vi.fn(async () => ({ allowed: true, used: 1 }));
    const salts = new Map([
      ['2026-10-01', Buffer.alloc(32, 1)],
      ['2026-10-02', Buffer.alloc(32, 2)],
    ]);
    const limiter = createNaturalLanguageQueryLimiter(
      repositoryWith({ consume, readClientSalt: async (date) => salts.get(date)! }),
      LIMITS,
    );

    await limiter.admit('203.0.113.9', NOW);
    await limiter.admit('203.0.113.9', new Date('2026-10-02T09:00:00.000Z'));

    const dayKeys = consume.mock.calls
      .filter(([kind]) => kind === 'client_day')
      .map(([, key]) => key);
    expect(dayKeys[0]).not.toBe(dayKeys[1]);
  });

  describe('when a limit is exhausted', () => {
    it('reports the per-minute limit with Retry-After', async () => {
      const limiter = createNaturalLanguageQueryLimiter(
        repositoryWith({
          consume: async (kind) =>
            kind === 'client_minute' ? { allowed: false, used: 10 } : { allowed: true, used: 1 },
        }),
        LIMITS,
      );

      const decision = await limiter.admit('203.0.113.9', NOW);

      expect(decision.outcome).toBe('rate_limited');
      expect(decision.headers).toEqual({
        'RateLimit-Limit': 10,
        'RateLimit-Remaining': 0,
        'RateLimit-Reset': 4,
        'Retry-After': 4,
      });
    });

    it('reports the daily quota with the quota headers and no Retry-After', async () => {
      const limiter = createNaturalLanguageQueryLimiter(
        repositoryWith({
          consume: async (kind) =>
            kind === 'client_day' ? { allowed: false, used: 100 } : { allowed: true, used: 3 },
        }),
        LIMITS,
      );

      const decision = await limiter.admit('203.0.113.9', NOW);

      expect(decision.outcome).toBe('quota_exceeded');
      expect(decision.headers['X-Quota-Remaining']).toBe(0);
      expect(decision.headers['X-Quota-Reset']).toBe(41_104);
      expect(decision.headers).not.toHaveProperty('Retry-After');
    });

    // The global cap is not the caller's own allowance, so reporting it through
    // RateLimit-* or X-Quota-* would tell a client it is exhausted when it is not.
    it('reports the global cap with Retry-After alone', async () => {
      const limiter = createNaturalLanguageQueryLimiter(
        repositoryWith({
          consume: async (kind) =>
            kind === 'global_day' ? { allowed: false, used: 300 } : { allowed: true, used: 1 },
        }),
        LIMITS,
      );

      const decision = await limiter.admit('203.0.113.9', NOW);

      expect(decision.outcome).toBe('global_limited');
      expect(decision.headers).toEqual({ 'Retry-After': 41_104 });
    });

    it('stops at the first exhausted limit rather than spending the others', async () => {
      const consume = vi.fn(async (kind: string) =>
        kind === 'client_minute' ? { allowed: false, used: 10 } : { allowed: true, used: 1 },
      );
      const limiter = createNaturalLanguageQueryLimiter(repositoryWith({ consume }), LIMITS);

      await limiter.admit('203.0.113.9', NOW);

      expect(consume.mock.calls.map(([kind]) => kind)).toEqual(['client_minute']);
    });
  });

  describe('when the limiter itself fails', () => {
    // A limiter that cannot count must not admit the request: an unmetered
    // anonymous endpoint in front of a paid provider is the failure worth avoiding.
    it('fails closed when the salt cannot be read', async () => {
      const limiter = createNaturalLanguageQueryLimiter(
        repositoryWith({
          readClientSalt: async () => {
            throw new Error('salt unavailable');
          },
        }),
        LIMITS,
      );

      await expect(limiter.admit('203.0.113.9', NOW)).resolves.toEqual({
        outcome: 'unavailable',
        headers: {},
      });
    });

    it.each(['client_minute', 'client_day', 'global_day'])(
      'fails closed when the %s counter cannot be written',
      async (failing) => {
        const limiter = createNaturalLanguageQueryLimiter(
          repositoryWith({
            consume: async (kind) => {
              if (kind === failing) throw new Error('counter unavailable');
              return { allowed: true, used: 1 };
            },
          }),
          LIMITS,
        );

        const decision = await limiter.admit('203.0.113.9', NOW);

        expect(decision.outcome).toBe('unavailable');
      },
    );

    it('does not cache a salt it failed to read', async () => {
      let attempt = 0;
      const readClientSalt = vi.fn(async () => {
        attempt += 1;
        if (attempt === 1) throw new Error('salt unavailable');
        return SALT;
      });
      const limiter = createNaturalLanguageQueryLimiter(repositoryWith({ readClientSalt }), LIMITS);

      expect((await limiter.admit('203.0.113.9', NOW)).outcome).toBe('unavailable');
      expect((await limiter.admit('203.0.113.9', NOW)).outcome).toBe('admitted');
    });
  });

  describe('window arithmetic', () => {
    it('counts a minute bucket from the truncated minute', async () => {
      const consume = vi.fn(async () => ({ allowed: true, used: 1 }));
      const limiter = createNaturalLanguageQueryLimiter(repositoryWith({ consume }), LIMITS);

      await limiter.admit('203.0.113.9', NOW);

      const [, , minuteWindow] = consume.mock.calls.find(([kind]) => kind === 'client_minute')!;
      expect((minuteWindow as Date).toISOString()).toBe('2026-10-01T12:34:00.000Z');
    });

    it('counts both day buckets from UTC midnight', async () => {
      const consume = vi.fn(async () => ({ allowed: true, used: 1 }));
      const limiter = createNaturalLanguageQueryLimiter(repositoryWith({ consume }), LIMITS);

      await limiter.admit('203.0.113.9', NOW);

      for (const kind of ['client_day', 'global_day']) {
        const [, , window] = consume.mock.calls.find(([bucket]) => bucket === kind)!;
        expect((window as Date).toISOString()).toBe('2026-10-01T00:00:00.000Z');
      }
    });

    it('never reports a reset of less than one second', async () => {
      const limiter = createNaturalLanguageQueryLimiter(repositoryWith(), LIMITS);

      const decision = await limiter.admit('203.0.113.9', new Date('2026-10-01T23:59:59.999Z'));

      expect(decision.headers['RateLimit-Reset']).toBeGreaterThanOrEqual(1);
      expect(decision.headers['X-Quota-Reset']).toBeGreaterThanOrEqual(1);
    });

    it('uses the single global bucket for every client', async () => {
      const consume = vi.fn(async () => ({ allowed: true, used: 1 }));
      const limiter = createNaturalLanguageQueryLimiter(repositoryWith({ consume }), LIMITS);

      await limiter.admit('203.0.113.9', NOW);
      await limiter.admit('198.51.100.4', NOW);

      const globalKeys = consume.mock.calls
        .filter(([kind]) => kind === 'global_day')
        .map(([, key]) => key);
      expect(globalKeys).toEqual(['', '']);
    });
  });
});
