/**
 * Measures participant aggregate reads over stored snapshots and batch
 * publication throughput on the representative 300-fixture corpus (issue
 * #592), and writes an auditable Markdown record.
 *
 * Usage: npm run measure:aggregate-snapshots --workspace=@sport-analytics/backend -- [--output path] [--samples 20]
 *
 * It starts a disposable embedded PostgreSQL server and a local backend, as
 * `measure:performance` does, and uses only the fictional generated corpus.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { cpus, tmpdir, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { publishAcceptedBatchChunk } from '@sport-analytics/batch-processing';
import EmbeddedPostgres from 'embedded-postgres';
import { Client, Pool } from 'pg';

import { createBatchRepository } from '../src/modules/batches/batch.repository';
import { ingestMatchData } from './ingest-match-data';

const backendDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryDirectory = resolve(backendDirectory, '../..');
const databaseName = 'sport_analytics_snapshot_performance_test';
const databaseUser = 'performance_user';
const databasePassword = 'performance_password';
const readTargetMs = 1_500;
const chunkSize = 100;
const itemsPerBatch = 1_000;

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

async function timedRequest(url: string): Promise<number> {
  const started = process.hrtime.bigint();
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  await response.arrayBuffer();
  const elapsed = Number(process.hrtime.bigint() - started) / 1_000_000;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return elapsed;
}

interface ReadResult {
  name: string;
  description: string;
  samples: number[];
}

interface StateRow {
  dataVersion: string | null;
  refreshCount: string;
}

async function stateOf(client: Client, participantId: string): Promise<StateRow | null> {
  const result = await client.query<StateRow>(
    `SELECT data_version::text AS "dataVersion", refresh_count::text AS "refreshCount"
     FROM participant_aggregate_snapshot_state WHERE participant_id = $1::bigint`,
    [participantId],
  );
  return result.rows[0] ?? null;
}

async function currentVersion(client: Client, participantId: string): Promise<string | null> {
  const result = await client.query<{ dataVersion: string }>(
    `SELECT data_version::text AS "dataVersion" FROM participant_statistics_version
     WHERE participant_id = $1::bigint`,
    [participantId],
  );
  return result.rows[0]?.dataVersion ?? null;
}

async function measureReads(
  client: Client,
  baseUrl: string,
  participantId: string,
  fixtureId: string,
  samples: number,
): Promise<ReadResult[]> {
  const participantUrl = `${baseUrl}/api/v1/participants/${participantId}/statistics`;
  const results: ReadResult[] = [];

  // (a) Served from current stored rows. One priming read builds them.
  await timedRequest(participantUrl);
  const primed = await stateOf(client, participantId);
  if (primed?.dataVersion !== (await currentVersion(client, participantId))) {
    throw new Error('The priming read did not store current rows.');
  }
  const served: number[] = [];
  for (let index = 0; index < samples; index += 1) served.push(await timedRequest(participantUrl));
  const afterServed = await stateOf(client, participantId);
  if (afterServed?.refreshCount !== primed?.refreshCount) {
    throw new Error('A served read unexpectedly refreshed the stored rows.');
  }
  results.push({
    name: '(a) participant aggregate, served from current snapshot',
    description: 'State row current; no live derivation and no write.',
    samples: served,
  });

  // The three measurements that include a live derivation are interleaved
  // request by request. On this host the derivation alone varies between about
  // 85 ms and 570 ms over tens of seconds, independently of which measurement
  // runs, so measuring them as three consecutive blocks compares different
  // moments rather than different work.
  const versionBumped: number[] = [];
  const rebuilt: number[] = [];
  const live: number[] = [];

  for (let index = 0; index < samples; index += 1) {
    // (b1) Read miss after a tracked write whose figures do not change the
    // rows: live derivation plus the synchronous refresh of the state row.
    await client.query(
      `UPDATE participant_statistics_version SET data_version = data_version + 1
       WHERE participant_id = $1::bigint`,
      [participantId],
    );
    const beforeBumped = await stateOf(client, participantId);
    versionBumped.push(await timedRequest(participantUrl));
    const afterBumped = await stateOf(client, participantId);
    if (
      afterBumped?.dataVersion !== (await currentVersion(client, participantId)) ||
      Number(afterBumped?.refreshCount) !== Number(beforeBumped?.refreshCount) + 1
    ) {
      throw new Error('A read miss did not refresh the stored rows in the same request.');
    }

    // (b2) Read miss with no stored rows: live derivation plus inserting every
    // scope row.
    await client.query(
      `DELETE FROM participant_aggregate_snapshot_state WHERE participant_id = $1::bigint`,
      [participantId],
    );
    rebuilt.push(await timedRequest(participantUrl));
    const afterRebuilt = await stateOf(client, participantId);
    if (afterRebuilt?.dataVersion !== (await currentVersion(client, participantId))) {
      throw new Error('A read miss did not rebuild the stored rows in the same request.');
    }

    // Reference: live derivation with no write, for an untracked participant.
    // Removing the version row leaves the stored rows unreachable but intact,
    // and restoring the same version makes them current again, so the next
    // (b1) sample starts from stored rows exactly one version behind.
    const version = await currentVersion(client, participantId);
    const beforeLive = await stateOf(client, participantId);
    await client.query(
      `DELETE FROM participant_statistics_version WHERE participant_id = $1::bigint`,
      [participantId],
    );
    live.push(await timedRequest(participantUrl));
    const afterLive = await stateOf(client, participantId);
    if (afterLive?.refreshCount !== beforeLive?.refreshCount) {
      throw new Error('The live-only read unexpectedly refreshed the stored rows.');
    }
    await client.query(
      `INSERT INTO participant_statistics_version (participant_id, data_version)
       VALUES ($1::bigint, $2)`,
      [participantId, version],
    );
  }

  results.push({
    name: '(b1) participant aggregate, read miss after a version advance',
    description:
      'Stored rows one version behind: live derivation, then the synchronous refresh (state row rewritten, unchanged scope rows untouched).',
    samples: versionBumped,
  });
  results.push({
    name: '(b2) participant aggregate, read miss with no stored rows',
    description: 'No state row: live derivation, then the synchronous insert of every scope row.',
    samples: rebuilt,
  });
  results.push({
    name: 'reference: participant aggregate, live derivation only',
    description: 'No statistics version row: derived live every time and never written.',
    samples: live,
  });

  const fixtureUrl = `${baseUrl}/api/v1/fixtures/${fixtureId}/statistics`;
  await timedRequest(fixtureUrl);
  const fixture: number[] = [];
  for (let index = 0; index < samples; index += 1) fixture.push(await timedRequest(fixtureUrl));
  results.push({
    name: 'fixture statistics (unchanged per-fixture cache)',
    description: 'Warm reads after one priming request.',
    samples: fixture,
  });

  return results;
}

interface PublicationScenario {
  name: string;
  description: string;
  batches: number;
  deliveries: number;
  elapsedMs: number;
  chunkMs: number[];
}

async function publishScenario(
  pool: Pool,
  name: string,
  description: string,
  batchInputs: Array<{ inningsId: string; players: [string, string, string] }>,
  context: { accountId: string; competitionId: string },
): Promise<PublicationScenario> {
  const repository = createBatchRepository(pool);
  const batchIds: string[] = [];
  for (const [batchIndex, input] of batchInputs.entries()) {
    const batch = await repository.createBatch({
      batchReference: randomUUID(),
      submitterId: context.accountId,
      competitionId: context.competitionId,
      idempotencyKey: `snapshot-performance-${randomUUID()}`,
      source: { checksum: 'a'.repeat(64), uri: `stored-object:${randomUUID()}`, sizeBytes: 64 },
      state: 'publishing',
    });
    const [striker, nonStriker, bowler] = input.players;
    await repository.insertBatchItems(
      batch.batchId,
      Array.from({ length: itemsPerBatch }, (_, ordinal) => ({
        ordinal,
        inningsId: input.inningsId,
        overNumber: 100 + batchIndex * 200 + Math.floor(ordinal / 6),
        positionInOver: ordinal % 6,
        state: 'accepted' as const,
        payload: {
          eventId: randomUUID(),
          sequenceNumber: 100_000 + batchIndex * 10_000 + ordinal,
          ballNumber: `${100 + Math.floor(ordinal / 6)}.${(ordinal % 6) + 1}`,
          strikerId: striker,
          nonStrikerId: nonStriker,
          bowlerId: bowler,
          runs: { offBat: ordinal % 5, extras: 0, total: ordinal % 5, nonBoundary: false },
          extras: {},
          wickets: [],
        },
      })),
    );
    batchIds.push(batch.batchId);
  }

  const chunkMs: number[] = [];
  const started = process.hrtime.bigint();
  await Promise.all(
    batchIds.map(async (batchId, index) => {
      for (;;) {
        const client = await pool.connect();
        const chunkStarted = process.hrtime.bigint();
        try {
          await client.query('BEGIN');
          const result = await publishAcceptedBatchChunk(client, batchId, `worker-${index}`, {
            chunkSize,
          });
          await client.query('COMMIT');
          chunkMs.push(Number(process.hrtime.bigint() - chunkStarted) / 1_000_000);
          if (result.complete) return;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    }),
  );
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;

  return {
    name,
    description,
    batches: batchIds.length,
    deliveries: batchIds.length * itemsPerBatch,
    elapsedMs,
    chunkMs,
  };
}

async function measurePublication(
  databaseUrl: string,
  client: Client,
): Promise<PublicationScenario[]> {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  try {
    const account = await client.query<{ accountId: string }>(
      `INSERT INTO app_user (auth_provider, auth_subject, application_role)
       VALUES ('test', $1, 'admin') RETURNING app_user_id::text AS "accountId"`,
      [`snapshot-performance-${randomUUID()}`],
    );
    const fixtures = await client.query<{
      competitionId: string;
      inningsIds: string[];
      players: string[];
    }>(
      `SELECT f.competition_id::text AS "competitionId",
              array_agg(i.innings_id::text ORDER BY i.ordinal) AS "inningsIds",
              (SELECT array_agg(person_id::text ORDER BY person_id)
               FROM fixture_squad WHERE fixture_id = f.fixture_id) AS players
       FROM fixture f JOIN innings i ON i.fixture_id = f.fixture_id
       GROUP BY f.fixture_id ORDER BY f.fixture_id LIMIT 2`,
    );
    const [first, second] = fixtures.rows;
    if (!first || !second) throw new Error('Expected two ingested fixtures.');
    const context = { accountId: account.rows[0]!.accountId, competitionId: first.competitionId };
    const squad = first.players;
    const shared: [string, string, string] = [squad[0]!, squad[1]!, squad[12]!];

    const fresh = async (label: string): Promise<[string, string, string]> => {
      const result = await client.query<{ personId: string }>(
        `INSERT INTO person (source_ref, display_name)
         SELECT $1 || n, $1 || n FROM generate_series(1, 3) AS n
         RETURNING person_id::text AS "personId"`,
        [`snapshot-performance-${label}-${randomUUID()}-`],
      );
      const ids = result.rows.map((row) => row.personId);
      return [ids[0]!, ids[1]!, ids[2]!];
    };

    return [
      await publishScenario(
        pool,
        'one batch',
        'One worker publishing one batch; no concurrent writer.',
        [{ inningsId: first.inningsIds[0]!, players: shared }],
        context,
      ),
      await publishScenario(
        pool,
        'two concurrent batches, shared participants',
        'Two workers publishing at once; every chunk advances the same three participant versions.',
        [
          { inningsId: first.inningsIds[1]!, players: shared },
          { inningsId: second.inningsIds[0]!, players: shared },
        ],
        context,
      ),
      await publishScenario(
        pool,
        'two concurrent batches, disjoint participants',
        'Two workers publishing at once; the chunks advance different participant versions.',
        [
          { inningsId: second.inningsIds[1]!, players: await fresh('a') },
          { inningsId: first.inningsIds[0]!, players: await fresh('b') },
        ],
        context,
      ),
    ];
  } finally {
    await pool.end();
  }
}

function format(value: number): string {
  return value.toFixed(1);
}

async function main(): Promise<void> {
  const output = resolve(
    repositoryDirectory,
    argument('--output', 'evidence/validation/issue-592-aggregate-snapshot-performance.md'),
  );
  const samples = Number(argument('--samples', '20'));
  if (!Number.isInteger(samples) || samples < 1)
    throw new Error('--samples must be a positive integer.');
  const postgresPort = await availablePort();
  const backendPort = await availablePort();
  const databaseDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-snapshot-postgres-'));
  const corpusDirectory = await mkdtemp(join(tmpdir(), 'sport-analytics-snapshot-corpus-'));
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
    try {
      for (const file of files) await ingestMatchData(client, join(corpusDirectory, file));
      // Freshly loaded tables have no planner statistics until autoanalyze reaches
      // them; a statement planned before then can take minutes
      // (evidence/validation/issue-592-first-read-plans/).
      await client.query('ANALYZE');
      const fixture = await client.query<{ fixtureId: string }>(
        'SELECT fixture_id::text AS "fixtureId" FROM fixture ORDER BY fixture_id LIMIT 1',
      );
      const participant = await client.query<{ participantId: string; fixtures: string }>(
        `SELECT p.person_id::text AS "participantId",
                (SELECT count(*) FROM fixture_squad fs WHERE fs.person_id = p.person_id)::text AS fixtures
         FROM person p WHERE p.source_ref = 'fictional-perf-player-1'`,
      );
      const fixtureId = fixture.rows[0]?.fixtureId;
      const participantRow = participant.rows[0];
      if (!fixtureId || !participantRow)
        throw new Error('Could not resolve benchmark identifiers.');

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
      // Establishes the backend's pooled connection; not sampled.
      await timedRequest(`${baseUrl}/api/v1/competitions?limit=1`);

      const reads = await measureReads(
        client,
        baseUrl,
        participantRow.participantId,
        fixtureId,
        samples,
      );
      const publication = await measurePublication(databaseUrl, client);

      const readLines = reads.map((result) => {
        const p95 = percentile(result.samples, 0.95);
        return `| ${result.name} | ${format(percentile(result.samples, 0.5))} | ${format(p95)} | ${format(Math.max(...result.samples))} | ${readTargetMs} | ${p95 <= readTargetMs ? 'pass' : 'fail'} |`;
      });
      const publicationLines = publication.map((scenario) => {
        const throughput = scenario.deliveries / (scenario.elapsedMs / 1_000);
        return `| ${scenario.name} | ${scenario.batches} | ${scenario.deliveries} | ${format(scenario.elapsedMs)} | ${format(throughput)} | ${format(percentile(scenario.chunkMs, 0.5))} | ${format(percentile(scenario.chunkMs, 0.95))} | ${format(Math.max(...scenario.chunkMs))} |`;
      });

      const lines = [
        '# Issue #592 participant aggregate snapshot measurement',
        '',
        `- Generated by \`npm run measure:aggregate-snapshots --workspace=@sport-analytics/backend\` on ${new Date().toISOString()}.`,
        `- Host: ${process.platform}, Node ${process.version}, ${cpus().length} logical CPUs, ${Math.round(totalmem() / 1024 ** 3)} GB memory; embedded PostgreSQL on the same host.`,
        '- Corpus: 300 generated fictional fixtures, 72,000 deliveries (`scripts/generate-representative-corpus.mjs`).',
        `- Participant: \`fictional-perf-player-1\` (ID ${participantRow.participantId}), selected in ${participantRow.fixtures} fixtures, the largest career in the corpus. Fixture ID ${fixtureId}.`,
        `- Reads: ${samples} sequential HTTP requests per row after one discarded warm-up request to the backend; timings include the backend-to-database round trip.`,
        '- `ANALYZE` runs after the corpus is ingested and before any request, so no request is planned without statistics.',
        '- Rows (b1), (b2) and the live-only reference are interleaved request by request. The derivation they share varies between about 85 ms and 570 ms over tens of seconds on this host, independently of which measurement runs, so consecutive blocks would compare moments rather than work.',
        '- The first participant read is not timed. It builds the stored rows that row (a) then serves, so it is setup for (a) rather than a sample of it; timing it would put one read miss into the served sample. Read misses are measured on their own in rows (b1) and (b2), each after the stored rows have been made stale.',
        '',
        '## Reads',
        '',
        '| Read | P50 (ms) | P95 (ms) | Max (ms) | Target P95 (ms) | Result |',
        '| --- | ---: | ---: | ---: | ---: | --- |',
        ...readLines,
        '',
        ...reads.map((result) => `- **${result.name}**: ${result.description}`),
        '',
        '## Batch publication',
        '',
        `Each batch holds ${itemsPerBatch} accepted deliveries published in chunks of ${chunkSize}, one transaction per chunk, as the worker does. Every chunk advances fixture and participant statistics versions once.`,
        '',
        '| Scenario | Batches | Deliveries | Elapsed (ms) | Deliveries/s | Chunk P50 (ms) | Chunk P95 (ms) | Chunk max (ms) |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...publicationLines,
        '',
        ...publication.map((scenario) => `- **${scenario.name}**: ${scenario.description}`),
        '',
        'This run uses no credentials, private data or production endpoint.',
        '',
      ];
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, lines.join('\n'));
      console.log(`Wrote ${output}`);
      if (reads.some((result) => percentile(result.samples, 0.95) > readTargetMs)) {
        process.exitCode = 2;
      }
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
