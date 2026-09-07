import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';

import { ingestMatchData } from './ingest-match-data';

const backendDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryDirectory = resolve(backendDirectory, '../..');
const databaseName = 'sport_analytics_performance_test';
const databaseUser = 'performance_user';
const databasePassword = 'performance_password';

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

async function availablePort(): Promise<number> {
  const server = createServer();
  return await new Promise((resolvePort, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not allocate a local port.'));
      } else {
        resolvePort(address.port);
      }
    });
  });
}

async function run(
  command: string,
  args: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, env: environment, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}.`));
    });
  });
}

async function runNpmScript(
  script: string,
  cwd: string,
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  if (!process.env.npm_execpath) {
    throw new Error('The performance runner must be started through an npm script.');
  }
  await run(process.execPath, [process.env.npm_execpath, 'run', script], cwd, environment);
}

async function waitForBackend(url: string, child: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error('The temporary backend stopped before becoming ready.');
    try {
      const response = await fetch(`${url}/api/v1/health`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error('Timed out waiting for the temporary backend.');
}

async function stop(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise<void>((resolveStop) => child.once('exit', () => resolveStop()));
}

async function main(): Promise<void> {
  const output = resolve(
    repositoryDirectory,
    argument('--output', 'evidence/validation/issue-290-local-measurement.md'),
  );
  const postgresPort = await availablePort();
  const backendPort = await availablePort();
  const databaseDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-performance-postgres-'));
  const corpusDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-performance-corpus-'));
  const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${postgresPort}/${databaseName}`;
  const postgres = new EmbeddedPostgres({
    databaseDir: databaseDirectory,
    user: databaseUser,
    password: databasePassword,
    port: postgresPort,
    persistent: false,
  });
  let backend: ChildProcess | undefined;

  try {
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase(databaseName);
    const setupEnvironment = { ...process.env, NODE_ENV: 'test', DATABASE_URL_TEST: databaseUrl };
    await runNpmScript('db:test:reset', backendDirectory, setupEnvironment);
    await runNpmScript('db:test:migrate', backendDirectory, setupEnvironment);
    await run(
      'node',
      ['scripts/generate-representative-corpus.mjs', '--output', corpusDirectory],
      repositoryDirectory,
      process.env,
    );

    const files = (await readdir(corpusDirectory))
      .filter((file) => /^representative-t20-\d{3}\.json$/.test(file))
      .sort();
    if (files.length !== 300)
      throw new Error(`Expected 300 generated fixtures, received ${files.length}.`);
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      for (const file of files) await ingestMatchData(client, join(corpusDirectory, file));
      const fixture = await client.query<{ fixtureId: string }>(
        'SELECT fixture_id::text AS "fixtureId" FROM fixture ORDER BY fixture_id LIMIT 1',
      );
      const participant = await client.query<{ participantId: string }>(
        'SELECT person_id::text AS "participantId" FROM person WHERE source_ref = \'fictional-perf-player-1\'',
      );
      const fixtureId = fixture.rows[0]?.fixtureId;
      const participantId = participant.rows[0]?.participantId;
      if (!fixtureId || !participantId)
        throw new Error('Could not resolve generated benchmark identifiers.');

      const backendEnvironment = {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(backendPort),
        DATABASE_URL: databaseUrl,
        SUPABASE_URL: 'https://test-project.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
      };
      backend = spawn(
        process.execPath,
        [resolve(repositoryDirectory, 'node_modules/tsx/dist/cli.mjs'), 'src/index.ts'],
        {
          cwd: backendDirectory,
          env: backendEnvironment,
          stdio: 'inherit',
        },
      );
      const baseUrl = `http://127.0.0.1:${backendPort}`;
      await waitForBackend(baseUrl, backend);
      await run(
        'node',
        [
          'scripts/measure-api-response-times.mjs',
          '--base-url',
          baseUrl,
          '--fixture-id',
          fixtureId,
          '--participant-id',
          participantId,
          '--samples',
          '10',
          '--output',
          output,
        ],
        repositoryDirectory,
        process.env,
      );
    } finally {
      await client.end();
    }
  } finally {
    await stop(backend);
    await postgres.stop().catch(() => undefined);
    await rm(databaseDirectory, { recursive: true, force: true });
    await rm(corpusDirectory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
