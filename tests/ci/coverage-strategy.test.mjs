import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  WORKSPACE_COVERAGE,
  aggregateCoverageSummaries,
  enforceThresholds,
  parseThresholds,
} from '../../scripts/coverage/aggregate-coverage.mjs';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const workflow = readFileSync('.gitea/workflows/ci.yml', 'utf8');

const expectedWorkspaces = [
  {
    name: 'frontend',
    packagePath: 'apps/frontend/package.json',
    configPath: 'apps/frontend/vite.config.ts',
    sourcePattern: "include: ['src/**/*.{ts,tsx}']",
  },
  {
    name: 'backend',
    packagePath: 'apps/backend/package.json',
    configPath: 'apps/backend/vitest.config.ts',
    sourcePattern: "include: ['src/**/*.ts']",
  },
  {
    name: 'worker',
    packagePath: 'apps/worker/package.json',
    configPath: 'apps/worker/vitest.config.ts',
    sourcePattern: "include: ['src/**/*.ts']",
  },
  {
    name: 'contracts',
    packagePath: 'packages/contracts/package.json',
    configPath: 'packages/contracts/vitest.config.ts',
    sourcePattern: "include: ['src/**/*.ts']",
  },
  {
    name: 'batch-processing',
    packagePath: 'packages/batch-processing/package.json',
    configPath: 'packages/batch-processing/vitest.config.ts',
    sourcePattern: "include: ['src/**/*.ts']",
  },
];

function fakeMetric(covered, total) {
  return { total, covered, skipped: 0, pct: total === 0 ? 100 : (covered / total) * 100 };
}

function writeWorkspaceArtifacts(root, workspace, covered, total) {
  const directory = path.join(root, 'coverage', workspace.name);
  mkdirSync(directory, { recursive: true });
  const metric = fakeMetric(covered, total);
  writeFileSync(
    path.join(directory, 'coverage-summary.json'),
    JSON.stringify({
      total: {
        lines: metric,
        statements: metric,
        functions: metric,
        branches: metric,
      },
    }),
  );
  writeFileSync(path.join(directory, 'coverage-final.json'), '{}\n');
  writeFileSync(path.join(directory, 'lcov.info'), 'TN:\nSF:src/index.ts\nDA:1,1\nend_of_record\n');
  writeFileSync(path.join(directory, 'index.html'), '<!doctype html><title>coverage</title>\n');
}

test('root coverage command owns the repository-wide coverage run', () => {
  assert.equal(rootPackage.scripts['test:coverage'], 'node scripts/coverage/run-coverage.mjs');
  assert.deepEqual(
    WORKSPACE_COVERAGE.map((workspace) => workspace.name),
    expectedWorkspaces.map((workspace) => workspace.name),
  );
});

test('every required workspace explicitly covers production source and emits machine-readable reports', () => {
  for (const workspace of expectedWorkspaces) {
    const packageJson = JSON.parse(readFileSync(workspace.packagePath, 'utf8'));
    const config = readFileSync(workspace.configPath, 'utf8');
    assert.equal(
      rootPackage.scripts['pretest:coverage'],
      'npm run build --workspace=@sport-analytics/contracts && npm run build --workspace=@sport-analytics/batch-processing && npm run build --workspace=@sport-analytics/object-storage',
    );
    assert.match(
      packageJson.scripts['test:coverage'],
      /vitest run.*--coverage/,
      `${workspace.name} must expose a Vitest coverage command`,
    );
    assert.match(config, /provider:\s*'v8'/, `${workspace.name} must use V8 coverage`);
    assert.ok(
      config.includes(workspace.sourcePattern),
      `${workspace.name} must explicitly include production source so untested files count as zero`,
    );
    assert.match(config, /\{test,spec\}/, `${workspace.name} must exclude tests/specs`);
    assert.match(config, /\{fixtures,mocks\}/, `${workspace.name} must exclude fixtures/mocks`);
    assert.match(config, /generated/, `${workspace.name} must exclude generated source`);
    assert.match(config, /\.d\.ts/, `${workspace.name} must exclude declarations`);
    for (const reporter of ['text', 'html', 'lcov', 'json', 'json-summary']) {
      assert.match(
        config,
        new RegExp(`['"]${reporter}['"]`),
        `${workspace.name} missing ${reporter}`,
      );
    }
    assert.match(
      config,
      new RegExp(`coverage/${workspace.name.replace('-', '\\-')}`),
      `${workspace.name} must write to its own coverage directory`,
    );
  }
});

