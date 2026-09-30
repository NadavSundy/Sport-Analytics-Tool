import assert from 'node:assert/strict';
import test from 'node:test';
import { selectableLighthouseRoutes } from './lighthouse-routes.mjs';

test('selects the deterministic public URL used to audit the wildcard not-found template', () => {
  assert.deepEqual(selectableLighthouseRoutes('/__lighthouse-not-found__'), [
    {
      path: '/__lighthouse-not-found__',
      routePattern: '*',
      access: 'public',
      kind: 'not-found',
      setup: 'deliberately nonexistent public path',
      baseline: false,
    },
  ]);
});
