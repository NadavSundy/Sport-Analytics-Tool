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

test('mobile Chromium runs only the representative tagged journey subset', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const specDir = new URL('../e2e/', import.meta.url);
  const config = readFileSync(new URL('../../playwright.config.ts', import.meta.url), 'utf8');
  assert.match(config, /name:\s*'mobile-chromium'/);
  assert.match(config, /grep:\s*\/@mobile\//);

  const expectedMobileFiles = [
    'accessibility.spec.ts',
    'admin-api-consumers.spec.ts',
    'admin-dataset-releases.spec.ts',
    'admin-submitter-rejection.spec.ts',
    'admin-users.spec.ts',
    'api-explorer.spec.ts',
    'authentication.spec.ts',
    'batch-review-workspace.spec.ts',
    'homepage.spec.ts',
    'natural-language-query.spec.ts',
    'player-overview.spec.ts',
    'policies.spec.ts',
    'public-browsing.spec.ts',
    'statistics.spec.ts',
    'submissions.spec.ts',
    'submitter-access.spec.ts',
  ];
  const sourceFiles = readdirSync(specDir).filter((file) => file.endsWith('.spec.ts'));
  const mobileFiles = sourceFiles
    .filter((file) => readFileSync(new URL(file, specDir), 'utf8').includes('@mobile'))
    .sort();
  assert.deepEqual(mobileFiles, expectedMobileFiles);
  assert.equal(mobileFiles.length, 16);

  const accessibility = readFileSync(new URL('accessibility.spec.ts', specDir), 'utf8');
  assert.match(accessibility, /const runsOnMobile = theme === 'day'/);
  assert.ok(accessibility.includes("(route === '/' || route === '/sign-in')"));
  assert.ok(accessibility.includes("${runsOnMobile ? ' @mobile' : ''}"));
});

test('mobile accessibility matrix stays focused while desktop includes core and policy routes', async () => {
  const { readFileSync } = await import('node:fs');
  const accessibility = readFileSync(
    new URL('../e2e/accessibility.spec.ts', import.meta.url),
    'utf8',
  );
  const required = [
    "const routes = ['/', '/sign-in', '/account', '/privacy', '/terms', '/accessibility'] as const;",
    "const themes = ['day', 'night'] as const;",
    'for (const route of routes)',
    'for (const theme of themes)',
    "const runsOnMobile = theme === 'day' && (route === '/' || route === '/sign-in');",
    "${runsOnMobile ? ' @mobile' : ''}",
    'await page.goto(route)',
    'new AxeBuilder({ page }).analyze()',
    "violation.impact === 'serious' || violation.impact === 'critical'",
    'seriousOrCriticalViolations',
    '.toEqual([])',
  ];
  for (const fragment of required) {
    assert.ok(
      accessibility.includes(fragment),
      `Missing accessibility coverage/assertion: ${fragment}`,
    );
  }
});

test('AI transcript exports are excluded from patch whitespace validation', () => {
  const workflow = read('.gitea/workflows/ci.yml');

  assert.ok(
    workflow.includes("':(exclude)evidence/ai/transcripts/**'"),
    'CI must preserve unedited AI transcript exports when running git diff --check',
  );
});
