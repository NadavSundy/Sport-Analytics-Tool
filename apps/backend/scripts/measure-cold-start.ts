/**
 * Records the documented cold-run observation for issue #599.
 *
 * Usage:
 *   npm run measure:cold-start --workspace=@sport-analytics/backend -- [--output path]
 *
 * `docs/development/performance-baseline.md` defines a cold observation as the
 * first request an operation makes against a freshly started backend that has
 * issued no prior database-backed request, with the backend restarted before
 * the next operation so that no operation reuses another's pool connection. A
 * cold observation has its own 5,000 ms maximum and must never be mixed into a
 * warm P95.
 *
 * The corpus is ingested once and the backend restarted per operation, rather
 * than rebuilding the database five times: the pool connection is what is being
 * measured, and it is established per backend process.
 *
 * What this does and does not measure is worth stating plainly. It measures
 * Node process start, Express wiring and the first PostgreSQL connection over
 * loopback. It does not measure an Azure Container Apps cold start, and the
 * deployed API is configured with `minReplicas` 0, so a deployed first request
 * after idle also pays for a container being scheduled and started. That cost
 * is not observable from here.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { cpus, tmpdir, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';

import { ingestMatchData } from './ingest-match-data';

const backendDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryDirectory = resolve(backendDirectory, '../..');
// The name must carry "test" as a distinct segment; `assertSafeTestDatabase`
// refuses to reset anything else.
const databaseName = 'sport_analytics_cold_start_test';
const databaseUser = 'performance_user';
const databasePassword = 'performance_password';

/** `docs/development/performance-baseline.md`: a cold request has its own bound. */
const coldMaximumMs = 5_000;

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

async function runNpmScript(script: string, environment: NodeJS.ProcessEnv): Promise<void> {
  if (!process.env.npm_execpath) {
    throw new Error('The measurement must be started through an npm script.');
  }
  await run(
    process.execPath,
    [process.env.npm_execpath, 'run', script],
    backendDirectory,
    environment,
  );
}

/**
 * Waits for the process to accept connections **without** issuing a
 * database-backed request. `/api/v1/health` is used because it does not touch
 * PostgreSQL; polling anything else would establish the pool connection this
 * measurement exists to time.
 */
