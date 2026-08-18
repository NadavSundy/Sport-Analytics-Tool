import { spawn } from 'node:child_process';
import { rm, mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import EmbeddedPostgres from 'embedded-postgres';

const backendDirectory = new URL('..', import.meta.url);
const databaseName = 'sport_analytics_test';
const databaseUser = 'test_user';
const databasePassword = 'test_password';

async function findAvailablePort(): Promise<number> {
  const server = createServer();

  return await new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a port for the disposable PostgreSQL server.'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function runNpmScript(script: string, environment: NodeJS.ProcessEnv): Promise<void> {
  const npmExecutable = process.env.npm_execpath;

  if (!npmExecutable) {
    throw new Error('The database test runner must be started through an npm script.');
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [npmExecutable, 'run', script], {
      cwd: backendDirectory,
      env: environment,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${script} exited with ${
            code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`
          }.`,
        ),
      );
    });
  });
}

async function runConfiguredDatabaseTests(): Promise<void> {
  console.log('Using the configured isolated PostgreSQL test database.');
  await runNpmScript('test:database:run', {
    ...process.env,
    NODE_ENV: 'test',
  });
}

async function runDisposableDatabaseTests(): Promise<void> {
  const port = await findAvailablePort();
  const databaseDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-postgres-'));
  const verbose = process.env.DATABASE_TEST_VERBOSE === '1';
  const postgres = new EmbeddedPostgres({
    databaseDir: databaseDirectory,
    user: databaseUser,
    password: databasePassword,
    port,
    persistent: false,
    onLog: verbose ? console.log : () => undefined,
    onError: verbose ? console.error : () => undefined,
  });

  console.log(`Starting disposable PostgreSQL 16 for database tests on port ${port}.`);

  try {
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase(databaseName);

    const testEnvironment = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL_TEST: `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/${databaseName}`,
    };

    await runNpmScript('db:test:reset', testEnvironment);
    await runNpmScript('db:test:seed', testEnvironment);
    await runNpmScript('test:database:run', testEnvironment);
  } finally {
    await postgres.stop().catch((error: unknown) => {
      console.error('Failed to stop the disposable PostgreSQL server cleanly.', error);
    });
    await rm(databaseDirectory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  if (process.env.DATABASE_URL_TEST) {
    await runConfiguredDatabaseTests();
    return;
  }

  await runDisposableDatabaseTests();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown database test runner error.');
  process.exitCode = 1;
});
