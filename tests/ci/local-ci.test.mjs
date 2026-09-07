import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import packageJson from '../../package.json' with { type: 'json' };

test('local CI commands are explicit and Docker remains opt-in', () => {
  assert.equal(packageJson.scripts['ci:local'], 'node scripts/ci-local.mjs');
  assert.equal(packageJson.scripts['ci:docker'], 'node scripts/ci-docker.mjs');
  assert.equal(packageJson.scripts['hooks:install'], 'node scripts/git-hooks.mjs install');
  assert.equal(packageJson.scripts['hooks:remove'], 'node scripts/git-hooks.mjs remove');
});

test('optional pre-push hook reuses ci:local instead of defining another suite', () => {
  const hook = readFileSync(new URL('../../.githooks/pre-push', import.meta.url), 'utf8');

  assert.match(hook, /npm run ci:local/);
  assert.doesNotMatch(hook, /ci:docker/);
});

test('Docker parity image pins Ubuntu Noble Playwright and Node 22', () => {
  const dockerfile = readFileSync(new URL('../../infra/ci/Dockerfile', import.meta.url), 'utf8');

  assert.match(dockerfile, /mcr\.microsoft\.com\/playwright:v1\.62\.1-noble/);
  assert.match(dockerfile, /FROM node:22-bookworm-slim AS node22/);
});
test('native local CI validates the lockfile without replacing host node_modules', () => {
  const localCi = readFileSync(new URL('../../scripts/ci-local.mjs', import.meta.url), 'utf8');

  assert.match(localCi, /\['ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'\]/);

  assert.match(
    localCi,
    /if \(insideDocker\)[\s\S]*\['ci', '--no-audit', '--no-fund'\][\s\S]*else[\s\S]*\['ci', '--dry-run'/,
  );
});

test('Docker local CI excludes host node_modules from the Linux workspace', () => {
  const dockerCi = readFileSync(new URL('../../scripts/ci-docker.mjs', import.meta.url), 'utf8');

  assert.ok(dockerCi.includes("--exclude='./node_modules'"));
  assert.equal(dockerCi.includes('cp -a /source/. /workspace'), false);
});
