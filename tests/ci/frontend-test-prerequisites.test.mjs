import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('root frontend test command rebuilds shared contracts before Vitest', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['pretest:frontend'],
    'npm run build --workspace=@sport-analytics/contracts',
    'npm run test:frontend must rebuild @sport-analytics/contracts first so local tests cannot consume stale compiled contracts',
  );

  assert.equal(
    packageJson.scripts['test:frontend'],
    'npm run test --workspace=@sport-analytics/frontend',
    'the existing frontend Vitest command should remain the test body',
  );
});