test('combined coverage is computed from counters rather than averaging workspace percentages', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'coverage-aggregate-'));
  try {
    for (const workspace of WORKSPACE_COVERAGE) writeWorkspaceArtifacts(root, workspace, 0, 0);
    writeWorkspaceArtifacts(root, WORKSPACE_COVERAGE[0], 1, 1);
    writeWorkspaceArtifacts(root, WORKSPACE_COVERAGE[1], 1, 9);

    const result = aggregateCoverageSummaries({ root });

    assert.equal(result.total.lines.covered, 2);
    assert.equal(result.total.lines.total, 10);
    assert.equal(result.total.lines.pct, 20);
    assert.notEqual(result.total.lines.pct, 55.55);

    const combined = path.join(root, 'coverage', 'combined');
    for (const artifact of ['coverage-summary.json', 'summary.txt', 'index.html', 'lcov.info']) {
      assert.ok(
        readFileSync(path.join(combined, artifact), 'utf8').length > 0,
        `${artifact} missing`,
      );
    }
    const lcov = readFileSync(path.join(combined, 'lcov.info'), 'utf8');
    assert.match(lcov, /SF:apps\/frontend\/src\/index\.ts/);
    assert.match(lcov, /SF:apps\/backend\/src\/index\.ts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('aggregation fails when a required workspace did not emit coverage artifacts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'coverage-missing-'));
  try {
    for (const workspace of WORKSPACE_COVERAGE.slice(1))
      writeWorkspaceArtifacts(root, workspace, 1, 1);
    assert.throws(() => aggregateCoverageSummaries({ root }), /Missing frontend JSON summary/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('coverage thresholds are optional, centrally parsed, and fail only when configured', () => {
  assert.deepEqual(parseThresholds({}), {});
  assert.deepEqual(
    parseThresholds({
      COVERAGE_THRESHOLD_LINES: '70',
      COVERAGE_THRESHOLD_STATEMENTS: '71.5',
      COVERAGE_THRESHOLD_FUNCTIONS: '60',
      COVERAGE_THRESHOLD_BRANCHES: '55',
    }),
    { lines: 70, statements: 71.5, functions: 60, branches: 55 },
  );
  assert.throws(() => parseThresholds({ COVERAGE_THRESHOLD_LINES: '101' }), /between 0 and 100/);

  const summary = {
    total: {
      lines: fakeMetric(8, 10),
      statements: fakeMetric(8, 10),
      functions: fakeMetric(7, 10),
      branches: fakeMetric(6, 10),
    },
  };

  assert.doesNotThrow(() => enforceThresholds(summary, {}));
  assert.doesNotThrow(() => enforceThresholds(summary, { lines: 80, branches: 60 }));
  assert.throws(
    () => enforceThresholds(summary, { functions: 71 }),
    /functions: 70\.00% < 71\.00%/,
  );
});

test('Gitea CI gives coverage its own routed lane, artifact, and quality-gate result', () => {
  assert.match(workflow, /\n  coverage:\n/);
  assert.match(workflow, /needs\.plan\.outputs\.coverage == 'true'/);
  assert.match(workflow, /run: npm run test:coverage/);
  assert.match(workflow, /uses: actions\/upload-artifact@v4/);
  assert.match(workflow, /name: repository-coverage-\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /path: coverage\//);
  assert.match(workflow, /- coverage\n/);
  assert.match(workflow, /COVERAGE_REQUIRED: \$\{\{ needs\.plan\.outputs\.coverage \}\}/);
  assert.match(workflow, /COVERAGE_RESULT: \$\{\{ needs\.coverage\.result \}\}/);
});

test('repository aggregation writes the live coverage badge from combined line coverage', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'coverage-badge-'));
  try {
    for (const workspace of WORKSPACE_COVERAGE) writeWorkspaceArtifacts(root, workspace, 0, 0);
    writeWorkspaceArtifacts(root, WORKSPACE_COVERAGE[0], 3, 4);
    writeWorkspaceArtifacts(root, WORKSPACE_COVERAGE[1], 1, 4);

    const result = aggregateCoverageSummaries({ root });
    assert.equal(result.total.lines.pct, 50);

    const badge = readFileSync(path.join(root, 'coverage', 'combined', 'badge.svg'), 'utf8');
    assert.match(badge, /aria-label="coverage: 50\.00%"/);
    assert.match(badge, />50\.00%<\/text>/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('main coverage publishing keeps a stable badge branch and README URL', () => {
  const readme = readFileSync('README.md', 'utf8');
  const coverageJob = workflow.match(/\n  coverage:\n[\s\S]*?\n  quality:\n/)?.[0] ?? '';

  assert.match(coverageJob, /permissions:\n\s+contents: write/);
  assert.match(coverageJob, /name: Publish live coverage badge/);
  assert.match(
    coverageJob,
    /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
  );
  assert.match(coverageJob, /git push origin coverage-badge/);
  assert.match(
    readme,
    /https:\/\/sdp\.ms\.wits\.ac\.za\/git-push-pray\/Sport-Analytics-Tool\/raw\/branch\/coverage-badge\/badge\.svg/,
  );
  assert.match(readme, /https:\/\/sports-analytics-tool\.pages\.dev\/testing\/code-coverage\//);
});
