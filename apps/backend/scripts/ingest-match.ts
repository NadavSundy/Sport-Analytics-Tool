/**
 * Load a single Cricsheet match into the delivery event schema.
 *
 * Usage:
 *   npm run db:ingest --workspace=@sport-analytics/backend -- <path-to-match.json>
 */

import { readFileSync } from 'node:fs';
import { Client } from 'pg';

import { ingestMatchData } from './ingest-match-data';

const matchPath = process.argv[2];
if (!matchPath) {
  console.error('Usage: db:ingest -- <path-to-match.json>');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(new URL('../certs/supabase-ca.crt', import.meta.url), 'utf8'),
  },
});

async function main(): Promise<void> {
  await client.connect();
  await client.query('BEGIN');

  try {
    const result = await ingestMatchData(client, matchPath);
    await client.query('COMMIT');

    console.log(`Ingested ${result.sourceRef}`);
    console.log(`  fixture_id       : ${result.fixtureId}`);
    console.log(`  people resolved  : ${result.peopleResolved}`);
    console.log(`  deliveries added : ${result.deliveriesAdded}`);
    if (result.deliveriesAdded === 0) {
      console.log('  (already present: this run was a no-op, which is the intended behaviour)');
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error('Ingestion failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
