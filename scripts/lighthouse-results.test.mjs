import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateLighthouseResults, evaluateLighthouseGate } from './lighthouse-results.mjs';

test('uses medians rather than the best Lighthouse run', () => {
  const aggregate = aggregateLighthouseResults([
    {
      route: '/',
      profile: 'desktop',
      performance: 92,
      lcpMs: 1800,
      tbtMs: 80,
      cls: 0.02,
      fcpMs: 900,
      speedIndexMs: 1100,
    },
    {
      route: '/',
      profile: 'desktop',
      performance: 65,
      lcpMs: 3400,
      tbtMs: 350,
      cls: 0.03,
      fcpMs: 1600,
      speedIndexMs: 2100,
    },
    {
      route: '/',
      profile: 'desktop',
      performance: 75,
      lcpMs: 2400,
      tbtMs: 180,
      cls: 0.01,
      fcpMs: 1200,
      speedIndexMs: 1500,
    },
  ]);

  assert.deepEqual(aggregate[0].individualRuns, [92, 65, 75]);
  assert.equal(aggregate[0].performance, 75);
  assert.equal(aggregate[0].lcpMs, 2400);
});

test('keeps strict 90 thresholds independent from a temporary baseline floor', () => {
  const result = {
    route: '/',
    profile: 'desktop',
    performance: 66,
    lcpMs: 2600,
    tbtMs: 220,
    cls: 0.04,
  };
  assert.equal(
    evaluateLighthouseGate(result, { mode: 'baseline', floors: { '/': { desktop: 65 } } }).passes,
    true,
  );
  assert.equal(evaluateLighthouseGate(result, { mode: 'strict', floors: {} }).passes, false);
});
