import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  queryDefinitionEvaluationResponseSchema,
  type Leaderboard,
  type ParticipantAggregates,
} from '@sport-analytics/contracts';

import type { AnonymousAccessRepository } from '../../src/modules/api-consumers/anonymous-access.repository';
import type { LeaderboardsService } from '../../src/modules/statistics/leaderboards.service';
import type { ParticipantAggregatesService } from '../../src/modules/statistics/participant-aggregates.service';
import type { QueryDefinitionNameResolver } from '../../src/modules/analytics-query/query-definition.evaluator';
import { createSeasonId } from '../../src/modules/public-read/season-id';
import { createTestApp } from '../test-app';

const EVALUATE = '/api/v1/query-definitions/evaluate';

const COMPETITION = { competitionId: '10', name: 'Indian Premier League' };
const SEASON = { competitionId: '10', competitionName: 'Indian Premier League', label: '2026' };
const SEASON_ID = createSeasonId({ competitionId: '10', label: '2026' });

const LEADERBOARD: Leaderboard = {
  scope: 'competition',
  competitionId: '10',
  competitionName: 'Indian Premier League',
  metric: 'most_runs',
  limit: 10,
  qualification: null,
  tieBreakers: ['metricValue', 'participantName', 'participantId'],
  entries: [{ rank: 1, participantId: '56', participantName: 'BB McCullum', value: 420 }],
};

function aggregatesFor(participantId: string): ParticipantAggregates {
  return {
    participantId,
    participantName: 'BB McCullum',
    status: 'complete',
    scope: { superOversIncluded: false },
    warnings: [],
    statistics: [
      {
        statisticId: `stat_career_${participantId}`,
        participantId,
        participantName: 'BB McCullum',
        appearances: 14,
        fixtureCount: 14,
        sourceEventCount: 300,
        batting: null,
        bowling: null,
        fielding: { catches: 1, stumpings: 0, runOutInvolvements: 0 },
        scope: 'career',
        statisticCode: 'participant_career',
      },
    ],
  };
}

const PARTICIPANTS: Record<string, { participantId: string; displayName: string }> = {
  'BB McCullum': { participantId: '56', displayName: 'BB McCullum' },
  "D'Arcy Short": { participantId: '57', displayName: "D'Arcy Short" },
};

function nameResolver(
  overrides: Partial<QueryDefinitionNameResolver> = {},
): QueryDefinitionNameResolver {
  return {
    async findParticipantsByName(name) {
      const record = PARTICIPANTS[name];
      return { records: record ? [record] : [], totalRecords: record ? 1 : 0 };
    },
    async findCompetitionsByName(name) {
      return { records: name === COMPETITION.name ? [COMPETITION] : [], hasMore: false };
    },
    async findSeasonExact(_competitionId, label) {
      return label === SEASON.label ? SEASON : null;
    },
    async findSeasonsByLabel() {
      return { records: [] };
    },
    ...overrides,
  };
}

/**
 * Both the evaluate route and the public statistics routes are built over the
 * same service stubs, so an equality assertion between them compares the two
 * code paths rather than two fixtures.
 */
function appWith(
  options: {
    leaderboard?: Leaderboard | null;
    aggregates?: (participantId: string) => ParticipantAggregates | null;
    names?: Partial<QueryDefinitionNameResolver>;
    anonymous?: AnonymousAccessRepository;
  } = {},
) {
  const leaderboards: LeaderboardsService = {
    getLeaderboard: vi.fn(async () =>
      'leaderboard' in options ? (options.leaderboard ?? null) : LEADERBOARD,
    ),
  };

  const build = options.aggregates ?? aggregatesFor;
  const participantAggregates: ParticipantAggregatesService = {
    getParticipantAggregates: vi.fn(async (participantId: string) => build(participantId)),
    getParticipantAggregate: vi.fn(async () => null),
  };

  return createTestApp(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    participantAggregates,
    undefined,
    undefined,
    undefined,
    undefined,
    leaderboards,
    { names: nameResolver(options.names) },
    // A default parameter, so `undefined` keeps the permissive test repository.
    options.anonymous,
  );
}

const RESET_AT = new Date('2026-10-08T10:01:00.000Z');

/**
 * An anonymous limiter that admits `allowed` requests and refuses the rest, so a
 * test can take the step from inside the bound to past it.
 */
function anonymousRepositoryAllowing(allowed: number): AnonymousAccessRepository {
  let used = 0;

  return {
    consume: vi.fn(async () => {
      used += 1;
      return {
        allowed: used <= allowed,
        sourceUsed: used,
        globalUsed: used,
        exceeded: used <= allowed ? null : ('source' as const),
        resetAt: RESET_AT,
      };
    }),
  };
}

