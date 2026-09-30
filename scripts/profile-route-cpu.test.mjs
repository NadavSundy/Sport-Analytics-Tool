import assert from 'node:assert/strict';
import test from 'node:test';
import { routeSlug } from './profile-route-cpu.mjs';

test('routeSlug produces stable artifact names for public routes', () => {
  assert.equal(routeSlug('/'), 'home');
  assert.equal(routeSlug('/seasons'), 'seasons');
  assert.equal(routeSlug('/dataset-releases'), 'dataset-releases');
});

test('routeSlug rejects traversal and non-route values', () => {
  assert.throws(() => routeSlug('../seasons'), /safe absolute route/);
  assert.throws(() => routeSlug('/../seasons'), /safe absolute route/);
  assert.throws(() => routeSlug('seasons'), /safe absolute route/);
});
