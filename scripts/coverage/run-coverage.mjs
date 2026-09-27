import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WORKSPACE_COVERAGE,
  aggregateCoverageSummaries,
  enforceThresholds,
  parseThresholds,
  printCoverageSummary,
} from './aggregate-coverage.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const npmExecPath = process.env.npm_execpath;

function runWorkspaceCoverage(workspace) {
  if (!npmExecPath) {
    throw new Error('Unable to locate npm. Run coverage through `npm run test:coverage`.');
  }

  console.log(`\n=== Coverage: ${workspace.name} ===\n`);
  const result = spawnSync(
    process.execPath,
    [npmExecPath, 'run', 'test:coverage', `--workspace=${workspace.workspace}`],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        SUPABASE_URL: process.env.SUPABASE_URL ?? 'https://example.invalid',
        SUPABASE_PUBLISHABLE_KEY:
          process.env.SUPABASE_PUBLISHABLE_KEY ?? 'test-publishable-key',
      },
      stdio: 'inherit',
      shell: false,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${workspace.workspace} coverage exited with code ${result.status}.`);
  }
}

function main() {
  rmSync(path.join(repoRoot, 'coverage'), { recursive: true, force: true });

  for (const workspace of WORKSPACE_COVERAGE) runWorkspaceCoverage(workspace);

  const summary = aggregateCoverageSummaries();
  const thresholds = parseThresholds();
  printCoverageSummary(summary, thresholds);
  enforceThresholds(summary, thresholds);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
