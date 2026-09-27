/**
 * Measures the two remaining issue #599 workloads that need an authenticated
 * caller or the worker's own job handler:
 *
 *   1. batch report reads, which are submitter-authenticated; and
 *   2. dataset release generation, measured as throughput rather than latency,
 *      with public reads sampled while generation runs.
 *
 * Usage:
 *   npm run measure:batch-and-release-workloads --workspace=@sport-analytics/backend -- \
 *     [--report-output path] [--release-output path] [--samples 20] [--batch-items 5000]
 *
 * Two things make this a separate runner from `measure:public-read-workloads`.
 * The report endpoints require a Supabase session, so the backend is created
 * in process with an injected token verifier rather than spawned; and release
 * generation is performed by the worker's handler, not by the API, so it is
 * invoked directly instead of through Service Bus.
 *
 * No credential, private data or deployed endpoint is involved. The injected
 * verifier accepts one synthetic identity and never contacts Supabase.
 */
import type { Server } from 'node:http';

import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { cpus, tmpdir, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FilesystemObjectStore } from '@sport-analytics/object-storage';
import EmbeddedPostgres from 'embedded-postgres';
import { Client, Pool } from 'pg';

import { ingestMatchData } from './ingest-match-data';

const backendDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryDirectory = resolve(backendDirectory, '../..');
// The name must carry "test" as a distinct segment; `assertSafeTestDatabase`
// refuses to reset anything else.
const databaseName = 'sport_analytics_batch_release_workloads_test';
const databaseUser = 'performance_user';
const databasePassword = 'performance_password';
const deploymentEnvironment = 'issue-599-measurement';

/** Section 5.2 of the issue #599 record. Stated before measurement. */
const reportTargetMs = 1_500;
const publicReadTargetMs = 500;
const statisticsTargetMs = 1_500;

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

function percentile(samples: readonly number[], fraction: number): number {
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.max(Math.ceil(ordered.length * fraction) - 1, 0)]!;
}

function format(value: number): string {
  return value.toFixed(1);
}

async function timedRequest(url: string, headers: Record<string, string> = {}): Promise<number> {
  const started = process.hrtime.bigint();
  const response = await fetch(url, { headers: { accept: 'application/json', ...headers } });
  await response.arrayBuffer();
  const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return elapsed;
}

interface ReadResult {
  name: string;
  description: string;
  targetMs: number;
  samples: number[];
}

async function measureReads(
  operations: Array<{ name: string; description: string; url: string; targetMs: number }>,
  samples: number,
  headers: Record<string, string>,
): Promise<ReadResult[]> {
  const results: ReadResult[] = [];
  for (const operation of operations) {
    await timedRequest(operation.url, headers);
    const timings: number[] = [];
    for (let index = 0; index < samples; index += 1) {
      timings.push(await timedRequest(operation.url, headers));
    }
    results.push({
      name: operation.name,
      description: operation.description,
      targetMs: operation.targetMs,
      samples: timings,
    });
  }
  return results;
}

function environmentLines(): string[] {
  return [
    `- Generated by \`npm run measure:batch-and-release-workloads --workspace=@sport-analytics/backend\` on ${new Date().toISOString()}.`,
    `- Host: ${process.platform}, Node ${process.version}, ${cpus().length} logical CPUs, ${Math.round(totalmem() / 1024 ** 3)} GB memory; embedded PostgreSQL on the same host.`,
    '- Corpus: 300 generated fictional fixtures, 72,000 deliveries (`scripts/generate-representative-corpus.mjs`).',
    '- `ANALYZE` runs after the corpus is ingested and before any timed request.',
    '- Local loopback to an embedded PostgreSQL server. These figures are not deployed response times; see `evidence/sprints/sprint-3/issue-599-performance-revalidation.md` section 1.',
  ];
}

