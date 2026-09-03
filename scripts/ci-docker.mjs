import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const image = 'sport-analytics-ci-local:node22-playwright-1.62.1';
const dockerfile = path.join(repoRoot, 'infra', 'ci', 'Dockerfile');
const buildContext = path.join(repoRoot, 'infra', 'ci');

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
      shell: false,
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `docker ${args.join(' ')} exited with ${
            code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`
          }.`,
        ),
      );
    });
  });
}

async function main() {
  console.log('\n=== Building/reusing Ubuntu 24.04 local CI image ===\n');
  await run(['build', '--file', dockerfile, '--tag', image, buildContext]);

  console.log('\n=== Running change-aware CI inside Docker ===\n');
  await run([
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    '--mount',
    `type=bind,source=${repoRoot},target=/source,readonly`,
    '--env',
    'CI_LOCAL_DOCKER=1',
    '--env',
    `PLAYWRIGHT_WORKERS=${process.env.PLAYWRIGHT_WORKERS ?? '2'}`,
    image,
    'bash',
    '-lc',
    [
      'set -euo pipefail',
      'mkdir -p /workspace',
      "tar -C /source --exclude='./node_modules' --exclude='./site' --exclude='./coverage' --exclude='./playwright-report' --exclude='./test-results' --exclude='./apps/frontend/dist' --exclude='./apps/backend/dist' -cf - . | tar -C /workspace -xf -",
      'cd /workspace',
      'npm run ci:local',
    ].join(' && '),
  ]);
}

main().catch((error) => {
  console.error('\n==============================================');
  console.error('DOCKER LOCAL CI: FAIL');
  console.error('==============================================');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
