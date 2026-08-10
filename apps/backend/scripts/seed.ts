/**
 * Load the development seed fixtures into the database.
 *
 * The seed runs the ingestion script over the match files committed under
 * database/seeds/matches, so that seeding exercises the same validation and
 * insertion path as a real submission and cannot drift from the schema.
 *
 * Ingestion is idempotent, so running the seed twice leaves the database in the
 * same state.
 *
 * Usage:
 *   npm run db:seed --workspace=@sport-analytics/backend
 */

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const seedDir = resolve(__dirname, '../../../database/seeds/matches');

const files = readdirSync(seedDir)
  .filter((name) => name.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error(`No seed match files found in ${seedDir}`);
  process.exit(1);
}

console.log(`Seeding ${files.length} fixtures from ${seedDir}`);

for (const file of files) {
  console.log(`\n--- ${file} ---`);
  execFileSync(
    process.execPath,
    [
      resolve(__dirname, '../../../node_modules/tsx/dist/cli.mjs'),
      '--env-file=.env',
      resolve(__dirname, 'ingest-match.ts'),
      resolve(seedDir, file),
    ],
    { stdio: 'inherit', cwd: resolve(__dirname, '..') }
  );
}

console.log('\nSeed complete.');