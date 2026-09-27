import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyChangedFiles } from './ci-change-plan.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmExecPath = process.env.npm_execpath;
const insideDocker = process.env.CI_LOCAL_DOCKER === '1';

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (error) {
    if (allowFailure) return '';
    throw error;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function lines(value) {
  return value ? value.split(/\r?\n/).filter(Boolean) : [];
}

export function resolveBaseRef() {
  const requested = process.env.CI_LOCAL_BASE?.trim();
  const candidates = unique([requested, 'origin/main', 'main']);

  for (const candidate of candidates) {
    if (git(['rev-parse', '--verify', '--quiet', candidate], { allowFailure: true })) {
      return candidate;
    }
  }

  return null;
}

export function resolveLocalChangedFiles(baseRef) {
  const changed = [];

  if (baseRef) {
    changed.push(
      ...lines(
        git(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${baseRef}...HEAD`], {
          allowFailure: true,
        }),
      ),
    );
  }

  // Include tracked and untracked working-tree changes so the command is useful
  // before a commit as well as immediately before a push.
  changed.push(
    ...lines(
      git(['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD'], { allowFailure: true }),
    ),
    ...lines(git(['ls-files', '--others', '--exclude-standard'], { allowFailure: true })),
  );

  return unique(changed.map((file) => file.replaceAll('\\', '/')));
}

function run(command, args, { env = process.env, label } = {}) {
  return new Promise((resolve, reject) => {
    if (label) console.log(`\n=== ${label} ===\n`);

    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
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
          `${command} ${args.join(' ')} exited with ${
            code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`
          }.`,
        ),
      );
    });
  });
}

async function runNpm(args, options = {}) {
  if (!npmExecPath) {
    throw new Error('Unable to locate npm. Run local CI through `npm run ci:local`.');
  }

  await run(process.execPath, [npmExecPath, ...args], options);
}

