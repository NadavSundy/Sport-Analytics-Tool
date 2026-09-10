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

function assertRepositoryDrivenDocsDeployment(workflow, label) {
  assert.match(workflow, /python -m mkdocs build --strict/);
  assert.match(workflow, /wrangler pages deploy site/);
  assert.match(workflow, /smoke-check-deployment\.mjs/);

  assert.doesNotMatch(workflow, /rclone/i, `${label} must not depend on rclone`);
  assert.doesNotMatch(workflow, /RCLONE_CONFIG/);
  assert.doesNotMatch(workflow, /RCLONE_REMOTE/);
  assert.doesNotMatch(workflow, /RCLONE_SOURCE/);
  assert.doesNotMatch(workflow, /retrieve:user-testing-feedback/);
  assert.doesNotMatch(workflow, /generate:user-testing-evidence/);
  assert.doesNotMatch(workflow, /testing\/user-feedback/);
}

test('automatic documentation deployment waits for validated main quality and published-doc routing', () => {
  const job = automaticDocsJob();

  assert.match(job, /needs:\s*\n\s*- plan\s*\n\s*- quality/);
  assert.match(job, /github\.event_name == 'push'/);
  assert.match(job, /github\.ref == 'refs\/heads\/main'/);
  assert.match(job, /needs\.plan\.outputs\.deployDocs == 'true'/);
});

test('automatic documentation deployment builds repository docs strictly and smoke checks the result', () => {
  const job = automaticDocsJob();

  assertRepositoryDrivenDocsDeployment(job, 'automatic docs deployment');
  assert.ok(
    job.indexOf('python -m mkdocs build --strict') <
      job.indexOf('wrangler pages deploy site --project-name=$CLOUDFLARE_PROJECT_NAME'),
    'strict MkDocs build must complete before Cloudflare deployment',
  );
  assert.ok(
    job.indexOf('wrangler pages deploy site --project-name=$CLOUDFLARE_PROJECT_NAME') <
      job.indexOf('smoke-check-deployment.mjs'),
    'Cloudflare deployment must complete before the public smoke check',
  );
  assert.doesNotMatch(job, /npm run test:frontend/);
  assert.doesNotMatch(job, /npm run test:unit/);
  assert.doesNotMatch(job, /npm run test:e2e/);
});

test('standalone documentation deployment workflow is repository-driven manual recovery only', () => {
  assert.match(manualDocsWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(manualDocsWorkflow, /\n\s*push:/);
  assertRepositoryDrivenDocsDeployment(manualDocsWorkflow, 'manual docs deployment');
  assert.ok(
    manualDocsWorkflow.indexOf('python -m mkdocs build --strict') <
      manualDocsWorkflow.indexOf('wrangler pages deploy site'),
    'manual recovery must build repository documentation before deployment',
  );
});
