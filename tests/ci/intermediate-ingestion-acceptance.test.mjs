import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../../.gitea/workflows/intermediate-ingestion-acceptance.yml', import.meta.url),
  'utf8',
);

test('Intermediate ingestion acceptance is manual-only and does not alter the normal merge gate', () => {
  assert.match(workflow, /name: Intermediate Ingestion Acceptance/);
  assert.match(workflow, /on:\n\s+workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+pull_request:/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.doesNotMatch(workflow, /deploy|azure\/webapps-deploy|wrangler pages deploy/i);
});

test('Intermediate ingestion acceptance reuses the hosted CI runtime and browser optimisations', () => {
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /cache: npm/);
  assert.match(workflow, /PLAYWRIGHT_REUSE_BUILD: '1'/);
  assert.match(workflow, /PLAYWRIGHT_WORKERS: '2'/);
  assert.match(workflow, /key: playwright-ubuntu24-chromium-1\.62\.1/);
  assert.match(workflow, /npx playwright install-deps chromium/);
  assert.match(workflow, /steps\.playwright-cache\.outputs\.cache-hit != 'true'/);
  assert.match(workflow, /npx playwright install chromium/);
});

test('Intermediate ingestion acceptance builds the browser bundle once before the integrated verifier', () => {
  const contractsBuild = workflow.indexOf('npm run build --workspace=@sport-analytics/contracts');
  const frontendBuild = workflow.indexOf('npm run build --workspace=@sport-analytics/frontend');
  const verifier = workflow.indexOf('npm run verify:intermediate-ingestion');

  assert.ok(contractsBuild >= 0);
  assert.ok(frontendBuild > contractsBuild);
  assert.ok(verifier > frontendBuild);
  assert.doesNotMatch(workflow, /npm run ci:local|npm run test:coverage/);
});
