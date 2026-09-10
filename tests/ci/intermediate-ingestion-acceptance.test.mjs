import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { classifyChangedFiles } from '../../scripts/ci-change-plan.mjs';

const workflow = readFileSync(new URL('../../.gitea/workflows/ci.yml', import.meta.url), 'utf8');
const verifier = readFileSync(
  new URL('../../scripts/verify-intermediate-ingestion.mjs', import.meta.url),
  'utf8',
);
const packageJson = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

test('Intermediate ingestion backend changes select the existing cross-layer merge gate', () => {
  const plan = classifyChangedFiles(['apps/backend/src/modules/batches/batch.service.ts']);

  assert.equal(plan.intermediateIngestion, true);
  assert.equal(plan.contracts, true);
  assert.equal(plan.backend, true);
  assert.equal(plan.worker, true);
  assert.equal(plan.database, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.e2eFull, false);
  assert.equal(plan.openapi, true);
});

test('Intermediate ingestion UI changes select focused browser acceptance plus persisted pipeline checks', () => {
  const plan = classifyChangedFiles(['apps/frontend/src/features/submissions/SubmissionPage.tsx']);

  assert.equal(plan.intermediateIngestion, true);
  assert.equal(plan.frontend, true);
  assert.equal(plan.backend, true);
  assert.equal(plan.worker, true);
  assert.equal(plan.database, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.e2eFull, false);
});

test('unrelated changes do not pay for the Intermediate ingestion gate', () => {
  const backend = classifyChangedFiles(['apps/backend/src/modules/weather/weather.service.ts']);
  assert.equal(backend.intermediateIngestion, false);
  assert.equal(backend.e2e, false);

  const frontend = classifyChangedFiles(['apps/frontend/src/features/home/HomePage.tsx']);
  assert.equal(frontend.intermediateIngestion, false);
  assert.equal(frontend.e2e, true);
  assert.equal(frontend.e2eFull, true);
});

test('a mixed ingestion and broader browser change retains full browser coverage', () => {
  const plan = classifyChangedFiles([
    'apps/backend/src/modules/submissions/submission.service.ts',
    'apps/frontend/src/features/home/HomePage.tsx',
  ]);

  assert.equal(plan.intermediateIngestion, true);
  assert.equal(plan.e2e, true);
  assert.equal(plan.e2eFull, true);
});

test('the normal CI workflow owns Intermediate ingestion acceptance without a duplicate workflow', () => {
  assert.equal(
    existsSync(
      new URL('../../.gitea/workflows/intermediate-ingestion-acceptance.yml', import.meta.url),
    ),
    false,
  );
  assert.match(
    workflow,
    /intermediateIngestion: \$\{\{ steps\.plan\.outputs\.intermediateIngestion \}\}/,
  );
  assert.match(workflow, /e2eFull: \$\{\{ steps\.plan\.outputs\.e2eFull \}\}/);
  assert.match(workflow, /Verify Intermediate ingestion acceptance invariants/);
  assert.match(workflow, /if: needs\.plan\.outputs\.intermediateIngestion == 'true'/);
  assert.match(workflow, /npm run verify:intermediate-ingestion:invariants/);
  assert.match(workflow, /Run Intermediate ingestion browser acceptance/);
  assert.match(workflow, /tests\/e2e\/submissions\.spec\.ts/);
  assert.match(workflow, /tests\/e2e\/batch-review-workspace\.spec\.ts/);
  assert.match(workflow, /tests\/e2e\/corrections\.spec\.ts/);
});

test('full browser validation supersedes the focused ingestion subset instead of duplicating it', () => {
  assert.match(
    workflow,
    /needs\.plan\.outputs\.intermediateIngestion == 'true' &&\n\s+needs\.plan\.outputs\.e2eFull != 'true'/,
  );
  assert.match(
    workflow,
    /Run browser and accessibility tests\n\s+if: needs\.plan\.outputs\.e2eFull == 'true'/,
  );
  assert.match(workflow, /Confirm full browser suite covers Intermediate ingestion acceptance/);
});

test('the required quality status reports the Intermediate ingestion merge gate', () => {
  assert.match(
    workflow,
    /INTERMEDIATE_INGESTION_REQUIRED: \$\{\{ needs\.plan\.outputs\.intermediateIngestion \}\}/,
  );
  assert.match(
    workflow,
    /Intermediate ingestion merge-gated acceptance passed through the existing validation and browser lanes/,
  );
  assert.match(workflow, /BROWSER_REQUIRED: \$\{\{ needs\.plan\.outputs\.e2e \}\}/);
});

test('the retained milestone verifier supports an invariants-only CI mode', () => {
  assert.match(packageJson, /"verify:intermediate-ingestion:invariants"/);
  assert.match(verifier, /process\.argv\.includes\('--invariants-only'\)/);
  assert.match(verifier, /INTERMEDIATE INGESTION INVARIANTS: PASS/);
});
