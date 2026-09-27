/**
 * Measures two issue #599 workloads that no existing harness covers:
 *
 *   1. filtered and deeply paginated public reads; and
 *   2. the overhead the API consumer controls add to a read.
 *
 * Usage:
 *   npm run measure:public-read-workloads --workspace=@sport-analytics/backend -- \
 *     [--filtered-output path] [--consumer-output path] [--samples 20]
 *
 * It follows the same shape as `measure:performance` and
 * `measure:aggregate-snapshots`: a disposable embedded PostgreSQL server, a
 * local backend, and only the fictional generated corpus. No credential,
 * private data or deployed endpoint is involved.
 *
 * This is a separate runner rather than extra rows inside
 * `scripts/measure-api-response-times.mjs`. That script writes the five #289
 * operations whose output shape every prior evidence file shares, and issue
 * #599 re-runs those for comparison; adding rows to it would have changed the
 * artefact being compared.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
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
const databaseName = 'sport_analytics_public_read_workloads_test';
const databaseUser = 'performance_user';
const databasePassword = 'performance_password';

/** Section 5.2 of the issue #599 record. Stated before measurement. */
const listTargetMs = 500;
const aggregateTargetMs = 1_500;
const consumerDeltaTargetMs = 100;

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

function percentile(samples: readonly number[], fraction: number): number {
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.max(Math.ceil(ordered.length * fraction) - 1, 0)]!;
}

function format(value: number): string {
  return value.toFixed(1);
}

interface Timing {
  elapsedMs: number;
  body: unknown;
}

async function timedRequest(url: string, headers: Record<string, string> = {}): Promise<Timing> {
  const started = process.hrtime.bigint();
  const response = await fetch(url, { headers: { accept: 'application/json', ...headers } });
  const text = await response.text();
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return { elapsedMs, body: text.length > 0 ? JSON.parse(text) : null };
}

interface Operation {
  name: string;
  description: string;
  url: string;
  targetMs: number;
}

interface OperationResult extends Operation {
  samples: number[];
}

/**
 * Walks the fixture collection to its final page and returns the cursor that
 * addresses it, plus the number of pages traversed. Deep pagination is the
 * shape worth measuring: a cursor implemented as an offset degrades with
 * depth, whereas a keyset cursor does not, and the difference is invisible on
 * page one.
 */