async function runPython(args, options = {}) {
  const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  let lastError;

  for (const candidate of candidates) {
    try {
      const candidateArgs = candidate === 'py' ? ['-3', ...args] : args;
      await run(candidate, candidateArgs, options);
      return;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('Python 3 is required for documentation validation.');
}

function printPlan(baseRef, files, plan) {
  console.log('\n==============================================');
  console.log('CHANGE-AWARE LOCAL CI');
  console.log('==============================================');
  console.log(`Mode: ${insideDocker ? 'Docker / Ubuntu 24.04' : `native ${process.platform}`}`);
  console.log(`Base: ${baseRef ?? 'unavailable (conservative full validation)'}`);

  if (files.length > 0) {
    console.log('Changed files:');
    for (const file of files) console.log(`  - ${file}`);
  } else {
    console.log('Changed files: none resolved');
  }

  console.log('Validation plan:');
  for (const [key, value] of Object.entries(plan)) console.log(`  ${key}: ${value}`);
  console.log('==============================================\n');
}

async function runValidation(plan) {
  await runNpm(['run', 'structure:check'], { label: 'Required repository structure' });
  await runNpm(['run', 'test:ci-routing'], { label: 'CI change-routing regression tests' });

  if (!plan.needsNpm) {
    console.log('\nNo npm-backed validation is required for this change set.');
    return;
  }

  // Validate the same frozen package manifest/lockfile relationship as hosted
  // `npm ci` without deleting or rewriting the developer's node_modules.
  if (insideDocker) {
    // Docker runs in an isolated workspace, so perform the same real clean
    // dependency install as hosted CI.
    await runNpm(['ci', '--no-audit', '--no-fund'], {
      label: 'Clean dependency install / lockfile validation',
    });
  } else {
    // Native local CI must not delete/rebuild the developer's node_modules.
    // Dry-run still catches package.json/package-lock.json drift.
    await runNpm(['ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'], {
      label: 'Frozen dependency lockfile validation',
    });
  }
  await runNpm(['run', 'format:check'], { label: 'Repository formatting' });

  const testEnvironment = {
    ...process.env,
    NODE_ENV: 'test',
    KNIP_DISABLE_RAW_TRANSFER: '1',
    SUPABASE_URL: 'https://example.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  };

  if (plan.hygiene) {
    await runNpm(['run', 'hygiene'], {
      env: testEnvironment,
      label: 'Monorepo architecture and hygiene',
    });
  }

  if (plan.contracts) {
    await runNpm(['run', 'lint', '--workspace=@sport-analytics/contracts'], {
      env: testEnvironment,
      label: 'Contracts lint',
    });
    await runNpm(['run', 'typecheck', '--workspace=@sport-analytics/contracts'], {
      env: testEnvironment,
      label: 'Contracts typecheck',
    });
    await runNpm(['run', 'test:contracts'], { env: testEnvironment, label: 'Contracts tests' });
    await runNpm(['run', 'build', '--workspace=@sport-analytics/contracts'], {
      env: testEnvironment,
      label: 'Contracts build',
    });
  }

  if (plan.backend) {
    await runNpm(['run', 'lint', '--workspace=@sport-analytics/backend'], {
      env: testEnvironment,
      label: 'Backend lint',
    });
    await runNpm(['run', 'typecheck', '--workspace=@sport-analytics/backend'], {
      env: testEnvironment,
      label: 'Backend typecheck',
    });
    await runNpm(['run', 'test:unit'], { env: testEnvironment, label: 'Backend unit tests' });
    await runNpm(['run', 'test:api'], { env: testEnvironment, label: 'Backend API tests' });
    await runNpm(['run', 'build', '--workspace=@sport-analytics/backend'], {
      env: testEnvironment,
      label: 'Backend build',
    });
  }

  if (plan.frontend) {
    await runNpm(['run', 'lint', '--workspace=@sport-analytics/frontend'], {
      env: testEnvironment,
      label: 'Frontend lint',
    });
    await runNpm(['run', 'typecheck', '--workspace=@sport-analytics/frontend'], {
      env: testEnvironment,
      label: 'Frontend typecheck',
    });
    await runNpm(['run', 'test:frontend'], {
      env: testEnvironment,
      label: 'Frontend unit tests',
    });
  }

  if (plan.deployment) {
    await runNpm(['run', 'test:deployment'], {
      env: testEnvironment,
      label: 'Deployment-helper tests',
    });
  }

  if (plan.openapi) {
    await runNpm(['run', 'openapi:lint'], { env: testEnvironment, label: 'OpenAPI lint' });
  }

  if (plan.apiContract) {
    await runNpm(['run', 'prepare:contracts', '--workspace=@sport-analytics/backend'], {
      env: testEnvironment,
      label: 'API contract prerequisites',
    });
    await runNpm(['run', 'test:api-contract'], {
      env: testEnvironment,
      label: 'OpenAPI contract tests',
    });
  }

  if (plan.intermediateIngestion) {
    await runNpm(['run', 'verify:intermediate-ingestion:invariants'], {
      env: testEnvironment,
      label: 'Intermediate ingestion acceptance invariants',
    });
  }

  if (plan.docs) {
    if (!existsSync(path.join(repoRoot, 'requirements-docs.txt'))) {
      throw new Error('requirements-docs.txt is required for strict documentation validation.');
    }

    // Install the same pinned documentation dependencies in both native and
    // Docker runs so strict documentation validation is reproducible locally.
    await runPython(['-m', 'pip', 'install', '-r', 'requirements-docs.txt'], {
      label: 'Documentation dependencies',
    });

    await runPython(['-m', 'mkdocs', 'build', '--strict'], {
      label: 'Strict MkDocs build',
    });
  }

  if (plan.e2e) {
    const browserEnvironment = {
      ...process.env,
      CI: 'true',
      NODE_ENV: 'production',
      PLAYWRIGHT_REUSE_BUILD: '1',
      PLAYWRIGHT_WORKERS: process.env.PLAYWRIGHT_WORKERS ?? '2',
      VITE_SUPABASE_URL: 'https://e2e.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-public-key',
    };

    await runNpm(['run', 'build', '--workspace=@sport-analytics/contracts'], {
      env: browserEnvironment,
      label: 'Browser contracts build',
    });
    await runNpm(['run', 'build', '--workspace=@sport-analytics/frontend'], {
      env: browserEnvironment,
      label: 'Frontend production build',
    });

    if (!insideDocker) {
      await runNpm(['exec', '--', 'playwright', 'install', 'chromium'], {
        env: browserEnvironment,
        label: 'Playwright Chromium availability',
      });
    }

    const browserArgs = plan.e2eFull
      ? ['run', 'test:e2e']
      : [
          'run',
          'test:e2e',
          '--',
          'tests/e2e/submissions.spec.ts',
          'tests/e2e/batch-review-workspace.spec.ts',
          'tests/e2e/corrections.spec.ts',
        ];

    await runNpm(browserArgs, {
      env: browserEnvironment,
      label: plan.e2eFull
        ? 'Full browser and accessibility tests'
        : 'Intermediate ingestion browser acceptance',
    });
  }

  if (plan.database) {
    await runNpm(['run', 'test:database'], {
      env: testEnvironment,
      label: 'PostgreSQL 16 database integration tests',
    });
  }

  if (plan.coverage) {
    await runNpm(['run', 'test:coverage'], {
      env: testEnvironment,
      label: 'Repository-wide code coverage',
    });
  }
}

async function main() {
  const baseRef = resolveBaseRef();
  const files = resolveLocalChangedFiles(baseRef);

  // If a base comparison cannot be established, use the planner's deliberate
  // empty-file fallback to select conservative full validation.
  const planningFiles = baseRef ? files : [];
  const plan = classifyChangedFiles(planningFiles, { eventName: 'pull_request' });

  printPlan(baseRef, files, plan);
  await runValidation(plan);

  console.log('\n==============================================');
  console.log('LOCAL CI: PASS');
  console.log('==============================================\n');
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch((error) => {
    console.error('\n==============================================');
    console.error('LOCAL CI: FAIL');
    console.error('==============================================');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
