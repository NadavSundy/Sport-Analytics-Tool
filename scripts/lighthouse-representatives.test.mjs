import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveLighthouseRepresentatives,
  resolveLighthouseRoutePath,
} from './lighthouse-representatives.mjs';

test('discovers public representative identifiers once and resolves routes centrally', async () => {
  const requests = [];
  const bodies = {
    '/competitions?limit=1': { data: [{ competitionId: 'competition-1' }] },
    '/seasons?limit=1': { data: [{ seasonId: 'season-1' }] },
    '/fixtures?limit=1': { data: [{ fixtureId: 'fixture-1' }] },
    '/competitors?limit=1': { data: [{ competitorId: 'competitor-1' }] },
    '/participants?limit=1': { data: [{ participantId: 'participant-1' }] },
    '/dataset-releases': { data: [{ version: 'v1' }] },
    '/fixtures/fixture-1/statistics': {
      data: {
        statistics: [
          { statisticId: 'statistic-1', scope: 'participant', participantId: 'participant-1' },
          { statisticId: 'statistic-2', scope: 'participant', participantId: 'participant-2' },
        ],
      },
    },
  };
  const representatives = await resolveLighthouseRepresentatives({
    apiBaseUrl: 'https://api.example.test/api/v1/',
    environment: {},
    fetchImpl: async (url) => {
      assert.equal(url.pathname.startsWith('/api/v1/'), true);
      const key = `${url.pathname.replace('/api/v1', '')}${url.search}`;
      requests.push(key);
      return { ok: true, json: async () => bodies[key] };
    },
  });
  assert.equal(requests.length, 7);
  assert.equal(
    resolveLighthouseRoutePath(
      { path: '/fixtures/:fixtureId/statistics/:statisticId' },
      representatives,
    ),
    '/fixtures/fixture-1/statistics/statistic-1',
  );
  assert.equal(
    resolveLighthouseRoutePath({ path: '/participants/compare' }, representatives),
    '/participants/compare?fixtureId=fixture-1&playerA=participant-1&playerB=participant-2',
  );
});

test('uses explicit protected overrides and refuses unresolved parameterised paths', () => {
  assert.equal(
    resolveLighthouseRoutePath(
      { path: '/admin/api-consumers/:consumerId', role: 'admin' },
      { apiConsumerId: 'consumer-1' },
    ),
    '/admin/api-consumers/consumer-1',
  );
  assert.equal(
    resolveLighthouseRoutePath(
      { path: '/submissions/batches/:batchReference', role: 'submitter' },
      {},
    ),
    null,
  );
});