const LEADERBOARD_QUESTION = {
  kind: 'leaderboard',
  metric: 'most_runs',
  scope: 'competition',
  competition: { name: 'Indian Premier League' },
} as const;

describe('query definition evaluation anonymous rate limit', () => {
  // The endpoint is anonymous and does real database work: it resolves every
  // name hint and calls the published statistics services. The documentation
  // actively directs traffic to it by telling clients that answering a
  // suggestion costs nothing, so "free of provider cost" must not be read as
  // "free". It is metered by the same anonymous bounds as the canonical reads.
  it('answers every request inside the anonymous bound', async () => {
    const anonymous = anonymousRepositoryAllowing(30);
    const app = appWith({ anonymous });

    for (let attempt = 1; attempt <= 30; attempt += 1) {
      await request(app)
        .post(EVALUATE)
        .send(LEADERBOARD_QUESTION)
        .expect('RateLimit-Limit', '30')
        .expect('RateLimit-Remaining', String(30 - attempt))
        .expect(200);
    }

    expect(anonymous.consume).toHaveBeenCalledTimes(30);
  });

  it('refuses the request past the bound with the shared anonymous error', async () => {
    const anonymous = anonymousRepositoryAllowing(1);
    const app = appWith({ anonymous });

    await request(app).post(EVALUATE).send(LEADERBOARD_QUESTION).expect(200);

    const refused = await request(app)
      .post(EVALUATE)
      .send(LEADERBOARD_QUESTION)
      .expect('RateLimit-Remaining', '0')
      .expect(429);

    // The existing shape, not a second one invented for this route.
    expect(refused.body).toEqual({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many anonymous requests. Retry after the current rate-limit window.',
      },
    });
    expect(refused.headers['retry-after']).toBe(refused.headers['ratelimit-reset']);
  });

  it('meters on the attempt, so a body that fails the contract still counts', async () => {
    const anonymous = anonymousRepositoryAllowing(30);

    await request(appWith({ anonymous }))
      .post(EVALUATE)
      .send({ kind: 'season_summary' })
      .expect(422);

    expect(anonymous.consume).toHaveBeenCalledOnce();
  });

  it('keys the limit on a digest rather than the address', async () => {
    const anonymous = anonymousRepositoryAllowing(30);

    await request(appWith({ anonymous })).post(EVALUATE).send(LEADERBOARD_QUESTION).expect(200);

    expect(anonymous.consume).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        sourceLimit: 30,
        globalLimit: 600,
      }),
    );
    expect(JSON.stringify(vi.mocked(anonymous.consume).mock.calls)).not.toContain('127.0.0.1');
  });

  it('leaves the sibling natural-language endpoint to its own limiter', async () => {
    const anonymous = anonymousRepositoryAllowing(30);

    await request(appWith({ anonymous }))
      .post('/api/v1/natural-language-queries')
      .send({ question: 'Who scored the most runs in the Indian Premier League?' });

    expect(anonymous.consume).not.toHaveBeenCalled();
  });
});

