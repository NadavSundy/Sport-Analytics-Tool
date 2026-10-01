import assert from 'node:assert/strict';
import test from 'node:test';
import { withLighthouseTimeout } from './lighthouse-run-control.mjs';

test('withLighthouseTimeout returns a completed Lighthouse result', async () => {
  const result = await withLighthouseTimeout(Promise.resolve('report'), 50, 'home desktop run 1');
  assert.equal(result, 'report');
});

test('withLighthouseTimeout identifies the stalled route/profile/run', async () => {
  await assert.rejects(
    withLighthouseTimeout(new Promise(() => {}), 1, 'home desktop run 1'),
    /Lighthouse timed out after 1ms for home desktop run 1/,
  );
});
