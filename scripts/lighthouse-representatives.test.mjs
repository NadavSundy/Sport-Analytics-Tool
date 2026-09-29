import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLighthouseRepresentatives, resolveLighthouseRoutePath } from './lighthouse-representatives.mjs';

test('discovers public representative identifiers once and resolves routes centrally', async () => {
  const requests = [];
  const bodies = {
    '/competitions?limit=1': { data: [{ id: 'competition-1' }] },
    '/seasons?limit=1': { data: [{ id: 'season-1' }] },
    '/fixtures?limit=1': { data: [{ id: 'fixture-1' }] },
    '/competitors?limit=1': { data: [{ id: 'competitor-1' }] },
    '/participants?limit=1': { data: [{ id: 'participant-1' }] },
    '/dataset-releases': { data: [{ version: 'v1' }] },
    '/fixtures/fixture-1/statistics': { data: { statistics: [{ id: 'statistic-1' }] } },
  };
  const representatives = await resolveLighthouseRepresentatives({
    apiBaseUrl: 'https://api.example.test/api/v1/', environment: {},
    fetchImpl: async (url) => {
      const key = `${url.pathname.replace('/api/v1', '')}${url.search}`;
      requests.push(key);
      return { ok: true, json: async () => bodies[key] };
    },
  });
  assert.equal(requests.length, 7);
  assert.equal(resolveLighthouseRoutePath({ path: '/fixtures/:fixtureId/statistics/:statisticId' }, representatives), '/fixtures/fixture-1/statistics/statistic-1');
  assert.equal(resolveLighthouseRoutePath({ path: '/participants/compare' }, representatives), '/participants/compare?fixtureId=fixture-1&playerA=participant-1&playerB=participant-1');
});

test('uses explicit protected overrides and refuses unresolved parameterised paths', () => {
  assert.equal(resolveLighthouseRoutePath({ path: '/admin/api-consumers/:consumerId', role: 'admin' }, { apiConsumerId: 'consumer-1' }), '/admin/api-consumers/consumer-1');
  assert.equal(resolveLighthouseRoutePath({ path: '/submissions/batches/:batchReference', role: 'submitter' }, {}), null);
});