describe('query definition evaluation endpoint', () => {
  // The natural-language feature is offered to anonymous visitors, so the
  // endpoint carries no authentication requirement.
  it('answers an unauthenticated request', async () => {
    const response = await request(appWith())
      .post(EVALUATE)
      .send({ kind: 'unsupported', reason: 'bowler_type' })
      .expect('Content-Type', /application\/json/)
      .expect(200);

    expect(response.body.data).toMatchObject({ outcome: 'unsupported', reason: 'bowler_type' });
  });

  it('rejects a body that fails the definition contract', async () => {
    for (const body of [
      { kind: 'season_summary' },
      { kind: 'leaderboard', metric: 'most_maidens', scope: 'season' },
      { kind: 'participant_statistics', participant: { name: '' }, scope: 'career' },
      // A career scope may not carry a reference (issue #811).
      {
        kind: 'participant_statistics',
        participant: { name: 'BB McCullum' },
        scope: 'career',
        competition: { name: 'Indian Premier League' },
      },
      {},
    ]) {
      const response = await request(appWith()).post(EVALUATE).send(body).expect(422);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('answers every published response against the contract', async () => {
    for (const body of [
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
      },
      { kind: 'participant_statistics', participant: { name: 'BB McCullum' }, scope: 'career' },
      {
        kind: 'participant_comparison',
        participants: [{ name: 'BB McCullum' }, { name: "D'Arcy Short" }],
        scope: 'career',
      },
      { kind: 'unsupported', reason: 'venue' },
    ]) {
      const response = await request(appWith()).post(EVALUATE).send(body).expect(200);

      expect(queryDefinitionEvaluationResponseSchema.safeParse(response.body).success).toBe(true);
    }
  });

  it('reports a participant that does not resolve', async () => {
    const response = await request(appWith())
      .post(EVALUATE)
      .send({ kind: 'participant_statistics', participant: { name: 'Nobody' }, scope: 'career' })
      .expect(200);

    expect(response.body.data).toMatchObject({
      outcome: 'entity_not_found',
      reference: 'participant',
      nameHint: 'Nobody',
    });
  });

  it('reports an ambiguous participant with candidates', async () => {
    const response = await request(
      appWith({
        names: {
          async findParticipantsByName() {
            return {
              records: [
                { participantId: '1', displayName: 'KL Rahul' },
                { participantId: '2', displayName: 'Rahul Dravid' },
              ],
              totalRecords: 2,
            };
          },
        },
      }),
    )
      .post(EVALUATE)
      .send({ kind: 'participant_statistics', participant: { name: 'Rahul' }, scope: 'career' })
      .expect(200);

    expect(response.body.data).toMatchObject({
      outcome: 'entity_ambiguous',
      reference: 'participant',
      candidates: [
        { id: '1', displayName: 'KL Rahul' },
        { id: '2', displayName: 'Rahul Dravid' },
      ],
    });
  });

  it('carries a source endpoint and statistic identifiers on every answered outcome', async () => {
    for (const body of [
      {
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
      },
      { kind: 'participant_statistics', participant: { name: 'BB McCullum' }, scope: 'career' },
      {
        kind: 'participant_comparison',
        participants: [{ name: 'BB McCullum' }, { name: "D'Arcy Short" }],
        scope: 'career',
      },
    ]) {
      const response = await request(appWith()).post(EVALUATE).send(body).expect(200);

      expect(response.body.data.outcome).toBe('answered');
      expect(response.body.data.sources.length).toBeGreaterThan(0);
      for (const source of response.body.data.sources) {
        expect(source.endpoint).toMatch(/^\/api\/v1\//);
        expect(Array.isArray(source.statisticIds)).toBe(true);
      }
      expect(response.body.data.definitionVersion).toMatch(/^qdv1_/);
    }
  });
});

/**
 * The acceptance criterion the issue names: an evaluated result is the same
 * resource the published endpoint returns. Each test calls both routes on one
 * app and compares the bodies, so a divergence in either path fails here.
 */
describe('query definition evaluation matches the published endpoints', () => {
  it('matches the competition leaderboard endpoint', async () => {
    const app = appWith();

    const evaluated = await request(app)
      .post(EVALUATE)
      .send({
        kind: 'leaderboard',
        metric: 'most_runs',
        scope: 'competition',
        competition: { name: 'Indian Premier League' },
      })
      .expect(200);

    const sourceEndpoint = evaluated.body.data.sources[0].endpoint;
    const published = await request(app).get(sourceEndpoint).expect(200);

    expect(evaluated.body.data.result).toEqual(published.body.data);
  });

  it('matches the season leaderboard endpoint, through the composed season identifier', async () => {
    const app = appWith();

    const evaluated = await request(app)
      .post(EVALUATE)
      .send({
        kind: 'leaderboard',
        metric: 'most_sixes',
        scope: 'season',
        season: { competitionName: 'Indian Premier League', seasonLabel: '2026' },
      })
      .expect(200);

    expect(evaluated.body.data.resolved.seasonId).toBe(SEASON_ID);

    const published = await request(app).get(evaluated.body.data.sources[0].endpoint).expect(200);

    expect(evaluated.body.data.result).toEqual(published.body.data);
  });

  it('matches the participant statistics endpoint', async () => {
    const app = appWith();

    const evaluated = await request(app)
      .post(EVALUATE)
      .send({
        kind: 'participant_statistics',
        participant: { name: 'BB McCullum' },
        scope: 'career',
      })
      .expect(200);

    const published = await request(app).get(evaluated.body.data.sources[0].endpoint).expect(200);

    expect(evaluated.body.data.result).toEqual(published.body.data);
    // The identifiers point at the rows inside that published response.
    expect(evaluated.body.data.sources[0].statisticIds).toEqual(
      published.body.data.statistics.map(
        (statistic: { statisticId: string }) => statistic.statisticId,
      ),
    );
  });

  it('matches the participant statistics endpoint once per compared participant', async () => {
    const app = appWith();

    const evaluated = await request(app)
      .post(EVALUATE)
      .send({
        kind: 'participant_comparison',
        participants: [{ name: 'BB McCullum' }, { name: "D'Arcy Short" }],
        scope: 'career',
      })
      .expect(200);

    expect(evaluated.body.data.sources).toHaveLength(2);

    for (const [index, source] of evaluated.body.data.sources.entries()) {
      const published = await request(app).get(source.endpoint).expect(200);

      expect(evaluated.body.data.result[index]).toEqual(published.body.data);
    }

    // In the order the definition named them.
    expect(evaluated.body.data.resolved.participantIds).toEqual(['56', '57']);
  });
});
