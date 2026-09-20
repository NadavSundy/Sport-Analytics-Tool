import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ciWorkflow = readFileSync('.gitea/workflows/ci.yml', 'utf8');
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const manualBackendWorkflow = readFileSync('.gitea/workflows/deploy-backend.yml', 'utf8');
const backendDeployScript = readFileSync('scripts/deploy-backend-azure.py', 'utf8');
const backendArtifactSmokeCheck = readFileSync('scripts/smoke-check-backend-artifact.mjs', 'utf8');
const backendContainerSmokeCheck = readFileSync(
  'scripts/smoke-check-backend-container.mjs',
  'utf8',
);

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

test('automatic backend deployment builds, validates and deploys an immutable Container Apps image', () => {
  const job = automaticBackendJob();

  assert.doesNotMatch(job, /npm run test:unit/);
  assert.doesNotMatch(job, /npm run test:api/);
  assert.doesNotMatch(job, /npm run typecheck/);
  assert.doesNotMatch(job, /npm run lint/);
  assert.match(job, /azure\/login@v2/);
  assert.match(job, /AZURE_WORKER_CREDENTIALS/);
  assert.doesNotMatch(job, /AZURE_BACKEND_CONTAINER_CREDENTIALS/);
  assert.match(job, /docker build[\s\S]*apps\/backend\/Dockerfile/);
  assert.equal(
    rootPackage.scripts['smoke:backend-container'],
    'node scripts/smoke-check-backend-container.mjs',
  );
  assert.match(job, /npm run smoke:backend-container --/);
  assert.doesNotMatch(job, /node scripts\/smoke-check-backend-container\.mjs/);
  assert.match(job, /sport-analytics-api:\$\{\{ github\.sha \}\}/);
  assert.match(job, /az acr login/);
  assert.match(job, /infra\/azure\/backend\/main\.bicep/);
  assert.match(job, /az containerapp revision list/);
  assert.match(job, /MATCHING_REVISION/);
  assert.match(job, /properties\.template\.containers\[0\]\.image/);
  assert.match(job, /properties\.configuration\.ingress\.fqdn/);
  assert.match(job, /api\/v1\/health/);
  assert.match(job, /api\/v1\/competitions\?limit=1/);
  const readinessStepIndex = job.indexOf('Wait for the healthy backend Container Apps revision');
  const healthSmokeIndex = job.indexOf('Smoke check deployed backend health');
  const databaseSmokeIndex = job.indexOf('Smoke check deployed database access');
  assert.ok(readinessStepIndex >= 0, 'readiness wait must be present');
  assert.ok(
    healthSmokeIndex > readinessStepIndex,
    'health smoke must run after readiness succeeds',
  );
  assert.ok(databaseSmokeIndex > healthSmokeIndex, 'database smoke must run after health succeeds');
  assert.doesNotMatch(job, /continue-on-error:\s*true/);
  assert.doesNotMatch(job, /AZURE_BACKEND_PUBLISH_PROFILE/);
  assert.doesNotMatch(job, /(?:adminUser|--username|--password)/i);
});

