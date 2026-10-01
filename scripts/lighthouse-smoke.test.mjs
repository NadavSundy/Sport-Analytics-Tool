import assert from 'node:assert/strict';
import test from 'node:test';
import { isUnexpectedAuthRedirect } from './lighthouse-smoke.mjs';

test('does not classify the sign-in page itself as an auth redirect', () => {
  assert.equal(isUnexpectedAuthRedirect('/sign-in', '/sign-in'), false);
  assert.equal(isUnexpectedAuthRedirect('/competitions', '/sign-in'), true);
});