async function main(): Promise<void> {
  const reportOutput = resolve(
    repositoryDirectory,
    argument('--report-output', 'evidence/validation/issue-599/batch-report-reads.md'),
  );
  const releaseOutput = resolve(
    repositoryDirectory,
    argument('--release-output', 'evidence/validation/issue-599/dataset-release-generation.md'),
  );
  const samples = Number(argument('--samples', '20'));
  const batchItems = Number(argument('--batch-items', '5000'));
  if (!Number.isInteger(samples) || samples < 1)
    throw new Error('--samples must be a positive integer.');
  if (!Number.isInteger(batchItems) || batchItems < 1)
    throw new Error('--batch-items must be a positive integer.');

  const postgresPort = await availablePort();
  const backendPort = await availablePort();
  const databaseDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-batchrelease-postgres-'));
  const corpusDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-batchrelease-corpus-'));
  const storageDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-batchrelease-storage-'));
  const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${postgresPort}/${databaseName}`;
  const postgres = new EmbeddedPostgres({
    databaseDir: databaseDirectory,
    user: databaseUser,
    password: databasePassword,
    port: postgresPort,
    persistent: false,
  });
  let server: Server | undefined;
  let pool: Pool | undefined;

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
    let accountId: string;
    let competitionId: string;
    let fixtureId: string;
    let inningsId: string;
    let squad: string[];
    try {
      for (const file of files) await ingestMatchData(client, join(corpusDirectory, file));
      await client.query('ANALYZE');
      const account = await client.query<{ accountId: string }>(
        `INSERT INTO app_user (auth_provider, auth_subject, application_role)
         VALUES ('test', $1, 'admin') RETURNING app_user_id::text AS "accountId"`,
        [`issue-599-measurement-${randomUUID()}`],
      );
      accountId = account.rows[0]!.accountId;
      const context = await client.query<{
        competitionId: string;
        fixtureId: string;
        inningsId: string;
        players: string[];
      }>(
        `SELECT f.competition_id::text AS "competitionId",
                f.fixture_id::text AS "fixtureId",
                (SELECT innings_id::text FROM innings WHERE fixture_id = f.fixture_id ORDER BY ordinal LIMIT 1) AS "inningsId",
                (SELECT array_agg(person_id::text ORDER BY person_id) FROM fixture_squad WHERE fixture_id = f.fixture_id) AS players
         FROM fixture f ORDER BY f.fixture_id LIMIT 1`,
      );
      const row = context.rows[0];
      if (!row?.competitionId || !row.fixtureId || !row.inningsId || !row.players)
        throw new Error('Could not resolve the measurement identifiers.');
      competitionId = row.competitionId;
      fixtureId = row.fixtureId;
      inningsId = row.inningsId;
      squad = row.players;
    } finally {
      await client.end();
    }

    // The application modules read DATABASE_URL lazily through getDatabasePool,
    // so this must be set before the app is created.
    process.env.DATABASE_URL = databaseUrl;
    process.env.NODE_ENV = 'test';
    process.env.OBJECT_STORAGE_PROVIDER = 'filesystem';
    process.env.OBJECT_STORAGE_ROOT = storageDirectory;

    const { createApp } = await import('../src/app');
    const { createBatchRepository } = await import('../src/modules/batches/batch.repository');
    const { createDatasetReleaseRepository } =
      await import('../src/modules/dataset-releases/dataset-release.repository');

    pool = new Pool({ connectionString: databaseUrl, max: 4 });

    // Seed one batch large enough for the report read to be a real page rather
    // than a handful of rows. The report loads blocking items with a 50,001-row
    // bound and accepted samples separately, so the size of the batch is what
    // the measurement is actually about.
    const batchRepository = createBatchRepository(pool);
    const batchReference = randomUUID();
    const batch = await batchRepository.createBatch({
      batchReference,
      submitterId: accountId,
      competitionId,
      idempotencyKey: `issue-599-report-${randomUUID()}`,
      source: { checksum: 'a'.repeat(64), uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
      state: 'awaiting_review',
    });
    // Seeded in chunks of 1,000, which is what the worker does
    // (`batch-validation-job.ts` caps its own page size at 1,000).
    // `insertBatchItems` builds one statement with 16 bind parameters per item
    // and does not chunk internally, so a single call above 4,095 items exceeds
    // PostgreSQL's 65,535-parameter limit. That bound is not reachable from the
    // ingestion path, which never calls this method, but it is reachable from a
    // seeding script that ignores it.
    const seedChunkSize = 1_000;
    for (let offset = 0; offset < batchItems; offset += seedChunkSize) {
      const size = Math.min(seedChunkSize, batchItems - offset);
      await batchRepository.insertBatchItems(
        batch.batchId,
        Array.from({ length: size }, (_, index) => {
          const ordinal = offset + index;
          return {
            ordinal,
            inningsId,
            overNumber: 200 + Math.floor(ordinal / 6),
            positionInOver: ordinal % 6,
            state: ordinal % 10 === 0 ? ('rejected' as const) : ('accepted' as const),
            payload: {
              eventId: randomUUID(),
              sequenceNumber: 500_000 + ordinal,
              ballNumber: `${200 + Math.floor(ordinal / 6)}.${(ordinal % 6) + 1}`,
              strikerId: squad[0]!,
              nonStrikerId: squad[1]!,
              bowlerId: squad[12]!,
              runs: { offBat: ordinal % 5, extras: 0, total: ordinal % 5, nonBoundary: false },
              extras: {},
              wickets: [],
            },
          };
        }),
      );
    }

    const app = createApp({
      environment: {
        NODE_ENV: 'test',
        PORT: backendPort,
        CORS_ORIGINS: 'http://localhost:5173',
        SUPABASE_URL: 'https://test-project.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
        DEPLOYMENT_ENVIRONMENT: deploymentEnvironment,
      },
      // Accepts one synthetic identity. It never contacts Supabase and no real
      // credential exists in this process.
      verifyAccessToken: async () => ({ uid: 'issue-599-measurement', displayName: 'Measurement' }),
      synchronizeAccount: async (identity) => ({
        accountId,
        subject: identity.uid,
        displayName: identity.displayName ?? null,
        role: 'admin',
        approvalState: 'approved',
        requestedCompetition: null,
        competitionIds: [competitionId],
        disabled: false,
        deletionState: 'active',
      }),
    });
    server = app.listen(backendPort);
    await new Promise<void>((resolveListen) => server!.once('listening', () => resolveListen()));

    const baseUrl = `http://127.0.0.1:${backendPort}`;
    const authorization = { authorization: 'Bearer issue-599-measurement' };
    // Establishes the retained pooled connection; not sampled.
    await timedRequest(`${baseUrl}/api/v1/competitions?limit=1`);

    const reportResults = await measureReads(
      [
        {
          name: 'batch report, first page of 50',
          description: `Eight repository reads in one request over a ${batchItems.toLocaleString('en-GB')}-item batch: the page itself, accepted samples, blocking items under a 50,001-row bound, status counts, rule groups, blocking validation error count, resolution counts and fixture summaries.`,
          url: `${baseUrl}/api/v1/batches/${batchReference}/report?limit=50`,
          targetMs: reportTargetMs,
        },
        {
          name: 'batch report download',
          description: 'The same report rendered as a downloadable artefact.',
          url: `${baseUrl}/api/v1/batches/${batchReference}/report/download`,
          targetMs: reportTargetMs,
        },
        {
          name: 'batch status',
          description: 'The lighter status read, for comparison with the full report.',
          url: `${baseUrl}/api/v1/batches/${batchReference}`,
          targetMs: reportTargetMs,
        },
      ],
      samples,
      authorization,
    );

    const reportLines = reportResults.map((result) => {
      const p95 = percentile(result.samples, 0.95);
      return `| ${result.name} | ${format(percentile(result.samples, 0.5))} | ${format(p95)} | ${format(Math.max(...result.samples))} | ${result.targetMs} | ${p95 <= result.targetMs ? 'pass' : 'fail'} |`;
    });
    await mkdir(dirname(reportOutput), { recursive: true });
    await writeFile(
      reportOutput,
      [
        '# Issue #599 batch report reads',
        '',
        ...environmentLines(),
        `- Batch: one batch of ${batchItems.toLocaleString('en-GB')} items, one in ten rejected, in state \`awaiting_review\`.`,
        `- Reads: ${samples} sequential authenticated HTTP requests per row after one discarded warm-up request for that row.`,
        '- The backend is created in process with an injected token verifier, because these endpoints require a submitter session. No Supabase call is made and no credential exists in the process.',
        '',
        '| Read | P50 (ms) | P95 (ms) | Max (ms) | Target P95 (ms) | Result |',
        '| --- | ---: | ---: | ---: | ---: | --- |',
        ...reportLines,
        '',
        ...reportResults.map((result) => `- **${result.name}**: ${result.description}`),
        '',
        'This run uses no credentials, private data or production endpoint.',
        '',
      ].join('\n'),
    );
    console.log(`Wrote ${reportOutput}`);

    // --- Dataset release generation -------------------------------------------------
    const releaseRepository = createDatasetReleaseRepository(pool);
    const releaseVersion = `2026.09.23-issue-599-${randomUUID().slice(0, 8)}`;
    const requested = await releaseRepository.requestGeneration({
      version: releaseVersion,
      requesterId: accountId,
      deploymentEnvironment,
      storageProvider: 'filesystem',
    });
    if (!requested.job) throw new Error('The release request did not create a generation job.');

    const { createDatasetReleaseJobHandler } = await import('../../worker/src/dataset-release-job');
    const silentLogger = {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
    const { handler } = createDatasetReleaseJobHandler(
      pool,
      new FilesystemObjectStore(storageDirectory),
      silentLogger,
      {
        workerId: 'issue-599-measurement',
        leaseMs: 300_000,
        deploymentEnvironment,
        storageProvider: 'filesystem',
      },
    );

    // Public reads are sampled on a timer while generation runs, which is the
    // local analogue of the #565 readSamples: the question is whether a long
    // streaming read degrades ordinary public traffic.
    const duringFixtures: number[] = [];
    const duringStatistics: number[] = [];
    let sampling = true;
    const sampler = (async () => {
      while (sampling) {
        try {
          duringFixtures.push(await timedRequest(`${baseUrl}/api/v1/fixtures?limit=50`));
          if (!sampling) break;
          duringStatistics.push(
            await timedRequest(`${baseUrl}/api/v1/fixtures/${fixtureId}/statistics`),
          );
        } catch {
          // A sample lost to a transient error is not a measurement failure.
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100));
      }
    })();

    const generationStarted = process.hrtime.bigint();
    await handler(
      {
        body: {
          type: 'dataset-release.generate',
          version: 1,
          jobId: requested.job.jobId,
          releaseVersion,
          deploymentEnvironment,
        },
        deliveryCount: 1,
        messageId: randomUUID(),
      },
      AbortSignal.timeout(1_800_000),
    );
    const generationMs = Number(process.hrtime.bigint() - generationStarted) / 1_000_000;
    sampling = false;
    await sampler;

    const release = await releaseRepository.findByVersion(releaseVersion, deploymentEnvironment);
    if (!release) throw new Error('Generation completed without publishing a release.');
    const eventCount = Number(release.eventCount);
    const eventsPerSecond = eventCount / (generationMs / 1_000);

    const duringRow = (name: string, values: number[], targetMs: number): string => {
      if (values.length === 0)
        return `| ${name} | no samples | — | — | ${targetMs} | not measured |`;
      const p95 = percentile(values, 0.95);
      return `| ${name} | ${format(percentile(values, 0.5))} | ${format(p95)} | ${format(Math.max(...values))} | ${targetMs} | ${p95 <= targetMs ? 'pass' : 'fail'} |`;
    };

    await mkdir(dirname(releaseOutput), { recursive: true });
    await writeFile(
      releaseOutput,
      [
        '# Issue #599 dataset release generation',
        '',
        ...environmentLines(),
        `- Release version: \`${releaseVersion}\`, deployment environment \`${deploymentEnvironment}\`, filesystem object store.`,
        '- Generation is performed by the worker handler `createDatasetReleaseJobHandler`, invoked directly rather than through Service Bus, because the handler takes a plain job message and a pool.',
        '',
        '## Throughput',
        '',
        '**No latency target is stated for this workload.** It has never been measured before at any scale, so a first measurement is recorded as throughput rather than judged against an invented bar. See section 5.2 of the issue #599 report.',
        '',
        '| Measure | Value |',
        '| --- | ---: |',
        `| Events written | ${eventCount.toLocaleString('en-GB')} |`,
        `| Wall-clock | ${format(generationMs)} ms |`,
        `| Throughput | ${format(eventsPerSecond)} events/s |`,
        `| Artefact checksum | \`${release.checksum}\` |`,
        '',
        '## Public reads sampled during generation',
        '',
        `Sampled on a 100 ms cycle for the whole of generation: ${duringFixtures.length} fixture-list samples and ${duringStatistics.length} statistics samples. Each is judged against its ordinary section 5.1 target, because generation running is not a licence for public reads to miss them.`,
        '',
        '| Read during generation | P50 (ms) | P95 (ms) | Max (ms) | Target P95 (ms) | Result |',
        '| --- | ---: | ---: | ---: | ---: | --- |',
        duringRow('GET /fixtures?limit=50', duringFixtures, publicReadTargetMs),
        duringRow('GET /fixtures/{id}/statistics', duringStatistics, statisticsTargetMs),
        '',
        'This run uses no credentials, private data or production endpoint.',
        '',
      ].join('\n'),
    );
    console.log(`Wrote ${releaseOutput}`);

    const reportMissed = reportResults.some(
      (result) => percentile(result.samples, 0.95) > result.targetMs,
    );
    const duringMissed =
      (duringFixtures.length > 0 && percentile(duringFixtures, 0.95) > publicReadTargetMs) ||
      (duringStatistics.length > 0 && percentile(duringStatistics, 0.95) > statisticsTargetMs);
    if (reportMissed || duringMissed) process.exitCode = 2;
  } finally {
    if (server) await new Promise<void>((resolveClose) => server!.close(() => resolveClose()));
    await pool?.end().catch(() => undefined);
    // The application modules hold their own lazily created pool. Closing it
    // before PostgreSQL stops keeps the shutdown quiet; otherwise every idle
    // connection reports a lost server as an unexpected pool error.
    const { closeDatabasePool } = await import('../src/database');
    await closeDatabasePool().catch(() => undefined);
    await postgres.stop().catch(() => undefined);
    await rm(databaseDirectory, { recursive: true, force: true });
    await rm(corpusDirectory, { recursive: true, force: true });
    await rm(storageDirectory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