test('automatic backend deployment verifies Docker npm access and builds through the runner host network', () => {
  const job = automaticBackendJob();

  const connectivityStart = job.indexOf('- name: Verify Docker npm registry connectivity');
  const buildStart = job.indexOf(
    '- name: Build immutable backend container image',
    connectivityStart,
  );

  assert.notEqual(
    connectivityStart,
    -1,
    'backend deployment must diagnose Docker DNS and npm registry access before the image build',
  );
  assert.notEqual(buildStart, -1, 'backend deployment must retain the immutable image build');

  const connectivity = job.slice(connectivityStart, buildStart);
  const hostNetworkRuns = connectivity.match(
    /docker run --rm --network=host node:22-bookworm-slim/g,
  );

  assert.ok(
    hostNetworkRuns && hostNetworkRuns.length >= 2,
    'backend deployment must probe both DNS and npm through the runner host network',
  );
  assert.match(
    connectivity,
    /registry\.npmjs\.org/,
    'backend deployment must name the registry in diagnostics',
  );
  assert.match(
    connectivity,
    /timeout 30s docker run --rm --network=host node:22-bookworm-slim[\s\S]*?require\('dns'\)/,
    'backend deployment must bound the Docker DNS preflight to 30 seconds',
  );
  assert.match(
    connectivity,
    /timeout 45s docker run --rm --network=host node:22-bookworm-slim[\s\S]*?npm ping/,
    'backend deployment must bound the Docker npm registry preflight to 45 seconds',
  );
  assert.match(
    job.slice(buildStart),
    /DOCKER_BUILDKIT=1 docker build[\s\S]*?--network=host/,
    'backend Docker build must use the same host network as the verified registry probes',
  );
  assert.match(
    job.slice(buildStart),
    /npm registry or Docker network failure/,
    'backend Docker build failure diagnostics must distinguish registry or network failures',
  );
  assert.match(
    job.slice(buildStart),
    /npm internal crash/,
    'backend Docker build failure diagnostics must distinguish npm internal crashes',
  );
  assert.match(
    job.slice(buildStart),
    /lifecycle-script failure/,
    'backend Docker build failure diagnostics must distinguish lifecycle-script failures',
  );
  assert.match(
    job.slice(buildStart),
    /Backend Docker build failed before Azure authentication[\s\S]*?fi\s*\n\s*exit 1/,
    'backend Docker build diagnostic branch must always fail the deployment job',
  );
});

test('manual backend deployment workflow preserves the App Service rollback path', () => {
  assert.match(manualBackendWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(manualBackendWorkflow, /\n\s*push:/);
  assert.doesNotMatch(manualBackendWorkflow, /npm run test:unit/);
  assert.doesNotMatch(manualBackendWorkflow, /npm run test:api/);
  assert.match(manualBackendWorkflow, /python3 scripts\/deploy-backend-azure\.py/);
  assert.match(manualBackendWorkflow, /AZURE_BACKEND_PUBLISH_PROFILE/);
  assert.match(manualBackendWorkflow, /statsthegame-api-dev/);
});

test('backend container smoke check uses inert configuration and validates health before image publish', () => {
  assert.match(backendContainerSmokeCheck, /run\('docker', \[\s*'run'/);
  assert.match(backendContainerSmokeCheck, /\/api\/v1\/health/);
  assert.match(backendContainerSmokeCheck, /OBJECT_STORAGE_PROVIDER.*azure/);
  assert.match(backendContainerSmokeCheck, /SUPABASE_URL.*example\.invalid/);
  assert.doesNotMatch(
    backendContainerSmokeCheck,
    /(?:SUPABASE_SECRET_KEY|DATABASE_URL|AZURE_STORAGE_CONNECTION_STRING|AccountKey)/,
  );
});

test('shared Azure backend deploy script retains ZIP creation, credential redaction and Kudu status checks', () => {
  assert.match(backendDeployScript, /zipfile\.ZIP_DEFLATED/);
  assert.match(backendDeployScript, /AZURE_BACKEND_PUBLISH_PROFILE/);
  assert.match(backendDeployScript, /def redact\(value\):/);
  assert.match(backendDeployScript, /Azure accepted the ZIP\. Waiting for deployment/);
  assert.match(backendDeployScript, /Azure backend deployment completed successfully/);
});

test('backend deployment smoke configuration uses only non-secret Blob resource identifiers', () => {
  assert.match(backendArtifactSmokeCheck, /OBJECT_STORAGE_PROVIDER: 'azure'/);
  assert.match(backendArtifactSmokeCheck, /AZURE_STORAGE_ACCOUNT_NAME: 'deploymentstorage'/);
  assert.match(backendArtifactSmokeCheck, /AZURE_STORAGE_CONTAINER_NAME: 'deployment-smoke-check'/);
  assert.match(
    backendArtifactSmokeCheck,
    /AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases'/,
  );
  assert.doesNotMatch(
    `${ciWorkflow}\n${manualBackendWorkflow}\n${backendArtifactSmokeCheck}`,
    /AZURE_STORAGE_(?:CONNECTION_STRING|ACCOUNT_KEY|SAS_TOKEN)/,
  );
});
