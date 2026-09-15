import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectIssueLikeObjects,
  findOpenUserFeedbackGates,
  makeReopenComment,
} from './enforce-user-feedback-closure-gate.mjs';

test('collectIssueLikeObjects accepts a direct dependency array', () => {
  const input = [
    { number: 603, state: 'open', labels: [{ name: 'gate: user-feedback' }] },
    { number: 600, state: 'open', labels: [{ name: 'area: testing' }] },
  ];
  assert.deepEqual(collectIssueLikeObjects(input).map((x) => x.number), [603, 600]);
});

test('collectIssueLikeObjects accepts common wrapper response shapes', () => {
  const input = {
    dependencies: {
      items: [
        { index: 603, state: 'open', labels: [{ name: 'gate: user-feedback' }] },
      ],
    },
  };
  const result = collectIssueLikeObjects(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].index, 603);
});

test('findOpenUserFeedbackGates returns only open gate:user-feedback dependencies', () => {
  const deps = [
    { number: 603, title: 'UF new fixture', state: 'open', labels: [{ name: 'gate: user-feedback' }] },
    { number: 607, title: 'UF API', state: 'closed', labels: [{ name: 'gate: user-feedback' }] },
    { number: 598, title: 'Acceptance', state: 'open', labels: [{ name: 'gate: acceptance' }] },
  ];
  assert.deepEqual(findOpenUserFeedbackGates(deps).map((x) => x.number), [603]);
});

test('makeReopenComment clearly states which user-feedback gate blocks closure', () => {
  const text = makeReopenComment(571, [
    { number: 603, title: 'test(user): validate genuinely new fixture submission and reviewer onboarding workflow' },
  ]);
  assert.match(text, /Closure blocked/i);
  assert.match(text, /#603/);
  assert.match(text, /user-feedback gate/i);
  assert.match(text, /reopened/i);
});

test('enforceClosedIssue reopens and comments when an open user-feedback gate blocks closure', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method ?? 'GET', body: options.body });
    if (String(url).endsWith('/issues/571/dependencies')) {
      return new Response(JSON.stringify([
        { number: 603, title: 'UF new fixture', state: 'open', labels: [{ name: 'gate: user-feedback' }] },
      ]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (String(url).endsWith('/issues/571') && options.method === 'PATCH') {
      return new Response(JSON.stringify({ number: 571, state: 'open' }), { status: 200 });
    }
    if (String(url).endsWith('/issues/571/comments') && options.method === 'POST') {
      return new Response(JSON.stringify({ id: 1 }), { status: 201 });
    }
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${url}`);
  };

  try {
    const { enforceClosedIssue } = await import('./enforce-user-feedback-closure-gate.mjs');
    const result = await enforceClosedIssue({
      event: { action: 'closed', number: 571, repository: { full_name: 'git-push-pray/Sport-Analytics-Tool' } },
      apiUrl: 'https://example.test/api/v1',
      token: 'test-token',
    });
    assert.equal(result.action, 'reopened');
    assert.equal(calls.filter((c) => c.method === 'PATCH').length, 1);
    assert.equal(calls.filter((c) => c.method === 'POST').length, 1);
    assert.deepEqual(JSON.parse(calls.find((c) => c.method === 'PATCH').body), { state: 'open' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('enforceClosedIssue allows closure after the user-feedback gate is closed', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method ?? 'GET' });
    return new Response(JSON.stringify([
      { number: 603, title: 'UF new fixture', state: 'closed', labels: [{ name: 'gate: user-feedback' }] },
    ]), { status: 200 });
  };

  try {
    const { enforceClosedIssue } = await import('./enforce-user-feedback-closure-gate.mjs');
    const result = await enforceClosedIssue({
      event: { action: 'closed', number: 571, repository: { full_name: 'git-push-pray/Sport-Analytics-Tool' } },
      apiUrl: 'https://example.test/api/v1',
      token: 'test-token',
    });
    assert.equal(result.action, 'allowed');
    assert.equal(calls.some((c) => c.method === 'PATCH'), false);
    assert.equal(calls.some((c) => c.method === 'POST'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
