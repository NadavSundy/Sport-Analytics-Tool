/**
 * Import a corpus of Cricsheet match files into the delivery event schema.
 *
 * Each match is ingested in its own transaction, so a file that cannot be
 * ingested rolls back alone and the run continues. Rejections are collected and
 * reported at the end rather than discarded, and the run is resumable: ingestion
 * is idempotent, so re-running skips what is already present.
 *
 * A run over the full corpus lasts hours, so a dropped connection is expected
 * rather than exceptional. The client is replaced and the match retried once
 * before the file is recorded as rejected.
 *
 * Usage:
 *   npm run db:import --workspace=@sport-analytics/backend -- <directory> [--limit N] [--dry-run]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Client } from 'pg';

import { ingestMatchData } from './ingest-match-data';

interface Rejection {
  file: string;
  reason: string;
}

function parseArguments(): { directory: string; limit: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  const positional = args.filter((value) => !value.startsWith('--'));
  const flags = args.filter((value) => value.startsWith('--'));

  const directory = positional[0];
  if (!directory) {
    console.error('Usage: db:import -- <directory> [--limit N] [--dry-run]');
    process.exit(1);
  }

  // --limit may be given as --limit=100 or as --limit 100. An absent or
  // unparseable value means no limit rather than a limit of zero.
  const limitFlag = flags.find((flag) => flag.startsWith('--limit'));
  let limit = Number.POSITIVE_INFINITY;

  if (limitFlag) {
    const inline = limitFlag.includes('=') ? limitFlag.split('=')[1] : undefined;
    const following = args[args.indexOf(limitFlag) + 1];
    const parsed = Number(inline ?? following);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = parsed;
    }
  }

  return {
    directory: resolve(process.cwd(), directory),
    limit,
    dryRun: flags.includes('--dry-run'),
  };
}

/** Every .json file beneath a directory, in a stable order so a run is repeatable. */
function matchFiles(directory: string): string[] {
  const found: string[] = [];

  function walk(current: string): void {
    for (const entry of readdirSync(current).sort()) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (entry.endsWith('.json')) {
        found.push(path);
      }
    }
  }

  walk(directory);
  return found;
}

/**
 * A Cricsheet match file is an object carrying info and innings. The corpus also
 * contains a manifest, which is an array, and must not be treated as a match.
 */
function looksLikeAMatch(path: string): boolean {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      'info' in parsed &&
      'innings' in parsed
    );
  } catch {
    return false;
  }
}

const certificate = readFileSync(new URL('../certs/supabase-ca.crt', import.meta.url), 'utf8');

function createClient(): Client {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: true,
      ca: certificate,
    },
  });

  // Without a listener, a dropped connection is emitted as an unhandled error
  // event and terminates the process. Over a run lasting hours that is not an
  // acceptable failure mode.
  client.on('error', (error: Error) => {
    console.error(`  connection error: ${error.message}`);
  });

  return client;
}

let client = createClient();

async function reconnect(): Promise<void> {
  await client.end().catch(() => undefined);
  client = createClient();
  await client.connect();
}

async function summarise(): Promise<Record<string, number>> {
  const { rows } = await client.query(`
    SELECT
      (SELECT count(*) FROM competition)                          AS competitions,
      (SELECT count(DISTINCT season) FROM fixture)                AS seasons,
      (SELECT count(*) FROM team)                                 AS teams,
      (SELECT count(*) FROM person)                               AS participants,
      (SELECT count(*) FROM fixture)                              AS fixtures,
      (SELECT count(*) FROM innings)                              AS innings,
      (SELECT count(*) FROM delivery WHERE superseded_at IS NULL) AS deliveries,
      (SELECT count(*) FROM delivery_wicket)                      AS wickets,
      (SELECT count(*) FROM submission)                           AS submissions
  `);

  return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
}

/** Ingest one match in its own transaction, retrying once if the connection dropped. */
async function ingestOne(file: string, allowRetry = true): Promise<number> {
  try {
    await client.query('BEGIN');
    const result = await ingestMatchData(client, file);
    await client.query('COMMIT');
    return result.deliveriesAdded;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    const message = error instanceof Error ? error.message : String(error);
    const connectionLost =
      message.includes('Connection terminated') ||
      message.includes('connection is closed') ||
      message.includes('Client has encountered a connection error');

    if (connectionLost && allowRetry) {
      console.log('  reconnecting after a dropped connection');
      await reconnect();
      return ingestOne(file, false);
    }

    throw error;
  }
}

async function main(): Promise<void> {
  const { directory, limit, dryRun } = parseArguments();

  const candidates = matchFiles(directory);
  console.log(`Found ${candidates.length} JSON files under ${directory}`);
  console.log('Checking which are match files. This reads every file and takes a minute.');

  const matches = candidates.filter(looksLikeAMatch);
  const notMatches = candidates.length - matches.length;
  if (notMatches > 0) {
    console.log(`Skipping ${notMatches} file(s) that are not match files`);
  }

  const files = Number.isFinite(limit) ? matches.slice(0, limit) : matches;

  if (dryRun) {
    console.log(`\nDry run: ${files.length} match file(s) would be imported. Nothing was written.`);
    return;
  }

  await client.connect();

  const before = await summarise();
  console.log(`\nStarting import of ${files.length} match file(s).\n`);

  const started = Date.now();
  const rejections: Rejection[] = [];
  let imported = 0;
  let alreadyPresent = 0;
  let deliveriesAdded = 0;

  for (const [index, file] of files.entries()) {
    try {
      const added = await ingestOne(file);
      deliveriesAdded += added;
      if (added === 0) {
        alreadyPresent += 1;
      } else {
        imported += 1;
      }
    } catch (error) {
      rejections.push({
        file,
        reason: error instanceof Error ? error.message : String(error),
      });
    }

    const done = index + 1;
    if (done % 25 === 0 || done === files.length) {
      const elapsed = (Date.now() - started) / 1000;
      const rate = done / elapsed;
      const remaining = (files.length - done) / rate;
      console.log(
        `  ${done}/${files.length}` +
          `  imported ${imported}` +
          `  already present ${alreadyPresent}` +
          `  rejected ${rejections.length}` +
          `  ${rate.toFixed(2)}/s` +
          `  ~${Math.round(remaining / 60)} min remaining`,
      );
    }
  }

  const after = await summarise();

  console.log('\nImport complete.\n');
  console.log(`  files considered  : ${files.length}`);
  console.log(`  imported          : ${imported}`);
  console.log(`  already present   : ${alreadyPresent}`);
  console.log(`  rejected          : ${rejections.length}`);
  console.log(`  deliveries added  : ${deliveriesAdded}`);
  console.log(`  elapsed           : ${Math.round((Date.now() - started) / 60_000)} min\n`);

  console.log('Database totals:\n');
  for (const key of Object.keys(after)) {
    const delta = after[key] - before[key];
    console.log(
      `  ${key.padEnd(14)}: ${String(after[key]).padStart(9)}` + (delta > 0 ? `  (+${delta})` : ''),
    );
  }

  if (rejections.length > 0) {
    console.log(`\n${rejections.length} file(s) were rejected:\n`);
    for (const rejection of rejections.slice(0, 50)) {
      console.log(`  ${rejection.file}`);
      console.log(`    ${rejection.reason}`);
    }
    if (rejections.length > 50) {
      console.log(`  ... and ${rejections.length - 50} more`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error('Import failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end().catch(() => undefined);
  });