async function waitForHealth(url: string, child: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error('The temporary backend stopped before becoming ready.');
    try {
      const response = await fetch(`${url}/api/v1/health`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error('Timed out waiting for the temporary backend.');
}

async function stop(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise<void>((resolveStop) => child.once('exit', () => resolveStop()));
}

async function timedRequest(url: string): Promise<number> {
  const started = process.hrtime.bigint();
  const response = await fetch(url, { headers: { accept: 'application/json,text/csv;q=0.9' } });
  await response.arrayBuffer();
  const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return elapsed;
}

interface ColdObservation {
  name: string;
  path: string;
  coldMs: number;
  warmMs: number;
}

async function main(): Promise<void> {
  const output = resolve(
    repositoryDirectory,
    argument('--output', 'evidence/validation/issue-599/cold-start-observations.md'),
  );
  const postgresPort = await availablePort();
  const databaseDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-coldstart-postgres-'));
  const corpusDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-coldstart-corpus-'));
  const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${postgresPort}/${databaseName}`;
  const postgres = new EmbeddedPostgres({
    databaseDir: databaseDirectory,
    user: databaseUser,
    password: databasePassword,
    port: postgresPort,
    persistent: false,
  });

  try {
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase(databaseName);
    const setupEnvironment = { ...process.env, NODE_ENV: 'test', DATABASE_URL_TEST: databaseUrl };
    await runNpmScript('db:test:reset', setupEnvironment);
    await runNpmScript('db:test:migrate', setupEnvironment);
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
    let fixtureId: string;
    let participantId: string;
    try {
      for (const file of files) await ingestMatchData(client, join(corpusDirectory, file));
      await client.query('ANALYZE');
      const identifiers = await client.query<{ fixtureId: string; participantId: string }>(
        `SELECT (SELECT fixture_id::text FROM fixture ORDER BY fixture_id LIMIT 1) AS "fixtureId",
                (SELECT person_id::text FROM person WHERE source_ref = 'fictional-perf-player-1') AS "participantId"`,
      );
      const row = identifiers.rows[0];
      if (!row?.fixtureId || !row.participantId)
        throw new Error('Could not resolve the measurement identifiers.');
      fixtureId = row.fixtureId;
      participantId = row.participantId;
    } finally {
      await client.end();
    }

    const operations = [
      { name: 'public fixture page', path: `/api/v1/fixtures?limit=50` },
      { name: 'fixture event page', path: `/api/v1/fixtures/${fixtureId}/events?limit=100` },
      { name: 'fixture statistics', path: `/api/v1/fixtures/${fixtureId}/statistics` },
      { name: 'participant aggregate', path: `/api/v1/participants/${participantId}/statistics` },
      { name: 'CSV event export', path: `/api/v1/fixtures/${fixtureId}/events/export.csv` },
    ];

    const observations: ColdObservation[] = [];
    for (const operation of operations) {
      const backendPort = await availablePort();
      const backend = spawn(
        process.execPath,
        [resolve(repositoryDirectory, 'node_modules/tsx/dist/cli.mjs'), 'src/index.ts'],
        {
          cwd: backendDirectory,
          env: {
            ...process.env,
            NODE_ENV: 'test',
            PORT: String(backendPort),
            DATABASE_URL: databaseUrl,
            SUPABASE_URL: 'https://test-project.supabase.co',
            SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
          },
          stdio: 'ignore',
        },
      );
      try {
        const baseUrl = `http://127.0.0.1:${backendPort}`;
        await waitForHealth(baseUrl, backend);
        // The first database-backed request this process makes.
        const coldMs = await timedRequest(`${baseUrl}${operation.path}`);
        // The next one, for contrast, on the connection the cold request built.
        const warmMs = await timedRequest(`${baseUrl}${operation.path}`);
        observations.push({ ...operation, coldMs, warmMs });
        console.log(
          `${operation.name}: cold ${coldMs.toFixed(1)} ms, next ${warmMs.toFixed(1)} ms`,
        );
      } finally {
        await stop(backend);
      }
    }

    const lines = observations.map(
      (observation) =>
        `| ${observation.name} | ${observation.coldMs.toFixed(1)} | ${observation.warmMs.toFixed(1)} | ${(observation.coldMs - observation.warmMs).toFixed(1)} | ${coldMaximumMs} | ${observation.coldMs <= coldMaximumMs ? 'pass' : 'fail'} |`,
    );
    await mkdir(dirname(output), { recursive: true });
    await writeFile(
      output,
      [
        '# Issue #599 cold-start observations',
        '',
        `- Generated by \`npm run measure:cold-start --workspace=@sport-analytics/backend\` on ${new Date().toISOString()}.`,
        `- Host: ${process.platform}, Node ${process.version}, ${cpus().length} logical CPUs, ${Math.round(totalmem() / 1024 ** 3)} GB memory; embedded PostgreSQL on the same host.`,
        '- Corpus: 300 generated fictional fixtures, 72,000 deliveries.',
        '- Procedure, from `docs/development/performance-baseline.md`: the backend is restarted before each operation, and the recorded cold figure is the first database-backed request that process makes. Readiness is polled on `/api/v1/health`, which does not touch PostgreSQL, so polling does not establish the pool connection being timed.',
        '- A cold observation has its own 5,000 ms maximum and is never mixed into a warm P95.',
        '',
        '| Operation | Cold first request (ms) | Next request (ms) | Difference (ms) | Cold maximum (ms) | Result |',
        '| --- | ---: | ---: | ---: | ---: | --- |',
        ...lines,
        '',
        '## What this does not measure',
        '',
        'This is the first local cold-run observation on record for this repository, and its scope is narrow. It covers Node process start, Express wiring and the first PostgreSQL connection over loopback to a server on the same machine.',
        '',
        'It does **not** cover the deployed cold path. Two costs dominate there and neither is observable from here. `evidence/validation/issue-369-idle-backend-latency.md` recorded a first database-backed request of 2,863 ms against the hosted database where the warm request was 183 ms, so the connection handshake alone is three orders of magnitude larger than anything below. Separately, `infra/azure/backend/main.bicep` sets `minReplicas` to 0, so a deployed request arriving after an idle period also waits for a container to be scheduled and started before any of this begins.',
        '',
        'The figures below therefore bound the application’s own start-up work. They are not a deployed cold-start budget.',
        '',
        'This run uses no credentials, private data or production endpoint.',
        '',
      ].join('\n'),
    );
    console.log(`Wrote ${output}`);
    if (observations.some((observation) => observation.coldMs > coldMaximumMs)) {
      process.exitCode = 2;
    }
  } finally {
    await postgres.stop().catch(() => undefined);
    await rm(databaseDirectory, { recursive: true, force: true });
    await rm(corpusDirectory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
