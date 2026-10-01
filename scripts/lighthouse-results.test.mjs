import assert from 'node:assert/strict';
import test from 'node:test';
import { lighthouseCiBaselineFloors } from './lighthouse-ci-baseline.mjs';
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

test('approved hosted-CI floors cover every representative route and profile', () => {
  assert.deepEqual(lighthouseCiBaselineFloors, {
    '/': { desktop: 97, mobile: 90 },
    '/api': { desktop: 96, mobile: 89 },
    '/competitions': { desktop: 96, mobile: 87 },
    '/seasons': { desktop: 96, mobile: 86 },
    '/fixtures': { desktop: 96, mobile: 86 },
    '/competitors': { desktop: 96, mobile: 87 },
    '/participants': { desktop: 96, mobile: 87 },
    '/dataset-releases': { desktop: 96, mobile: 88 },
    '/sign-in': { desktop: 96, mobile: 87 },
  });
});

test('baseline mode accepts every aggregate at its route/profile floor and blocks one below it', () => {
  for (const [route, profiles] of Object.entries(lighthouseCiBaselineFloors)) {
    for (const [profile, floor] of Object.entries(profiles)) {
      const result = { route, profile, lcpMs: null, tbtMs: null, cls: null };

      assert.equal(
        evaluateLighthouseGate(
          { ...result, performance: floor },
          { mode: 'baseline', floors: lighthouseCiBaselineFloors },
        ).passes,
        true,
        `${route} ${profile} must pass at its floor`,
      );
      assert.equal(
        evaluateLighthouseGate(
          { ...result, performance: floor - 1 },
          { mode: 'baseline', floors: lighthouseCiBaselineFloors },
        ).passes,
        false,
        `${route} ${profile} must fail below its floor`,
      );
    }
  }
});

test('baseline mode fails safely when a route/profile floor is missing', () => {
  const result = {
    route: '/missing',
    profile: 'mobile',
    performance: 100,
    lcpMs: null,
    tbtMs: null,
    cls: null,
  };

  assert.equal(
    evaluateLighthouseGate(result, { mode: 'baseline', floors: lighthouseCiBaselineFloors }).passes,
    false,
  );
});

test('report mode allows representative results within its existing regression tolerance', () => {
  const result = {
    route: '/',
    profile: 'mobile',
    performance: 89,
    lcpMs: 2400,
    tbtMs: 100,
    cls: 0.02,
  };

  assert.equal(evaluateLighthouseGate(result, { mode: 'report' }).passes, true);
});

test('report mode blocks the existing catastrophic median regression', () => {
  const result = {
    route: '/',
    profile: 'mobile',
    performance: 39,
    lcpMs: null,
    tbtMs: null,
    cls: null,
  };

  assert.equal(evaluateLighthouseGate(result, { mode: 'report' }).passes, false);
  assert.equal(evaluateLighthouseGate(result, { mode: 'report' }).gate, 'catastrophic regression');
});
