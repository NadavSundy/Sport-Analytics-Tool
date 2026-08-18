import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const testDatabaseUrl = 'postgresql://test_user:test_password@127.0.0.1:55432/sport_analytics_test';

const npmExecPath = process.env.npm_execpath;

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
      shell: false,
    });

    child.once('error', reject);

    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}.`));
    });
  });
}

async function runNpm(args, env) {
  if (!npmExecPath) {
    throw new Error('Unable to locate npm. Run this workflow through npm run test:database:local.');
  }

  await run(process.execPath, [npmExecPath, ...args], env);
}

async function main() {
  const testEnvironment = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL_TEST: testDatabaseUrl,
    SUPABASE_URL: 'https://example.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  };

  console.log('\n=== Local PostgreSQL database integration tests ===\n');

  console.log('[1/5] Starting PostgreSQL 16 test database...');
  await run('docker', ['compose', '-f', 'compose.test.yml', 'up', '-d', '--wait']);
  console.log('✓ PostgreSQL ready');

  console.log('\n[2/5] Resetting test database...');
  await runNpm(['run', 'db:test:reset', '--workspace=@sport-analytics/backend'], testEnvironment);
  console.log('✓ Reset complete');

  console.log('\n[3/5] Applying database migrations...');
  await runNpm(['run', 'db:test:migrate', '--workspace=@sport-analytics/backend'], testEnvironment);
  console.log('✓ Migrations complete');

  console.log('\n[4/5] Loading deterministic test seed...');
  await runNpm(['run', 'db:test:seed', '--workspace=@sport-analytics/backend'], testEnvironment);
  console.log('✓ Seed complete');

  console.log('\n[5/5] Running database integration tests...');
  await runNpm(
    [
      'run',
      'test:database:run',
      '--workspace=@sport-analytics/backend',
      '--',
      '--reporter=verbose',
    ],
    testEnvironment,
  );

  console.log('\n==============================================');
  console.log('DATABASE INTEGRATION TESTS: PASS');
  console.log('==============================================\n');
}

main().catch((error) => {
  console.error('\n==============================================');
  console.error('DATABASE INTEGRATION TESTS: FAIL');
  console.error('==============================================');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
