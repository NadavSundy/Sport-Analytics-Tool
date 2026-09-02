import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ciWorkflow = readFileSync('.gitea/workflows/ci.yml', 'utf8');
const manualDocsWorkflow = readFileSync('.gitea/workflows/deploy-docs.yml', 'utf8');

function automaticDocsJob() {
  const marker = '\n  deploy_docs:';
  const start = ciWorkflow.indexOf(marker);
  assert.notEqual(start, -1, 'automatic docs deployment job must exist in CI');
  return ciWorkflow.slice(start);
}

test('automatic documentation deployment waits for validated main quality and published-doc routing', () => {
  const job = automaticDocsJob();

  assert.match(job, /needs:\s*\n\s*- plan\s*\n\s*- quality/);
  assert.match(job, /github\.event_name == 'push'/);
  assert.match(job, /github\.ref == 'refs\/heads\/main'/);
  assert.match(job, /needs\.plan\.outputs\.deployDocs == 'true'/);
});

test('automatic documentation deployment rebuilds the deployable site strictly and smoke checks Cloudflare', () => {
  const job = automaticDocsJob();

  assert.match(job, /python -m mkdocs build --strict/);
  assert.match(job, /wrangler pages deploy site --project-name=\$CLOUDFLARE_PROJECT_NAME/);
  assert.match(job, /smoke-check-deployment\.mjs/);
  assert.doesNotMatch(job, /npm run test:frontend/);
  assert.doesNotMatch(job, /npm run test:unit/);
  assert.doesNotMatch(job, /npm run test:e2e/);
});

test('standalone documentation deployment workflow is manual recovery only', () => {
  assert.match(manualDocsWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(manualDocsWorkflow, /\n\s*push:/);
  assert.match(manualDocsWorkflow, /python -m mkdocs build --strict/);
  assert.match(manualDocsWorkflow, /wrangler pages deploy site/);
});
