import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { Client } from 'pg';

import { assertSafeTestDatabase } from './test-database-safety';

async function runMigrations(): Promise<void> {
  const migrationCli = createRequire(import.meta.url).resolve(
    'node-pg-migrate/bin/node-pg-migrate',
  );

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        migrationCli,
        'up',
        '--database-url-var',
        'DATABASE_URL_TEST',
        '--migrations-dir',
        '../../database/migrations',
        '--ignore-pattern',
        'README.md',
      ],
      {
        cwd: new URL('..', import.meta.url),
        env: process.env,
        stdio: 'inherit',
      },
    );

    child.once('error', reject);

    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Migration process exited with code ${code}.`));
    });
  });
}

async function resetTestDatabase(): Promise<void> {
  const databaseUrl = assertSafeTestDatabase(
    process.env.DATABASE_URL_TEST,
    process.env.DATABASE_URL,
    process.env.NODE_ENV,
  );

  const client = new Client({
    connectionString: databaseUrl.toString(),
  });

  try {
    await client.connect();

    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
  } finally {
    await client.end();
  }

  await runMigrations();
}

resetTestDatabase().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown database reset error.');
  process.exitCode = 1;
});
