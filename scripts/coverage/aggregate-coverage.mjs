import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const COVERAGE_METRICS = ['lines', 'statements', 'functions', 'branches'];

export const WORKSPACE_COVERAGE = [
  { name: 'frontend', workspace: '@sport-analytics/frontend', directory: 'apps/frontend' },
  { name: 'backend', workspace: '@sport-analytics/backend', directory: 'apps/backend' },
  { name: 'worker', workspace: '@sport-analytics/worker', directory: 'apps/worker' },
  { name: 'contracts', workspace: '@sport-analytics/contracts', directory: 'packages/contracts' },
  {
    name: 'batch-processing',
    workspace: '@sport-analytics/batch-processing',
    directory: 'packages/batch-processing',
  },
];

function emptyMetric() {
  return { total: 0, covered: 0, skipped: 0, pct: 100 };
}

function percentage(covered, total) {
  if (total === 0) return 100;
  return Math.floor((covered / total) * 10000) / 100;
}

function normaliseMetric(metric) {
  const total = Number(metric?.total ?? 0);
  const covered = Number(metric?.covered ?? 0);
  const skipped = Number(metric?.skipped ?? 0);
  return { total, covered, skipped, pct: percentage(covered, total) };
}

function addMetric(target, source) {
  target.total += source.total;
  target.covered += source.covered;
  target.skipped += source.skipped;
  target.pct = percentage(target.covered, target.total);
}

function requireFile(filepath, label) {
  if (!existsSync(filepath)) {
    throw new Error(`Missing ${label}: ${path.relative(repoRoot, filepath)}`);
  }
}

function renderText(summary) {
  const rows = [
    'Repository-wide coverage',
    '',
    'Workspace           Lines      Statements  Functions   Branches',
  ];

  for (const workspace of summary.workspaces) {
    rows.push(
      `${workspace.name.padEnd(19)}${String(workspace.total.lines.pct.toFixed(2)).padStart(7)}%` +
        `${String(workspace.total.statements.pct.toFixed(2)).padStart(11)}%` +
        `${String(workspace.total.functions.pct.toFixed(2)).padStart(11)}%` +
        `${String(workspace.total.branches.pct.toFixed(2)).padStart(11)}%`,
    );
  }

  rows.push(
    `${'TOTAL'.padEnd(19)}${String(summary.total.lines.pct.toFixed(2)).padStart(7)}%` +
      `${String(summary.total.statements.pct.toFixed(2)).padStart(11)}%` +
      `${String(summary.total.functions.pct.toFixed(2)).padStart(11)}%` +
      `${String(summary.total.branches.pct.toFixed(2)).padStart(11)}%`,
    '',
  );

  for (const metric of COVERAGE_METRICS) {
    const value = summary.total[metric];
    rows.push(`${metric}: ${value.covered}/${value.total} covered (${value.pct.toFixed(2)}%)`);
  }

  return `${rows.join('\n')}\n`;
}

