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

test('automatic frontend deployment waits for quality and only runs for production-impacting frontend changes', () => {
  const job = automaticFrontendJob();

  assert.match(job, /needs:\s*\n\s*- plan\s*\n\s*- quality/);
  assert.match(job, /github\.event_name == 'push'/);
  assert.match(job, /github\.ref == 'refs\/heads\/main'/);
  assert.match(job, /needs\.plan\.outputs\.deployFrontend == 'true'/);
});

test('automatic frontend deployment does not repeat the authoritative frontend unit-test suite', () => {
  const job = automaticFrontendJob();

  assert.doesNotMatch(job, /npm run test:frontend/);
  assert.match(job, /npm run build --workspace=@sport-analytics\/contracts/);
  assert.match(job, /npm run build --workspace=@sport-analytics\/frontend/);
  assert.match(job, /azure\/webapps-deploy@v3/);
  assert.match(job, /smoke-check-deployment\.mjs/);
});

test('standalone frontend deployment workflow is manual recovery only and also avoids duplicate unit tests', () => {
  assert.match(manualFrontendWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(manualFrontendWorkflow, /\n\s*push:/);
  assert.doesNotMatch(manualFrontendWorkflow, /npm run test:frontend/);
  assert.match(manualFrontendWorkflow, /npm run build --workspace=@sport-analytics\/frontend/);
});
