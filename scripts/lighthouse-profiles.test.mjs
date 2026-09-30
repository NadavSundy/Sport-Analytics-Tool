import assert from 'node:assert/strict';
import test from 'node:test';
import { lighthouseProfiles, selectLighthouseProfiles } from './lighthouse-profiles.mjs';

test('desktop profile uses Lighthouse desktop defaults instead of mobile simulation', () => {
  const desktop = lighthouseProfiles.find((profile) => profile.name === 'desktop').settings;

  assert.equal(desktop.formFactor, 'desktop');
  assert.equal(desktop.throttling.cpuSlowdownMultiplier, 1);
  assert.equal(desktop.throttling.requestLatencyMs, 0);
  assert.equal(desktop.screenEmulation.mobile, false);
  assert.equal(desktop.screenEmulation.width, 1350);
});

test('profile selection supports an isolated desktop regression audit', () => {
  assert.deepEqual(
    selectLighthouseProfiles('desktop').map((profile) => profile.name),
    ['desktop'],
  );
  assert.throws(() => selectLighthouseProfiles('tablet'), /LIGHTHOUSE_PROFILES/);
});

test('mobile profile retains Lighthouse mobile simulation defaults', () => {
  const mobile = lighthouseProfiles.find((profile) => profile.name === 'mobile').settings;

  assert.equal(mobile.formFactor, 'mobile');
  assert.equal(mobile.throttling.cpuSlowdownMultiplier, 4);
  assert.equal(mobile.screenEmulation.mobile, true);
});
