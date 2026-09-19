import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const REDIRECTS_PATH = 'apps/frontend/public/_redirects';

test('a Cloudflare Pages SPA fallback file is published from the frontend public directory', () => {
  assert.ok(
    existsSync(REDIRECTS_PATH),
    `${REDIRECTS_PATH} must exist so Vite copies it into apps/frontend/dist during build`,
  );
});

test('the SPA fallback rewrites every unmatched path to index.html with a 200 status', () => {
  const contents = readFileSync(REDIRECTS_PATH, 'utf8').trim();

  // A 200 (not 301/302) rewrite is required: Cloudflare Pages must serve index.html
  // directly for deep links and refreshes on client-side routes (e.g. /fixtures/12)
  // without changing the URL the browser shows or bouncing through a redirect.
  assert.match(
    contents,
    /^\/\*\s+\/index\.html\s+200\s*$/m,
    'expected a catch-all rewrite rule "/*  /index.html  200'
      + ' so deep links and refreshes on client-side routes do not 404',
  );
});

test('the SPA fallback does not intercept static asset or API-shaped paths unnecessarily', () => {
  const contents = readFileSync(REDIRECTS_PATH, 'utf8');

  // Cloudflare Pages only falls back to _redirects rules for paths that don't
  // already match a real static file, so a single catch-all rule is sufficient
  // and correct here; this test just guards against someone narrowing the rule
  // in a way that would break nested client-side routes again.
  assert.doesNotMatch(contents, /\/api\//);
});
