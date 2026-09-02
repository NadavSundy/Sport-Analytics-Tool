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
});

test('frontend unit-test-only changes do not force Playwright', () => {
  const plan = classifyChangedFiles(['apps/frontend/src/App.test.tsx']);

  assert.equal(plan.frontend, true);
  assert.equal(plan.e2e, false);
});

test('backend source changes conservatively include database integration validation', () => {
  const plan = classifyChangedFiles(['apps/backend/src/modules/submissions/submission.service.ts']);

  assert.equal(plan.backend, true);
  assert.equal(plan.contracts, true);
  assert.equal(plan.database, true);
  assert.equal(plan.e2e, false);
  assert.equal(plan.hygiene, true);
});

test('shared contracts validate both applications and browser integration', () => {
  const plan = classifyChangedFiles(['packages/contracts/src/api.ts']);

  assert.equal(plan.contracts, true);
  assert.equal(plan.frontend, true);
  assert.equal(plan.backend, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.database, false);
});

test('root dependency changes select full CI', () => {
  const plan = classifyChangedFiles(['package-lock.json']);

  assert.equal(plan.full, true);
  assert.equal(plan.docs, true);
  assert.equal(plan.frontend, true);
  assert.equal(plan.backend, true);
  assert.equal(plan.database, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.hygiene, true);
  assert.equal(plan.coverage, false);
});

test('unknown files fail safely to full CI', () => {
  const plan = classifyChangedFiles(['unexpected-root-file.xyz']);

  assert.equal(plan.full, true);
});

test('application changes on main generate coverage after merge', () => {
  const plan = classifyChangedFiles(['apps/frontend/src/App.tsx'], { eventName: 'push' });

  assert.equal(plan.frontend, true);
  assert.equal(plan.coverage, true);
});

test('manual workflow dispatch always selects full CI', () => {
  const plan = classifyChangedFiles(['evidence/ai/registers/example.csv'], {
    eventName: 'workflow_dispatch',
  });

  assert.equal(plan.full, true);
  assert.equal(plan.coverage, true);
});
