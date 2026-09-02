import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ciWorkflow = readFileSync('.gitea/workflows/ci.yml', 'utf8');
const manualBackendWorkflow = readFileSync('.gitea/workflows/deploy-backend.yml', 'utf8');
const backendDeployScript = readFileSync('scripts/deploy-backend-azure.py', 'utf8');

function automaticBackendJob() {
  const marker = '\n  deploy_backend:';
  const start = ciWorkflow.indexOf(marker);
  assert.notEqual(start, -1, 'automatic backend deployment job must exist in CI');
  const end = ciWorkflow.indexOf('\n  deploy_docs:', start);
  return end === -1 ? ciWorkflow.slice(start) : ciWorkflow.slice(start, end);
}

test('automatic backend deployment waits for validated main quality and production-impact routing', () => {
  const job = automaticBackendJob();

  assert.match(job, /needs:\s*\n\s*- plan\s*\n\s*- quality/);
  assert.match(job, /github\.event_name == 'push'/);
  assert.match(job, /github\.ref == 'refs\/heads\/main'/);
  assert.match(job, /needs\.plan\.outputs\.deployBackend == 'true'/);
});

test('automatic backend deployment avoids duplicate authoritative test suites', () => {
  const job = automaticBackendJob();

  assert.doesNotMatch(job, /npm run test:unit/);
  assert.doesNotMatch(job, /npm run test:api/);
  assert.doesNotMatch(job, /npm run typecheck/);
  assert.doesNotMatch(job, /npm run lint/);
  assert.match(job, /npm run build --workspace=@sport-analytics\/backend/);
  assert.match(job, /npm run deploy:prepare:backend/);
  assert.match(job, /smoke-check-backend-artifact\.mjs/);
  assert.match(job, /python3 scripts\/deploy-backend-azure\.py/);
  assert.match(job, /api\/v1\/health/);
  assert.match(job, /api\/v1\/competitions\?limit=1/);
});

test('standalone backend deployment workflow is manual recovery only and shares deployment mechanics', () => {
  assert.match(manualBackendWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(manualBackendWorkflow, /\n\s*push:/);
  assert.doesNotMatch(manualBackendWorkflow, /npm run test:unit/);
  assert.doesNotMatch(manualBackendWorkflow, /npm run test:api/);
  assert.match(manualBackendWorkflow, /python3 scripts\/deploy-backend-azure\.py/);
});

test('shared Azure backend deploy script retains ZIP creation, credential redaction and Kudu status checks', () => {
  assert.match(backendDeployScript, /zipfile\.ZIP_DEFLATED/);
  assert.match(backendDeployScript, /AZURE_BACKEND_PUBLISH_PROFILE/);
  assert.match(backendDeployScript, /def redact\(value\):/);
  assert.match(backendDeployScript, /Azure accepted the ZIP\. Waiting for deployment/);
  assert.match(backendDeployScript, /Azure backend deployment completed successfully/);
});
