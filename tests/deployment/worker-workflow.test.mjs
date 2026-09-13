import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.gitea/workflows/deploy-worker.yml', 'utf8');
const infrastructure = readFileSync('infra/azure/worker/main.bicep', 'utf8');
const dockerfile = readFileSync('apps/worker/Dockerfile', 'utf8');

test('worker deployment is manual, immutable and quality-gated', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s*push:/);
  assert.match(workflow, /npm run lint --workspace=@sport-analytics\/worker/);
  assert.match(workflow, /npm run typecheck --workspace=@sport-analytics\/worker/);
  assert.match(workflow, /npm run test --workspace=@sport-analytics\/worker/);
  assert.match(workflow, /sport-analytics-worker:\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /az containerapp revision list/);
});

test('worker deployment does not embed database or Azure data-plane credentials', () => {
  assert.match(infrastructure, /keyVaultUrl: databaseSecretUri/);
  assert.match(infrastructure, /identity: runtimeIdentity\.id/);
  assert.match(infrastructure, /disableLocalAuth: true/);
  assert.doesNotMatch(
    `${workflow}\n${infrastructure}\n${dockerfile}`,
    /(?:SharedAccessKey|AccountKey|SERVICE_BUS_CONNECTION_STRING|AZURE_STORAGE_CONNECTION_STRING)/,
  );
});

test('worker target has bounded scaling, health probes, graceful termination and recovery controls', () => {
  assert.match(infrastructure, /terminationGracePeriodSeconds: 30/);
  assert.match(infrastructure, /path: '\/health\/live'/);
  assert.match(infrastructure, /path: '\/health\/ready'/);
  assert.match(infrastructure, /minReplicas: minReplicas/);
  assert.match(infrastructure, /maxReplicas: maxReplicas/);
  assert.match(infrastructure, /type: 'azure-servicebus'/);
  assert.match(infrastructure, /requiresDuplicateDetection: true/);
  assert.match(infrastructure, /lockDuration: 'PT1M'/);
  assert.match(infrastructure, /maxDeliveryCount: 5/);
  assert.match(infrastructure, /deadLetteringOnMessageExpiration: true/);
});

test('worker image is Node 22, non-root and independently startable', () => {
  assert.match(dockerfile, /FROM node:22-bookworm-slim/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /CMD \["node", "apps\/worker\/dist\/index\.js"\]/);

  assert.match(
    dockerfile,
    /npm ci\s+\\\s+--workspace=@sport-analytics\/worker\s+\\\s+--no-audit\s+\\\s+--no-fund/,
  );

  assert.doesNotMatch(dockerfile, /--mount=type=cache,target=\/root\/\.npm/);
});