async function lastPageCursor(
  baseUrl: string,
  limit: number,
): Promise<{ cursor: string; pages: number }> {
  let cursor: string | null = null;
  let pages = 0;
  for (;;) {
    const url = `${baseUrl}/api/v1/fixtures?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const { body } = await timedRequest(url);
    const next = (body as { pagination?: { nextCursor?: string | null } }).pagination?.nextCursor;
    pages += 1;
    if (!next) break;
    cursor = next;
    if (pages > 100) throw new Error('The fixture collection did not terminate within 100 pages.');
  }
  if (!cursor) throw new Error('The fixture collection fits in one page; no deep page to measure.');
  return { cursor, pages };
}

async function measureOperations(
  operations: Operation[],
  samples: number,
  headers: Record<string, string> = {},
): Promise<OperationResult[]> {
  const results: OperationResult[] = [];
  for (const operation of operations) {
    // One discarded request per operation, so the figure is a warm read of a
    // plan PostgreSQL has already chosen rather than a first-touch read.
    await timedRequest(operation.url, headers);
    const timings: number[] = [];
    for (let index = 0; index < samples; index += 1) {
      timings.push((await timedRequest(operation.url, headers)).elapsedMs);
    }
    results.push({ ...operation, samples: timings });
  }
  return results;
}

interface PairedResult {
  name: string;
  publicUrl: string;
  consumerUrl: string;
  publicSamples: number[];
  consumerSamples: number[];
}

/**
 * Measures the consumer-authenticated read against its public twin,
 * interleaved request by request.
 *
 * The two are interleaved for the same reason the #592 harness interleaves its
 * derivation rows: request cost on a developer host drifts over tens of
 * seconds, so two consecutive blocks would compare two moments rather than two
 * code paths. Interleaving makes the delta attributable to the enforcement
 * middleware.
 */
async function measurePaired(
  pairs: Array<{ name: string; publicUrl: string; consumerUrl: string }>,
  samples: number,
  apiKey: string,
): Promise<PairedResult[]> {
  const results: PairedResult[] = [];
  for (const pair of pairs) {
    await timedRequest(pair.publicUrl);
    await timedRequest(pair.consumerUrl, { 'X-API-Key': apiKey });
    const publicSamples: number[] = [];
    const consumerSamples: number[] = [];
    for (let index = 0; index < samples; index += 1) {
      publicSamples.push((await timedRequest(pair.publicUrl)).elapsedMs);
      consumerSamples.push(
        (await timedRequest(pair.consumerUrl, { 'X-API-Key': apiKey })).elapsedMs,
      );
    }
    results.push({ ...pair, publicSamples, consumerSamples });
  }
  return results;
}

/**
 * Seeds one API consumer and one key directly, because issuing through the
 * administrator endpoint would need a Supabase session this runner
 * deliberately does not have. The key material matches the format the
 * middleware accepts and never leaves this process.
 */
async function seedConsumer(client: Client): Promise<string> {
  const rawKey = `sat_live_${randomBytes(32).toString('base64url').slice(0, 43)}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const account = await client.query<{ accountId: string }>(
    `INSERT INTO app_user (auth_provider, auth_subject, application_role)
     VALUES ('test', $1, 'admin') RETURNING app_user_id::text AS "accountId"`,
    [`public-read-workloads-${randomBytes(8).toString('hex')}`],
  );
  const consumer = await client.query<{ consumerId: string }>(
    `INSERT INTO api_consumer (owner_app_user_id, name, rate_limit_per_minute, daily_quota)
     VALUES ($1, 'issue-599 measurement consumer', 10000, 10000)
     RETURNING api_consumer_id::text AS "consumerId"`,
    [account.rows[0]!.accountId],
  );
  await client.query(
    `INSERT INTO api_consumer_key (api_consumer_id, key_prefix, key_hash) VALUES ($1, $2, $3)`,
    [consumer.rows[0]!.consumerId, rawKey.slice(0, 16), keyHash],
  );
  return rawKey;
}

function environmentLines(): string[] {
  return [
    `- Generated by \`npm run measure:public-read-workloads --workspace=@sport-analytics/backend\` on ${new Date().toISOString()}.`,
    `- Host: ${process.platform}, Node ${process.version}, ${cpus().length} logical CPUs, ${Math.round(totalmem() / 1024 ** 3)} GB memory; embedded PostgreSQL on the same host.`,
    '- Corpus: 300 generated fictional fixtures, 72,000 deliveries (`scripts/generate-representative-corpus.mjs`).',
    '- `ANALYZE` runs after the corpus is ingested and before any timed request, so no request is planned without statistics (`evidence/validation/issue-592-first-read-plans/`).',
    '- Local loopback to an embedded PostgreSQL server. These figures are not deployed response times; see `evidence/sprints/sprint-3/issue-599-performance-revalidation.md` section 1.',
  ];
}

async function main(): Promise<void> {
  const filteredOutput = resolve(
    repositoryDirectory,
    argument('--filtered-output', 'evidence/validation/issue-599/filtered-paginated-reads.md'),
  );
  const consumerOutput = resolve(
    repositoryDirectory,
    argument('--consumer-output', 'evidence/validation/issue-599/consumer-enforcement-overhead.md'),
  );
  const samples = Number(argument('--samples', '20'));
  if (!Number.isInteger(samples) || samples < 1)
    throw new Error('--samples must be a positive integer.');

  const postgresPort = await availablePort();
  const backendPort = await availablePort();
  const databaseDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-workloads-postgres-'));
  const corpusDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-workloads-corpus-'));
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
    let apiKey: string;
    let competitionId: string;
    let fixtureId: string;
    let participantId: string;
    try {
      for (const file of files) await ingestMatchData(client, join(corpusDirectory, file));
      await client.query('ANALYZE');
      apiKey = await seedConsumer(client);
      const context = await client.query<{
        competitionId: string;
        fixtureId: string;
        participantId: string;
      }>(
        `SELECT (SELECT competition_id::text FROM competition ORDER BY competition_id LIMIT 1) AS "competitionId",
                (SELECT fixture_id::text FROM fixture ORDER BY fixture_id LIMIT 1) AS "fixtureId",
                (SELECT person_id::text FROM person WHERE source_ref = 'fictional-perf-player-1') AS "participantId"`,
      );
      const row = context.rows[0];
      if (!row?.competitionId || !row.fixtureId || !row.participantId)
        throw new Error('Could not resolve the measurement identifiers.');
      competitionId = row.competitionId;
      fixtureId = row.fixtureId;
      participantId = row.participantId;
    } finally {
      await client.end();
    }

    backend = spawn(
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
        stdio: 'inherit',
      },
    );
    const baseUrl = `http://127.0.0.1:${backendPort}`;
    await waitForBackend(baseUrl, backend);
    // Establishes the backend's retained pooled connection; not sampled.
    await timedRequest(`${baseUrl}/api/v1/competitions?limit=1`);

    const deep = await lastPageCursor(baseUrl, 50);
    const filtered: Operation[] = [
      {
        name: 'unfiltered fixture list, first page',
        description: 'Baseline for the rows below; the same request the #289 harness measures.',
        url: `${baseUrl}/api/v1/fixtures?limit=50`,
        targetMs: listTargetMs,
      },
      {
        name: 'fixture list filtered by competition',
        description:
          'Worst case for this corpus: every one of the 300 fixtures belongs to the single generated competition, so the filter removes nothing and the predicate is pure overhead.',
        url: `${baseUrl}/api/v1/fixtures?limit=50&competitionId=${competitionId}`,
        targetMs: listTargetMs,
      },
      {
        name: 'fixture list filtered by start-date range',
        description:
          'Genuinely selective: the generated dates span about eleven months and this range selects roughly one month of them.',
        url: `${baseUrl}/api/v1/fixtures?limit=50&startDateFrom=2025-03-01&startDateTo=2025-03-28`,
        targetMs: listTargetMs,
      },
      {
        name: `fixture list, last page of ${deep.pages}`,
        description:
          'Deep cursor page. An offset-based cursor degrades with depth and a keyset cursor does not; page one cannot tell the two apart.',
        url: `${baseUrl}/api/v1/fixtures?limit=50&cursor=${encodeURIComponent(deep.cursor)}`,
        targetMs: listTargetMs,
      },
      {
        name: 'participant fixture history, first page',
        description: 'The issue #410 endpoint, at a 50-record page.',
        url: `${baseUrl}/api/v1/participants/${participantId}/fixtures?limit=50`,
        targetMs: aggregateTargetMs,
      },
    ];

    const filteredResults = await measureOperations(filtered, samples);
    const pairedResults = await measurePaired(
      [
        {
          name: 'fixture list, 50 records',
          publicUrl: `${baseUrl}/api/v1/fixtures?limit=50`,
          consumerUrl: `${baseUrl}/api/v1/consumer/fixtures?limit=50`,
        },
        {
          name: 'fixture statistics',
          publicUrl: `${baseUrl}/api/v1/fixtures/${fixtureId}/statistics`,
          consumerUrl: `${baseUrl}/api/v1/consumer/fixtures/${fixtureId}/statistics`,
        },
        {
          name: 'competition list, 1 record',
          publicUrl: `${baseUrl}/api/v1/competitions?limit=1`,
          consumerUrl: `${baseUrl}/api/v1/consumer/competitions?limit=1`,
        },
      ],
      samples,
      apiKey,
    );

    const filteredLines = filteredResults.map((result) => {
      const p95 = percentile(result.samples, 0.95);
      return `| ${result.name} | ${format(percentile(result.samples, 0.5))} | ${format(p95)} | ${format(Math.max(...result.samples))} | ${result.targetMs} | ${p95 <= result.targetMs ? 'pass' : 'fail'} |`;
    });
    await mkdir(dirname(filteredOutput), { recursive: true });
    await writeFile(
      filteredOutput,
      [
        '# Issue #599 filtered and paginated public reads',
        '',
        ...environmentLines(),
        `- Reads: ${samples} sequential HTTP requests per row after one discarded warm-up request for that row.`,
        '',
        '| Operation | P50 (ms) | P95 (ms) | Max (ms) | Target P95 (ms) | Result |',
        '| --- | ---: | ---: | ---: | ---: | --- |',
        ...filteredLines,
        '',
        ...filteredResults.map((result) => `- **${result.name}**: ${result.description}`),
        '',
        'This run uses no credentials, private data or production endpoint.',
        '',
      ].join('\n'),
    );
    console.log(`Wrote ${filteredOutput}`);

    const pairedLines = pairedResults.map((result) => {
      const publicP95 = percentile(result.publicSamples, 0.95);
      const consumerP95 = percentile(result.consumerSamples, 0.95);
      const delta = consumerP95 - publicP95;
      return `| ${result.name} | ${format(percentile(result.publicSamples, 0.5))} | ${format(publicP95)} | ${format(percentile(result.consumerSamples, 0.5))} | ${format(consumerP95)} | ${format(delta)} | ${delta <= consumerDeltaTargetMs ? 'pass' : 'fail'} |`;
    });
    await mkdir(dirname(consumerOutput), { recursive: true });
    await writeFile(
      consumerOutput,
      [
        '# Issue #599 API consumer enforcement overhead',
        '',
        ...environmentLines(),
        `- Reads: ${samples} request pairs per row, interleaved public then consumer, after one discarded pair.`,
        '- Interleaved rather than measured as two blocks, for the reason the #592 harness gives: request cost on a developer host drifts over tens of seconds, so consecutive blocks would compare moments rather than code paths.',
        '- The consumer path adds three database round trips per request: `findActiveConsumer`, `consumeRateLimit` against the shared `api_consumer_minute_usage` table added by #595, and `consumeDailyQuota`.',
        '- The measurement consumer is seeded directly with a rate limit and daily quota of 10,000, the schema maximum, so that no sample is rejected by the limits being measured.',
        '',
        `| Read | Public P50 (ms) | Public P95 (ms) | Consumer P50 (ms) | Consumer P95 (ms) | P95 delta (ms) | Result vs ${consumerDeltaTargetMs} ms |`,
        '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
        ...pairedLines,
        '',
        'The delta is the cost of the enforcement middleware on this host. It is not a deployed figure: against a hosted database each of the three added round trips carries the network latency recorded in section 1 of the issue #599 report, not the sub-millisecond loopback cost seen here.',
        '',
        'This run uses no credentials, private data or production endpoint.',
        '',
      ].join('\n'),
    );
    console.log(`Wrote ${consumerOutput}`);

    const missed = filteredResults.filter(
      (result) => percentile(result.samples, 0.95) > result.targetMs,
    );
    const missedPairs = pairedResults.filter(
      (result) =>
        percentile(result.consumerSamples, 0.95) - percentile(result.publicSamples, 0.95) >
        consumerDeltaTargetMs,
    );
    if (missed.length > 0 || missedPairs.length > 0) process.exitCode = 2;
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
