import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(path, 'utf8');
}

test('browser validation is an independent required lane rather than the tail of validation', () => {
  const workflow = read('.gitea/workflows/ci.yml');
  const validationStart = workflow.indexOf('  validation:');
  const browserStart = workflow.indexOf('  browser:');
  const databaseStart = workflow.indexOf('  database:', browserStart);
  const validation = workflow.slice(validationStart, browserStart);
  const browser = workflow.slice(browserStart, databaseStart);

  assert.match(browser, /needs: plan/);
  assert.match(browser, /if: needs\.plan\.outputs\.e2e == 'true'/);
  assert.match(workflow, /quality:\n\s+needs:\n(?:.|\n)*?- browser\n/);
  assert.match(workflow, /BROWSER_REQUIRED: \$\{\{ needs\.plan\.outputs\.e2e \}\}/);
  assert.match(workflow, /BROWSER_RESULT: \$\{\{ needs\.browser\.result \}\}/);
  assert.doesNotMatch(validation, /playwright install|npm run test:e2e/);
});

test('hosted browser validation reuses one production build and defaults to four workers', () => {
  const workflow = read('.gitea/workflows/ci.yml');
  const config = read('playwright.config.ts');

  assert.match(workflow, /PLAYWRIGHT_REUSE_BUILD: '1'/);
  assert.match(workflow, /PLAYWRIGHT_WORKERS: '4'/);
  assert.match(workflow, /Build frontend production bundle once/);
  const browserStart = workflow.indexOf('  browser:');
  const databaseStart = workflow.indexOf('  database:', browserStart);
  const browser = workflow.slice(browserStart, databaseStart);
  assert.ok(
    browser.indexOf('run: npm ci') < browser.indexOf('NODE_ENV: production'),
    'npm ci must install dev dependencies before the browser lane switches to production mode',
  );
  assert.match(config, /PLAYWRIGHT_REUSE_BUILD === '1'/);
  assert.match(config, /PLAYWRIGHT_WORKERS \?\? '4'/);
  assert.match(config, /reuseProductionBuild\s*\?\s*previewCommand/);
});

test('mobile Chromium runs only the representative tagged journey subset', () => {
  const config = read('playwright.config.ts');
  assert.match(config, /name: 'mobile-chromium'[\s\S]*?grep: \/@mobile\//);

  const specs = readdirSync('tests/e2e')
    .filter((file) => file.endsWith('.spec.ts'))
    .map((file) => `tests/e2e/${file}`);
  const tagged = specs.flatMap((path) => {
    const matches = read(path).match(/tag: '@mobile'/g) ?? [];
    return matches.map(() => path);
  });

  assert.equal(tagged.length, 9);
  for (const required of [
    'tests/e2e/accessibility.spec.ts',
    'tests/e2e/authentication.spec.ts',
    'tests/e2e/homepage.spec.ts',
    'tests/e2e/public-browsing.spec.ts',
    'tests/e2e/player-overview.spec.ts',
    'tests/e2e/statistics.spec.ts',
    'tests/e2e/submissions.spec.ts',
  ]) {
    assert.ok(tagged.includes(required), `${required} must retain representative mobile coverage`);
  }
});

test('mobile accessibility matrix is focused while desktop keeps both themes and all core routes', () => {
  const accessibility = read('tests/e2e/accessibility.spec.ts');

  assert.match(
    accessibility,
    /isMobile \? \['\/', '\/sign-in'\] : \['\/', '\/sign-in', '\/account'\]/,
  );
  assert.match(
    accessibility,
    /isMobile \? \(\['day'\] as const\) : \(\['day', 'night'\] as const\)/,
  );
});
