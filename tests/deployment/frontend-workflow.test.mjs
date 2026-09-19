import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ciWorkflow = readFileSync('.gitea/workflows/ci.yml', 'utf8');
const manualFrontendWorkflow = readFileSync('.gitea/workflows/deploy-frontend.yml', 'utf8');

function automaticFrontendJob() {
  const marker = '\n  deploy_frontend:';
  const start = ciWorkflow.indexOf(marker);
  assert.notEqual(start, -1, 'automatic frontend deployment job must exist in CI');
  return ciWorkflow.slice(start);
}

function assertRepositoryDrivenFrontendDeployment(workflow, label) {
  assert.match(workflow, /npm run build --workspace=@sport-analytics\/contracts/);
  assert.match(workflow, /npm run build --workspace=@sport-analytics\/frontend/);
  assert.match(workflow, /check-frontend-bundle-secrets\.mjs/);
  assert.match(workflow, /wrangler pages deploy apps\/frontend\/dist/);
  assert.match(workflow, /smoke-check-deployment\.mjs/);

  assert.doesNotMatch(
    workflow,
    /azure\/webapps-deploy@v3/,
    `${label} must no longer deploy the frontend to Azure App Service`,
  );
  assert.doesNotMatch(
    workflow,
    /AZURE_FRONTEND_PUBLISH_PROFILE/,
    `${label} must not reference the retired Azure frontend publish profile secret`,
  );

  assert.ok(
    workflow.indexOf('npm run build --workspace=@sport-analytics/frontend')
      < workflow.indexOf('check-frontend-bundle-secrets.mjs'),
    'the bundle must be built before it is scanned for leaked secrets',
  );
  assert.ok(
    workflow.indexOf('check-frontend-bundle-secrets.mjs')
      < workflow.indexOf('wrangler pages deploy apps/frontend/dist'),
    'the bundle secret scan must pass before the bundle is published',
  );
  assert.ok(
    workflow.indexOf('wrangler pages deploy apps/frontend/dist')
      < workflow.indexOf('smoke-check-deployment.mjs'),
    'Cloudflare deployment must complete before the public smoke check',
  );
}

test('automatic frontend deployment waits for quality and only runs for production-impacting frontend changes', () => {
  const job = automaticFrontendJob();

  assert.match(job, /needs:\s*\n\s*- plan\s*\n\s*- quality/);
  assert.match(job, /github\.event_name == 'push'/);
  assert.match(job, /github\.ref == 'refs\/heads\/main'/);
  assert.match(job, /needs\.plan\.outputs\.deployFrontend == 'true'/);
});

test('automatic frontend deployment publishes to Cloudflare Pages and does not repeat the frontend unit-test suite', () => {
  const job = automaticFrontendJob();

  assertRepositoryDrivenFrontendDeployment(job, 'automatic frontend deployment');
  assert.doesNotMatch(job, /npm run test:frontend/);
});

test('automatic frontend deployment validates the required Cloudflare and public build-time secrets', () => {
  const job = automaticFrontendJob();

  for (const name of [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'VITE_API_BASE_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
  ]) {
    assert.match(job, new RegExp(name), `deployment must validate the ${name} secret is configured`);
  }
});

test('standalone frontend deployment workflow is manual recovery only, targets Cloudflare Pages and avoids duplicate unit tests', () => {
  assert.match(manualFrontendWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(manualFrontendWorkflow, /\n\s*push:/);
  assert.doesNotMatch(manualFrontendWorkflow, /npm run test:frontend/);
  assertRepositoryDrivenFrontendDeployment(manualFrontendWorkflow, 'manual frontend deployment');
});
