import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

function read(path) {
  return readFileSync(path, 'utf8');
}

test('browser validation runs in parallel with validation after planning', () => {
  const workflow = read('.gitea/workflows/ci.yml');
  const validationStart = workflow.indexOf('  validation:');
  const browserStart = workflow.indexOf('  browser:');
  const qualityStart = workflow.indexOf('  quality:', browserStart);
  const validation = workflow.slice(validationStart, browserStart);
  const browser = workflow.slice(browserStart, qualityStart);

  assert.match(validation, /needs: plan/);
  assert.match(browser, /needs: plan/);
  assert.doesNotMatch(workflow, /\n  preflight:/);
  assert.match(browser, /github\.event_name != 'push'/);
  assert.match(browser, /needs\.plan\.outputs\.e2e == 'true'/);
  assert.match(workflow, /quality:\n\s+needs:\n(?:.|\n)*?- browser\n/);
  assert.match(workflow, /BROWSER_REQUIRED: \$\{\{ needs\.plan\.outputs\.e2e \}\}/);
  assert.match(workflow, /BROWSER_RESULT: \$\{\{ needs\.browser\.result \}\}/);
  assert.doesNotMatch(validation, /playwright install|npm run test:e2e/);
});

test('database integration is folded into validation without a separate hosted job', () => {
  const workflow = read('.gitea/workflows/ci.yml');
  const validationStart = workflow.indexOf('  validation:');
  const browserStart = workflow.indexOf('  browser:');
  const validation = workflow.slice(validationStart, browserStart);

  assert.match(validation, /Run PostgreSQL database integration tests/);
  assert.match(validation, /if: needs\.plan\.outputs\.database == 'true'/);
  assert.match(validation, /run: npm run test:database/);
  assert.doesNotMatch(workflow, /\n  database:/);
  assert.doesNotMatch(workflow, /DATABASE_RESULT|needs\.database/);
});

test('hosted browser validation reuses one production build and caches pinned Chromium', () => {
  const workflow = read('.gitea/workflows/ci.yml');
  const config = read('playwright.config.ts');

  assert.match(workflow, /PLAYWRIGHT_REUSE_BUILD: '1'/);
  assert.match(workflow, /PLAYWRIGHT_WORKERS: '2'/);
  assert.match(workflow, /Build shared contracts for browser validation/);
  assert.match(workflow, /Build frontend production bundle once/);
  const browserStart = workflow.indexOf('  browser:');
  const qualityStart = workflow.indexOf('  quality:', browserStart);
  const browser = workflow.slice(browserStart, qualityStart);
  assert.ok(
    browser.indexOf('run: npm ci') < browser.indexOf('NODE_ENV: production'),
    'npm ci must install dev dependencies before the browser lane switches to production mode',
  );
  assert.ok(
    browser.indexOf('npm run build --workspace=@sport-analytics/contracts') <
      browser.indexOf('npm run build --workspace=@sport-analytics/frontend'),
    'shared contracts must be built before the standalone browser lane builds the frontend',
  );
  assert.match(browser, /uses: actions\/cache@v4/);
  assert.match(browser, /path: ~\/.cache\/ms-playwright/);
  assert.match(browser, /key: playwright-ubuntu24-chromium-1\.62\.1/);
  assert.match(browser, /npx playwright install-deps chromium/);
  assert.match(browser, /steps\.playwright-cache\.outputs\.cache-hit != 'true'/);
  assert.match(browser, /npx playwright install chromium/);
  assert.match(config, /PLAYWRIGHT_REUSE_BUILD === '1'/);
  assert.match(config, /PLAYWRIGHT_WORKERS \?\? '2'/);
  assert.match(config, /retries: process\.env\.CI \? 1 : 0/);
  assert.match(config, /timeout: process\.env\.CI \? 45_000 : 30_000/);
  assert.match(config, /reuseProductionBuild\s*\?\s*previewCommand/);
});

test('plan owns cheap lockfile fail-fast while main push skips duplicate application suites', () => {
  const workflow = read('.gitea/workflows/ci.yml');
  const planStart = workflow.indexOf('  plan:');
  const validationStart = workflow.indexOf('  validation:');
  const browserStart = workflow.indexOf('  browser:');
  const qualityStart = workflow.indexOf('  quality:');
  const deployStart = workflow.indexOf('  deploy_frontend:');
  const plan = workflow.slice(planStart, validationStart);
  const validation = workflow.slice(validationStart, browserStart);
  const browser = workflow.slice(browserStart, qualityStart);
  const quality = workflow.slice(qualityStart, deployStart);

  assert.match(plan, /npm ci --dry-run --ignore-scripts --no-audit --no-fund/);
  assert.match(plan, /git diff --check/);
  assert.match(validation, /github\.event_name != 'push'/);
  assert.match(browser, /github\.event_name != 'push'/);
  assert.match(quality, /if \[ "\$EVENT_NAME" != "push" \]/);
  assert.match(quality, /full application quality was enforced before merge/);
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

  assert.equal(tagged.length, 11);
  for (const required of [
    'tests/e2e/accessibility.spec.ts',
    'tests/e2e/authentication.spec.ts',
    'tests/e2e/homepage.spec.ts',
    'tests/e2e/public-browsing.spec.ts',
    'tests/e2e/player-overview.spec.ts',
    'tests/e2e/statistics.spec.ts',
    'tests/e2e/submissions.spec.ts',
    'tests/e2e/submitter-access.spec.ts',
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
test('AI transcript exports are excluded from patch whitespace validation', () => {
  const workflow = read('.gitea/workflows/ci.yml');

  assert.ok(
    workflow.includes("':(exclude)evidence/ai/transcripts/**'"),
    'CI must preserve unedited AI transcript exports when running git diff --check',
  );
});