function renderHtml(summary) {
  const tableRows = summary.workspaces
    .map(
      (workspace) => `<tr>
        <td><a href="../${workspace.name}/index.html">${workspace.name}</a></td>
        ${COVERAGE_METRICS.map(
          (metric) => `<td>${workspace.total[metric].covered}/${workspace.total[metric].total} (${workspace.total[metric].pct.toFixed(2)}%)</td>`,
        ).join('\n        ')}
      </tr>`,
    )
    .join('\n');

  const totalCells = COVERAGE_METRICS.map(
    (metric) => `<td><strong>${summary.total[metric].covered}/${summary.total[metric].total} (${summary.total[metric].pct.toFixed(2)}%)</strong></td>`,
  ).join('\n        ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Repository-wide coverage</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1f2937; }
    table { border-collapse: collapse; width: 100%; max-width: 80rem; }
    th, td { border: 1px solid #d1d5db; padding: 0.6rem; text-align: left; }
    th { background: #f3f4f6; }
    tfoot { background: #f9fafb; }
  </style>
</head>
<body>
  <h1>Repository-wide coverage</h1>
  <p>Totals are calculated from summed covered/coverable counters, not averaged workspace percentages.</p>
  <table>
    <thead><tr><th>Workspace</th><th>Lines</th><th>Statements</th><th>Functions</th><th>Branches</th></tr></thead>
    <tbody>${tableRows}</tbody>
    <tfoot><tr><td><strong>TOTAL</strong></td>${totalCells}</tr></tfoot>
  </table>
</body>
</html>
`;
}

export function aggregateCoverageSummaries({ root = repoRoot } = {}) {
  const workspaceSummaries = WORKSPACE_COVERAGE.map((workspace) => {
    const summaryPath = path.join(root, 'coverage', workspace.name, 'coverage-summary.json');
    const lcovPath = path.join(root, 'coverage', workspace.name, 'lcov.info');
    const jsonPath = path.join(root, 'coverage', workspace.name, 'coverage-final.json');
    const htmlPath = path.join(root, 'coverage', workspace.name, 'index.html');
    requireFile(summaryPath, `${workspace.name} JSON summary`);
    requireFile(lcovPath, `${workspace.name} LCOV report`);
    requireFile(jsonPath, `${workspace.name} JSON report`);
    requireFile(htmlPath, `${workspace.name} HTML report`);
    const parsed = JSON.parse(readFileSync(summaryPath, 'utf8'));
    if (!parsed.total) throw new Error(`${workspace.name} coverage summary has no total object.`);
    return {
      ...workspace,
      total: Object.fromEntries(
        COVERAGE_METRICS.map((metric) => [metric, normaliseMetric(parsed.total[metric])]),
      ),
    };
  });

  const total = Object.fromEntries(COVERAGE_METRICS.map((metric) => [metric, emptyMetric()]));
  for (const workspace of workspaceSummaries) {
    for (const metric of COVERAGE_METRICS) addMetric(total[metric], workspace.total[metric]);
  }

  const combined = {
    generatedAt: new Date().toISOString(),
    total,
    workspaces: workspaceSummaries,
  };

  const combinedDir = path.join(root, 'coverage', 'combined');
  mkdirSync(combinedDir, { recursive: true });
  writeFileSync(path.join(combinedDir, 'coverage-summary.json'), `${JSON.stringify(combined, null, 2)}\n`);
  writeFileSync(path.join(combinedDir, 'summary.txt'), renderText(combined));
  writeFileSync(path.join(combinedDir, 'index.html'), renderHtml(combined));

  const combinedLcov = WORKSPACE_COVERAGE.map((workspace) => {
    const lcov = readFileSync(path.join(root, 'coverage', workspace.name, 'lcov.info'), 'utf8');
    const prefix = workspace.directory.replaceAll('\\', '/');
    return lcov
      .split(/\r?\n/)
      .map((line) => {
        if (!line.startsWith('SF:')) return line;
        const source = line.slice(3).replaceAll('\\', '/');
        if (source.startsWith(`${prefix}/`)) return `SF:${source}`;
        return `SF:${prefix}/${source.replace(/^\.\//, '')}`;
      })
      .join('\n');
  }).join('\n');
  writeFileSync(path.join(combinedDir, 'lcov.info'), combinedLcov.endsWith('\n') ? combinedLcov : `${combinedLcov}\n`);

  return combined;
}

export function parseThresholds(env = process.env) {
  const thresholds = {};
  for (const metric of COVERAGE_METRICS) {
    const key = `COVERAGE_THRESHOLD_${metric.toUpperCase()}`;
    const raw = env[key];
    if (raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`${key} must be a number between 0 and 100; received ${JSON.stringify(raw)}.`);
    }
    thresholds[metric] = value;
  }
  return thresholds;
}

export function enforceThresholds(summary, thresholds) {
  const failures = [];
  for (const [metric, minimum] of Object.entries(thresholds)) {
    const actual = summary.total[metric]?.pct;
    if (actual === undefined) throw new Error(`Unknown coverage metric ${metric}.`);
    if (actual < minimum) failures.push(`${metric}: ${actual.toFixed(2)}% < ${minimum.toFixed(2)}%`);
  }
  if (failures.length > 0) {
    throw new Error(`Repository coverage threshold failed:\n${failures.map((line) => `  - ${line}`).join('\n')}`);
  }
}

export function printCoverageSummary(summary, thresholds = {}) {
  process.stdout.write(renderText(summary));
  const configured = Object.entries(thresholds);
  if (configured.length === 0) {
    console.log('Coverage thresholds: informational only (no repository threshold configured).');
  } else {
    console.log(
      `Coverage thresholds: ${configured.map(([metric, value]) => `${metric}>=${value}%`).join(', ')}`,
    );
  }
}
