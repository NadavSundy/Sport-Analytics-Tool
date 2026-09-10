import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyChangedFiles } from '../../scripts/ci-change-plan.mjs';

test('AI register CSV changes use the lightweight evidence path', () => {
  const plan = classifyChangedFiles(['evidence/ai/registers/shayna-unterslak.csv']);

  assert.equal(plan.evidence, true);
  assert.equal(plan.needsNpm, false);
  assert.equal(plan.frontend, false);
  assert.equal(plan.backend, false);
  assert.equal(plan.database, false);
  assert.equal(plan.e2e, false);
});

test('documentation changes request strict docs validation without application suites', () => {
  const plan = classifyChangedFiles(['docs/development/testing.md']);

  assert.equal(plan.docs, true);
  assert.equal(plan.needsNpm, true);
  assert.equal(plan.frontend, false);
  assert.equal(plan.backend, false);
  assert.equal(plan.database, false);
  assert.equal(plan.e2e, false);
});

test('OpenAPI documentation also requests OpenAPI linting', () => {
  const plan = classifyChangedFiles(['docs/api/openapi.yaml']);

  assert.equal(plan.docs, true);
  assert.equal(plan.openapi, true);
});

test('frontend implementation changes run frontend and browser validation without PostgreSQL', () => {
  const plan = classifyChangedFiles(['apps/frontend/src/App.tsx']);

  assert.equal(plan.frontend, true);
  assert.equal(plan.contracts, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.database, false);
  assert.equal(plan.hygiene, true);
  assert.equal(plan.deployFrontend, true);
  assert.equal(plan.deployBackend, false);
  assert.equal(plan.deployDocs, false);
});

test('frontend unit-test-only changes do not force Playwright', () => {
  const plan = classifyChangedFiles(['apps/frontend/src/App.test.tsx']);

  assert.equal(plan.frontend, true);
  assert.equal(plan.e2e, false);
  assert.equal(plan.deployFrontend, false);
  assert.equal(plan.deployBackend, false);
  assert.equal(plan.deployDocs, false);
});

test('browser-suite changes request browser validation without production deployment', () => {
  const plan = classifyChangedFiles(['tests/e2e/accessibility.spec.ts']);

  assert.equal(plan.frontend, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.database, false);
  assert.equal(plan.deployFrontend, false);
});

test('unrelated backend source changes conservatively include database integration without browser work', () => {
  const plan = classifyChangedFiles(['apps/backend/src/modules/weather/weather.service.ts']);

  assert.equal(plan.backend, true);
  assert.equal(plan.contracts, true);
  assert.equal(plan.database, true);
  assert.equal(plan.e2e, false);
  assert.equal(plan.hygiene, true);
  assert.equal(plan.deployBackend, true);
  assert.equal(plan.deployFrontend, false);
  assert.equal(plan.deployDocs, false);
});

test('worker changes select the Intermediate ingestion merge gate plus deployment validation', () => {
  const plan = classifyChangedFiles(['apps/worker/src/index.ts']);

  assert.equal(plan.worker, true);
  assert.equal(plan.database, true);
  assert.equal(plan.deployment, true);
  assert.equal(plan.intermediateIngestion, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.e2eFull, false);
  assert.equal(plan.frontend, false);
  assert.equal(plan.backend, true);
  assert.equal(plan.contracts, true);
  assert.equal(plan.hygiene, true);
});

test('shared contracts validate both applications and browser integration', () => {
  const plan = classifyChangedFiles(['packages/contracts/src/api.ts']);

  assert.equal(plan.contracts, true);
  assert.equal(plan.frontend, true);
  assert.equal(plan.backend, true);
  assert.equal(plan.worker, false);
  assert.equal(plan.e2e, true);
  assert.equal(plan.database, false);
  assert.equal(plan.deployFrontend, true);
  assert.equal(plan.deployBackend, true);
  assert.equal(plan.deployDocs, false);
});

test('root dependency changes select full CI', () => {
  const plan = classifyChangedFiles(['package-lock.json']);

  assert.equal(plan.full, true);
  assert.equal(plan.docs, true);
  assert.equal(plan.frontend, true);
  assert.equal(plan.backend, true);
  assert.equal(plan.worker, true);
  assert.equal(plan.database, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.hygiene, true);
  assert.equal(plan.coverage, false);
  assert.equal(plan.deployFrontend, true);
  assert.equal(plan.deployBackend, true);
  assert.equal(plan.deployDocs, true);
});

test('CI workflow changes select full validation without redeploying unchanged application code', () => {
  const plan = classifyChangedFiles(['.gitea/workflows/ci.yml']);

  assert.equal(plan.full, true);
  assert.equal(plan.deployFrontend, false);
  assert.equal(plan.deployBackend, false);
  assert.equal(plan.deployDocs, false);
});

test('full validation still preserves deployment impacts from other changed files', () => {
  const plan = classifyChangedFiles([
    '.gitea/workflows/ci.yml',
    'apps/backend/src/app.ts',
    'docs/index.md',
  ]);

  assert.equal(plan.full, true);
  assert.equal(plan.deployBackend, true);
  assert.equal(plan.deployDocs, true);
  assert.equal(plan.deployFrontend, false);
});

test('backend test-only changes validate backend without redeploying production', () => {
  const plan = classifyChangedFiles(['apps/backend/tests/unit/weather.service.test.ts']);

  assert.equal(plan.backend, true);
  assert.equal(plan.deployBackend, false);
  assert.equal(plan.deployFrontend, false);
  assert.equal(plan.deployDocs, false);
});

test('published MkDocs changes validate and deploy documentation only', () => {
  const plan = classifyChangedFiles(['docs/deployment/overview.md']);

  assert.equal(plan.docs, true);
  assert.equal(plan.deployDocs, true);
  assert.equal(plan.deployFrontend, false);
  assert.equal(plan.deployBackend, false);
});

test('non-published root documentation does not redeploy the MkDocs site', () => {
  const plan = classifyChangedFiles(['README.md']);

  assert.equal(plan.docs, true);
  assert.equal(plan.deployDocs, false);
});

test('backend deployment helpers request backend deployment without unrelated targets', () => {
  const plan = classifyChangedFiles(['scripts/prepare-backend-deployment.mjs']);

  assert.equal(plan.backend, true);
  assert.equal(plan.deployment, true);
  assert.equal(plan.deployBackend, true);
  assert.equal(plan.deployFrontend, false);
  assert.equal(plan.deployDocs, false);
});

test('unknown files fail safely to full CI', () => {
  const plan = classifyChangedFiles(['unexpected-root-file.xyz']);

  assert.equal(plan.full, true);
});

test('main pushes preserve deployment routing without repeating coverage suites', () => {
  const plan = classifyChangedFiles(['apps/frontend/src/App.tsx'], { eventName: 'push' });

  assert.equal(plan.frontend, true);
  assert.equal(plan.deployFrontend, true);
  assert.equal(plan.coverage, false);
});

test('manual workflow dispatch always selects full CI', () => {
  const plan = classifyChangedFiles(['evidence/ai/registers/example.csv'], {
    eventName: 'workflow_dispatch',
  });

  assert.equal(plan.full, true);
  assert.equal(plan.coverage, true);
});

test('local CI Docker infrastructure changes select full validation', () => {
  const plan = classifyChangedFiles(['infra/ci/Dockerfile']);

  assert.equal(plan.full, true);
  assert.equal(plan.frontend, true);
  assert.equal(plan.backend, true);
  assert.equal(plan.database, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.hygiene, true);
});
